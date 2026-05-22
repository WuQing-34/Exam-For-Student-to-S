/**
 * v1.1 增量回归测试套件
 * 覆盖：自动分配、分科判分、S班判定、多科目解析、数据库Schema
 */

import assert from 'assert'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

// 设置工作目录为 backend
process.chdir(path.join(__dirname, '..'))

// 延迟导入以确保数据库初始化
let db: any
let paperModel: any
let studentModel: any
let assignmentModel: any
let examModel: any
let assignmentService: any
let examService: any
let paperService: any

describe('v1.1 增量回归测试', function() {
  this.timeout(10000)

  before(async () => {
    // 清理并重新初始化数据库
    const dbPath = path.join(__dirname, '../data/exam.db')
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
    }

    // 初始化数据库
    const { initDatabase } = await import('../src/models/db')
    await initDatabase()

    // 导入模块
    db = (await import('../src/models/db')).getDb()
    paperModel = (await import('../src/models/paperModel')).paperModel
    studentModel = (await import('../src/models/studentModel')).studentModel
    assignmentModel = (await import('../src/models/assignmentModel')).assignmentModel
    examModel = (await import('../src/models/examModel')).examModel
    assignmentService = (await import('../src/services/assignmentService')).assignmentService
    examService = (await import('../src/services/examService')).examService
    paperService = (await import('../src/services/paperService')).paperService
  })

  after(() => {
    // 清理
    const { closeDatabase } = require('../src/models/db')
    closeDatabase()
  })

  describe('1. 数据库 Schema 测试', () => {
    it('✅ subject_section 表存在', () => {
      const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='subject_section'")
      assert.strictEqual(result.length, 1, 'subject_section 表应该存在')
      assert.strictEqual(result[0].values.length, 1, 'subject_section 表应该有一条记录')
    })

    it('✅ paper 表有 subjects_included 字段', () => {
      const result = db.exec("PRAGMA table_info(paper)")
      const columns = result[0].values.map((row: any[]) => row[1])
      assert.ok(columns.includes('subjects_included'), 'paper 表应该有 subjects_included 字段')
    })

    it('✅ paper 表有 total_full_score 字段', () => {
      const result = db.exec("PRAGMA table_info(paper)")
      const columns = result[0].values.map((row: any[]) => row[1])
      assert.ok(columns.includes('total_full_score'), 'paper 表应该有 total_full_score 字段')
    })

    it('✅ question 表有 subject 字段', () => {
      const result = db.exec("PRAGMA table_info(question)")
      const columns = result[0].values.map((row: any[]) => row[1])
      assert.ok(columns.includes('subject'), 'question 表应该有 subject 字段')
    })

    it('✅ exam_record 表有 subject_scores 字段', () => {
      const result = db.exec("PRAGMA table_info(exam_record)")
      const columns = result[0].values.map((row: any[]) => row[1])
      assert.ok(columns.includes('subject_scores'), 'exam_record 表应该有 subject_scores 字段')
    })

    it('✅ exam_record 表有 s_class_qualified 字段', () => {
      const result = db.exec("PRAGMA table_info(exam_record)")
      const columns = result[0].values.map((row: any[]) => row[1])
      assert.ok(columns.includes('s_class_qualified'), 'exam_record 表应该有 s_class_qualified 字段')
    })

    it('✅ exam_record 表有 total_full_score 字段', () => {
      const result = db.exec("PRAGMA table_info(exam_record)")
      const columns = result[0].values.map((row: any[]) => row[1])
      assert.ok(columns.includes('total_full_score'), 'exam_record 表应该有 total_full_score 字段')
    })
  })

  describe('2. assignmentService 测试', () => {
    beforeEach(() => {
      // 清理数据
      db.run('DELETE FROM assignment')
      db.run('DELETE FROM student')
      db.run('DELETE FROM paper')
      db.run('DELETE FROM question')
      db.run('DELETE FROM exam_record')
      const { saveDatabase } = require('../src/models/db')
      saveDatabase()
    })

    it('✅ autoAssignAfterImport: 按年级匹配最新试卷', async () => {
      // 创建测试试卷
      const paperId1 = paperModel.create({
        title: '初一月考',
        grade: 'junior1',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })
      const paperId2 = paperModel.create({
        title: '初二月考',
        grade: 'junior2',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })

      // 创建学生
      const studentId1 = studentModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
      const studentId2 = studentModel.create({ name: '李四', phone: '13800000002', grade: 'junior2' })

      // 自动分配
      const result = assignmentService.autoAssignAfterImport([studentId1, studentId2])

      assert.strictEqual(result.assigned, 2, '应该分配2个试卷')
      assert.strictEqual(result.skipped, 0, '不应该跳过任何学生')

      // 验证分配记录
      const assign1 = assignmentModel.findByStudentAndPaper(studentId1, paperId1)
      const assign2 = assignmentModel.findByStudentAndPaper(studentId2, paperId2)
      assert.ok(assign1, '初一学生应该分配到初一试卷')
      assert.ok(assign2, '初二学生应该分配到初二战卷')
    })

    it('✅ autoAssignAfterImport: 跳过没有试卷的年级', async () => {
      // 只创建初一试卷
      const paperId = paperModel.create({
        title: '初一月考',
        grade: 'junior1',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })

      // 创建初一和初二学生
      const studentId1 = studentModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
      const studentId2 = studentModel.create({ name: '李四', phone: '13800000002', grade: 'junior2' })

      const result = assignmentService.autoAssignAfterImport([studentId1, studentId2])

      assert.strictEqual(result.assigned, 1, '应该分配1个试卷')
      assert.strictEqual(result.skipped, 1, '应该跳过1个学生')
    })

    it('✅ autoAssignNewPaper: 新试卷分配给同年级学生', async () => {
      // 创建试卷
      const paperId = paperModel.create({
        title: '初一月考',
        grade: 'junior1',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })

      // 创建多个同年级学生
      const studentId1 = studentModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
      const studentId2 = studentModel.create({ name: '李四', phone: '13800000002', grade: 'junior1' })

      // 新试卷上传后自动分配
      const count = assignmentService.autoAssignNewPaper(paperId)

      assert.strictEqual(count, 2, '应该分配给2个学生')
    })

    it('✅ autoAssignNewPaper: 跳过已分配的学生', async () => {
      // 创建试卷
      const paperId = paperModel.create({
        title: '初一月考',
        grade: 'junior1',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })

      // 创建学生并手动分配一个
      const studentId1 = studentModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
      const studentId2 = studentModel.create({ name: '李四', phone: '13800000002', grade: 'junior1' })
      
      // 手动分配一个
      assignmentModel.create({ student_id: studentId1, paper_id: paperId })

      // 新试卷上传后自动分配
      const count = assignmentService.autoAssignNewPaper(paperId)

      assert.strictEqual(count, 1, '应该只分配给1个未分配的学生')
    })
  })

  describe('3. 分科判分测试 (examService)', () => {
    beforeEach(() => {
      // 清理数据
      db.run('DELETE FROM assignment')
      db.run('DELETE FROM student')
      db.run('DELETE FROM paper')
      db.run('DELETE FROM question')
      db.run('DELETE FROM exam_record')
      const { saveDatabase } = require('../src/models/db')
      saveDatabase()
    })

    it('✅ 单科试卷判分（向后兼容）', () => {
      // 创建单科试卷
      const paperId = paperModel.create({
        title: '初一月考-语文',
        grade: 'junior1',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })

      // 创建题目
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '题目1',
        options: JSON.stringify([{label:'A',text:'1'},{label:'B',text:'2'}]),
        correct_answer: 'A',
        score: 50,
        order_num: 1,
        subject: 'chinese'
      })
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '题目2',
        options: JSON.stringify([{label:'A',text:'3'},{label:'B',text:'4'}]),
        correct_answer: 'B',
        score: 50,
        order_num: 2,
        subject: 'chinese'
      })

      // 模拟答题（1题对，1题错）
      const answers = [
        { questionId: 1, answer: 'A' },
        { questionId: 2, answer: 'A' }
      ]

      const result = examService.gradeAnswersBySubject(answers, paperId)

      assert.strictEqual(result.total_score, 50, '总分应该是50')
      assert.strictEqual(result.total_full_score, 100, '满分应该是100')
      assert.strictEqual(result.subject_scores.length, 1, '应该有1个科目')
      assert.strictEqual(result.subject_scores[0].subject, 'chinese', '科目应该是chinese')
      assert.strictEqual(result.subject_scores[0].score, 50, '语文得分应该是50')
      assert.strictEqual(result.subject_scores[0].questions_correct, 1, '答对1题')
    })

    it('✅ 多科试卷按科判分', () => {
      // 创建多科试卷
      const paperId = paperModel.create({
        title: '初一月考-多科',
        grade: 'junior1',
        subject: 'multi',
        total_score: 200,
        total_full_score: 200,
        created_by: 1
      })

      // 创建语文题目
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '语文题1',
        options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
        correct_answer: 'A',
        score: 50,
        order_num: 1,
        subject: 'chinese'
      })
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '语文题2',
        options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
        correct_answer: 'B',
        score: 50,
        order_num: 2,
        subject: 'chinese'
      })

      // 创建数学题目
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '数学题1',
        options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
        correct_answer: 'A',
        score: 50,
        order_num: 3,
        subject: 'math'
      })
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '数学题2',
        options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
        correct_answer: 'B',
        score: 50,
        order_num: 4,
        subject: 'math'
      })

      // 语文全对，数学全错
      const answers = [
        { questionId: 1, answer: 'A' },
        { questionId: 2, answer: 'B' },
        { questionId: 3, answer: 'A' },
        { questionId: 4, answer: 'A' }
      ]

      const result = examService.gradeAnswersBySubject(answers, paperId)

      assert.strictEqual(result.total_score, 100, '总分应该是100')
      assert.strictEqual(result.total_full_score, 200, '满分应该是200')

      // 验证分科成绩
      const chineseScore = result.subject_scores.find((s: any) => s.subject === 'chinese')
      const mathScore = result.subject_scores.find((s: any) => s.subject === 'math')

      assert.ok(chineseScore, '应该有语文成绩')
      assert.ok(mathScore, '应该有数学成绩')
      assert.strictEqual(chineseScore.score, 100, '语文应该100分')
      assert.strictEqual(chineseScore.score_rate, 100, '语文正确率100%')
      assert.strictEqual(mathScore.score, 50, '数学应该50分')
      assert.strictEqual(mathScore.score_rate, 50, '数学正确率50%')
    })

    it('✅ S班判定：所有科目>=60%', () => {
      // 创建多科试卷
      const paperId = paperModel.create({
        title: 'S班测试',
        grade: 'junior1',
        subject: 'multi',
        total_score: 200,
        total_full_score: 200,
        created_by: 1
      })

      // 语文70分，数学70分
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'fill',
        content: '语文填空',
        options: null,
        correct_answer: '答案',
        score: 70,
        order_num: 1,
        subject: 'chinese'
      })
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'fill',
        content: '数学填空',
        options: null,
        correct_answer: '答案',
        score: 70,
        order_num: 2,
        subject: 'math'
      })

      // 全部答对
      const questions = paperModel.findQuestionsByPaperId(paperId)
      const answers = questions.map((q: any) => ({ questionId: q.id, answer: q.correct_answer }))

      const result = examService.gradeAnswersBySubject(answers, paperId)

      assert.strictEqual(result.s_class_qualified, true, '应该S班合格（70%+70% >= 60%）')
    })

    it('✅ S班判定：一科<60%不合格', () => {
      // 创建多科试卷
      const paperId = paperModel.create({
        title: 'S班测试2',
        grade: 'junior1',
        subject: 'multi',
        total_score: 200,
        total_full_score: 200,
        created_by: 1
      })

      // 语文70分，数学50分
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'fill',
        content: '语文填空',
        options: null,
        correct_answer: '答案',
        score: 70,
        order_num: 1,
        subject: 'chinese'
      })
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'fill',
        content: '数学填空',
        options: null,
        correct_answer: '答案',
        score: 130,
        order_num: 2,
        subject: 'math'
      })

      // 语文对，数学错
      const questions = paperModel.findQuestionsByPaperId(paperId)
      const answers = [
        { questionId: questions[0].id, answer: '答案' },
        { questionId: questions[1].id, answer: '错误答案' }
      ]

      const result = examService.gradeAnswersBySubject(answers, paperId)

      assert.strictEqual(result.s_class_qualified, false, '数学50/130 < 60%，应该S班不合格')
    })

    it('✅ submitAnswers 保存分科成绩', () => {
      // 创建学生和试卷
      const paperId = paperModel.create({
        title: '测试试卷',
        grade: 'junior1',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '题目',
        options: JSON.stringify([{label:'A',text:'1'},{label:'B',text:'2'}]),
        correct_answer: 'A',
        score: 100,
        order_num: 1,
        subject: 'chinese'
      })

      const studentId = studentModel.create({ name: '测试学生', phone: '13800000001', grade: 'junior1' })
      assignmentModel.create({ student_id: studentId, paper_id: paperId })
      const assignment = assignmentModel.findAll().find((a: any) => a.student_id === studentId)

      examService.startExam(assignment.id)
      const examRecord = examModel.findByAssignmentId(assignment.id)

      // 提交答案
      const questions = paperModel.findQuestionsByPaperId(paperId)
      const result = examService.submitAnswers(examRecord.id, [{ questionId: questions[0].id, answer: 'A' }], 'submit')

      assert.strictEqual(result.status, 'submitted', '状态应该是submitted')
      assert.strictEqual(result.score, 100, '得分应该是100')
      assert.ok(result.sClassQualified !== undefined, '应该有S班判定结果')

      // 验证数据库记录
      const updatedRecord = examModel.findById(examRecord.id)
      assert.ok(updatedRecord.subject_scores, '应该有分科成绩')
      assert.ok(updatedRecord.s_class_qualified !== null, '应该有S班判定')
    })
  })

  describe('4. 多科解析测试 (paperService)', () => {
    it('✅ parseMultiSheetExcel: 单科目格式兼容', async () => {
      // 创建一个简单的单科目 Excel
      const ws = XLSX.utils.aoa_to_sheet([
        ['题号', '题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '分值'],
        [1, '选择题', '1+1=?', '1', '2', '3', '4', 'B', 5]
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      const result = paperService.parseMultiSheetExcel(buffer)

      assert.ok(result.has('default'), '单科目格式应该返回 default 键')
      assert.strictEqual(result.get('default')!.length, 1, '应该有1个题目')
    })

    it('✅ parseMultiSheetExcel: 多科目格式识别', async () => {
      // 创建多科目 Excel（中文Sheet名）
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

      assert.ok(result.has('chinese'), '应该有中文科目')
      assert.ok(result.has('math'), '应该有数学科目')
      assert.strictEqual(result.get('chinese')![0].subject, 'chinese', '语文题目应该有 chinese 标记')
      assert.strictEqual(result.get('math')![0].subject, 'math', '数学题目应该有 math 标记')
    })

    it('✅ parseMultiSheetExcel: 英文Sheet名映射', async () => {
      const ws1 = XLSX.utils.aoa_to_sheet([
        ['题号', '题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '分值'],
        [1, '选择题', '语文题', '对', '错', '', '', 'A', 100]
      ])

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'chinese')

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const result = paperService.parseMultiSheetExcel(buffer)

      assert.ok(result.has('chinese'), '应该识别英文科目名 chinese')
    })

    it('✅ 科目显示名称映射正确', async () => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['题号', '题型', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '分值'],
        [1, '选择题', '语文题', '对', '错', '', '', 'A', 100]
      ])

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'chinese')

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
      const result = paperService.parseMultiSheetExcel(buffer)

      const chineseQuestions = result.get('chinese')
      assert.ok(chineseQuestions, '应该有中文题目')
      assert.strictEqual(chineseQuestions![0].subject, 'chinese', 'subject 应该是 chinese')
    })
  })

  describe('5. 年级枚举测试', () => {
    it('✅ 支持 junior1/junior2/junior3 年级值', () => {
      // 创建不同年级的试卷
      const paperId1 = paperModel.create({
        title: '初一测试',
        grade: 'junior1',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })
      const paperId2 = paperModel.create({
        title: '初二测试',
        grade: 'junior2',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })
      const paperId3 = paperModel.create({
        title: '初三测试',
        grade: 'junior3',
        subject: 'chinese',
        total_score: 100,
        created_by: 1
      })

      // 查询各年级试卷
      const list1 = paperModel.findAll({ grade: 'junior1' })
      const list2 = paperModel.findAll({ grade: 'junior2' })
      const list3 = paperModel.findAll({ grade: 'junior3' })

      assert.strictEqual(list1.total, 1, '初一试卷应该有1个')
      assert.strictEqual(list2.total, 1, '初二战卷应该有1个')
      assert.strictEqual(list3.total, 1, '初三试卷应该有1个')
    })

    it('✅ 初三自动分配包含化学科目', async () => {
      // 清理并重建数据库
      db.run('DELETE FROM assignment')
      db.run('DELETE FROM student')
      db.run('DELETE FROM paper')
      db.run('DELETE FROM question')
      db.run('DELETE FROM exam_record')
      const { saveDatabase } = require('../src/models/db')
      saveDatabase()

      // 创建初三试卷（必须包含化学）
      try {
        await paperService.parseAndSaveMultiSubject(
          '/tmp/test_paper_junior3.xlsx',
          { title: '初三测试', grade: 'junior3', created_by: 1 }
        )
        assert.fail('应该抛出错误：初三试卷必须包含化学')
      } catch (e: any) {
        assert.ok(e.message.includes('化学'), '错误消息应该提到化学科目')
      }
    })
  })

  describe('6. 整体流程集成测试', () => {
    beforeEach(() => {
      // 清理数据
      db.run('DELETE FROM assignment')
      db.run('DELETE FROM student')
      db.run('DELETE FROM paper')
      db.run('DELETE FROM question')
      db.run('DELETE FROM exam_record')
      const { saveDatabase } = require('../src/models/db')
      saveDatabase()
    })

    it('✅ 完整考试流程：上传→分配→考试→判分→查看成绩', async () => {
      // 1. 创建试卷
      const paperId = paperModel.create({
        title: '集成测试试卷',
        grade: 'junior1',
        subject: 'multi',
        total_score: 200,
        total_full_score: 200,
        created_by: 1
      })

      // 创建题目
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '语文题',
        options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
        correct_answer: 'A',
        score: 100,
        order_num: 1,
        subject: 'chinese'
      })
      paperModel.createQuestion({
        paper_id: paperId,
        type: 'choice',
        content: '数学题',
        options: JSON.stringify([{label:'A',text:'对'},{label:'B',text:'错'}]),
        correct_answer: 'B',
        score: 100,
        order_num: 2,
        subject: 'math'
      })

      // 2. 创建学生
      const studentId = studentModel.create({ name: '集成测试学生', phone: '13900000001', grade: 'junior1' })

      // 3. 自动分配
      const assignResult = assignmentService.autoAssignAfterImport([studentId])
      assert.strictEqual(assignResult.assigned, 1, '应该分配成功')

      // 4. 开始考试
      const assignment = assignmentModel.findAll().find((a: any) => a.student_id === studentId)
      const examRecordId = examService.startExam(assignment.id)

      // 5. 提交答案（语文对，数学错）
      const questions = paperModel.findQuestionsByPaperId(paperId)
      const submitResult = examService.submitAnswers(
        examRecordId,
        [
          { questionId: questions[0].id, answer: 'A' },  // 语文对
          { questionId: questions[1].id, answer: 'A' }   // 数学错
        ],
        'submit'
      )

      assert.strictEqual(submitResult.status, 'submitted', '状态应该是submitted')
      assert.strictEqual(submitResult.score, 100, '总分应该是100')
      assert.strictEqual(submitResult.sClassQualified, false, 'S班不合格')

      // 6. 查看成绩
      const result = examService.getResult(examRecordId)
      assert.strictEqual(result.total_score, 100, '总成绩应该是100')
      assert.strictEqual(result.s_class_qualified, false, 'S班不合格')
      assert.ok(result.subject_scores.length >= 2, '应该有分科成绩')

      // 验证分科成绩
      const chineseResult = result.subject_scores.find((s: any) => s.subject === 'chinese')
      const mathResult = result.subject_scores.find((s: any) => s.subject === 'math')
      assert.strictEqual(chineseResult.score, 100, '语文应该是100分')
      assert.strictEqual(mathResult.score, 0, '数学应该是0分')
    })
  })
})
