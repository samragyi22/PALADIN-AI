# 🏢 Enterprise AI Analyst

> An agentic, multi-modal enterprise intelligence platform that answers natural language questions over both **unstructured documents** (PDF, DOCX) and **structured tabular data** (CSV, SQLite) — simultaneously.

Powered by a **LangGraph state machine** with 6 nodes: Intent Router → RAG / SQL (parallel) → Merge → Chart → Evaluate. Supports Google Gemini and OpenAI, with a built-in offline mock LLM for development.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧠 **Smart Intent Routing** | LLM classifies queries as `rag`, `sql`, or `hybrid` automatically |
| 📄 **Hybrid RAG** | Vector (ChromaDB) + BM25 keyword search + Cohere Reranking |
| 🗃️ **NL→SQL with Self-Correction** | Generates SQLite queries, validates with AST guardian, retries on errors (3x) |
| 🔒 **SQL Security** | AST-based validator blocks all mutation queries (DROP, DELETE, INSERT, etc.) |
| 📊 **Auto Charts** | Detects bar / line / pie from SQL results and renders via Recharts |
| 📏 **LLM-as-Judge Evaluation** | Faithfulness, Answer Relevancy, Context Recall scored per response |
| 📑 **PDF Reports** | Full session export with tables, charts (Matplotlib), and citations |
| 🌗 **Dark / Light Mode** | Tailwind-driven theme with glassmorphism UI |

---

## 🗂️ Project Structure

```
Enterprise-AI-Analyst/
├── backend/                   Python FastAPI backend
│   ├── app/
│   │   ├── main.py            FastAPI app + CORS
│   │   ├── config.py          Settings (pydantic-settings, .env)
│   │   ├── api/
│   │   │   ├── routes.py      All API endpoints
│   │   │   └── schemas.py     Pydantic request/response models
│   │   └── core/
│   │       ├── agent.py       LangGraph 6-node state machine
│   │       ├── rag.py         Document ingestion + hybrid retrieval
│   │       ├── sql.py         CSV ingestion + NL→SQL + SQLGuardian
│   │       ├── evaluator.py   LLM-as-judge quality evaluation
│   │       ├── reporter.py    PDF report generation (ReportLab)
│   │       └── logger.py      Session event logging
│   ├── tests/
│   │   ├── test_e2e_complete.py   Full 7-scenario E2E test suite
│   │   ├── test_sql_engine.py     SQL Guardian + schema extraction tests
│   │   └── test_state_machine.py  LangGraph graph unit tests
│   ├── requirements.txt
│   └── .env.example
├── frontend/                  React + Vite + Tailwind frontend
│   └── src/
│       ├── App.jsx            3-column root layout
│       ├── context/
│       │   └── ApiContext.jsx Global state + API calls
│       └── components/
│           ├── Sidebar.jsx        File upload + session management
│           ├── ChatWindow.jsx     Chat UI + SQL + citations + metrics
│           ├── ChartRenderer.jsx  Live Recharts visualization panel
│           └── FileUploader.jsx   Drag-and-drop upload component
├── data/                      Auto-created data directories
│   ├── documents/             Uploaded PDFs & DOCX files
│   ├── chroma/                ChromaDB vector store
│   ├── sqlite/                SQLite database (analyst.db)
│   └── logs/                  Session event logs
├── setup.sh                   One-command local setup script
├── docker-compose.yml         Docker Compose for containerized deployment
└── Dockerfile                 Backend Docker image
```

---

## 🏛️ Architecture

