/**
 * 分配逻辑 Bug 修复验证测试
 * 测试场景：
 * 1. 同年级只有 1 套试卷：导入用户应该自动分配
 * 2. 同年级有 2 套试卷：导入用户应该不自动分配，返回 warnings
 * 3. 新上传试卷时同年级已有试卷：应该不自动分配，返回 warning
 * 4. 新上传试卷时同年级无其他试卷：应该正常自动分配
 */

import assert from 'assert'
import path from 'path'
import fs from 'fs'

// 设置工作目录
process.chdir(path.join(__dirname, '..'))

// 测试计数器
let passed = 0
let failed = 0
const errors: string[] = []

async function test(name: string, fn: () => Promise<void>) {
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
  console.log('分配逻辑 Bug 修复验证测试')
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
  console.log('  ✅ 数据库初始化完成\n')

  // 导入模型和服务
  const paperModel = (await import('../src/models/paperModel')).paperModel
  const userModel = (await import('../src/models/userModel')).userModel
  const assignmentModel = (await import('../src/models/assignmentModel')).assignmentModel
  const assignmentService = (await import('../src/services/assignmentService')).assignmentService

  // 清理函数
  function cleanup() {
    db.run('DELETE FROM assignment')
    db.run('DELETE FROM student')
    db.run('DELETE FROM paper')
    db.run('DELETE FROM question')
    db.run('DELETE FROM exam_record')
    dbSave()
  }

  // ===== 场景 1: 同年级只有 1 套试卷 =====
  console.log('[场景 1] 同年级只有 1 套试卷：导入用户应该自动分配')
  console.log('------------------------------------------------------------')

  await test('应该自动分配试卷给新导入的用户', async () => {
    cleanup()

    // 创建 1 套初一试卷
    const paperId = paperModel.create({
      title: '初一月考',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    // 导入学生
    const studentId1 = userModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
    const studentId2 = userModel.create({ name: '李四', phone: '13800000002', grade: 'junior1' })

    // 自动分配
    const result = assignmentService.autoAssignAfterImport([studentId1, studentId2])

    assert.strictEqual(result.assigned, 2, '应该分配 2 个')
    assert.strictEqual(result.skipped, 0, '不应该跳过')
    assert.deepStrictEqual(result.warnings, [], '不应该有警告')

    // 验证分配记录
    const assignments = assignmentModel.findAll({})
    assert.strictEqual(assignments.total, 2, '应该有 2 条分配记录')
  })

  await test('同年级只有 1 套试卷时不应该返回 warning', async () => {
    cleanup()

    // 创建 1 套试卷
    paperModel.create({
      title: '初一月考',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const studentId = userModel.create({ name: '学生', phone: '13800000001', grade: 'junior1' })
    const result = assignmentService.autoAssignAfterImport([studentId])

    assert.strictEqual(result.warnings.length, 0, '不应该有警告')
  })

  console.log('')

  // ===== 场景 2: 同年级有 2 套试卷 =====
  console.log('[场景 2] 同年级有 2 套试卷：导入用户应该不自动分配，返回 warnings')
  console.log('------------------------------------------------------------')

  await test('同年级有 2 套试卷时应该跳过并返回 warnings', async () => {
    cleanup()

    // 创建 2 套初一试卷
    paperModel.create({
      title: '初一月考1',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })
    paperModel.create({
      title: '初一月考2',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const studentId = userModel.create({ name: '学生', phone: '13800000001', grade: 'junior1' })
    const result = assignmentService.autoAssignAfterImport([studentId])

    assert.strictEqual(result.assigned, 0, '不应该分配')
    assert.strictEqual(result.skipped, 1, '应该跳过')
    assert.ok(result.warnings.length > 0, '应该有警告')
    assert.ok(result.warnings.some(w => w.includes('有多套试卷')), '警告应该说明有多套试卷')
  })

  await test('同年级有 3 套试卷时也应该跳过并返回 warnings', async () => {
    cleanup()

    // 创建 3 套试卷
    paperModel.create({
      title: '初一月考1',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })
    paperModel.create({
      title: '初一月考2',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })
    paperModel.create({
      title: '初一月考3',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const studentId = userModel.create({ name: '学生', phone: '13800000001', grade: 'junior1' })
    const result = assignmentService.autoAssignAfterImport([studentId])

    assert.strictEqual(result.assigned, 0, '不应该分配')
    assert.strictEqual(result.skipped, 1, '应该跳过')
    assert.ok(result.warnings.length > 0, '应该有警告')
  })

  await test('不同年级有不同试卷数量时行为正确', async () => {
    cleanup()

    // 初一有 2 套，初二有 1 套
    paperModel.create({
      title: '初一月考1',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })
    paperModel.create({
      title: '初一月考2',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })
    paperModel.create({
      title: '初二月考',
      grade: 'junior2',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const studentId1 = userModel.create({ name: '初一学生', phone: '13800000001', grade: 'junior1' })
    const studentId2 = userModel.create({ name: '初二学生', phone: '13800000002', grade: 'junior2' })

    const result = assignmentService.autoAssignAfterImport([studentId1, studentId2])

    assert.strictEqual(result.assigned, 1, '应该只有 1 个分配（初二）')
    assert.strictEqual(result.skipped, 1, '应该跳过 1 个（初一）')
    assert.ok(result.warnings.some(w => w.includes('junior1')), '应该有针对 junior1 的警告')
  })

  console.log('')

  // ===== 场景 3: 新上传试卷时同年级已有试卷 =====
  console.log('[场景 3] 新上传试卷时同年级已有试卷：应该不自动分配，返回 warning')
  console.log('------------------------------------------------------------')

  await test('上传新试卷时同年级已有 1 套应该返回 warning', async () => {
    cleanup()

    // 先创建 1 套试卷
    const existingPaperId = paperModel.create({
      title: '初一月考-旧',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    // 创建学生
    const studentId = userModel.create({ name: '学生', phone: '13800000001', grade: 'junior1' })

    // 上传新试卷
    const newPaperId = paperModel.create({
      title: '初一月考-新',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const result = assignmentService.autoAssignNewPaper(newPaperId)

    assert.strictEqual(result.count, 0, '不应该自动分配')
    assert.ok(result.warning, '应该有警告')
    assert.ok(result.warning!.includes('有多套试卷'), '警告应该说明有多套试卷')
  })

  await test('上传新试卷时同年级已有 2 套也应该返回 warning', async () => {
    cleanup()

    // 先创建 2 套试卷
    paperModel.create({
      title: '初一月考1',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })
    paperModel.create({
      title: '初一月考2',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    // 创建学生
    userModel.create({ name: '学生', phone: '13800000001', grade: 'junior1' })

    // 上传新试卷
    const newPaperId = paperModel.create({
      title: '初一月考-新',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const result = assignmentService.autoAssignNewPaper(newPaperId)

    assert.strictEqual(result.count, 0, '不应该自动分配')
    assert.ok(result.warning, '应该有警告')
  })

  console.log('')

  // ===== 场景 4: 新上传试卷时同年级无其他试卷 =====
  console.log('[场景 4] 新上传试卷时同年级无其他试卷：应该正常自动分配')
  console.log('------------------------------------------------------------')

  await test('上传新试卷时同年级无其他试卷应该正常分配', async () => {
    cleanup()

    // 创建学生
    const studentId1 = userModel.create({ name: '张三', phone: '13800000001', grade: 'junior1' })
    const studentId2 = userModel.create({ name: '李四', phone: '13800000002', grade: 'junior1' })

    // 上传新试卷（这是该年级第一套）
    const newPaperId = paperModel.create({
      title: '初一月考',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const result = assignmentService.autoAssignNewPaper(newPaperId)

    assert.strictEqual(result.count, 2, '应该分配给 2 个学生')
    assert.strictEqual(result.warning, undefined, '不应该有警告')
  })

  await test('上传新试卷时同年级无其他试卷不应返回 warning 字段', async () => {
    cleanup()

    userModel.create({ name: '学生', phone: '13800000001', grade: 'junior1' })

    const newPaperId = paperModel.create({
      title: '初一月考',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const result = assignmentService.autoAssignNewPaper(newPaperId)

    // warning 字段不应该存在或为 undefined
    assert.ok(!result.warning, '不应该有 warning 字段')
  })

  console.log('')

  // ===== 集成测试: 完整流程 =====
  console.log('[集成测试] 完整导入和上传流程')
  console.log('------------------------------------------------------------')

  await test('批量导入后自动分配结果包含 warnings', async () => {
    cleanup()

    // 创建 2 套试卷
    paperModel.create({
      title: '初一月考1',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })
    paperModel.create({
      title: '初一月考2',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    // 批量导入
    const importResult = userModel.batchImport([
      { name: '学生1', phone: '13800000001', grade: 'junior1' },
      { name: '学生2', phone: '13800000002', grade: 'junior1' },
    ])

    // 自动分配
    const assignResult = assignmentService.autoAssignAfterImport(importResult.ids)

    // 验证返回结构包含 warnings
    assert.ok('warnings' in assignResult, '返回结果应该包含 warnings 字段')
    assert.ok(Array.isArray(assignResult.warnings), 'warnings 应该是数组')
  })

  await test('新试卷上传后返回结果包含 warning 字段', async () => {
    cleanup()

    // 上传新试卷
    const newPaperId = paperModel.create({
      title: '初一月考',
      grade: 'junior1',
      subject: 'chinese',
      total_score: 100,
      created_by: 1
    })

    const result = assignmentService.autoAssignNewPaper(newPaperId)

    // 验证返回结构包含 count 字段
    assert.ok('count' in result, '返回结果应该包含 count 字段')
    // warning 字段可能存在也可能不存在（无 warning 时不返回）
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

  // 清理
  const { closeDatabase } = await import('../src/models/db')
  closeDatabase()

  return failed === 0
}

runTests().then(success => {
  process.exit(success ? 0 : 1)
}).catch(e => {
  console.error('测试执行失败:', e)
  process.exit(1)
})
