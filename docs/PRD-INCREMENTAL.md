# PRD 增量文档：多科合一试卷 + 自动分配

- **文档版本**：v1.1（增量）
- **创建日期**：2026-05-20
- **产品负责人**：许清楚（产品经理）
- **基于版本**：v1.0（`PRD.md`）
- **关联架构**：`ARCHITECTURE.md`

---

## 1. 变更概述

本次增量覆盖以下四个核心变更：

| 变更维度 | 原设计 | 新设计 |
|----------|--------|--------|
| 试卷模型 | 一张试卷对应一个科目 | 一张试卷包含语/数/英/物/化 5 科，化学仅初三；上传时不选科目 |
| 判分粒度 | 整卷一个总分 | 按科目分别计分，每科满分 100，合并展示 |
| 试卷分配 | 销售手动分配 | 系统按年级自动分配，销售可手动调整 |
| 用户科目字段 | 用户有"科目"多选字段 | 用户无科目字段（试卷天然覆盖全科） |

---

## 2. 受影响模块

| 模块 | 影响程度 | 说明 |
|------|----------|------|
| 试卷上传（前端 + 后端） | **高** — 重构 | 解析逻辑变更，按科目分 section 计分 |
| 试卷模型（DB + 类型） | **高** — 重构 | subject 字段移除；新增 subject_section 结构 |
| 判分服务 | **高** — 重构 | 按科目分组判分，输出 per-subject 分数 |
| 分配逻辑 | **高** — 新增 | 自动分配规则 + 手动覆盖 |
| 用户管理 | **中** — 简化 | subjects 字段保留但前端隐藏（向后兼容） |
| 考试数据查看 | **中** — 扩展 | 列表/详情增加 per-subject 分数列 |
| 用户端 | **低** — 扩展 | 结果页展示分科分数 |
| Word 导出 | **中** — 扩展 | 按科目分段导出 |
| 架构文档 | **中** — 更新 | 数据字典、API 响应、试卷格式约定 |

---

## 3. 新增 / 变更需求详细说明

### 3.1 试卷模型重构

#### 3.1.1 数据结构变更

**原 Paper 表：** 每张试卷有 `subject` 字段（单一科目）

**新 Paper 结构：** 试卷无单一 `subject`，改为内置 `sections`（科目分组）

```typescript
// 新增：SubjectSection（科目分段）
interface SubjectSection {
  subject: 'chinese' | 'math' | 'english' | 'physics' | 'chemistry'; // 科目枚举
  subject_name: string;        // 展示名，如"语文""数学"
  subject_order: number;       // 排序：1=语文, 2=数学, 3=英语, 4=物理, 5=化学
  total_score: number;         // 本科满分，固定 100
  question_count: number;     // 本科题目数量
  questions: Question[];       // 本科题目列表
}

// Question 结构不变，新增字段
interface Question {
  // ... 原有字段
  subject: 'chinese' | 'math' | 'english' | 'physics' | 'chemistry'; // 题目所属科目
  subject_section_id?: string; // 所属科目分段 ID（兼容用）
}

// Paper 结构变更
interface Paper {
  id: UUID;
  title: string;              // 试卷名称（自动提取或手动填写）
  grade: Grade;               // 适用年级：junior1/junior2/junior3
  // ❌ subject 字段移除
  // ✅ 新增
  subjects_included: Subject[]; // 包含科目列表，化学初三试卷才有 chemistry
  total_score: number;        // 总满分 = subjects_included.length × 100
  sections: SubjectSection[];  // 科目分段（JSON 存储）
  created_by: UUID;
  created_at: datetime;
}
```

#### 3.1.2 科目规则

| 科目 | 初一 | 初二 | 初三 |
|------|------|------|------|
| 语文 | ✅ | ✅ | ✅ |
| 数学 | ✅ | ✅ | ✅ |
| 英语 | ✅ | ✅ | ✅ |
| 物理 | ❌ | ✅ | ✅ |
| 化学 | ❌ | ❌ | ✅ |

