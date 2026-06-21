import os
import logging
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# --- 日志配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("access.log"),
    ],
)
logger = logging.getLogger("PassionAPI")

# --- 环境变量 ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
QWEN_API_URL = os.getenv("QWEN_API_URL")
QWEN_API_KEY = os.getenv("QWEN_API_KEY")

# 管理员邮箱：仅此邮箱的登录用户可执行审核操作（approve/reject）
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")

# --- Supabase 客户端 ---
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
