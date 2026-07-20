# Design Document

## Overview

The Enterprise AI Analyst is an AI-powered analytics platform that unifies unstructured documents (PDFs, DOCX) and structured databases (CSV, SQLite) into a single natural language query interface. The system uses LangGraph for stateful orchestration, hybrid RAG for document retrieval, and self-correcting SQL agents for database queries.

### Design Goals
- **Unified Query Interface**: Single entry point for document and database queries
- **Security First**: AST-based SQL validation to prevent destructive operations
- **Self-Healing**: Auto-retry failed SQL queries with error analysis
- **Traceable**: Citation-backed answers with source references
- **Observable**: RAGAS metrics for answer quality monitoring
- **Extensible**: Pluggable LLM providers (Gemini/OpenAI)

## Architecture

### High-Level Architecture

Three-tier architecture separating presentation, business logic, and data storage:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
│  React + Vite + Tailwind CSS + Recharts                         │
│  - File Upload UI                                                │
│  - Chat Interface                                                │
│  - Chart Visualization                                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ REST API (JSON)
┌─────────────────────────▼───────────────────────────────────────┐
│                      API Backend Layer                           │
│  FastAPI + CORS Middleware                                       │
│  - /api/upload (file ingestion)                                  │
│  - /api/chat (query execution)                                   │
│  - /api/export-pdf (report generation)                           │
│  - /api/transcribe (voice-to-text dictation)                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                   Core Processing Layer                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            |
│  │  LangGraph   │  │  RAG Pipeline│  │  SQL Engine  │            │
│  │ State Machine│  │              │  │              │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │ 
│  │  Evaluator   │  │  Reporter    │  │  Citation    │            │
│  │  (RAGAS)     │  │  Compiler    │  │  Engine      │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      Data Storage Layer                         │
│  - ChromaDB (Vector Store)                                      │
│  - SQLite (Relational Database)                                 │
│  - File System (Documents, Logs)                                │
└─────────────────────────────────────────────────────────────────┘
```


### Technology Decisions

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Orchestration | LangGraph | Stateful graphs for conditional routing and retry loops |
| LLM | Gemini/OpenAI | Interchangeable via LangChain abstractions |
| Vector Store | ChromaDB | Embedded, no external dependencies |
| Sparse Search | BM25 | Keyword-exact retrieval complement |
| Reranking | Cohere API | Cross-encoder relevance scoring |
| Database | SQLite | Zero-config, file-based |
| SQL Security | sqlparse | AST inspection blocks destructive queries |
| Evaluation | RAGAS | Answer quality metrics |
| Backend | FastAPI | Async, auto-docs |
| Frontend | React+Vite | Modern SPA with fast HMR |
| Styling | Tailwind | Utility-first, dark mode |
| Charts | Recharts | Declarative React charting |

### Data Flow Patterns

**File Upload Flow:**
```
User → Upload UI → POST /api/upload → File Router
  ├─ PDF/DOCX → Extract → Chunk (500 tokens) → Embed → ChromaDB
  └─ CSV → Parse → Infer Schema → CREATE TABLE → SQLite
```

**Query Execution Flow:**
```
Voice Dictation → POST /api/transcribe → Groq Whisper Transcription
User Query → POST /api/chat → LangGraph State Machine
  ├─ Router: Classify intent (rag/sql/hybrid)
  ├─ RAG: Vector + BM25 → Rerank → Top 3 chunks
  ├─ SQL: Schema → Generate → Validate AST → Execute (retry on error)
  ├─ Merge: Synthesize answer from chunks + SQL results
  ├─ Chart: Detect tabular data → Generate config
  └─ Evaluate: Compute RAGAS metrics
