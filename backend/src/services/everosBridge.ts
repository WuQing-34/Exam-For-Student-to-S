/**
 * EverOS 桥接层 — TypeScript 侧
 * ==============================
 * 通过子进程调用 Python bridge.py 来与 EverOS API 交互。
 *
 * 设计原则：
 * - 懒初始化：首次调用时启动 Python 进程，保持长连接
 * - 请求-响应：每行 JSON 对应一个请求/响应
 * - 优雅降级：Python 不可用时不影响主流程
 */

import { spawn, ChildProcess } from 'child_process'
import path from 'path'

// CJS 兼容路径解析（项目使用 CommonJS 模块）
const BRIDGE_SCRIPT = path.resolve(__dirname, '../../everos/bridge.py')
const PYTHON_BIN = path.resolve(__dirname, '../../../.venv-everos/bin/python3')

interface EverOSRequest {
  action: string
  params: Record<string, unknown>
}

interface EverOSResponse {
  error?: string
  [key: string]: unknown
}

class EverOSBridge {
  private process: ChildProcess | null = null
  private pendingRequests = new Map<string, {
    resolve: (value: EverOSResponse) => void
    reject: (reason: Error) => void
  }>()
  private requestId = 0
  private buffer = ''
  private initialized = false
  private initError: Error | null = null

  /**
   * 启动 Python 桥接进程（懒加载）
   */
  private async ensureProcess(): Promise<ChildProcess> {
    if (this.initError) throw this.initError
    if (this.process) return this.process

    return new Promise((resolve, reject) => {
      try {
        const env = {
          ...process.env,
          EVEROS_API_KEY: process.env.EVEROS_API_KEY || 'aa395619-55e6-473e-8f23-b9af05010b20',
        }

        this.process = spawn(PYTHON_BIN, [BRIDGE_SCRIPT], {
          env,
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        this.process.stdout?.on('data', (data: Buffer) => {
          this.buffer += data.toString()
          this.processBuffer()
        })

        this.process.stderr?.on('data', (data: Buffer) => {
          console.warn('[EverOS bridge stderr]', data.toString().trim())
        })

        this.process.on('error', (err) => {
          this.initError = err
          this.rejectAll(new Error(`EverOS bridge process error: ${err.message}`))
        })

        this.process.on('close', (code) => {
          if (code !== 0 && !this.initialized) {
            const msg = `EverOS bridge exited with code ${code}`
            this.initError = new Error(msg)
            this.rejectAll(new Error(msg))
          }
        })

        // 发送 ping 测试连通性
        this.sendRequest('ping', {})
          .then(() => {
            this.initialized = true
            resolve(this.process!)
          })
          .catch(reject)
      } catch (err) {
        this.initError = err as Error
        reject(err)
      }
    })
  }

  private processBuffer() {
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() || '' // 最后一行可能不完整，保留

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const resp: EverOSResponse = JSON.parse(line)
        // 当前是单请求-单响应模式，从 pending 队列取出第一个
        const [key] = this.pendingRequests.keys()
        if (key) {
          const entry = this.pendingRequests.get(key)!
          this.pendingRequests.delete(key)
          if (resp.error) {
            entry.reject(new Error(resp.error))
          } else {
            entry.resolve(resp)
          }
        }
      } catch {
        console.warn('[EverOS bridge] 无法解析响应:', line)
      }
    }
  }

  private rejectAll(err: Error) {
    for (const [, entry] of this.pendingRequests) {
      entry.reject(err)
    }
    this.pendingRequests.clear()
  }

  private async sendRequest(action: string, params: Record<string, unknown>): Promise<EverOSResponse> {
    await this.ensureProcess()
    this.requestId++
    const id = `req_${this.requestId}`

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject })

      // 设置超时（30s）
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`EverOS request ${action} timed out`))
      }, 30000)

      // 包装 resolve/reject 以清除超时
      const origResolve = resolve
      const origReject = reject
      this.pendingRequests.set(id, {
        resolve: (val) => { clearTimeout(timeout); origResolve(val) },
        reject: (err) => { clearTimeout(timeout); origReject(err) },
      })

      const request: EverOSRequest = { action, params }
      this.process?.stdin?.write(JSON.stringify(request) + '\n')
    })
  }

  /**
   * 安全调用：失败时返回 null 不抛异常
   */
  private async safeCall(action: string, params: Record<string, unknown>): Promise<EverOSResponse | null> {
    try {
      return await this.sendRequest(action, params)
    } catch (err) {
      console.warn(`[EverOS] ${action} 调用失败:`, (err as Error).message)
      return null
    }
  }

  // ═══ 公开 API ═══

  /** 记录考试结果 */
  async recordExamResult(
    studentId: number,
    subject: string,
    score: number,
    fullScore: number,
    questionsDetail?: string,
  ) {
    return this.safeCall('record_exam_result', {
      student_id: studentId,
      subject,
      score,
      full_score: fullScore,
      questions_detail: questionsDetail,
    })
  }

  /** 记录单题判分详情 */
  async recordGradingDetail(
    studentId: number,
    subject: string,
    questionId: number,
    questionType: string,
    correctAnswer: string,
    studentAnswer: string,
    isCorrect: boolean,
    blankCount: number = 1,
  ) {
    return this.safeCall('record_grading_detail', {
      student_id: studentId,
      subject,
      question_id: questionId,
      question_type: questionType,
      correct_answer: correctAnswer,
      student_answer: studentAnswer,
      is_correct: isCorrect,
      blank_count: blankCount,
    })
  }

  /** 获取学生学习档案 */
  async getStudentProfile(studentId: number) {
    return this.safeCall('get_student_profile', { student_id: studentId })
  }

  /** 获取学生某科目薄弱环节 */
  async getStudentWeaknessContext(studentId: number, subject: string) {
    return this.safeCall('get_student_weakness_context', {
      student_id: studentId,
      subject,
    })
  }

  /** 记录系统批量操作 */
  async recordGradingBatch(
    action: string,
    subject: string,
    studentIds: number[],
    results: string,
  ) {
    return this.safeCall('record_grading_batch', {
      action,
      subject,
      student_ids: studentIds,
      results,
    })
  }

  /** 搜索历史判分案例 */
  async searchGradingCases(query: string, topK: number = 10) {
    return this.safeCall('search_grading_cases', { query, top_k: topK })
  }

  /** 销毁桥接进程 */
  destroy() {
    if (this.process) {
      this.process.stdin?.end()
      this.process.kill()
      this.process = null
    }
  }
}

// 单例导出
export const everosBridge = new EverOSBridge()
export { EverOSBridge }
