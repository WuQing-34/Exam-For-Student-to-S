import { getDb, initDatabase, saveDatabase } from '../src/models/db';
import { examModel } from '../src/models/examModel';
import { assignmentModel } from '../src/models/assignmentModel';
import { paperModel } from '../src/models/paperModel';
import { examService } from '../src/services/examService';

async function regradeAll() {
  await initDatabase();
  const db = getDb();

  // 找出所有已提交的考试记录
  const result = db.exec("SELECT id, assignment_id, answers FROM exam_record WHERE status = 'submitted'");
  if (!result || result.length === 0) {
    console.log('没有已提交的考试记录');
    return;
  }

  const { columns, values } = result[0];
  console.log(`找到 ${values.length} 条已提交记录，开始重新判分...\n`);

  for (const row of values) {
    const record: Record<string, any> = {};
    columns.forEach((col, i) => { record[col] = row[i]; });

    const examRecordId = record.id as number;
    const answersStr = record.answers as string;

    if (!answersStr) {
      console.log(`记录 #${examRecordId}: 无答案数据，跳过`);
      continue;
    }

    const answers = JSON.parse(answersStr);
    const assignment = assignmentModel.findById(record.assignment_id as number);
    if (!assignment) {
      console.log(`记录 #${examRecordId}: 分配记录不存在，跳过`);
      continue;
    }

    // 用修复后的逻辑重新判分
    const gradingResult = examService.gradeAnswersBySubject(answers, assignment.paper_id);

    console.log(`记录 #${examRecordId}: 原分=${record.score}, 新分=${gradingResult.total_score}`);
    console.log(`  分科: ${JSON.stringify(gradingResult.subject_scores.map(s => `${s.subject_name}:${s.score}/${s.full_score}`))}`);
    console.log(`  S班资格: ${gradingResult.s_class_qualified ? '是' : '否'}`);

    // 更新记录
    examModel.submit(examRecordId, {
      answers: answersStr,
      score: gradingResult.total_score,
      subject_scores: JSON.stringify(gradingResult.subject_scores),
      s_class_qualified: gradingResult.s_class_qualified ? 1 : 0,
      total_full_score: gradingResult.total_full_score,
    });
  }

  saveDatabase();
  console.log('\n✅ 所有记录已重新判分并保存');
}

regradeAll().catch(console.error);