```

## Components and Interfaces

### 1. File Processor

**Responsibility:** Route uploaded files to appropriate processing pipelines

**Interface:**
```python
async def process_file(file: UploadFile) -> ProcessingResult
```

**Key Operations:**
- PDF/DOCX: Extract text → Chunk → Embed → Store in ChromaDB
- CSV: Parse → Infer schema → Bulk insert to SQLite

### 2. RAG Pipeline

**Responsibility:** Hybrid document retrieval with reranking

**Interface:**
```python
async def retrieve(query: str, top_k: int = 10, rerank_n: int = 3) -> List[Citation]
```

**Pipeline Steps:**
1. Vector similarity search (ChromaDB)
2. BM25 keyword search
3. Merge and deduplicate
4. Cohere rerank to top-3
5. Extract citation metadata (source, page, text)

### 3. SQL Engine

**Responsibility:** Natural language to SQL with validation and auto-retry

**Interface:**
```python
async def execute_query(user_query: str, max_retries: int = 3) -> SQLResult
```

**Execution Flow:**
1. Extract database schema (tables, columns, sample rows)
2. LLM generates SQL query
3. AST validation via SQL Guardian
4. Execute with 5-second timeout
5. On error: append error to context, regenerate, retry (max 3)

### 4. SQL Guardian

**Responsibility:** Block destructive SQL operations via AST inspection

**Interface:**
```python
def validate(sql_query: str) -> ValidationResult
```

**Security Rules:**
- Parse SQL to AST using sqlparse
- Reject queries containing: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE
- Only SELECT statements allowed

### 5. LangGraph State Machine

**Responsibility:** Orchestrate query execution with conditional routing

**State Schema:**
```python
class AgentState(TypedDict):
    query: str
    intent: str  # "rag" | "sql" | "hybrid"
    retrieved_chunks: List[dict]
    sql_query: str
    sql_results: List[dict]
    sql_error: str
    sql_retry_count: int
    response_text: str
    citations: List[dict]
    chart_config: dict
    evaluation_metrics: dict
```

**Graph Structure:**
```
START → router → {rag, sql, hybrid}
  rag → merge
  sql → merge
  hybrid → rag → sql → merge
merge → chart → evaluate → END
```

**Node Responsibilities:**
- **router**: Classify intent using LLM
- **rag**: Execute hybrid retrieval pipeline
- **sql**: Generate and execute SQL with retry logic
- **merge**: Synthesize answer from all contexts
- **chart**: Detect tabular patterns, generate Recharts config
- **evaluate**: Compute RAGAS metrics

### 6. Chart Generator

**Responsibility:** Auto-detect visualization patterns in SQL results

**Interface:**
```python
def generate_config(sql_results: List[dict]) -> ChartConfig
```

**Chart Type Heuristics:**
- Temporal categorical column → Line chart
- Numeric sum ≈ 100 → Pie chart
- Default → Bar chart

### 7. RAGAS Evaluator

**Responsibility:** Compute answer quality metrics

**Interface:**
```python
async def evaluate(query: str, answer: str, contexts: List[str]) -> Metrics
```

**Metrics:**
- **Faithfulness**: Is answer grounded in retrieved chunks?
- **Answer Relevance**: Does answer address the query?
- **Context Recall**: Did retrieval find all relevant information?

### 8. Report Compiler

**Responsibility:** Generate PDF exports with queries, answers, tables, charts

**Interface:**
```python
def generate_pdf(session_data: dict) -> bytes
```

**PDF Sections:**
- Title and timestamp
- Query/answer pairs
- SQL result tables (ReportLab Table)
- Chart images (matplotlib → PNG)
- Citations list

## Data Models

### AgentState
```python
class AgentState(TypedDict):
    query: str                   # User's natural language query
    intent: str                  # Routing decision ("rag" | "sql" | "hybrid")
    retrieved_chunks: List[dict] # RAG results with scores
    sql_query: str               # Generated SQL
    sql_results: List[dict]      # Query execution results
    sql_error: str               # Error message if SQL fails
    sql_retry_count: int         # Retry counter for self-correction
    response_text: str           # Final synthesized answer
    citations: List[dict]        # Source references
    chart_config: dict           # Visualization specification
    evaluation_metrics: dict     # Quality scores
