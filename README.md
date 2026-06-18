# PassionIsEverything — Interactive AI Learning Platform

[**中文说明**](#中文说明) | [**English Description**](#english-description)

---

<h2 id="english-description">English Description</h2>

**PassionIsEverything** is an innovative, interactive platform for learning and coding AI. It reimagines traditional textbooks using a Notion/Jupyter-inspired block layout, integrating rich Markdown tutorials with live-executable Python cells.

🚀 **Live Demo**: [**https://passionie.uk**](https://passionie.uk)

### Key Features
- **Interactive Reading**: Content organized in "blocks" similar to Notion.
- **Live Code Execution**: Run PyTorch, NumPy, and Matplotlib code directly on the server and see results in real-time.
- **AI Tutor**: Meet **Paipai**, an LLM-powered assistant (with a tailored system prompt for its identity and role) that answers your technical questions about the tutorials.
- **Block-Level Discussions**: Engage in granular community discussions for every paragraph or code snippet.

### Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS.
- **Backend**: FastAPI, streaming chat to a vision-capable LLM (Qwen3-VL).
- **In-browser Python**: Pyodide for client-side code execution; server-side sandbox for richer runs.
- **Database**: Supabase (PostgreSQL).
- **Deployment**: Docker, Cloudflare Tunnel.

> **Note**: This repository contains the platform framework and engine. The specific textbook content (Markdown files) is excluded for copyright protection.

---

<h2 id="中文说明">中文说明</h2>

**PassionIsEverything** 是一个创新的**交互式 AI 学习与编程平台**，旨在打破传统教材与实操练习之间的隔阂。平台采用 Notion/Jupyter 风格的动态块展示内容，将深度学习教程与可实时执行的 Python 代码环境深度融合。

🚀 **立即体验**: [**https://passionie.uk**](https://passionie.uk)

### 核心功能
- **交互式阅读**：Notion 风格的块化布局，告别枯燥的纯文本。
- **实时代码执行**：用户可直接在页面运行 PyTorch 算法并回显图表，实现“验证式学习”。
- **AI 助教**：智能助教“**派派**”由大模型驱动（通过定制系统提示词设定其身份与职责），为你解答教程相关的技术问题。
- **颗粒度讨论区**：支持针对特定知识块、代码段进行社区讨论。

### 技术栈
- **前端**：Next.js 16 (App Router), React 19, Tailwind CSS
- **后端**：FastAPI，流式对接视觉大模型 (Qwen3-VL)
- **浏览器内 Python**：Pyodide 客户端执行代码；服务端沙箱用于更完整的运行
- **数据库**：Supabase (PostgreSQL)
- **部署**：Docker, Cloudflare Tunnel (内网穿透)

> **注意**：本仓库开源的是平台架构与逻辑代码。具体的教材原稿（Markdown 文件）由于版权保护未包含在内。

---

## Quick Start / 快速开始

```bash
# 1. Clone repository
git clone https://github.com/Tianyu-Zhou1964/Interactive-Textbook.git
cd Interactive-Textbook

# 2. Configure environment variables
# Edit backend/.env and web/.env.local (see deployment guide)

# 3. Spin up services
docker-compose up -d --build
```

详细部署与开发指南请参考 [项目快速上手指南.md](项目快速上手指南.md)。