```
User Query
    │
    ▼
[1. Router Node]  ──── classifies intent: "rag" / "sql" / "hybrid"
    │
    ├── "rag"    ──► [2. RAG Node]  → ChromaDB vector + BM25 + Cohere rerank
    ├── "sql"    ──► [3. SQL Node]  → NL→SQL → Guardian → Execute → retry
    └── "hybrid" ──► [2. RAG Node] AND [3. SQL Node]  (parallel fan-out)
                          │               │
                          └───────┬───────┘
                                  ▼
                         [4. Merge Node]   → LLM synthesizes final answer
                                  │
                         [5. Chart Node]   → auto-detects bar/line/pie
                                  │
                         [6. Evaluation Node] → faithfulness / relevancy / recall
                                  │
                              Response
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- API key for **Google Gemini** or **OpenAI** (optional — works offline without one)

### Option A: Automated Setup (Recommended)

```bash
# From project root
chmod +x setup.sh
./setup.sh
```

This installs all dependencies, creates the `.env` from the template, and prints startup instructions.

### Option B: Manual Setup

#### 1. Backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate       # macOS/Linux
# venv\Scripts\activate        # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys (optional — mock LLM works without them)

# Start the FastAPI server
uvicorn app.main:app --port 8000 --reload
```

API docs available at: `http://localhost:8000/docs`

#### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

Open: `http://localhost:5173`

---

## ⚙️ Environment Variables

