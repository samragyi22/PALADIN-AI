# Specification Sheet & Implementation Roadmap

This document defines the functional requirements, design specifications, and step-by-step milestone roadmap to build the **Enterprise AI Analyst** from scratch. 

---

## 1. System Requirements & Specifications

### 1.1 Ingestion Specifications
* **Document Parser**: Must parse `.pdf` and `.docx` files. Large files must be read asynchronously to avoid blocking the main server threads.
* **Vector Database**: An embedded instance of `ChromaDB` storing 1536-dimensional embeddings (if using OpenAI `text-embedding-3-small` or similar) or 768-dimensional embeddings (if using Google Gemini text-embeddings).
* **Database Engine**: A local SQLite database. When a user uploads a `.csv` file, the backend must dynamically generate an SQL table schema based on the CSV column types and insert records using bulk insert streams.

### 1.2 Security & Guardrails
* **SQL Sandbox**: The SQL execution engine must parse generated SQL strings into an Abstract Syntax Tree (AST) using `sqlparse` before running them. It must reject any statements containing write operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `CREATE`).
* **Execution Timeout**: SQL queries must be wrapped in a transaction with a maximum database thread execution timeout of 5 seconds to prevent execution of infinite join-loops.

### 1.3 Agent Orchestration (LangGraph State)
The shared graph state must track:
```python
class AgentState(TypedDict):
    query: str                  # Original user query
    intent: str                 # Intent classification ("rag", "sql", "mixed")
    retrieved_chunks: List[dict]# Raw/Reranked document chunks (for RAG)
    sql_query: str              # Generated SQL command
    sql_results: List[dict]     # Raw database results
    sql_error: str              # Any error message if execution fails
    sql_retry_count: int        # Counter for auto-correction loop
    response_text: str          # Synthesized final answer
    citations: List[dict]       # Source citation nodes
    chart_config: dict          # Formatted chart configurations (for UI)
```

---

## 2. Milestone Build Roadmap

Here is the step-by-step roadmap to implement this project. Each milestone represents a self-contained, testable block of work.

```
                  [ MILESTONE 1: Project Initialization ]
                                     │
                  ┌──────────────────┴──────────────────┐
                  ▼                                     ▼
      [ MILESTONE 2: RAG Pipeline ]        [ MILESTONE 3: SQL Engine ]
                  │                                     │
                  └──────────────────┬──────────────────┘
                                     ▼
                 [ MILESTONE 4: LangGraph Routing Brain ]
                                     │
                 [ MILESTONE 5: Evaluators & Observability ]
                                     │
                 [ MILESTONE 6: React UI Layout & Uploads ]
                                     │
                 [ MILESTONE 7: Chat Console & Recharts ]
                                     │
                 [ MILESTONE 8: PDF Reports & End-to-End ]
```

---

### Milestone 1: Project Setup & API Core
* **Tasks**:
  1. Initialize Python virtual environment (`venv`) and Git repository.
  2. Write `/backend/requirements.txt` with specific library versions.
  3. Implement `/backend/app/config.py` to parse environmental settings (`.env`).
  4. Scaffold `/backend/app/main.py` using FastAPI with CORS middleware.
  5. Set up the local directory structure (`/data/documents`, `/data/sqlite`, `/data/chroma`).
* **Verification Criteria**:
  * Running `uvicorn app.main:app --reload` starts the server without errors.
  * Visiting `http://127.0.0.1:8000/docs` displays the auto-generated Swagger UI.

---

### Milestone 2: Document Processing & Vector Search (RAG Branch)
* **Tasks**:
  1. Create `/backend/app/core/rag.py`.
  2. Implement text extractors for PDF and DOCX documents.
  3. Configure LangChain's `RecursiveCharacterTextSplitter` (Target: 500 token chunks, 50 token overlap).
  4. Initialize `ChromaDB` client pointing to `/data/chroma`.
  5. Write the retrieval pipeline using **hybrid search** (merging dense vector similarities with BM25 matches) and apply the **Cohere Rerank API** helper to sort the top-10 chunks down to a high-relevance top-3.
  6. Track text metadata (source filename, page number) in database fields for citation lookups.
* **Verification Criteria**:
  * Execute a test script: upload a sample PDF, chunk it, embed it, search for a semantic phrase, and verify that the output contains the exact source document name and matching text fragments.

---

### Milestone 3: Database Mapping & Protected SQL Engine (SQL Branch)
* **Tasks**:
  1. Create `/backend/app/core/sql.py`.
  2. Write a function to read uploaded CSV files into Pandas DataFrames, infer schema types, and commit them to SQLite tables in `/data/sqlite/analyst.db`.
  3. Create an SQLite metadata inspector that extracts catalog info (table names, columns, data types, sample values) and formats it into a semantic text map for the LLM.
  4. Build the SQL agent generation prompt.
  5. **Implement AST Guardrail**: Write a validation function using `sqlparse` to block queries containing mutation tokens.
  6. **Implement Auto-Correction Loop**: Write an execution wrapper. If SQLite throws a syntax or column error, catch the error message, append it to the chat context, call the LLM to write a revised query, and attempt execution again (limit to 3 retries).
* **Verification Criteria**:
  * Run a test script: upload a CSV file, ask a question (e.g. "Calculate average price"), confirm the agent generates valid SQL, runs it, and outputs table rows.
  * Test security: attempt a query like "DELETE FROM orders" and verify that the AST guardrail catches it and raises a security exception.

