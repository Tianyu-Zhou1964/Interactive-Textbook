from typing import Dict, Optional, List
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import logger, supabase
from chat import stream_chat
from auth import CurrentUser, get_current_user, get_optional_user, require_admin

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

# 注：user_id 不再由前端提供，而是后端从登录 token 解出，防止冒充。
class SuggestionSchema(BaseModel):
    block_id: str
    suggested_content: str
    reason: str

class CommentSchema(BaseModel):
    block_id: str
    content: str

class BlockCreateSchema(BaseModel):
    section_id: str
    type: str
    content: str
    order_index: Optional[int] = None


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
async def submit_suggestion(
    suggestion: SuggestionSchema,
    user: CurrentUser = Depends(get_current_user),  # 提交建议必须登录，便于追溯贡献者
):
    try:
        result = (
            supabase.table("edit_suggestions")
            .insert({
                "block_id": suggestion.block_id,
                "suggested_content": suggestion.suggested_content,
                "reason": suggestion.reason,
                "user_id": user.user_id,  # 取自登录 token，前端无法伪造
                "status": "pending",
            })
            .execute()
        )
        return {"success": True, "id": result.data[0].get("id")} if result.data else None
    except Exception as e:
        logger.error(f"submit_suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments")
async def add_comment(
    comment: CommentSchema,
    user: Optional[CurrentUser] = Depends(get_optional_user),  # 评论允许匿名
):
    try:
        result = (
            supabase.table("discussions")
            .insert({
                "block_id": comment.block_id,
                "content": comment.content,
                "user_id": user.user_id if user else "anonymous",
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
# 编辑建议审核（仅管理员）
# ============================================
@router.get("/suggestions")
async def list_suggestions(
    status: str = "pending",
    admin: CurrentUser = Depends(require_admin),
):
    """列出指定状态的编辑建议，并附上对应 block 的当前原文，便于审核对比。"""
    try:
        sug_result = (
            supabase.table("edit_suggestions")
            .select("*")
            .eq("status", status)
            .order("created_at", desc=True)
            .execute()
        )
        suggestions = sug_result.data or []

        # 批量取出涉及的 block 原文
        block_ids = list({s["block_id"] for s in suggestions if s.get("block_id")})
        blocks_map: Dict[str, dict] = {}
        if block_ids:
            blocks_result = (
                supabase.table("content_blocks")
                .select("id, type, content, status")
                .in_("id", block_ids)
                .execute()
            )
            for b in blocks_result.data or []:
                blocks_map[b["id"]] = b

        for s in suggestions:
            block = blocks_map.get(s.get("block_id"))
            s["block_type"] = block.get("type") if block else None
            s["original_content"] = block.get("content") if block else None

        return {"suggestions": suggestions}
    except Exception as e:
        logger.error(f"list_suggestions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggestions/{suggestion_id}/approve")
async def approve_suggestion(
    suggestion_id: str,
    admin: CurrentUser = Depends(require_admin),
):
    """批准建议：把 suggested_content 写回 content_blocks，并标记 approved。"""
    try:
        sug = (
            supabase.table("edit_suggestions")
            .select("*")
            .eq("id", suggestion_id)
            .single()
            .execute()
        )
        if not sug.data:
            raise HTTPException(status_code=404, detail="建议不存在。")
        if sug.data.get("status") != "pending":
            raise HTTPException(status_code=409, detail="该建议已被处理过。")

        block_id = sug.data["block_id"]
        new_content = sug.data["suggested_content"]

        # 写回内容块
        updated = (
            supabase.table("content_blocks")
            .update({"content": new_content})
            .eq("id", block_id)
            .execute()
        )
        if not updated.data:
            raise HTTPException(status_code=404, detail="目标内容块不存在，无法写回。")

        # 标记建议已批准
        supabase.table("edit_suggestions").update({"status": "approved"}).eq("id", suggestion_id).execute()

        logger.info(f"[review] admin={admin.email} approved suggestion={suggestion_id} block={block_id}")
        return {"success": True, "block_id": block_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"approve_suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggestions/{suggestion_id}/reject")
async def reject_suggestion(
    suggestion_id: str,
    admin: CurrentUser = Depends(require_admin),
):
    """驳回建议：仅标记 rejected，不改动内容块。"""
    try:
        sug = (
            supabase.table("edit_suggestions")
            .select("status")
            .eq("id", suggestion_id)
            .single()
            .execute()
        )
        if not sug.data:
            raise HTTPException(status_code=404, detail="建议不存在。")
        if sug.data.get("status") != "pending":
            raise HTTPException(status_code=409, detail="该建议已被处理过。")

        supabase.table("edit_suggestions").update({"status": "rejected"}).eq("id", suggestion_id).execute()
        logger.info(f"[review] admin={admin.email} rejected suggestion={suggestion_id}")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"reject_suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# Chat 路由（流式，纯系统提示词驱动）
# ============================================
@router.post("/chat_stream")
async def chat_stream(chat_req: ChatSchema):
    history = [{"role": m.role, "content": m.content} for m in (chat_req.history or [])]

    return StreamingResponse(
        stream_chat(chat_req.query, chat_req.image, history, chat_req.lang or "zh"),
        media_type="application/x-ndjson",
        headers={"X-Accel-Buffering": "no"},
    )

# 注：代码执行已迁移到前端 Pyodide（浏览器内 WebAssembly 沙箱），
# 后端不再执行任何用户提交的代码，原 /run_code 路由已移除。