- 每科满分固定 100 分
- 一套试卷可能包含 4 科（初一/初二）或 5 科（初三）
- 上传时系统根据年级自动识别化学题目是否存在；解析时若初三试卷无化学 section，报错提示

#### 3.1.3 数据库变更

```sql
-- 新增 subject_sections 表（存放科目分段）
CREATE TABLE IF NOT EXISTS subject_section (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id     INTEGER NOT NULL REFERENCES paper(id) ON DELETE CASCADE,
    subject      TEXT    NOT NULL,   -- chinese/math/english/physics/chemistry
    subject_name TEXT    NOT NULL,   -- 展示名
    subject_order INTEGER NOT NULL,  -- 排序
    total_score  INTEGER NOT NULL DEFAULT 100,
    question_count INTEGER NOT NULL DEFAULT 0,
    UNIQUE(paper_id, subject)
);

-- paper 表变更
ALTER TABLE paper DROP COLUMN subject;              -- 移除单科字段
ALTER TABLE paper ADD COLUMN subjects_included TEXT; -- JSON: ["chinese","math","english","physics","chemistry"]

-- question 表变更
ALTER TABLE question ADD COLUMN subject TEXT;       -- 题目所属科目

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_question_subject ON question(subject);
CREATE INDEX IF NOT EXISTS idx_section_paper ON subject_section(paper_id);
```

---

### 3.2 试卷文件格式规范（新增）

> 系统需按此规范解析 Excel / Word 文件；需提供标准模板供管理员下载。

#### 3.2.1 Excel 格式规范

**Sheet 名约定：**
- `试卷信息`：填写基本信息
- `语文` / `数学` / `英语` / `物理` / `化学`：各科单独一个 Sheet

**Sheet1：试卷信息**

| 字段 | 示例 | 说明 |
|------|------|------|
| 试卷标题 | 2026年S班入学考核 | 必填 |
| 适用年级 | 初一 / 初二 / 初三 | 必填 |
| 包含科目 | 语文,数学,英语,物理,化学 | 初一/初二不填化学 |

**各科目 Sheet（如"数学"）：**

| 题号 | 题型 | 题目内容 | 选项A | 选项B | 选项C | 选项D | 正确答案 | 分值 |
|------|------|---------|-------|-------|-------|-------|---------|------|
| 1 | 选择题 | 化简：$\frac{2}{3}+\frac{1}{4}$ | $\frac{5}{7}$ | $\frac{11}{12}$ | $\frac{3}{7}$ | $\frac{1}{2}$ | B | 5 |
| 2 | 填空题 | 计算：$\frac{2}{3} \times \frac{9}{4}=$____ | — | — | — | — | 3/2 | 5 |
| 3 | 简答题 | 请证明... | — | — | — | — | 略 | 10 |

**规则：**
- 每科题目分值之和必须为 100 分（允许±0）
- 若某科总分不为 100，上传时提示"数学总分 95，不等于 100，请调整后重新上传"
- 初三试卷若缺少化学 Sheet，提示"检测到初三试卷但未找到化学题目，请补充后重新上传"
- 初一/初二若出现化学 Sheet，忽略并提示"化学科目已忽略（不适用于初一）"

#### 3.2.2 Word 格式规范

**段落结构约定（每个科目为一个标题区块）：**

```
2026年S班入学考核
适用年级：初三

# 语文（满分100分）
1. 选择题
题目内容...
A. 选项A
B. 选项B
C. 选项C
D. 选项D
答案：B
分值：5

2. 填空题
题目内容...
答案：xxx
分值：5

# 数学（满分100分）
...

# 英语（满分100分）
...

# 物理（满分100分）
...

# 化学（满分100分）
...
```

**识别规则：**
- 以 `# ` 开头的行作为科目标题，如 `# 语文（满分100分）`
- 初三试卷缺少 `# 化学` 时，按 Excel 规则报错
- 初一/初二出现 `# 化学` 时忽略并提示

