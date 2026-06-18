import io
import json
import base64
import contextlib
import traceback
import httpx
import matplotlib.pyplot as plt
from typing import List, AsyncIterator

from config import (
    logger,
    QWEN_API_URL, QWEN_API_KEY, GLOBAL_NAMESPACE,
)


# ============================================
# LLM 流式调用
# ============================================
IDENTITY_PROMPT_ZH = (
    "你叫派派，是教材作者\"阡陌交通_\"创造的智能助教。\n"
    "你的职责是协助读者学习《手撕 AI 大模型》系列教程。\n"
    "当回答问题时：\n"
    "1. 保持亲切、专业且富有启发性的语气。\n"
    "2. 涉及公式时，务必使用 LaTeX 格式（用 $ 或 $$ 包裹）。\n"
    "3. 优先使用教材中的概念和术语。\n"
)

IDENTITY_PROMPT_EN = (
    "You are Paimai, an intelligent teaching assistant created by the textbook author \"阡陌交通_\".\n"
    "Your role is to help readers learn the \"Handmaking LLM\" tutorial series.\n"
    "When answering questions:\n"
    "1. Keep a friendly, professional, and inspiring tone.\n"
    "2. Always use LaTeX format for formulas (wrapped in $ or $$).\n"
    "3. Prioritize concepts and terminology from the textbook.\n"
    "4. Always respond in English.\n"
)


async def stream_chat(
    query: str,
    image: str | None,
    history: list[dict],
    lang: str = "zh",
) -> AsyncIterator[str]:
    """身份系统提示词 + LLM 流式生成管道。"""
    try:
        identity = IDENTITY_PROMPT_EN if lang == "en" else IDENTITY_PROMPT_ZH

        if lang == "en":
            system_prompt = (
                f"{identity}\nPlease answer the user's question about LLMs based on your knowledge."
            )
        else:
            system_prompt = (
                f"{identity}\n请基于你的专业知识回答用户关于 AI 大模型的问题。"
            )

        messages = [{"role": "system", "content": system_prompt}]

        # 注入历史（最近 10 条）
        for msg in history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})

        # 2. 当前 query（可能带图片）
        if image and len(image) < 2 * 1024 * 1024:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": query},
                    {"type": "image_url", "image_url": {"url": image}},
                ],
            })
        else:
            messages.append({"role": "user", "content": query})

        # 3. 调用 Qwen
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                QWEN_API_URL,
                headers={"Authorization": f"Bearer {QWEN_API_KEY}"},
                json={
                    "model": "med_vision_agent",
                    "messages": messages,
                    "stream": True,
                    "temperature": 0.7,
                },
            ) as resp:
                if resp.status_code != 200:
                    yield json.dumps({"type": "error", "content": f"API Error: {resp.status_code}"}) + "\n"
                    return

                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    data_content = line[6:].strip() if line.startswith("data: ") else line.strip()
                    if data_content == "[DONE]" or not data_content:
                        break
                    try:
                        chunk = json.loads(data_content)
                        delta = chunk["choices"][0].get("delta", {}).get("content", "")
                        if delta:
                            yield json.dumps({"type": "delta", "content": delta}, ensure_ascii=False) + "\n"
                    except Exception:
                        pass

        yield json.dumps({"type": "done", "references": []}, ensure_ascii=False) + "\n"

    except Exception as e:
        yield json.dumps({"type": "error", "content": str(e)}, ensure_ascii=False) + "\n"


# ============================================
# 代码执行沙箱
# ============================================
DANGEROUS_KEYWORDS = [
    "os.", "sys.", "subprocess", "shutil", "__import__",
    "open(", "write(", "remove(", "unlink(", "rmdir(",
    "socket", "getattr", "setattr", "eval(", "exec(", "globals(",
]


def audit_code(code: str) -> str | None:
    """检查危险关键字，返回被拦截的关键字或 None。"""
    for kw in DANGEROUS_KEYWORDS:
        if kw in code:
            return kw
    return None


def execute_code(code: str) -> dict:
    """在受限全局命名空间中执行代码，返回结果字典。"""
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    plot_base64 = None
    exec_error = None
    success = False

    try:
        plt.clf()
        plt.close("all")

        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
            exec(code, GLOBAL_NAMESPACE)

            if plt.get_fignums():
                img_buf = io.BytesIO()
                plt.savefig(img_buf, format="png", bbox_inches="tight", dpi=100, facecolor="white")
                img_buf.seek(0)
                plot_base64 = base64.b64encode(img_buf.read()).decode("utf-8")
                plt.close("all")

        success = True
    except Exception:
        exec_error = traceback.format_exc()
        plt.close("all")

    return {
        "stdout": stdout_capture.getvalue(),
        "stderr": stderr_capture.getvalue(),
        "error": exec_error,
        "plotBase64": plot_base64,
        "success": success,
    }
