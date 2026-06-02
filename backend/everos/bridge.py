"""
EverOS 桥接层 — JSON-lines CLI
===============================
供 Node.js 通过 child_process 调用的 CLI 接口。

用法:
  echo '{"action":"record_exam","params":{...}}' | python bridge.py

每条请求一行 JSON，响应一行 JSON。
"""

import json
import sys
import os

from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from client import ExamMemory

client = ExamMemory()


def _to_serializable(obj):
    """递归将 Pydantic 对象转为可 JSON 序列化的 dict"""
    if isinstance(obj, BaseModel):
        return obj.model_dump()
    if isinstance(obj, dict):
        return {k: _to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_serializable(x) for x in obj]
    return obj


def handle(action: str, params: dict) -> dict:
    """路由分发，返回可序列化的 dict"""
    try:
        if action == "record_exam_result":
            return _to_serializable(client.record_exam_result(**params))
        elif action == "record_grading_detail":
            return _to_serializable(client.record_grading_detail(**params))
        elif action == "get_student_profile":
            return _to_serializable(client.get_student_profile(**params))
        elif action == "get_student_weakness_context":
            return _to_serializable(client.get_student_weakness_context(**params))
        elif action == "record_agent_operation":
            return _to_serializable(client.record_agent_operation(**params))
        elif action == "record_grading_batch":
            return _to_serializable(client.record_grading_batch(**params))
        elif action == "search_grading_cases":
            return _to_serializable(client.search_grading_cases(**params))
        elif action == "flush":
            return _to_serializable(client.flush(**params))
        elif action == "ping":
            return {"status": "ok", "service": "everos-bridge"}
        else:
            return {"error": f"Unknown action: {action}"}
    except Exception as e:
        return {"error": str(e)}


def main():
    """读取 stdin 逐行处理 JSON 请求"""
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            action = req.get("action", "")
            params = req.get("params", {})
            result = handle(action, params)
            print(json.dumps(result, default=str), flush=True)
        except json.JSONDecodeError as e:
            print(json.dumps({"error": f"Invalid JSON: {e}"}), flush=True)


if __name__ == "__main__":
    main()
