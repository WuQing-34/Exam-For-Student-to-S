import { getDb, initDatabase } from '../src/models/db';

// 初始化数据库（加载 exam.db）
initDatabase();

const db = getDb();

console.log('=== exam 表结构 ===');
const columns = db.exec('PRAGMA table_info(exam)');
console.log(JSON.stringify(columns, null, 2));

console.log('\n=== exam 表记录数 ===');
const count = db.exec('SELECT COUNT(*) as cnt FROM exam');
console.log('总数:', count[0].values[0][0]);

console.log('\n=== 样本 exam 记录 ===');
const sample = db.exec('SELECT * FROM exam LIMIT 2');
console.log(JSON.stringify(sample, null, 2));