Edit `backend/.env` (copy from `backend/.env.example`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `LLM_PROVIDER` | ✅ | `gemini` | `"gemini"` or `"openai"` |
| `GOOGLE_API_KEY` | ⚠️ | — | Google Gemini API key ([get one](https://aistudio.google.com/)) |
| `OPENAI_API_KEY` | ⚠️ | — | OpenAI API key ([get one](https://platform.openai.com/)) |
| `COHERE_API_KEY` | ❌ | — | Cohere Rerank API key (optional — falls back to BM25) |
| `DATA_DIR` | ✅ | `../data` | Path to data storage directory |
| `ENV` | ✅ | `development` | `"development"` or `"production"` |
| `PORT` | ✅ | `8000` | Backend server port |
| `HOST` | ✅ | `0.0.0.0` | Backend server host |

> **Offline mode**: If API keys are missing or set to placeholder values (`your_*`), the system automatically uses an offline mock LLM. All features work — SQL ingestion, chart generation, PDF export, and E2E tests — without any API calls.

---

## 🌐 API Reference

### `POST /api/upload`
Upload a document or data file for processing.

**Accepted formats:** `PDF`, `DOCX`, `CSV`, `SQLite (.db)`

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@/path/to/your/report.pdf"
```

**Response:**
```json
{
  "status": "success",
  "file_id": "uuid-string",
  "filename": "report.pdf",
  "processing_status": "processing"
}
```

---

### `GET /api/upload/status/{file_id}`
Poll background processing status.

```bash
curl http://localhost:8000/api/upload/status/{file_id}
```

**Response:**
```json
{ "status": "completed", "filename": "report.pdf", "error": null }
```

Status values: `processing` | `completed` | `failed`

---

### `POST /api/chat`
Submit a natural language query. Runs the full LangGraph pipeline.

```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me Q3 sales by month", "session_id": "my-session"}'
```

**Response:**
```json
{
  "status": "success",
  "intent": "sql",
  "answer": "## Q3 Sales Summary\n- July: $165,000...",
  "citations": [],
  "sql_query": "SELECT month, sales_actual FROM q3_sales",
  "sql_results": [{"month": "July", "sales_actual": 165000}],
  "chart_config": {
    "type": "bar",
    "xAxis": "month",
    "yAxis": "sales_actual",
    "title": "Sales Actual by Month",
    "data": [...]
  },
  "evaluation_metrics": {
    "faithfulness": 1.0,
    "answer_relevancy": 1.0,
    "context_recall": 1.0
  }
}
```

---

### `GET /api/export-pdf?session_id={id}`
Download a styled PDF report of the full session.

```bash
curl "http://localhost:8000/api/export-pdf?session_id=my-session" \
  --output report.pdf
```

Returns a `application/pdf` binary stream. PDF includes: queries, answers, SQL blocks, data tables, Matplotlib charts, and document citations.

---

## 🧪 Running Tests

All tests use a mock LLM and mock embeddings — **no real API keys required**.

```bash
cd backend

# Full E2E integration test suite (Task 26 — all 7 scenarios)
python3 tests/test_e2e_complete.py

# SQL Guardian security + schema extraction unit tests
python3 tests/test_sql_engine.py

# LangGraph state machine unit tests (with mock LLM)
python3 tests/test_state_machine.py
```

### Test Coverage

| Test | Scenario |
|---|---|
| Test 1 | Health Check — Config & Settings load correctly |
| Test 2 | RAG Flow — PDF seed → query → citations returned |
| Test 3 | SQL Flow — CSV upload → NL→SQL → execution → chart |
| Test 4 | Hybrid Flow — Both RAG + SQL parallel paths → merged answer |
| Test 5 | PDF Export — ReportLab compiles valid binary PDF |
| Test 6 | Self-Correction — SQL retry loop corrects errors within 3 retries |
| Test 7 | Security Guardrail — SQLGuardian blocks 8 attack patterns |

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# From project root
docker-compose up --build
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173` (run separately with `npm run dev`)

### Backend Only (Docker)

```bash
docker build -t enterprise-ai-analyst-backend .
docker run -p 8000:8000 \
  -e LLM_PROVIDER=gemini \
  -e GOOGLE_API_KEY=your_key_here \
  enterprise-ai-analyst-backend
```

---

## 🔧 Troubleshooting

### `ModuleNotFoundError: No module named 'langgraph'`
**Cause:** Dependencies not installed in the active Python environment.
```bash
cd backend && pip install -r requirements.txt
```

### `Unexpected keyword argument 'openai_api_key'`
**Cause:** `langchain-openai >= 0.1` renamed `openai_api_key` to `api_key`.  
**Fix:** Already applied in this codebase. If you encounter it elsewhere, replace `openai_api_key=` with `api_key=`.

### `AttributeError: np.float_ was removed in NumPy 2.0`
**Cause:** Old ChromaDB (< 0.5) is incompatible with NumPy 2.0.  
**Fix:** Already pinned in `requirements.txt` as `chromadb>=0.5.0`. Run `pip install --upgrade chromadb`.

### `ChromaDB vector store is empty on retrieval`
**Cause:** File was uploaded but background processing hasn't completed.  
**Fix:** Poll `GET /api/upload/status/{file_id}` until status is `"completed"` before querying.

### `PDF upload returns 400 - Unsupported file type`
**Cause:** Only `.pdf`, `.docx`, `.csv`, `.sqlite`, `.db` are accepted.

### `LangGraph execution failed: 500`
**Cause:** Usually an LLM API error. Check your API key in `.env`.  
**Fix:** Set placeholder values (e.g. `mock_google_api_key`) to fall back to offline mock LLM.

### Frontend shows blank page
```bash
cd frontend && npm install && npm run dev
```
Ensure the backend is running on port 8000 before starting the frontend.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | FastAPI + Uvicorn |
| AI Orchestration | LangGraph (StateGraph) |
| LLM (Chat) | Google Gemini 1.5 Flash / OpenAI GPT-4o-mini |
| Embeddings | Google `embedding-001` / OpenAI `text-embedding-3-small` |
| Vector Store | ChromaDB >= 0.5.0 (persistent) |
| Keyword Search | BM25 (`rank-bm25`) |
| Reranking | Cohere Rerank API (optional) |
| SQL Database | SQLite + SQLAlchemy |
| SQL Security | sqlparse AST validator |
| PDF Parsing | PyMuPDF (`fitz`) |
| DOCX Parsing | python-docx |
| PDF Generation | ReportLab |
| Chart (backend) | Matplotlib (PNG for PDF reports) |
| Chart (frontend) | Recharts |
| Frontend | React 18 + Vite + Tailwind CSS |
| Data Processing | Pandas |
| Settings | Pydantic v2 + pydantic-settings |

---

Backend - 
cd "/Users/kartikbhardwaj/Desktop/Enterprise Ai Project/Enterprise-AI-Analyst/backend"
source venv/bin/activate
uvicorn app.main:app --port 8000 --reload


Frontend - 
cd "/Users/kartikbhardwaj/Desktop/Enterprise Ai Project/Enterprise-AI-Analyst/frontend"
npm run dev


## 📄 License

MIT License — free to use, modify, and distribute.