---

### 3.3 判分规则变更

#### 3.3.1 判分逻辑

**原逻辑：** 比对全部题目答案，输出 `total_score`

**新逻辑：** 按科目分组判分，输出每科得分 + 总得分

```typescript
interface GradingResult {
  total_score: number;        // 总分（各科之和）
  total_score_rate: number;  // 总分率（总分 / 500 或 400）
  subjects: {
    subject: Subject;
    subject_name: string;
    score: number;           // 本科得分
    full_score: number;      // 本科满分（100）
    score_rate: number;       // 本科得分率
    questions_answered: number;
    questions_correct: number;
  }[];
  s_class_qualified: boolean; // true if all subjects >= 60%
}
```

#### 3.3.2 S 班资格判定

**新规则：** 所有参考科目中，每科得分率均 ≥ 60% → 符合 S 班资格

| 场景 | 语文 | 数学 | 英语 | 物理 | 化学 | 符合 S 班？ |
|------|------|------|------|------|------|-------------|
| 初一：4科 | 70% | 55% | 80% | 90% | — | ❌（数学<60%） |
| 初二：4科 | 70% | 70% | 70% | 70% | — | ✅ |
| 初三：5科 | 60% | 60% | 60% | 60% | 60% | ✅ |

#### 3.3.3 ExamRecord 变更

```typescript
// 新增字段
interface ExamRecord {
  id: UUID;
  assignment_id: UUID;
  start_at: datetime;
  submitted_at: datetime;
  duration_seconds: number;
  total_score: number;          // 总得分
  total_full_score: number;     // 总满分（400 或 500）
  score_rate: number;           // 总得分率
  // ❌ achieved_score 字段保留但改名 alias
  subject_scores: SubjectScore[]; // 新增：分科得分
  s_class_qualified: boolean;   // 新增：S班资格
  answers: Answer[];
}

interface SubjectScore {
  subject: Subject;
  subject_name: string;
  score: number;      // 本科得分
  full_score: number; // 本科满分：100
  score_rate: number;
}
```

---

### 3.4 自动分配规则

#### 3.4.1 分配策略

| 触发时机 | 触发动作 | 自动分配逻辑 |
|----------|----------|-------------|
| 用户导入完成 | 批量导入用户 | 按年级自动分配最新版本对应年级试卷 |
| 用户编辑年级 | 修改年级 | 重新匹配最新版本试卷（如有变化） |
| 新试卷上传 | 上传成功 | 自动为所有**未开始答题**且年级匹配的用户创建分配记录 |

**版本说明：**
- "最新版本"指该年级下 `created_at` 最新的那张试卷
- 若该年级尚无试卷，不自动分配，等待管理员手动分配

#### 3.4.2 手动覆盖

- 销售可在分配页手动为特定用户分配其他试卷
- 手动分配优先级高于自动分配：同一用户的同一试卷，手动分配记录优先
- 若用户已答题（`in_progress` 或 `completed`），不允许修改分配（需管理员强制重置）

#### 3.4.3 自动分配 API 变更

```typescript
// 新增后端服务方法
class AssignmentService {
  // 自动分配：用户导入/编辑后调用
  autoAssignForStudent(studentId: number): Assignment[];

  // 批量自动分配：试卷上传后调用
  autoAssignForNewPaper(paperId: number): { assigned: number };

  // 取消分配：用户编辑时年级变化，重新分配前调用
  cancelPendingAssignments(studentId: number): void;
}
```

---

### 3.5 用户端影响

#### 3.5.1 用户登录（不变）

登录方式不变，仍为孩子姓名 + 年级 + 手机号。

#### 3.5.2 试卷列表页（微调）

- 不再显示"科目"列（试卷天然包含全部科目）
- 状态列不变

#### 3.5.3 答题页（不变）

题目展示顺序：按语文 → 数学 → 英语 → 物理 → 化学排列（仅展示该年级包含的科目）。

