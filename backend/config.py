import os
import sys
import logging
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import torch
import numpy as np
import pandas as pd
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

# --- Supabase 客户端 ---
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================
# D2L 暴力兼容补丁 (Monkey Patch)
# ============================================
d2l = None
try:
    from d2l import torch as d2l

    d2l.use_svg_display = lambda: None
    d2l.plt = plt

    def _set_figsize(figsize=(3.5, 2.5)):
        plt.rcParams['figure.figsize'] = figsize
    d2l.set_figsize = _set_figsize

    _original_show_heatmaps = d2l.show_heatmaps
    def _safe_show_heatmaps(*args, **kwargs):
        d2l.use_svg_display = lambda: None
        return _original_show_heatmaps(*args, **kwargs)
    d2l.show_heatmaps = _safe_show_heatmaps

    if not hasattr(d2l, 'numpy'):
        def _to_numpy(x):
            if isinstance(x, torch.Tensor):
                return x.detach().cpu().numpy()
            return x
        d2l.numpy = _to_numpy

    print("✅ D2L 兼容性补丁已强制应用 (Removed IPython dependencies)")
except ImportError:
    print("❌ Warning: d2l module not found. Run 'pip install d2l==1.0.3'")

# --- 代码执行全局命名空间 ---
GLOBAL_NAMESPACE = {
    "torch": torch,
    "np": np,
    "pd": pd,
    "plt": plt,
    "d2l": d2l,
    "sys": sys,
    "os": os,
    "math": sys.modules.get('math', __import__('math')),
}
