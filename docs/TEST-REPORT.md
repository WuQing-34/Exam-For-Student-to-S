# 在线考试系统 - 测试报告 (第二轮)

## 测试环境

- **测试日期**: 2026-05-20
- **测试工程师**: 严过关（QA 工程师）
- **后端地址**: http://localhost:3001
- **前端地址**: http://localhost:5173
- **数据库**: SQLite (sql.js)

---

## 一、修复验证结果

### Bug #1: 注册接口权限问题 - ✅ 已修复（但有新问题）

| 测试项 | 预期 | 实际 | 状态 |
|--------|------|------|------|
| 公开注册 tutor 角色 | 成功 | `{"code":0,"message":"注册成功"...}` | ✅ |
| 公开注册 admin 角色 | 返回 403 | `{"code":1002,"message":"管理员账户需由已有管理员创建"...}` | ✅ |

**修复验证**: ✅ 通过

**新发现的问题**: 修复创建了"先有鸡还是先有蛋"问题：
- Admin 角色需要已有管理员创建
- 但当前没有提供创建第一个管理员的接口
- 需要通过数据库直接插入或添加管理员初始化接口

---

### Bug #2: 前端导入路径错误 - ✅ 已修复

| 文件 | 原路径 | 修复后 | 状态 |
|------|--------|--------|------|
| LoginPage.tsx | `../../../api/exam` | `../../api/exam` | ✅ |
| ExamPage.tsx | `../../../api/exam` | `../../api/exam` | ✅ |
| PaperListPage.tsx | `../../../api/exam` | `../../api/exam` | ✅ |
| ResultPage.tsx | `../../../api/exam` | `../../api/exam` | ✅ |

**修复验证**: ✅ 通过

---

### Bug #3: Axios 响应类型不一致 - ✅ 已修复

| 文件 | 修复方式 | 状态 |
|------|----------|------|
| api/index.ts | 拦截器返回完整 response | ✅ |
| api/paper.ts | 类型改为 `ApiResponse<...>` | ✅ |
| pages 使用方式 | 使用 `res.data.code` 和 `res.data.data` | ✅ |

**修复验证**: ✅ 通过

---

### Bug #4: MUI margin 属性 - ⚠️ 部分修复

仍有 2 处使用 `margin="normal"` 导致编译错误：
- `src/pages/admin/user/UserListPage.tsx:237`
- `src/pages/exam/LoginPage.tsx:83`

---

## 二、API 功能测试

### 管理端 API - 11/11 通过

| 测试项 | 状态 |
|--------|------|
| 管理员登录 | ✅ |
| 获取当前用户 | ✅ |
| 上传试卷 | ✅ |
| 试卷预览 | ✅ |
| 新增考生 | ✅ |
| 分配试卷 | ✅ |

### 考生端 API - 6/6 通过

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 考生登录 | ✅ | Cookie session 正常工作 |
| 开始考试 | ✅ | |
| 获取答题内容 | ✅ | **安全验证**: 不含 `correct_answer` |
| 提交答案 | ✅ | 自动判分正常 |
| 查看成绩 | ✅ | |

### 安全验证 - ✅ 通过

- ✅ 试卷预览不含 `correct_answer` 字段
- ✅ 考生答题内容不含 `correct_answer` 字段

---

## 三、前端编译测试

### TypeScript 错误 - 9 个

| 错误类型 | 数量 | 严重程度 |
|----------|------|----------|
| 未使用导入 (TS6133) | 6 | 低 |
| MUI 类型错误 (TS2322) | 2 | 中 |
| 类型不匹配 (TS2345) | 1 | 中 |

**关键错误**:

1. **MUI margin 属性错误** (TS2322)
   - `src/pages/admin/user/UserListPage.tsx:237`
   - `src/pages/exam/LoginPage.tsx:83`
   - `margin="normal"` 应为 `margin="dense"`

2. **AxiosResponse<Blob> 类型问题** (TS2345)
   - `src/pages/admin/exam/ExamDataPage.tsx:97`
   - 导出 Word 文件时类型不匹配

3. **参数类型问题** (TS2345)
   - `src/pages/exam/ExamPage.tsx:124`
   - `number | null` 不能赋值给 `number`

---

## 四、总体评估

### 修复完成情况

| Bug # | 描述 | 状态 | 备注 |
|-------|------|------|------|
| #1 | 注册权限问题 | ✅ 已修复 | 需添加管理员初始化机制 |
| #2 | 导入路径错误 | ✅ 已修复 | |
| #3 | Axios 类型不一致 | ✅ 已修复 | |
| #4 | MUI margin 属性 | ⚠️ 部分修复 | 2 处仍需修复 |

### API 功能验证

| 模块 | 通过率 |
|------|--------|
| 管理端 API | 100% (11/11) |
| 考生端 API | 100% (6/6) |
| 安全验证 | 100% |

### 前端编译

- **状态**: ❌ 仍有错误
- **通过率**: 0% (无法通过编译)

---

## 五、智能路由判定

### 判定结果: **Engineer** (需继续修复)

剩余问题：

1. **Bug #4 (未完成)**: MUI `margin` 属性错误
   - 文件: `src/pages/admin/user/UserListPage.tsx:237`
   - 文件: `src/pages/exam/LoginPage.tsx:83`
   - 修复: `margin="normal"` → `margin="dense"` 或移除

2. **新问题**: 导出 Word 文件类型错误
   - 文件: `src/pages/admin/exam/ExamDataPage.tsx:97`
   - 需要: 类型断言或修改处理逻辑

3. **新问题**: 参数类型不匹配
   - 文件: `src/pages/exam/ExamPage.tsx:124`
   - 需要: 添加 null 检查

---

## 六、测试报告总结

### 本轮验证
- **后端 API 测试**: 17/17 通过 ✅
- **前端编译测试**: 部分通过 ⚠️
- **安全验证**: 全部通过 ✅

### 建议
1. 修复剩余的 MUI 类型错误和参数类型问题
2. 添加管理员初始化接口或数据库种子脚本
3. 清理未使用的导入（可选，提高代码质量）