#### 3.5.4 结果页（重构）

**原设计：**
```
您的分数是：xx 分
```

**新设计：**

```
        您的考试成绩

总分：285 / 400 分（得分率 71.3%）

语文  72 / 100  ████████░░  72%
数学  65 / 100  ██████▌░░░  65%
英语  80 / 100  ████████░░  80%
物理  68 / 100  ██████▊░░░  68%

❌ 您的成绩未达到 S 班录取标准（各科需达到 60%）

或

✅ 恭喜！您已达到 S 班录取标准
```

**S 班资格提示：**
- 所有参考科目得分率均 ≥ 60% → 绿色高亮 + "恭喜！"
- 任一科目 < 60% → 红色提示 + 未达标科目高亮

---

## 4. 管理端页面变更

### 4.1 试卷上传页（重构）

**上传弹窗变更：**
- ❌ 移除"科目选择"下拉
- 新增：自动识别 Sheet 名称，列表展示识别到的科目和题目数
- 列表展示：科目、识别题目数、分值合计（需=100）
- 解析失败时按科目逐一提示错误位置

### 4.2 试卷列表页（微调）

- ❌ 移除"科目"列
- ✅ 新增"包含科目"列（以 tag 展示，如：语 数 英 物）

### 4.3 分配试卷页（重构为手动调整页）

**原功能：** 销售主动为用户分配试卷

**新功能：**
- 页面标题改为"试卷分配管理"
- 默认视图：展示所有用户的当前分配状态（年级、分配试卷、操作）
- 支持按年级筛选
- 异常状态高亮：
  - 黄色："用户年级无对应试卷，请手动分配"
  - 绿色："已自动分配"
  - 蓝色："已手动分配"
- 单个用户可点击"更换试卷"手动覆盖

### 4.4 考试数据页（扩展）

**列表新增列：**

| 列名 | 说明 |
|------|------|
| 语文 | 得分/100 |
| 数学 | 得分/100 |
| 英语 | 得分/100 |
| 物理 | 得分/100（初一不显示） |
| 化学 | 得分/100（仅初三） |
| S班资格 | ✅ / ❌ 标记 |

**筛选新增：**
- S 班资格筛选（全部 / 符合 / 不符合）

**详情弹窗扩展：**
- 每科分组展示答题情况
- 每科有独立的正确率摘要

### 4.5 用户管理页（简化）

- 学生导入模板中"科目"字段保留但标记"已废弃，自动按年级分配"
- 前端编辑用户时隐藏"科目"字段

---

## 5. 数据迁移说明

> 以下为 v1.0 → v1.1 升级时的数据迁移方案（一次性脚本）

```sql
-- 1. 新增字段
ALTER TABLE paper ADD COLUMN subjects_included TEXT DEFAULT '["chinese","math","english","physics"]';
ALTER TABLE question ADD COLUMN subject TEXT;

-- 2. 迁移旧试卷数据（假设旧数据均为4科，化学后续手动补充）
UPDATE paper SET subjects_included =
  CASE grade
    WHEN 'junior3' THEN '["chinese","math","english","physics","chemistry"]'
    ELSE '["chinese","math","english","physics"]'
  END;

-- 3. 旧 question 表无 subject 字段，需重新上传试卷
-- 建议：旧试卷标记为"待升级"，提示管理员重新上传新格式

-- 4. 新增表
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

-- 5. 新增 ExamRecord 扩展字段
ALTER TABLE exam_record ADD COLUMN subject_scores TEXT; -- JSON: SubjectScore[]
ALTER TABLE exam_record ADD COLUMN s_class_qualified INTEGER DEFAULT 0; -- 0/1

-- 6. 旧 exam_record 数据：subject_scores 设为 null，s_class_qualified 待下次答题后更新
```

---

## 6. API 响应变更

### 6.1 试卷相关

