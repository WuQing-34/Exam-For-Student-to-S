import { getDb } from '../src/models/db';

const db = getDb();

console.log('=== question 表结构 ===');
const columns = db.exec('PRAGMA table_info(question)');
console.log(JSON.stringify(columns, null, 2));

console.log('\n=== 题目总数 ===');
const count = db.exec('SELECT COUNT(*) as cnt FROM question');
console.log('总数:', count[0].values[0][0]);

console.log('\n=== 样本题目 (前3条) ===');
const sample = db.exec('SELECT * FROM question LIMIT 3');
console.log(JSON.stringify(sample, null, 2));

console.log('\n=== subject 字段分布 ===');
const subjDist = db.exec('SELECT subject, COUNT(*) as cnt FROM question GROUP BY subject');
console.log(JSON.stringify(subjDist, null, 2));
