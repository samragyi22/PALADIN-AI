# 📋 Changelog

All notable changes to **Enterprise AI Analyst** are documented here.

---

## [1.2.0] - 2026-07-22 — Production Deployment Release

### 🚀 Deployed
- Live deployment on Render.com: https://enterprise-ai-analyst.onrender.com

### ✨ Added
- Full JWT + CSRF authentication system (signup, login, logout, token refresh)
- Landing Page with animated hero section and feature highlights
- Dashboard page with session management UI
- Workspace Console with full agentic chat interface
- Protected routes and AuthContext for session persistence
- Alembic database migrations for auth tables
- Auto database table creation on server startup
- `render.yaml` blueprint for one-click Render deployment

### 🐛 Fixed
- Fixed frontend `dist` path resolution for Docker container (2 vs 3 `os.path.dirname` levels)
- Fixed CSRF token not being sent on file upload and chat API calls (axios interceptor)
- Upgraded Node.js from 18 to 20-alpine (Vite 8 compatibility — `styleText` error)
- CORS now reads from `ALLOWED_ORIGINS` environment variable for secure production config

### 🔧 Changed
- README updated with live demo badge and deployment link
- Version badges updated: Node 20+, React 19+, Python 3.11+, FastAPI 0.110+

---

## [1.1.0] - 2026-07-20 — UI/UX Animation Upgrade

### ✨ Added
- Glassmorphism design system with dark mode
- Micro-animations and hover effects across all components
- Mobile-responsive layouts
- Smooth sidebar collapse/expand animations
- Chart panel bottom sheet for mobile

### 🔧 Changed
- Migrated to TailwindCSS v3 with custom design tokens
- Improved ChatWindow message entry animations
- Enhanced FileUploader with drag-and-drop visual feedback

---

## [1.0.0] - 2026-07-13 — Initial Release

### ✨ Added
- LangGraph StateGraph multi-agent orchestration
- Hybrid RAG pipeline: ChromaDB vector search + BM25 + Cohere reranking
- NL-to-SQL engine with AST-based SQL Guardian safety checks
- Dynamic chart detection and Recharts rendering (Bar, Line, Area, Pie)
- LLM-as-Judge evaluation (faithfulness, relevance, recall)
- PDF report export with ReportLab + Matplotlib
- Voice query transcription via Groq Whisper
- File ingestion: PDF (OCR-aware), DOCX, CSV, SQLite, Images
- FastAPI + Uvicorn backend serving React frontend as static files
- Docker multi-stage build (frontend + backend in single container)

---

> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
