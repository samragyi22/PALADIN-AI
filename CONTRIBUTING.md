# 🤝 Contributing to Enterprise AI Analyst

Thank you for your interest in contributing! This guide will help you get started.

---

## 🌿 Branch Strategy

We follow **Git Flow**:

```
main          ← Production (auto-deploys to Render.com)
  └── develop ← Integration branch (merge features here first)
        ├── feature/your-feature-name    ← New features
        ├── fix/your-bug-fix-name        ← Bug fixes
        ├── docs/update-readme           ← Documentation only
        └── perf/optimize-rag-pipeline   ← Performance improvements
```

### Rules:
- ✅ **Never push directly to `main`**
- ✅ All changes go through a **Pull Request**
- ✅ PRs must target `develop` first, then `develop` → `main`
- ✅ Branch names must be lowercase with hyphens

---

## 🚀 Development Setup

```bash
# 1. Fork and clone
git clone https://github.com/kartikbhardwaj1111/Enterprise-AI-Analyst.git
cd Enterprise-AI-Analyst

# 2. Create your feature branch FROM develop
git checkout develop
git checkout -b feature/your-feature-name

# 3. Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys

# 4. Frontend setup
cd ../frontend
npm install
npm run dev

# 5. Start backend (separate terminal)
cd backend
uvicorn app.main:app --port 8000 --reload
```

---

## 📝 Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

Types:
  feat     - New feature
  fix      - Bug fix
  docs     - Documentation only
  style    - Formatting (no logic change)
  refactor - Code restructuring
  perf     - Performance improvement
  test     - Adding/fixing tests
  chore    - Build process or tooling
```

**Examples:**
```bash
git commit -m "feat: add PDF export with custom branding"
git commit -m "fix: resolve CSRF token mismatch on file upload"
git commit -m "docs: update API reference with new endpoints"
```

---

## 🔁 Pull Request Process

1. Create branch from `develop`: `git checkout -b feature/my-feature develop`
2. Make your changes and commit using conventional commits
3. Push: `git push origin feature/my-feature`
4. Open PR targeting **`develop`** branch (NOT main)
5. Fill in the PR template completely
6. Request review
7. After approval → merge into `develop`
8. After testing `develop` → PR from `develop` to `main`

---

## 🧪 Testing Before PR

```bash
# Backend tests
cd backend
python3 tests/test_e2e_complete.py
python3 tests/test_sql_engine.py

# Docker build test (important!)
cd ..
docker-compose up --build
```

---

## 📂 Project Structure Quick Reference

```
Enterprise-AI-Analyst/
├── backend/app/
│   ├── main.py          # FastAPI entry point + CORS + startup events
│   ├── api/
│   │   ├── routes.py    # /upload, /chat, /export-pdf, /transcribe
│   │   └── auth.py      # /signup, /login, /logout, /me, /refresh
│   ├── core/
│   │   ├── agent.py     # LangGraph StateGraph orchestration
│   │   ├── rag.py       # ChromaDB + BM25 + Cohere reranking
│   │   ├── sql.py       # NL-to-SQL + AST guardian
│   │   └── reporter.py  # PDF report generation
│   └── database/
│       ├── models.py    # SQLAlchemy ORM models
│       └── session.py   # DB engine and session factory
└── frontend/src/
    ├── context/
    │   ├── ApiContext.jsx   # All API calls (upload, chat, export)
    │   └── AuthContext.jsx  # JWT auth state management
    └── pages/
        ├── LandingPage.jsx
        ├── Login.jsx / Signup.jsx
        └── WorkspaceConsole.jsx
```
