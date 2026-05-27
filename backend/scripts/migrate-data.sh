#!/bin/bash
# 从 SQLite 导出数据到 MySQL，按 MySQL 列顺序生成 INSERT 语句
set -e

DB_DIR="$(cd "$(dirname "$0")/../data" && pwd)"
SQLITE_DB="$DB_DIR/exam.db"
SQL_FILE="/tmp/migrate_exam_data.sql"

echo "📦 从 SQLite 导出数据..."
> "$SQL_FILE"

# 关闭外键检查
echo "SET FOREIGN_KEY_CHECKS = 0;" >> "$SQL_FILE"

# ============ admin: MySQL order = id, email, password_hash, name, role, center, team, created_at
sqlite3 "$SQLITE_DB" <<'EOF' >> "$SQL_FILE"
.mode insert admin_temp
SELECT id, email, password_hash, name, role, center, team, created_at FROM admin;
EOF
# Replace table name back to admin
sed -i '' 's/INSERT INTO admin_temp/INSERT INTO admin/' "$SQL_FILE"

# ============ student: MySQL order = id, name, phone, grade, subjects, sales_id, created_at
sqlite3 "$SQLITE_DB" <<'EOF' >> "$SQL_FILE"
.mode insert student_temp
SELECT id, name, phone, grade, subjects, sales_id, created_at FROM student;
EOF
sed -i '' 's/INSERT INTO student_temp/INSERT INTO student/' "$SQL_FILE"

# ============ assignment: column order same
sqlite3 "$SQLITE_DB" <<'EOF' >> "$SQL_FILE"
.mode insert assignment
SELECT * FROM assignment;
EOF

# ============ exam_record: MySQL order = id, assignment_id, answers, score, subject_scores, s_class_qualified, total_full_score, status, started_at, submitted_at
sqlite3 "$SQLITE_DB" <<'EOF' >> "$SQL_FILE"
.mode insert exam_record_temp
SELECT id, assignment_id, answers, score, subject_scores, s_class_qualified, total_full_score, status, started_at, submitted_at FROM exam_record;
EOF
sed -i '' 's/INSERT INTO exam_record_temp/INSERT INTO exam_record/' "$SQL_FILE"

# ============ student_exam: column order same
sqlite3 "$SQLITE_DB" <<'EOF' >> "$SQL_FILE"
.mode insert student_exam
SELECT * FROM student_exam;
EOF

# 开启外键检查
echo "SET FOREIGN_KEY_CHECKS = 1;" >> "$SQL_FILE"

# 先清空 MySQL
echo "🧹 清空 MySQL 表..."
mysql -u root exam_system -e "SET FOREIGN_KEY_CHECKS=0; TRUNCATE TABLE student_exam; TRUNCATE TABLE exam_record; TRUNCATE TABLE assignment; TRUNCATE TABLE student; TRUNCATE TABLE admin; SET FOREIGN_KEY_CHECKS=1;"

# 导入
echo "📥 导入 MySQL..."
mysql -u root exam_system < "$SQL_FILE"

# 验证
echo ""
echo "✅ 迁移完成，验证行数:"
for t in admin student assignment exam_record student_exam; do
  count=$(mysql -u root exam_system -N -e "SELECT COUNT(*) FROM $t")
  echo "  $t: $count rows"
done

rm "$SQL_FILE"
