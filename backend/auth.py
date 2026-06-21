"""身份验证：从 Authorization 头解出可信用户身份。

关键原则：后端**不信任**前端传来的 user_id，而是用 Supabase 验证
请求头里的 access token（JWT），从中解出真实的 user_id / email。
"""
from typing import Optional
from fastapi import Header, HTTPException, Depends

from config import logger, supabase, ADMIN_EMAIL


class CurrentUser:
    def __init__(self, user_id: str, email: Optional[str]):
        self.user_id = user_id
        self.email = email


def _extract_token(authorization: Optional[str]) -> Optional[str]:
    """从 'Bearer <token>' 头里取出 token。"""
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return None


async def get_optional_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[CurrentUser]:
    """可选登录：有有效 token 就返回用户，否则返回 None（不报错）。

    用于评论、提交建议这类「登录更好、匿名也能用」的场景。
    """
    token = _extract_token(authorization)
    if not token:
        return None
    try:
        resp = supabase.auth.get_user(token)
        user = getattr(resp, "user", None)
        if not user or not getattr(user, "id", None):
            return None
        return CurrentUser(user_id=user.id, email=getattr(user, "email", None))
    except Exception as e:
        logger.warning(f"[auth] token 验证失败: {e}")
        return None


async def get_current_user(
    authorization: Optional[str] = Header(default=None),
) -> CurrentUser:
    """必须登录：无有效 token 直接 401。"""
    user = await get_optional_user(authorization)
    if user is None:
        raise HTTPException(status_code=401, detail="未登录或登录已失效，请重新登录。")
    return user


async def require_admin(
    user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """管理员鉴权：email 必须等于环境变量 ADMIN_EMAIL。"""
    if not ADMIN_EMAIL:
        logger.error("[auth] 未配置 ADMIN_EMAIL，审核接口已禁用。")
        raise HTTPException(status_code=503, detail="服务端未配置管理员，审核功能不可用。")
    if (user.email or "").lower() != ADMIN_EMAIL.lower():
        raise HTTPException(status_code=403, detail="无权限：仅管理员可执行此操作。")
    return user
