import initSqlJs, { Database } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { config } from '../config'

// sql.js 实例（异步初始化）
let db: Database | null = null

/**
 * 初始化数据库连接（异步，只能调用一次）
 */
export async function initDatabase(): Promise<Database> {
  if (db) return db

  // 确保目录存在
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true })
  }

  const dbPath = path.join(config.dataDir, 'exam.db')

  // 初始化 sql.js
  const SQL = await initSqlJs()

  // 加载已有数据库或创建新数据库
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // 创建表
  db.run(`
    -- 管理端用户表
    CREATE TABLE IF NOT EXISTS admin (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      email        TEXT    NOT NULL UNIQUE,
      password_hash TEXT   NOT NULL,
      name         TEXT    NOT NULL,
      role         TEXT    NOT NULL DEFAULT 'tutor',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 考生表
    CREATE TABLE IF NOT EXISTS student (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      phone      TEXT    NOT NULL,
      grade      TEXT    NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, phone, grade)
    );

    -- 试卷表
    CREATE TABLE IF NOT EXISTS paper (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT    NOT NULL,
      grade        TEXT    NOT NULL,
      subject      TEXT    NOT NULL,
      total_score  INTEGER NOT NULL DEFAULT 0,
      total_time   INTEGER NOT NULL DEFAULT 60,
      created_by   INTEGER REFERENCES admin(id),
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 题目表
    CREATE TABLE IF NOT EXISTS question (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      paper_id       INTEGER NOT NULL REFERENCES paper(id) ON DELETE CASCADE,
      type           TEXT    NOT NULL,
      content        TEXT    NOT NULL,
      options        TEXT,
      correct_answer TEXT    NOT NULL,
      score          INTEGER NOT NULL DEFAULT 5,
      order_num      INTEGER NOT NULL DEFAULT 0
    );

    -- 分配表
    CREATE TABLE IF NOT EXISTS assignment (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id  INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
      paper_id    INTEGER NOT NULL REFERENCES paper(id) ON DELETE CASCADE,
      status      TEXT    NOT NULL DEFAULT 'pending',
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, paper_id)
    );

    -- 考试记录表
    CREATE TABLE IF NOT EXISTS exam_record (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id  INTEGER NOT NULL REFERENCES assignment(id) ON DELETE CASCADE,
      answers        TEXT,
      score          INTEGER,
      status         TEXT    NOT NULL DEFAULT 'in_progress',
      started_at     DATETIME,
      submitted_at   DATETIME
    );
  `)

  // v1.1 迁移：新增字段
  try {
    // 新增 subject_section 表（多科目支持）
    db.run(`
      CREATE TABLE IF NOT EXISTS subject_section (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        paper_id INTEGER NOT NULL REFERENCES paper(id) ON DELETE CASCADE,
        subject TEXT NOT NULL,
        subject_name TEXT NOT NULL,
        subject_order INTEGER NOT NULL,
        total_score INTEGER NOT NULL DEFAULT 100,
        question_count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(paper_id, subject)
      );
    `)
  } catch (e) {
    // 表可能已存在
  }

  try {
    // 对 paper 表新增字段
    db.run(`ALTER TABLE paper ADD COLUMN subjects_included TEXT;`)
  } catch (e) {
    // 列可能已存在
  }

  try {
    db.run(`ALTER TABLE paper ADD COLUMN total_full_score INTEGER;`)
  } catch (e) {
    // 列可能已存在
  }

  try {
    // 对 question 表新增 subject 字段
    db.run(`ALTER TABLE question ADD COLUMN subject TEXT;`)
  } catch (e) {
    // 列可能已存在
  }

  try {
    // 对 exam_record 表新增字段
    db.run(`ALTER TABLE exam_record ADD COLUMN subject_scores TEXT;`)
  } catch (e) {
    // 列可能已存在
  }

  try {
    db.run(`ALTER TABLE exam_record ADD COLUMN s_class_qualified INTEGER DEFAULT 0;`)
  } catch (e) {
    // 列可能已存在
  }

  try {
    db.run(`ALTER TABLE exam_record ADD COLUMN total_full_score INTEGER;`)
  } catch (e) {
    // 列可能已存在
  }

  // v2.0 迁移：题库 + 学生自主注册
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS question_bank (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        subject        TEXT    NOT NULL,
        type           TEXT    NOT NULL,
        content        TEXT    NOT NULL,
        options        TEXT,
        correct_answer TEXT    NOT NULL,
        created_by     INTEGER REFERENCES admin(id),
        created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
  } catch (e) { /* 表可能已存在 */ }

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS student_exam (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id      INTEGER NOT NULL REFERENCES student(id),
        subject         TEXT    NOT NULL,
        questions_json  TEXT,
        answers_json    TEXT,
        score           INTEGER,
        full_score      INTEGER DEFAULT 100,
        status          TEXT    DEFAULT 'pending',
        started_at      DATETIME,
        submitted_at    DATETIME,
        UNIQUE(student_id, subject)
      );
    `)
  } catch (e) { /* 表可能已存在 */ }

  try {
    db.run(`ALTER TABLE student ADD COLUMN subjects TEXT;`)
  } catch (e) { /* 列可能已存在 */ }

  try {
    db.run(`ALTER TABLE student ADD COLUMN sales_id INTEGER;`)
  } catch (e) { /* 列可能已存在 */ }

  // v2.1 迁移：短期班辅导增加中心和战队字段
  try {
    db.run(`ALTER TABLE admin ADD COLUMN center TEXT;`)
  } catch (e) { /* 列可能已存在 */ }

  try {
    db.run(`ALTER TABLE admin ADD COLUMN team TEXT;`)
  } catch (e) { /* 列可能已存在 */ }

  // 创建索引
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_student_grade ON student(grade);
    CREATE INDEX IF NOT EXISTS idx_paper_grade ON paper(grade);
    CREATE INDEX IF NOT EXISTS idx_paper_subject ON paper(subject);
    CREATE INDEX IF NOT EXISTS idx_question_paper ON question(paper_id);
    CREATE INDEX IF NOT EXISTS idx_question_subject ON question(subject);
    CREATE INDEX IF NOT EXISTS idx_section_paper ON subject_section(paper_id);
    CREATE INDEX IF NOT EXISTS idx_assignment_student ON assignment(student_id);
    CREATE INDEX IF NOT EXISTS idx_exam_assignment ON exam_record(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON question_bank(subject);
    CREATE INDEX IF NOT EXISTS idx_question_bank_type ON question_bank(type);
    CREATE INDEX IF NOT EXISTS idx_student_exam_student ON student_exam(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_exam_subject ON student_exam(subject);
    CREATE INDEX IF NOT EXISTS idx_student_sales ON student(sales_id);
  `)

  // 持久化到磁盘
  saveDatabase()

  console.log('✅ 数据库初始化完成 (v2.0)')
  return db
}

/**
 * 保存数据库到磁盘
 */
export function saveDatabase(): void {
  if (!db) return
  const dbPath = path.join(config.dataDir, 'exam.db')
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
}

/**
 * 获取数据库实例（必须先调用 initDatabase）
 */
export function getDb(): Database {
  if (!db) throw new Error('数据库未初始化，请先调用 initDatabase()')
  return db
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

// 重新导出 Database 类型
export type { Database }
