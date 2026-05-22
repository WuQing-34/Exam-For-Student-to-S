import { getDb, saveDatabase } from '../models/db'

// v1.1: 自动分配服务
export const assignmentService = {
  /**
   * 用户导入后自动分配
   * 根据导入学生的年级自动分配最新试卷
   * 如果同年级有>=2套试卷，则不自动分配，返回警告
   */
  autoAssignAfterImport(studentIds: number[]): { assigned: number; skipped: number; warnings: string[] } {
    const db = getDb()
    let assigned = 0
    let skipped = 0
    const warnings: string[] = []

    // 预检查：统计每个年级的试卷数量
    const paperCountResult = db.exec('SELECT grade, COUNT(*) as cnt FROM paper GROUP BY grade')
    const gradePaperCount: Record<string, number> = {}
    if (paperCountResult[0]?.values) {
      for (const row of paperCountResult[0].values) {
        gradePaperCount[row[0] as string] = row[1] as number
      }
    }

    for (const sid of studentIds) {
      // 获取学生年级
      const studentResult = db.exec('SELECT grade FROM student WHERE id = ?', [sid])
      if (!studentResult[0]?.values[0]) {
        skipped++
        continue
      }

      const grade = studentResult[0].values[0][0] as string

      // 检查该年级是否有多套试卷（>=2）
      if ((gradePaperCount[grade] || 0) >= 2) {
        const warning = `检测到年级 ${grade} 有多套试卷，请手动分配`
        if (!warnings.includes(warning)) {
          warnings.push(warning)
        }
        skipped++
        continue
      }

      // 查找该年级最新的试卷
      const paperResult = db.exec(
        'SELECT id FROM paper WHERE grade = ? ORDER BY created_at DESC LIMIT 1',
        [grade]
      )

      if (!paperResult[0]?.values[0]) {
        skipped++
        continue
      }

      const paperId = paperResult[0].values[0][0] as number

      try {
        db.run(
          'INSERT INTO assignment (student_id, paper_id) VALUES (?, ?)',
          [sid, paperId]
        )
        assigned++
      } catch {
        // UNIQUE 约束冲突，跳过
        skipped++
      }
    }

    saveDatabase()
    return { assigned, skipped, warnings }
  },

  /**
   * 新试卷上传后自动分配
   * 自动分配给同年级还未分配该试卷的学生
   * 如果同年级已有>=1套试卷（加上新上传的>=2套），则不自动分配
   */
  autoAssignNewPaper(paperId: number): { count: number; warning?: string } {
    const db = getDb()

    // 获取试卷年级
    const paperResult = db.exec('SELECT grade FROM paper WHERE id = ?', [paperId])
    if (!paperResult[0]?.values[0]) {
      return { count: 0 }
    }

    const grade = paperResult[0].values[0][0] as string

    // 检查该年级已有的试卷数量（不包含当前刚上传的这张）
    const countResult = db.exec(
      'SELECT COUNT(*) FROM paper WHERE grade = ? AND id != ?',
      [grade, paperId]
    )
    const existingCount = countResult[0]?.values[0]?.[0] as number || 0

    // 如果该年级已有试卷（加上新上传的 >= 2 套），不自动分配
    if (existingCount >= 1) {
      return {
        count: 0,
        warning: `检测到年级 ${grade} 有多套试卷，请手动分配`,
      }
    }

    // 只有一套试卷，正常自动分配
    const students = db.exec(
      `SELECT s.id FROM student s
       WHERE s.grade = ?
       AND s.id NOT IN (SELECT a.student_id FROM assignment a WHERE a.paper_id = ?)`,
      [grade, paperId]
    )

    let count = 0
    if (students[0]?.values) {
      for (const row of students[0].values) {
        try {
          db.run(
            'INSERT INTO assignment (student_id, paper_id) VALUES (?, ?)',
            [row[0], paperId]
          )
          count++
        } catch {
          // 跳过已存在的记录
        }
      }
    }

    saveDatabase()
    return { count }
  },

  /**
   * 删除学生的所有分配
   */
  deleteByStudentId(studentId: number): boolean {
    const db = getDb()
    db.run('DELETE FROM assignment WHERE student_id = ?', [studentId])
    saveDatabase()
    return true
  },
}
