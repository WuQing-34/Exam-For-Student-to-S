import mysql from 'mysql2/promise'
import { config } from '../config'

let pool: mysql.Pool | null = null

export async function initDatabase(): Promise<mysql.Pool> {
  if (pool) return pool

  // 先创建数据库（如果不存在）
  const initConn = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
  })
  await initConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await initConn.end()

  // 创建连接池
  pool = mysql.createPool(config.mysql)

  // 执行 DDL 创建所有表（逐条执行，确保兼容性）
  const tables = [
    `CREATE TABLE IF NOT EXISTS admin (
      id           INT PRIMARY KEY AUTO_INCREMENT,
      email        VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name         VARCHAR(100) NOT NULL,
      role         VARCHAR(50) NOT NULL DEFAULT 'tutor',
      center       VARCHAR(100),
      team         VARCHAR(100),
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS student (
      id         INT PRIMARY KEY AUTO_INCREMENT,
      name       VARCHAR(100) NOT NULL,
      phone      VARCHAR(20) NOT NULL,
      grade      VARCHAR(50) NOT NULL,
      subjects   TEXT,
      sales_id   INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY idx_student_unique (name, phone, grade),
      INDEX idx_student_grade (grade),
      INDEX idx_student_sales (sales_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS paper (
      id                INT PRIMARY KEY AUTO_INCREMENT,
      title             VARCHAR(255) NOT NULL,
      grade             VARCHAR(50) NOT NULL,
      subject           VARCHAR(50) NOT NULL,
      total_score       INT NOT NULL DEFAULT 0,
      total_time        INT NOT NULL DEFAULT 60,
      subjects_included TEXT,
      total_full_score  INT,
      created_by        INT,
      created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_paper_grade (grade),
      INDEX idx_paper_subject (subject),
      FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS question (
      id             INT PRIMARY KEY AUTO_INCREMENT,
      paper_id       INT NOT NULL,
      type           VARCHAR(20) NOT NULL,
      content        TEXT NOT NULL,
      options        TEXT,
      correct_answer TEXT NOT NULL,
      score          INT NOT NULL DEFAULT 5,
      order_num      INT NOT NULL DEFAULT 0,
      subject        VARCHAR(50),
      INDEX idx_question_paper (paper_id),
      INDEX idx_question_subject (subject),
      FOREIGN KEY (paper_id) REFERENCES paper(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS subject_section (
      id             INT PRIMARY KEY AUTO_INCREMENT,
      paper_id       INT NOT NULL,
      subject        VARCHAR(50) NOT NULL,
      subject_name   VARCHAR(100) NOT NULL,
      subject_order  INT NOT NULL,
      total_score    INT NOT NULL DEFAULT 100,
      question_count INT NOT NULL DEFAULT 0,
      UNIQUE KEY idx_section_unique (paper_id, subject),
      INDEX idx_section_paper (paper_id),
      FOREIGN KEY (paper_id) REFERENCES paper(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS assignment (
      id          INT PRIMARY KEY AUTO_INCREMENT,
      student_id  INT NOT NULL,
      paper_id    INT NOT NULL,
      status      VARCHAR(20) NOT NULL DEFAULT 'pending',
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY idx_assignment_unique (student_id, paper_id),
      INDEX idx_assignment_student (student_id),
      FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
      FOREIGN KEY (paper_id) REFERENCES paper(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS exam_record (
      id                INT PRIMARY KEY AUTO_INCREMENT,
      assignment_id     INT NOT NULL,
      answers           TEXT,
      score             INT,
      subject_scores    TEXT,
      s_class_qualified TINYINT DEFAULT 0,
      total_full_score  INT,
      status            VARCHAR(20) NOT NULL DEFAULT 'in_progress',
      started_at        TIMESTAMP NULL,
      submitted_at      TIMESTAMP NULL,
      INDEX idx_exam_assignment (assignment_id),
      FOREIGN KEY (assignment_id) REFERENCES assignment(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS question_bank (
      id             INT PRIMARY KEY AUTO_INCREMENT,
      subject        VARCHAR(50) NOT NULL,
      type           VARCHAR(20) NOT NULL,
      content        TEXT NOT NULL,
      options        TEXT,
      correct_answer TEXT NOT NULL,
      created_by     INT,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_question_bank_subject (subject),
      INDEX idx_question_bank_type (type),
      FOREIGN KEY (created_by) REFERENCES admin(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

    `CREATE TABLE IF NOT EXISTS student_exam (
      id             INT PRIMARY KEY AUTO_INCREMENT,
      student_id     INT NOT NULL,
      subject        VARCHAR(50) NOT NULL,
      questions_json TEXT,
      answers_json   TEXT,
      score          INT,
      full_score     INT DEFAULT 100,
      status         VARCHAR(20) DEFAULT 'pending',
      started_at     TIMESTAMP NULL,
      submitted_at   TIMESTAMP NULL,
      UNIQUE KEY idx_student_exam_unique (student_id, subject),
      INDEX idx_student_exam_student (student_id),
      INDEX idx_student_exam_subject (subject),
      FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ]

  for (const sql of tables) {
    await pool.execute(sql)
  }

  console.log('✅ MySQL 数据库初始化完成')
  return pool
}

export function getPool(): mysql.Pool {
  if (!pool) throw new Error('数据库未初始化，请先调用 initDatabase()')
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
