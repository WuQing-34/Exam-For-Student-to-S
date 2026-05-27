# 在线考试系统 v3.0 — 产品文档（灰度上线版）

- **文档版本**：v3.0
- **创建日期**：2026-05-26
- **产品负责人**：齐活林（交付总监）
- **项目代号**：`online_exam_system`
- **技术栈**：Express + TypeScript + MySQL + Redis + PM2（后端）/ Vite + React + MUI + Tailwind CSS（前端）

---

## 1. 系统概述

### 1.1 产品目标

在线考试系统面向教育机构的短期班销售团队，支持：
- 销售批量导入学生 → 分配试卷 → 学生在线答题 → 自动判分 → 导出成绩报告
- S 班精准筛选（得分 ≥ 满分 60% 自动标记）
- 题库随机抽题组卷（5 选择 + 5 填空，满分 100）
- 草稿自动保存 + 防误点退出

### 1.2 v3.0 重大变更

| 维度 | v2.0（旧） | v3.0（新） |
|------|-----------|-----------|
| 数据库 | SQLite（sql.js WASM） | MySQL 8+（InnoDB, UTF8MB4） |
| 进程模型 | 单进程 | PM2 Cluster（instances: max） |
| Session 存储 | 内存 Map（单进程） | Redis（跨进程共享, TTL 24h） |
| 并发能力 | ~10 并发 | 数百并发（取决于 MySQL/Redis 配置） |
| 数据持久化 | 文件落盘（exam.db） | MySQL + Redis（自动持久化） |

---

## 2. 用户角色

| 角色 | 账号系统 | 核心权限 |
|------|---------|---------|
| Administrator | JWT Token | 全部管理端功能 |
| 短期班辅导（short_term_tutor） | JWT Token | 学生管理、分配试卷、查看成绩 |
| 考生（Student） | Cookie Session（Redis） | 注册、登录、答题、查分 |

---

## 3. 功能清单

### 3.1 管理端

| 功能 | API | 方法 |
|------|-----|------|
| 管理员登录 | `/api/admin/auth/login` | POST |
| 获取当前用户 | `/api/admin/auth/me` | GET |
| 管理员列表 | `/api/admin/auth/admins` | GET |
| 学生 CRUD | `/api/admin/students` | GET/POST/PUT/DELETE |
| 试卷管理 | `/api/admin/papers` | GET/POST/PUT/DELETE |
| 题库管理 | `/api/admin/question-bank` | GET/POST/PUT/DELETE |
| 题库批量删除 | `/api/admin/question-bank/batch` | DELETE |
| 分配试卷 | `/api/admin/assignments` | GET/POST |
| 考试记录 | `/api/admin/exams` | GET |
| 文件上传 | `/api/admin/upload` | POST |

### 3.2 考生端

| 功能 | API | 方法 |
|------|-----|------|
| 自助注册 | `/api/student/register` | POST |
| 登录 | `/api/student/login` | POST |
| 获取销售列表 | `/api/student/sales` | GET |
| 我的科目 | `/api/student/subjects` | GET |
| 开始考试 | `/api/student/exams/start` | POST |
| 保存草稿 | `/api/student/exams/:id/save` | POST |
| 提交答案 | `/api/student/exams/:id/submit` | POST |
| 获取考题 | `/api/student/exams/:id` | GET |
| 单科成绩 | `/api/student/exams/:id/result` | GET |
| 成绩汇总 | `/api/student/exams/results` | GET |

---

## 4. 系统架构

### 4.1 部署架构

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (反向代理)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐┌────┴─────┐┌────┴─────┐
        │  Worker 1 ││ Worker 2 ││ Worker N │
        │  (Node.js)││ (Node.js)││ (Node.js)│
        └─────┬─────┘└────┬─────┘└────┬─────┘
              │            │            │
              └────────────┼────────────┘
                           │
              ┌────────────┼────────────┐
              │                         │
        ┌─────┴─────┐            ┌──────┴──────┐
        │   MySQL   │            │    Redis    │
        │ (InnoDB)  │            │  (Session)  │
        └───────────┘            └─────────────┘
```

### 4.2 技术栈版本

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | 22+ | 运行时 |
| Express | 4.x | Web 框架 |
| TypeScript | 5.x | 类型安全 |
| MySQL | 8+ / 9.x | 关系型数据库 |
| Redis | 7+ | Session 缓存 |
| PM2 | 5+ | 进程管理 |
| mysql2 | 3.x | MySQL 驱动（连接池） |
| ioredis | 5.x | Redis 客户端 |
| jsonwebtoken | 9.x | JWT 认证 |
| bcryptjs | 2.x | 密码哈希 |

### 4.3 数据库表（9 张）

| 表名 | 说明 | 核心字段 |
|------|------|---------|
| admin | 管理员 | id, email, password_hash, name, role |
| student | 学生 | id, name, phone, grade, subjects, sales_id |
| paper | 试卷 | id, title, grade, subject, total_score, total_time |
| question | 题目 | id, paper_id, type, content, correct_answer, score |
| subject_section | 科目分区 | id, paper_id, subject, total_score |
| assignment | 分配 | id, student_id, paper_id, status |
| exam_record | 考试记录（旧版） | id, assignment_id, score, status |
| question_bank | 题库 | id, subject, type, content, correct_answer |
| student_exam | 学生考试（v2+） | id, student_id, subject, questions_json, score, status |

---

## 5. 部署指南

### 5.1 环境要求

- **服务器**：Linux（推荐 Ubuntu 22.04+），2 核 4G 起步
- **MySQL**：8.0+，推荐使用云数据库（如阿里云 RDS）
- **Redis**：7.0+，推荐使用云 Redis（如阿里云 Redis）
- **Node.js**：22.x LTS

### 5.2 环境变量

```bash
# .env 文件
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=exam_system
MYSQL_CONNECTION_LIMIT=20
MYSQL_CHARSET=utf8mb4

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=exam:
REDIS_SESSION_TTL=86400

