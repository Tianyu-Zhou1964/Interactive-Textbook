import json
from typing import Dict, Optional, List
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import logger, supabase
from RAG import audit_code, execute_code, stream_chat

# --- 频率限制（与 main.py 中的 limiter 共享 key_func） ---
limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

# ============================================
# Pydantic Schemas
# ============================================
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatSchema(BaseModel):
    query: str
    image: Optional[str] = None
    history: Optional[List[ChatMessage]] = []
    lang: Optional[str] = "zh"

class SuggestionSchema(BaseModel):
    block_id: str
    suggested_content: str
    reason: str
    user_id: Optional[str] = None

class CommentSchema(BaseModel):
    block_id: str
    content: str
    user_id: Optional[str] = None

class BlockCreateSchema(BaseModel):
    section_id: str
    type: str
    content: str
    order_index: Optional[int] = None

class CodeExecutionSchema(BaseModel):
    code: str


# ============================================
# Content / Database 路由
# ============================================
@router.post("/blocks")
async def create_block(block: BlockCreateSchema):
    try:
        if block.order_index is None:
            max_result = (
                supabase.table("content_blocks")
                .select("order_index")
                .eq("section_id", block.section_id)
                .order("order_index", desc=True)
                .limit(1)
                .execute()
            )
            block.order_index = (
                max_result.data[0].get("order_index", 0) + 1 if max_result.data else 0
            )

        result = (
            supabase.table("content_blocks")
            .insert({
                "section_id": block.section_id,
                "type": block.type,
                "content": block.content,
                "order_index": block.order_index,
                "status": "draft",
            })
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"create_block: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit_suggestion")
async def submit_suggestion(suggestion: SuggestionSchema):
    try:
        result = (
            supabase.table("edit_suggestions")
            .insert({
                "block_id": suggestion.block_id,
                "suggested_content": suggestion.suggested_content,
                "reason": suggestion.reason,
                "user_id": suggestion.user_id or "anonymous",
                "status": "pending",
            })
            .execute()
        )
        return {"success": True, "id": result.data[0].get("id")} if result.data else None
    except Exception as e:
        logger.error(f"submit_suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments")
async def add_comment(comment: CommentSchema):
    try:
        result = (
            supabase.table("discussions")
            .insert({
                "block_id": comment.block_id,
                "content": comment.content,
                "user_id": comment.user_id or "anonymous",
            })
            .execute()
        )
        return result.data[0] if result.data else None
    except Exception as e:
        logger.error(f"add_comment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comments")
async def get_comments(block_id: str):
    try:
        result = (
            supabase.table("discussions")
            .select("*")
            .eq("block_id", block_id)
            .order("created_at", desc=True)
            .execute()
        )
        return {"comments": result.data or []}
    except Exception as e:
        logger.error(f"get_comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments/counts")
async def get_comment_counts(body: dict):
    """批量获取多个 block 的评论数量"""
    try:
        block_ids = body.get("block_ids", [])
        if not block_ids:
            return {"counts": {}}

        result = (
            supabase.table("discussions")
            .select("block_id")
            .in_("block_id", block_ids)
            .execute()
        )

        counts: Dict[str, int] = {}
        for row in result.data or []:
            bid = row["block_id"]
            counts[bid] = counts.get(bid, 0) + 1

        return {"counts": counts}
    except Exception as e:
        logger.error(f"get_comment_counts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Chat & RAG 路由
# ============================================
@router.post("/chat_stream")
async def chat_stream(chat_req: ChatSchema):
    history = [{"role": m.role, "content": m.content} for m in (chat_req.history or [])]

    return StreamingResponse(
        stream_chat(chat_req.query, chat_req.image, history, chat_req.lang or "zh"),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no"},
    )


# ============================================
# Code Execution 路由
# ============================================
@router.post("/run_code")
@limiter.limit("5/minute")
async def run_code(request: CodeExecutionSchema, req_info: Request):
    """Execute Python code on the server with persistent global namespace."""
    code = request.code
    client_ip = req_info.client.host if req_info.client else "unknown"

    # 安全审计
    blocked_kw = audit_code(code)
    if blocked_kw:
        logger.warning(f"🚨 [CODE_EXEC] Blocked '{blocked_kw}' from IP: {client_ip}")
        return {
            "stdout": "",
            "stderr": f"Security Error: Use of dangerous keyword '{blocked_kw}' is prohibited.",
            "error": "Security Restriction",
            "plotBase64": None,
            "success": False,
        }

    logger.info(f"🚀 [CODE_EXEC] IP: {client_ip} Executing code:\n{code}")
    return execute_code(code)
