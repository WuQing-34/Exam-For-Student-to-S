import { getPool } from '../models/db'
import { RowDataPacket } from 'mysql2'

export const assignmentService = {
  async autoAssignAfterImport(studentIds: number[]): Promise<{ assigned: number; skipped: number; warnings: string[] }> {
    const pool = getPool()
    let assigned = 0
    let skipped = 0
    const warnings: string[] = []

    const [paperCountRows] = await pool.execute<RowDataPacket[]>('SELECT grade, COUNT(*) as cnt FROM paper GROUP BY grade')
    const gradePaperCount: Record<string, number> = {}
    for (const row of paperCountRows) {
      const r = row as { grade: string; cnt: number }
      gradePaperCount[r.grade] = r.cnt
    }

    for (const sid of studentIds) {
      const [studentRows] = await pool.execute<RowDataPacket[]>('SELECT grade FROM student WHERE id = ?', [sid])
      if (!studentRows[0]) { skipped++; continue }

      const grade = (studentRows[0] as { grade: string }).grade

      if ((gradePaperCount[grade] || 0) >= 2) {
        const warning = `检测到年级 ${grade} 有多套试卷，请手动分配`
        if (!warnings.includes(warning)) {
          warnings.push(warning)
        }
        skipped++
        continue
      }

      const [paperRows] = await pool.execute<RowDataPacket[]>(
        'SELECT id FROM paper WHERE grade = ? ORDER BY created_at DESC LIMIT 1', [grade]
      )
      if (!paperRows[0]) { skipped++; continue }

      const paperId = (paperRows[0] as { id: number }).id

      try {
        await pool.execute('INSERT INTO assignment (student_id, paper_id) VALUES (?, ?)', [sid, paperId])
        assigned++
      } catch {
        skipped++
      }
    }

    return { assigned, skipped, warnings }
  },

  async autoAssignNewPaper(paperId: number): Promise<{ count: number; warning?: string }> {
    const pool = getPool()

    const [paperRows] = await pool.execute<RowDataPacket[]>('SELECT grade FROM paper WHERE id = ?', [paperId])
    if (!paperRows[0]) return { count: 0 }

    const grade = (paperRows[0] as { grade: string }).grade

    const [countRows] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as cnt FROM paper WHERE grade = ? AND id != ?', [grade, paperId]
    )
    const existingCount = (countRows[0] as { cnt: number }).cnt

    if (existingCount >= 1) {
      return { count: 0, warning: `检测到年级 ${grade} 有多套试卷，请手动分配` }
    }

    const [students] = await pool.execute<RowDataPacket[]>(
      `SELECT s.id FROM student s
       WHERE s.grade = ? AND s.id NOT IN (SELECT a.student_id FROM assignment a WHERE a.paper_id = ?)`,
      [grade, paperId]
    )

    let count = 0
    for (const row of students) {
      try {
        await pool.execute('INSERT INTO assignment (student_id, paper_id) VALUES (?, ?)', [(row as { id: number }).id, paperId])
        count++
      } catch {
        // 跳过已存在的记录
      }
    }

    return { count }
  },

  async deleteByStudentId(studentId: number): Promise<boolean> {
    const pool = getPool()
    await pool.execute('DELETE FROM assignment WHERE student_id = ?', [studentId])
    return true
  },
}