JWT_SECRET=your_jwt_secret_here
PORT=3001
```

### 5.3 部署步骤

```bash
# 1. 安装依赖
cd backend && npm install

# 2. 编译 TypeScript
npm run build

# 3. 启动（PM2 Cluster 模式）
npm run start:cluster:prod

# 4. 查看状态
pm2 status
pm2 logs exam-system

# 5. 停止服务
pm2 stop exam-system
```

### 5.4 Nginx 配置示例

```nginx
upstream exam_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name exam.example.com;

    client_max_body_size 20M;

    location /api/ {
        proxy_pass http://exam_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        root /var/www/exam-frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 6. 灰度上线风险评估

### 6.1 风险矩阵

| 级别 | 风险 | 影响 | 缓解措施 | 负责人 |
|------|------|------|---------|-------|
| **P0** | MySQL 连接池耗尽 | 服务不可用 | 连接池限制 20，监控 `SHOW PROCESSLIST` | 运维 |
| **P0** | Redis 不可用 | 学生无法登录/答题 | Redis 持久化开启(AOF)，主从部署 | 运维 |
| **P1** | 题库数量不足导致无法开考 | 学生报错无法考试 | 上线前确认每科至少 10 选择+10 填空 | 产品 |
| **P1** | PM2 Worker 异常退出 | 部分请求失败 | PM2 自动重启，max_memory_restart: 512M | 运维 |
| **P1** | 旧版 SQLite 数据未迁移 | 学生看不到历史记录 | 迁移脚本 `scripts/migrate-data.sh` | 开发 |
| **P2** | 前端缓存旧 API 格式 | 数据显示异常 | 前端重新构建部署，清除 CDN 缓存 | 前端 |
| **P2** | Nginx 超时配置不当 | 长请求 504 | proxy_read_timeout 调至 120s | 运维 |

### 6.2 灰度计划建议

| 阶段 | 时间 | 范围 | 关注点 |
|------|------|------|--------|
| 阶段 1 | 第 1 天 | 内部测试（5-10 人） | 核心流程（登录→答题→提交→查分） |
| 阶段 2 | 第 2-3 天 | 单个销售团队（~50 人） | 并发稳定性、数据正确性 |
| 阶段 3 | 第 4-5 天 | 全量销售团队 | 性能监控、错误率 |

### 6.3 回滚方案

1. 保留旧版代码分支 `v2-sqlite`
2. MySQL 数据库保持独立，不影响旧版 SQLite
3. 如需回滚：切换 Nginx 指向后端 v2 + 前端 v2

---

## 7. 已修复的关键 Bug（测试中发现）

| Bug | 描述 | 修复方式 |
|-----|------|---------|
| LIMIT 参数化 | MySQL prepared statement 不支持 `LIMIT ?` | 改为模板字符串拼接整数值 |
| 多语句 DDL | `pool.execute()` 不支持多语句 | 改为逐条执行每个 CREATE TABLE |
| Redis 未初始化 | `initRedis()` 未在 app.ts 中调用 | 在 `initDatabase()` 后调用 `initRedis()` |
| ISO 时间格式 | `new Date().toISOString()` 不兼容 MySQL TIMESTAMP | 改用 `CURRENT_TIMESTAMP` |
| randomPick LIMIT | `ORDER BY RAND() LIMIT ?` 参数化失败 | 改为 `LIMIT ${count}` 拼接 |

---

## 8. 运维手册

### 8.1 健康检查

```bash
# 服务存活
curl http://localhost:3001/api/admin/auth/me

# MySQL 连接
mysql -u root -e "SELECT 1"

# Redis 连接
redis-cli PING

# PM2 状态
pm2 status
```

### 8.2 常用运维命令

```bash
# 查看日志
pm2 logs exam-system --lines 100

# 重启服务
pm2 restart exam-system

# 查看 MySQL 连接数
mysql -u root -e "SHOW PROCESSLIST" | wc -l

# 查看 Redis Session 数
redis-cli KEYS "exam:*" | wc -l

# 清理过期 Session
redis-cli SCAN 0 MATCH "exam:*" COUNT 100
```

### 8.3 备份策略

- **MySQL**：每日全量备份 + binlog 实时同步
- **Redis**：AOF 持久化已开启
- **上传文件**：`/uploads` 目录需定期备份

---

## 9. API 响应格式

### 成功响应
```json
{
  "code": 0,
  "message": "操作成功",
  "data": { ... }
}
```

### 错误响应
```json
{
  "code": 1000,
  "message": "错误描述",
  "data": null
}
```

### 常见错误码

| 错误码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1000 | 通用业务错误 |
| 1001 | 未登录/Token 过期 |
| 1003 | 资源不存在 |
| 2001 | 认证失败 |
| 4002 | 重复提交 |

---

## 10. 下一步优化方向

1. **管理端考试记录**：当前 `exam_record`（旧版分配模式）与 `student_exam`（新版自助模式）并存，需统一
2. **学生注册去重**：增加手机号唯一性校验
3. **题库批量导入**：Excel 批量导入功能需适配 MySQL
4. **WebSocket 实时通知**：考试状态变更推送
5. **数据统计面板**：管理端 Dashboard 展示关键指标
6. **MySQL 读写分离**：读操作走从库，提升并发能力
7. **Rate Limiting**：防止 API 滥用

---

*文档结束 — 齐活林（交付总监），2026-05-26*