```typescript
// GET /api/admin/papers/:id
// Response 变更
{
  code: 0,
  data: {
    paper: {
      id, title, grade,
      subjects_included: ['chinese','math','english','physics','chemistry'], // 新
      total_score: 500,  // 更新为 400 或 500
    },
    sections: [  // 新增：按科目分组
      { subject: 'chinese', subject_name: '语文', subject_order: 1, total_score: 100, questions: [...] },
      { subject: 'math', subject_name: '数学', subject_order: 2, total_score: 100, questions: [...] },
      // ...
    ]
  }
}
```

### 6.2 考试记录相关

```typescript
// GET /api/admin/exams
// Response 列表项新增字段
{
  list: [{
    student_name, grade, paper_title,
    subject_scores: [  // 新增
      { subject: 'chinese', score: 72, full_score: 100 },
      { subject: 'math', score: 65, full_score: 100 },
      { subject: 'english', score: 80, full_score: 100 },
      { subject: 'physics', score: 68, full_score: 100 },
    ],
    s_class_qualified: false,  // 新增
    total_score: 285,
    score_rate: 0.7125,
  }]
}

// GET /api/student/exams/:id/result
// Response 变更
{
  code: 0,
  data: {
    total_score: 285,
    total_full_score: 400,
    score_rate: 0.7125,
    s_class_qualified: false,
    subject_scores: [
      { subject: 'chinese', subject_name: '语文', score: 72, full_score: 100, score_rate: 0.72 },
      // ...
    ]
  }
}
```

---

## 7. 非功能性需求补充

### 7.1 试卷解析性能

- 5 科目合计约 200~300 道题，解析时间可能达 15 秒（相比原来翻倍）
- 建议：前端显示预估时间，后端超时设置为 30 秒

### 7.2 Word 导出性能

- 5 科目成绩单内容翻倍，导出时间可能达 5 秒
- 后端生成 .docx 时按科目分页，确保可读性

### 7.3 判分性能

- 每科约 40~60 道题 × 5 科，判分涉及 200~300 次比对
- 预计判分耗时 < 1 秒（纯内存运算），用户体验影响较小

---

## 8. 待确认问题

| # | 问题 | 影响范围 | 建议 |
|---|------|----------|------|
| 1 | **旧试卷处理**：v1.0 上传的旧格式试卷（单科）是否需要迁移脚本批量转换，还是直接废弃让管理员重新上传？ | 数据迁移 | 建议废弃 + 提示重新上传，成本低且避免解析错误 |
| 2 | **化学初三强制**：若管理员上传初三试卷但未包含化学，系统是否直接拒绝上传，还是允许上传后告知"化学暂缺"？ | 试卷上传逻辑 | 建议初三必须含化学，否则拒绝上传 |
| 3 | **分科得分率 S 班判定**：各科均需 60%，还是总分率达到 60% 即可？ | 判分逻辑 | 当前设计为各科均需 60%，请确认 |
| 4 | **简答题跨科目分值**：简答题按科目出题，分值计入该科。是否需要在每科内部再细分大题/小题分值？ | 试卷格式 | 当前不细分，统一按"分值"字段 |
| 5 | **自动分配触发时机**：用户导入时自动分配，用户编辑年级时重新分配；是否需要在用户登录后自动触发分配检查？ | 分配逻辑 | 建议在"我的试卷"加载时检查，未分配则提示 |
| 6 | **手动分配优先级**：销售手动分配 vs 自动分配的冲突处理规则。是否允许同一用户同一年级有多张试卷？ | 分配逻辑 | 建议允许，但用户端只展示最新一张（待确认） |
| 7 | **旧 ExamRecord 数据**：v1.0 已有的考试记录，`subject_scores` 字段如何回填？是否追溯判分？ | 数据迁移 | 建议不回填，旧记录只展示总分，分科为空 |
| 8 | **S 班资格可配置**：各科资格线（当前 60%）是否需要在后台可配置（如：化学 50%，其他 60%）？ | 判分规则 | 当前固定 60%，扩展为可配置可作为 P2 功能 |
