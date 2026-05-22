import { getDb, initDatabase, saveDatabase } from '../src/models/db';

async function fix() {
  await initDatabase();
  const db = getDb();

  console.log('=== 检查 exam_record 表结构 ===');
  const columns = db.exec('PRAGMA table_info(exam_record)');
  console.log(JSON.stringify(columns, null, 2));

  const existingCols = new Set(
    (columns[0]?.values || []).map((row: any[]) => row[1] as string)
  );
  console.log('\n现有列:', Array.from(existingCols));

  const needed = [
    { name: 'subject_scores', type: 'TEXT' },
    { name: 's_class_qualified', type: 'INTEGER DEFAULT 0' },
    { name: 'total_full_score', type: 'INTEGER' },
  ];

  for (const col of needed) {
    if (!existingCols.has(col.name)) {
      console.log(`\n添加列: ${col.name} ${col.type}`);
      try {
        db.run(`ALTER TABLE exam_record ADD COLUMN ${col.name} ${col.type};`);
        console.log(`✅ 成功添加 ${col.name}`);
      } catch (e: any) {
        console.log(`❌ 添加 ${col.name} 失败:`, e.message);
      }
    } else {
      console.log(`列已存在: ${col.name}`);
    }
  }

  saveDatabase();
  console.log('\n✅ 数据库已保存');
}

fix().catch(console.error);