```

### Citation
```python
class Citation(TypedDict):
    source: str      # Filename
    page: int        # Page number
    text: str        # Exact text span
    score: float     # Relevance score from reranker
```

### ChartConfig
```python
class ChartConfig(TypedDict):
    type: str        # "bar" | "line" | "pie"
    data: List[dict] # SQL results
    xAxis: str       # Column name for x-axis
    yAxis: str       # Column name for y-axis
    title: str       # Chart title
```

### API Schemas

**Upload Response:**
```python
class UploadResponse(BaseModel):
    status: str              # "success" | "error"
    message: str
    file_id: str
    filename: str
    processing_status: str   # "completed" | "failed"
```

**Chat Request:**
```python
class ChatRequest(BaseModel):
    query: str
    session_id: str
```

**Chat Response:**
```python
class ChatResponse(BaseModel):
    status: str
    intent: str
    answer: str
    citations: List[Citation]
    sql_query: Optional[str]
    sql_results: Optional[List[dict]]
    chart_config: Optional[ChartConfig]
    evaluation_metrics: dict
```

## Correctness Properties

### Security Invariants
1. **SQL Safety**: All SQL queries MUST pass AST validation before execution
2. **Read-Only Database**: Only SELECT statements permitted, no mutations
3. **Execution Timeout**: Queries terminated after 5 seconds max
4. **Input Validation**: File types restricted to PDF, DOCX, CSV, SQLite

### Data Integrity
1. **Citation Traceability**: Every answer chunk MUST link to source document and page
2. **Retry Idempotency**: SQL retry logic must not modify state on failure
3. **Atomic Processing**: File uploads complete fully or roll back entirely

### Quality Guarantees
1. **Retrieval Relevance**: Reranker ensures top-3 chunks are contextually relevant
2. **Answer Grounding**: RAGAS faithfulness metric detects hallucinations
3. **Schema Accuracy**: SQL generation receives up-to-date schema with sample data

## Error Handling

### File Processing Errors
- **Invalid file type** → 400 error with supported types list
- **Parsing failure** → Log error, return descriptive message with failure point
- **Embedding timeout** → Retry once, then mark file as failed

### SQL Execution Errors
- **Security violation** → Reject immediately, log attempt, return violation type
- **Syntax error** → Auto-retry with error context (max 3 attempts)
- **Timeout** → Return timeout message, suggest query simplification
- **Max retries exceeded** → Return final error, log full retry history

### RAG Errors
- **No documents found** → Return "No relevant documents" message
- **Reranker API failure** → Fall back to vector search results without reranking
- **Empty retrieval** → Check if ChromaDB has indexed documents, guide user

### System Errors
- **LLM API failure** → Return service unavailable, log provider and error
- **ChromaDB connection loss** → Attempt reconnect, fail gracefully with message
- **SQLite lock** → Wait and retry with exponential backoff

## Testing Strategy

### Unit Tests
- **SQL Guardian**: Test prohibited keyword detection across all mutation types
- **Chart Generator**: Verify correct chart type selection for various data patterns
- **File Processor**: Test each file type parsing and error cases

### Integration Tests
- **End-to-End Query Flow**: Upload CSV → Ask question → Verify SQL execution → Check chart generation
- **Hybrid Routing**: Queries requiring both RAG and SQL produce merged answers
- **Self-Correction**: SQL errors trigger retry with corrected query

### Security Tests
- **SQL Injection Prevention**: Attempt malicious queries, verify AST blocks them
- **File Upload Validation**: Try unauthorized file types, confirm rejection
- **Timeout Enforcement**: Run expensive queries, verify 5-second termination

### Evaluation Tests
- **RAGAS Baseline**: Maintain faithfulness > 0.85, relevance > 0.80
- **Retrieval Quality**: Top-3 reranked chunks should contain answer
- **Citation Accuracy**: Verify page numbers and text spans match source documents
