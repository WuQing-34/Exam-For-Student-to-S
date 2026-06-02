"""
EverOS 客户端 — 考试系统专用封装
=============================
提供考试场景下的记忆存储/检索能力：
- 记录学生考试结果和学习档案
- 记录判分决策和系统操作轨迹
- 检索学生历史上下文以辅助判分
"""

import os
import time
from typing import Optional

from everos import EverOS

API_KEY = os.environ.get("EVEROS_API_KEY", "aa395619-55e6-473e-8f23-b9af05010b20")
SYSTEM_USER_ID = "exam_system"


class ExamMemory:
    """考试系统记忆层"""

    def __init__(self, api_key: Optional[str] = None):
        self.client = EverOS(api_key=api_key or API_KEY)
        self.memories = self.client.v1.memories
        self.agent_mem = self.client.v1.memories.agent

    # ── Student Memory ──────────────────────────────────────

    def record_exam_result(
        self,
        student_id: int,
        subject: str,
        score: int,
        full_score: int,
        questions_detail: Optional[str] = None,
    ) -> dict:
        """记录学生某科考试成绩"""
        session_id = f"exam_{student_id}_{subject}"
        now_ms = int(time.time() * 1000)
        detail = questions_detail or ""
        return self.memories.add(
            user_id=f"student_{student_id}",
            session_id=session_id,
            messages=[
                {
                    "role": "user",
                    "timestamp": now_ms,
                    "content": f"完成科目 [{subject}] 考试",
                },
                {
                    "role": "assistant",
                    "timestamp": now_ms + 1000,
                    "content": (
                        f"[{subject}] 得分: {score}/{full_score} "
                        f"({round(score / full_score * 100, 1)}%)\n{detail}"
                    ),
                },
            ],
        )

    def record_grading_detail(
        self,
        student_id: int,
        subject: str,
        question_id: int,
        question_type: str,
        correct_answer: str,
        student_answer: str,
        is_correct: bool,
        blank_count: int = 1,
    ) -> dict:
        """记录单题判分详情（用于积累判分案例）"""
        now_ms = int(time.time() * 1000)
        verdict = "✅ 正确" if is_correct else "❌ 错误"
        return self.memories.add(
            user_id=f"student_{student_id}",
            session_id=f"grading_{student_id}_{subject}",
            messages=[
                {
                    "role": "user",
                    "timestamp": now_ms,
                    "content": (
                        f"题目 Q{question_id} [{question_type}] "
                        f"学生答: {student_answer}"
                    ),
                },
                {
                    "role": "assistant",
                    "timestamp": now_ms + 1000,
                    "content": (
                        f"正确答案: {correct_answer}\n"
                        f"判分: {verdict} (空数: {blank_count})"
                    ),
                },
            ],
        )

    def get_student_profile(self, student_id: int) -> dict:
        """获取学生学习档案（优势/薄弱科目）"""
        resp = self.memories.search(
            filters={"user_id": f"student_{student_id}"},
            query="exam results strengths weaknesses subjects score",
            method="hybrid",
            memory_types=["episodic_memory", "profile"],
            top_k=10,
        )
        return _extract_data(resp)

    def get_student_weakness_context(self, student_id: int, subject: str) -> dict:
        """获取学生在某科目的薄弱环节上下文"""
        resp = self.memories.search(
            filters={"user_id": f"student_{student_id}"},
            query=f"{subject} difficult wrong incorrect mistakes low score",
            method="vector",
            memory_types=["episodic_memory"],
            top_k=10,
        )
        return _extract_data(resp)

    # ── Agent Memory (系统操作轨迹) ─────────────────────────

    def record_agent_operation(
        self,
        session_id: str,
        messages: list,
    ) -> dict:
        """记录系统操作轨迹（Agent 模式）"""
        return self.agent_mem.add(
            user_id=SYSTEM_USER_ID,
            session_id=session_id,
            messages=messages,
        )

    def record_grading_batch(
        self,
        action: str,
        subject: str,
        student_ids: list[int],
        results: str,
    ) -> dict:
        """记录批量判分操作"""
        now_ms = int(time.time() * 1000)
        return self.agent_mem.add(
            user_id=SYSTEM_USER_ID,
            session_id=f"batch_{action}",
            messages=[
                {
                    "role": "user",
                    "timestamp": now_ms,
                    "content": f"执行批量操作: {action} | 科目: {subject} | 学生: {student_ids}",
                },
                {
                    "role": "assistant",
                    "timestamp": now_ms + 1000,
                    "content": results,
                },
            ],
        )

    # ── Search & Retrieval ──────────────────────────────────

    def search_grading_cases(self, query: str, top_k: int = 10) -> dict:
        """搜索历史判分案例"""
        resp = self.memories.search(
            filters={"user_id": SYSTEM_USER_ID},
            query=query,
            method="hybrid",
            memory_types=["episodic_memory", "agent_memory"],
            top_k=top_k,
        )
        return _extract_data(resp)

    # ── Lifecycle ───────────────────────────────────────────

    def flush(self, user_id: str, session_id: Optional[str] = None) -> dict:
        """触发记忆提取"""
        return self.memories.flush(user_id=user_id, session_id=session_id)


def _extract_data(resp) -> dict:
    """安全提取 API 响应数据"""
    data = resp.data if resp and hasattr(resp, 'data') else None
    if not data:
        return {"data": None, "total_count": 0}
    return {
        "data": data,
        "total_count": getattr(data, "total_count", 0),
    }


# ── Singleton ───────────────────────────────────────────────

_exam_memory: Optional[ExamMemory] = None


def get_exam_memory() -> ExamMemory:
    global _exam_memory
    if _exam_memory is None:
        _exam_memory = ExamMemory()
    return _exam_memory