---

### Milestone 4: LangGraph Routing Brain
* **Tasks**:
  1. Create `/backend/app/core/agent.py`.
  2. Define `AgentState` schema.
  3. Implement Graph Nodes:
     * `RouterNode`: Classifies query intent.
     * `RAGNode`: Retrieves document chunks.
     * `SQLNode`: Generates and runs database queries.
     * `MergeNode`: Synthesizes answers, combining text context and database tables.
     * `ChartNode`: Inspects final results; if structured tables exist, generates a JSON configuration detailing chart types (bar, line, pie) and axis dimensions.
  4. Wire nodes together using conditional edges.
* **Verification Criteria**:
  * Pass three test queries:
    1. "What is our company's policy on remote work?" $\rightarrow$ routes to RAG node.
    2. "List sales numbers by month" $\rightarrow$ routes to SQL node.
    3. "Verify if the sales target in the remote work policy matches our sales database" $\rightarrow$ routes to both nodes and merges.

---

### Milestone 5: Observability & RAGAS Evaluator
* **Tasks**:
  1. Create `/backend/app/core/evaluator.py`.
  2. Implement an execution evaluator using **RAGAS** or a lightweight LLM judge to score output answer quality:
     * **Faithfulness**: Is the answer fully grounded in the retrieved chunks? (Check for hallucinations).
     * **Answer Relevance**: Does the answer directly address the user's question?
  3. Configure standard Python logging structure to log query inputs, routed paths, execution times, SQL queries, and evaluation scores to `/data/logs/session.log`.
  4. Set up LangSmith/LangFuse environment variables in `.env` for optional full trace logging.
* **Verification Criteria**:
  * Run a sequence of queries and verify that the log file records the execution paths and evaluation metrics for each step.

---

### Milestone 6: React UI Scaffolding & Upload Panel
* **Tasks**:
  1. Scaffold a React project using Vite in `/frontend`.
  2. Configure Tailwind CSS and compile main layout grids.
  3. Create `/frontend/src/components/Sidebar.jsx` (session control, uploaded files registry).
  4. Create `/frontend/src/components/FileUploader.jsx` with animated drag-and-drop file support, dynamic format indicators (PDF, DOCX, CSV), and upload progress states.
  5. Connect these views to backend FastAPI routers via Axios.
* **Verification Criteria**:
  * Drag and drop a document into the UI. Confirm that it calls the backend `/api/upload` endpoint and displays the uploaded file in the sidebar inventory list.

---

### Milestone 7: Chat Console & Recharts Panel
* **Tasks**:
  1. Create `/frontend/src/components/ChatWindow.jsx`.
  2. Implement typing bubble indicators, message grids, and support for rendering markdown text and inline HTML tables.
  3. Build source citation widgets (e.g. click a footnote to show the underlying document chunk).
  4. Create `/frontend/src/components/ChartRenderer.jsx` using `Recharts` or `Chart.js` to automatically parse chart configurations returned from the backend and draw the correct graphical representation.
* **Verification Criteria**:
  * Type a question about an uploaded CSV. Verify the chat window prints the written response, displays the resulting table data, and renders the interactive Recharts widget in a split-screen panel.

---

### Milestone 8: PDF Reports & End-to-End Verification
* **Tasks**:
  1. Create `/backend/app/core/reporter.py`.
  2. Implement a ReportLab document compiler. It reads the current chat session state, maps structured tables to ReportLab tables, converts Plotly/Recharts metrics to static PNG images, and formats them into a clean PDF layout.
  3. Create `/api/export-pdf` route to stream the compiled PDF.
  4. Build a download button on the frontend chat console.
* **Verification Criteria**:
  * Trigger a PDF export. Verify that a formatted document downloads containing the summary text, data tables, and high-resolution chart images.

---

## 3. UI Design Specifications

To ensure a highly interactive, state-of-the-art visual appearance, the frontend will implement:

```
┌────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR          │  CHAT WORKSPACE               │  ANALYTICS PANEL   │
│                   │                               │                    │
│  [+] New Session  │  User asks: "Q3 Sales?"       │  [ Bar Chart ]     │
│                   │  ───────────────────────────  │  ┌───┐             │
│  Uploaded Files:  │  System: "Based on orders...  │  │   │ ┌───┐       │
│  - q3_report.pdf  │  the total sales are $1.2M.   │  │   │ │   │       │
│  - sales.csv      │  Citations: [1] q3_report.pdf │  └───┴─└───┴───────│
│                   │                               │                    │
│  History:         │  [Table Render]               │  - Filter Columns  │
│  - Session 1      │  Month   | Sales              │  - Toggle Chart    │
│  - Session 2      │  July    | $450k              │  - Download Table  │
│                   │                               │                    │
│  [Dark Mode Sw]   │  [ Type query here       ]    │  [ Export PDF ]    │
└────────────────────────────────────────────────────────────────────────┘
```

* **Dynamic Shimmer Loaders**: When the backend is executing nodes, the chat message window will show customized loaders matching the active node:
  * *RAG executing*: A loading bar showing "Scanning document archives...".
  * *SQL executing*: A typing cursor showing "Compiling query schemas...".
  * *Merging*: "Synthesizing cross-source insights...".
* **Themes**: Tailwind-driven theme switching (Dark slate as default theme `#0B0F19` / Light mode as toggle option).
