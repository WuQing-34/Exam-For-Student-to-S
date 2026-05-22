/**
 * v1.1 增量回归测试套件
 * 简单测试运行器 - 使用 Node.js 内置 assert 模块
 */

import assert from 'assert'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

// 设置工作目录
process.chdir(path.join(__dirname, '..'))

// 测试计数器
let passed = 0
let failed = 0
const errors: string[] = []
let testIndex = 0

async function test(name: string, fn: () => Promise<void>) {
  testIndex++
  try {
    await fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e: any) {
    console.log(`  ❌ ${name}`)
    const msg = e?.message || String(e) || 'unknown error'
    console.log(`     Error: ${msg}`)
    errors.push(`${name}: ${msg}`)
    failed++
  }
}

async function runTests() {
  console.log('\n========================================')
  console.log('v1.1 增量回归测试套件')
  console.log('========================================\n')

  // 清理并重新初始化数据库
  const dbPath = path.join(__dirname, '../data/exam.db')
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath)
  }

  // 初始化数据库
  console.log('[初始化] 清理并重新初始化数据库...')
  const { initDatabase, getDb, saveDatabase: dbSave } = await import('../src/models/db')
  await initDatabase()
  const db = getDb()
  console.log('  ✅ 数据库初始化完成 (v1.1)\n')

  // 导入模型和服务
  const paperModel = (await import('../src/models/paperModel')).paperModel
  const userModel = (await import('../src/models/userModel')).userModel
  const assignmentModel = (await import('../src/models/assignmentModel')).assignmentModel
  const examModel = (await import('../src/models/examModel')).examModel
  const assignmentService = (await import('../src/services/assignmentService')).assignmentService
  const examService = (await import('../src/services/examService')).examService
  const paperService = (await import('../src/services/paperService')).paperService

  // 清理函数
  function cleanup() {
    db.run('DELETE FROM assignment')
    db.run('DELETE FROM student')
    db.run('DELETE FROM paper')
    db.run('DELETE FROM question')
    db.run('DELETE FROM exam_record')
    dbSave()
  }

  // ===== 测试1: 数据库 Schema =====
  console.log('[1/6] 测试数据库 Schema...')

  await test('subject_section 表存在', async () => {
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='subject_section'")
    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].values.length, 1)
  })

  await test('paper 表有 subjects_included 字段', async () => {
    const result = db.exec("PRAGMA table_info(paper)")
    const columns = result[0].values.map((row: any[]) => row[1])
    assert.ok(columns.includes('subjects_included'))
  })

  await test('paper 表有 total_full_score 字段', async () => {
    const result = db.exec("PRAGMA table_info(paper)")
    const columns = result[0].values.map((row: any[]) => row[1])
    assert.ok(columns.includes('total_full_score'))
  })

  await test('question 表有 subject 字段', async () => {
    const result = db.exec("PRAGMA table_info(question)")
    const columns = result[0].values.map((row: any[]) => row[1])
    assert.ok(columns.includes('subject'))
  })

  await test('exam_record 表有 subject_scores 字段', async () => {
    const result = db.exec("PRAGMA table_info(exam_record)")
    const columns = result[0].values.map((row: any[]) => row[1])
    assert.ok(columns.includes('subject_scores'))
  })

  await test('exam_record 表有 s_class_qualified 字段', async () => {
    const result = db.exec("PRAGMA table_info(exam_record)")
    const columns = result[0].values.map((row: any[]) => row[1])
    assert.ok(columns.includes('s_class_qualified'))
  })

  await test('exam_record 表有 total_full_score 字段', async () => {
    const result = db.exec("PRAGMA table_info(exam_record)")
    const columns = result[0].values.map((row: any[]) => row[1])
    assert.ok(columns.includes('total_full_score'))
  })

  console.log('')

  // ===== 测试2: assignmentService =====
  console.log('[2/6] 测试 assignmentService...')

  await test('autoAssignAfterImport: 按年级匹配最新试卷', async () => {
    cleanup()

    const paperId1 = paperModel.create({
      title: '初一月考', grade: 'junior1', subject: 'chinese', total_score: 100, created_by: 1
    })
    const paperId2 = paperModel.create({
      title: '初二月考', grade: 'junior2', subject: 'chinese', total_score: 100, created_by: 1
    })

    const studentId1 = userModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
    const studentId2 = userModel.create({ name: '李四', phone: '13800000002', grade: 'junior2' })

    const result = assignmentService.autoAssignAfterImport([studentId1, studentId2])
    assert.strictEqual(result.assigned, 2)
    assert.strictEqual(result.skipped, 0)

    // 验证分配记录
    const allAssignments = assignmentModel.findAll({})
    const assign1 = allAssignments.list.find((a: any) => a.student_id === studentId1 && a.paper_id === paperId1)
    const assign2 = allAssignments.list.find((a: any) => a.student_id === studentId2 && a.paper_id === paperId2)
    assert.ok(assign1, '初一学生应该分配到初一试卷')
    assert.ok(assign2, '初二学生应该分配到初二战卷')
  })

  await test('autoAssignAfterImport: 跳过没有试卷的年级', async () => {
    cleanup()

    paperModel.create({
      title: '初一月考', grade: 'junior1', subject: 'chinese', total_score: 100, created_by: 1
    })

    const studentId1 = userModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
    const studentId2 = userModel.create({ name: '李四', phone: '13800000002', grade: 'junior2' })

    const result = assignmentService.autoAssignAfterImport([studentId1, studentId2])
    assert.strictEqual(result.assigned, 1)
    assert.strictEqual(result.skipped, 1)
  })

  await test('autoAssignNewPaper: 新试卷分配给同年级学生', async () => {
    cleanup()

    const paperId = paperModel.create({
      title: '初一月考', grade: 'junior1', subject: 'chinese', total_score: 100, created_by: 1
    })

    userModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
    userModel.create({ name: '李四', phone: '13800000002', grade: 'junior1' })

    const count = assignmentService.autoAssignNewPaper(paperId)
    assert.strictEqual(count, 2)
  })

  await test('autoAssignNewPaper: 跳过已分配的学生', async () => {
    cleanup()

    const paperId = paperModel.create({
      title: '初一月考', grade: 'junior1', subject: 'chinese', total_score: 100, created_by: 1
    })

    const studentId1 = userModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
    userModel.create({ name: '李四', phone: '13800000002', grade: 'junior1' })

    assignmentModel.create({ student_id: studentId1, paper_id: paperId })
    const count = assignmentService.autoAssignNewPaper(paperId)
    assert.strictEqual(count, 1)
  })

  console.log('')

  // ===== 测试3: 分科判分 =====
  console.log('[3/6] 测试 examService 分科判分...')

  await test('单科试卷判分（向后兼容）', async () => {
    cleanup()

    const paperId = paperModel.create({
      title: '初一月考-语文', grade: 'junior1', subject: 'chinese', total_score: 100, created_by: 1
    })

    paperModel.createQuestion({
      paper_id: paperId, type: 'choice', content: '题目1',
      options: JSON.stringify([{label:'A',text:'1'},{label:'B',text:'2'}]),
      correct_answer: 'A', score: 50, order_num: 1, subject: 'chinese'
    })
    paperModel.createQuestion({
      paper_id: paperId, type: 'choice', content: '题目2',
      options: JSON.stringify([{label:'A',text:'3'},{label:'B',text:'4'}]),
      correct_answer: 'B', score: 50, order_num: 2, subject: 'chinese'
    })

    const answers = [
      { questionId: 1, answer: 'A' },
      { questionId: 2, answer: 'A' }
    ]

    const result = examService.gradeAnswersBySubject(answers, paperId)
    assert.strictEqual(result.total_score, 50)
    assert.strictEqual(result.total_full_score, 100)
    assert.strictEqual(result.subject_scores.length, 1)
    assert.strictEqual(result.subject_scores[0].subject, 'chinese')
    assert.strictEqual(result.subject_scores[0].score, 50)
  })

  await test('多科试卷按科判分', async () => {
    cleanup()

    const paperId = paperModel.create({
      title: '初一月考-多科', grade: 'junior1', subject: 'multi',
      total_score: 200, total_full_score: 200, created_by: 1
    })

    // 创建语文题目
    const chineseQ1Id = paperModel.createQuestion({
      paper_id: paperId, type: 'choice', content: '语文题1',
      options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
      correct_answer: 'A', score: 50, order_num: 1, subject: 'chinese'
    })
    const chineseQ2Id = paperModel.createQuestion({
      paper_id: paperId, type: 'choice', content: '语文题2',
      options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
      correct_answer: 'B', score: 50, order_num: 2, subject: 'chinese'
    })

    // 创建数学题目
    const mathQ1Id = paperModel.createQuestion({
      paper_id: paperId, type: 'choice', content: '数学题1',
      options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
      correct_answer: 'A', score: 50, order_num: 3, subject: 'math'
    })
    const mathQ2Id = paperModel.createQuestion({
      paper_id: paperId, type: 'choice', content: '数学题2',
      options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
      correct_answer: 'B', score: 50, order_num: 4, subject: 'math'
    })

    // 语文全对(100) + 数学半对(50) = 总分 150
    const answers = [
      { questionId: chineseQ1Id, answer: 'A' },  // 语文1: 对
      { questionId: chineseQ2Id, answer: 'B' },  // 语文2: 对
      { questionId: mathQ1Id, answer: 'A' },      // 数学1: 对
      { questionId: mathQ2Id, answer: 'A' }      // 数学2: 错
    ]

    const result = examService.gradeAnswersBySubject(answers, paperId)
    assert.strictEqual(result.total_score, 150)
    assert.strictEqual(result.total_full_score, 200)

    const chineseScore = result.subject_scores.find((s: any) => s.subject === 'chinese')
    const mathScore = result.subject_scores.find((s: any) => s.subject === 'math')

    assert.strictEqual(chineseScore.score, 100)
    assert.strictEqual(chineseScore.score_rate, 100)
    assert.strictEqual(mathScore.score, 50)
    assert.strictEqual(mathScore.score_rate, 50)
  })

  await test('S班判定：所有科目>=60%', async () => {
    cleanup()

    const paperId = paperModel.create({
      title: 'S班测试', grade: 'junior1', subject: 'multi',
      total_score: 200, total_full_score: 200, created_by: 1
    })

    paperModel.createQuestion({
      paper_id: paperId, type: 'fill', content: '语文填空',
      options: null, correct_answer: '答案', score: 70, order_num: 1, subject: 'chinese'
    })
    paperModel.createQuestion({
      paper_id: paperId, type: 'fill', content: '数学填空',
      options: null, correct_answer: '答案', score: 130, order_num: 2, subject: 'math'
    })

    const questions = paperModel.findQuestionsByPaperId(paperId)
    const answers = questions.map((q: any) => ({ questionId: q.id, answer: q.correct_answer }))

    const result = examService.gradeAnswersBySubject(answers, paperId)
    assert.strictEqual(result.s_class_qualified, true)
  })

  await test('S班判定：一科<60%不合格', async () => {
    cleanup()

    const paperId = paperModel.create({
      title: 'S班测试2', grade: 'junior1', subject: 'multi',
      total_score: 200, total_full_score: 200, created_by: 1
    })

    paperModel.createQuestion({
      paper_id: paperId, type: 'fill', content: '语文填空',
      options: null, correct_answer: '答案', score: 70, order_num: 1, subject: 'chinese'
    })
    paperModel.createQuestion({
      paper_id: paperId, type: 'fill', content: '数学填空',
      options: null, correct_answer: '答案', score: 130, order_num: 2, subject: 'math'
    })

    const questions = paperModel.findQuestionsByPaperId(paperId)
    const answers = [
      { questionId: questions[0].id, answer: '答案' },
      { questionId: questions[1].id, answer: '错误答案' }
    ]

    const result = examService.gradeAnswersBySubject(answers, paperId)
    assert.strictEqual(result.s_class_qualified, false)
  })

  console.log('')

  // ===== 测试4: 多科解析 =====
  console.log('[4/6] 测试 paperService 多科解析...')

  await test('parseMultiSheetExcel: 单科目格式兼容', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['题号', '题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '分值'],
      [1, '选择题', '1+1=?', '1', '2', '3', '4', 'B', 5]
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    const result = paperService.parseMultiSheetExcel(buffer)
    assert.ok(result.has('default'))
    assert.strictEqual(result.get('default')!.length, 1)
  })

  await test('parseMultiSheetExcel: 多科目格式识别', async () => {
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['题号', '题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '分值'],
      [1, '选择题', '语文题', '对', '错', '', '', 'A', 100]
    ])
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['题号', '题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '分值'],
      [1, '选择题', '数学题', '对', '错', '', '', 'B', 100]
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, '语文')
    XLSX.utils.book_append_sheet(wb, ws2, '数学')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const result = paperService.parseMultiSheetExcel(buffer)

    assert.ok(result.has('chinese'))
    assert.ok(result.has('math'))
    assert.strictEqual(result.get('chinese')![0].subject, 'chinese')
    assert.strictEqual(result.get('math')![0].subject, 'math')
  })

  await test('parseMultiSheetExcel: 英文Sheet名映射', async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['题号', '题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '分值'],
      [1, '选择题', '语文题', '对', '错', '', '', 'A', 100]
    ])

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'chinese')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const result = paperService.parseMultiSheetExcel(buffer)

    assert.ok(result.has('chinese'))
  })

  console.log('')

  // ===== 测试5: 年级枚举 =====
  console.log('[5/6] 测试年级枚举...')

  await test('支持 junior1/junior2/junior3 年级值', async () => {
    cleanup()

    paperModel.create({ title: '初一测试', grade: 'junior1', subject: 'chinese', total_score: 100, created_by: 1 })
    paperModel.create({ title: '初二测试', grade: 'junior2', subject: 'chinese', total_score: 100, created_by: 1 })
    paperModel.create({ title: '初三测试', grade: 'junior3', subject: 'chinese', total_score: 100, created_by: 1 })

    const list1 = paperModel.findAll({ grade: 'junior1' })
    const list2 = paperModel.findAll({ grade: 'junior2' })
    const list3 = paperModel.findAll({ grade: 'junior3' })

    assert.strictEqual(list1.total, 1)
    assert.strictEqual(list2.total, 1)
    assert.strictEqual(list3.total, 1)
  })

  console.log('')

  // ===== 测试6: 整体流程 =====
  console.log('[6/6] 测试整体流程集成...')

  await test('完整考试流程: 上传→分配→考试→判分→查看成绩', async () => {
    cleanup()

    // 1. 创建试卷
    const paperId = paperModel.create({
      title: '集成测试试卷', grade: 'junior1', subject: 'multi',
      total_score: 200, total_full_score: 200, created_by: 1
    })

    paperModel.createQuestion({
      paper_id: paperId, type: 'choice', content: '语文题',
      options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
      correct_answer: 'A', score: 100, order_num: 1, subject: 'chinese'
    })
    paperModel.createQuestion({
      paper_id: paperId, type: 'choice', content: '数学题',
      options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
      correct_answer: 'B', score: 100, order_num: 2, subject: 'math'
    })

    // 2. 创建学生
    const studentId = userModel.create({ name: '集成测试学生', phone: '13900000001', grade: 'junior1' })

    // 3. 自动分配
    const assignResult = assignmentService.autoAssignAfterImport([studentId])
    assert.strictEqual(assignResult.assigned, 1, '应该分配成功')

    // 4. 开始考试
    const assignments = assignmentModel.findAll({ studentId })
    const assignment = assignments.list[0]
    const examRecordId = examService.startExam(assignment.id)

    // 5. 提交答案（语文对，数学错）
    const questions = paperModel.findQuestionsByPaperId(paperId)
    const submitResult = examService.submitAnswers(
      examRecordId,
      [
        { questionId: questions[0].id, answer: 'A' },
        { questionId: questions[1].id, answer: 'A' }
      ],
      'submit'
    )

    assert.strictEqual(submitResult.status, 'submitted')
    assert.strictEqual(submitResult.score, 100)
    assert.strictEqual(submitResult.sClassQualified, false)

    // 6. 查看成绩
    const result = examService.getResult(examRecordId)
    assert.strictEqual(result.total_score, 100)
    assert.strictEqual(result.s_class_qualified, false)

    const chineseResult = result.subject_scores.find((s: any) => s.subject === 'chinese')
    const mathResult = result.subject_scores.find((s: any) => s.subject === 'math')
    assert.strictEqual(chineseResult.score, 100)
    assert.strictEqual(mathResult.score, 0)
  })

  console.log('')

  // ===== 输出结果 =====
  console.log('========================================')
  console.log('测试结果')
  console.log('========================================')
  console.log(`通过: ${passed}`)
  console.log(`失败: ${failed}`)

  if (errors.length > 0) {
    console.log('\n失败详情:')
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
  }

  console.log('')
  return failed === 0
}

runTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(e => {
  console.error('测试执行失败:', e)
  process.exit(1)
})
