# Tasks

## Task 1: Project Setup and Configuration
**Status:** pending
**Depends On:** None

### Description
Initialize the project structure, configure development environment, and set up foundational dependencies for both backend and frontend.

### Implementation Steps
1. Create project directory structure:
   - `backend/app/{core,api,database}`
   - `frontend/src/{components,context}`
   - `data/{documents,sqlite,chroma}`
2. Initialize Python virtual environment
3. Create `backend/requirements.txt` with all dependencies
4. Create `backend/.env.example` template
5. Initialize React project with Vite in `frontend/`
6. Configure Tailwind CSS for frontend
7. Set up Git repository with `.gitignore`

### Acceptance Criteria
- [ ] All directory structures created
- [ ] Python venv activated and dependencies installable
- [ ] Frontend dev server starts without errors
- [ ] Environment variables template documented

---

## Task 2: FastAPI Backend Core
**Status:** pending
**Depends On:** Task 1

### Description
Build the FastAPI application skeleton with CORS, middleware, and API route scaffolding.

### Implementation Steps
1. Create `backend/app/config.py` for environment variable management
2. Create `backend/app/main.py` with FastAPI app initialization
3. Add CORS middleware configuration
4. Create placeholder route files in `api/routes.py`
5. Create Pydantic schemas in `api/schemas.py`
6. Test server startup and OpenAPI docs at `/docs`

### Acceptance Criteria
- [ ] FastAPI server runs on `http://localhost:8000`
- [ ] CORS allows frontend requests
- [ ] `/docs` displays Swagger UI
- [ ] Health check endpoint responds

---

## Task 3: File Upload and Processing Pipeline
**Status:** pending
**Depends On:** Task 2

### Description
Implement file upload endpoint with routing logic for PDF, DOCX, and CSV files.

### Implementation Steps
1. Create `/api/upload` POST endpoint
2. Implement file type validation (PDF, DOCX, CSV, SQLite)
3. Create async file processor router
4. Add file storage logic to `data/documents/`
5. Implement error handling for invalid files
6. Return processing status and file metadata

### Acceptance Criteria
- [ ] Accepts multipart/form-data uploads
- [ ] Validates file types correctly
- [ ] Stores files in appropriate directories
- [ ] Returns proper error messages for invalid files
- [ ] Processing completes within 30 seconds for <10MB files

---

## Task 4: Document Text Extraction and Chunking
**Status:** pending
**Depends On:** Task 3

### Description
Build document processing pipeline for extracting text from PDFs and DOCX files, then chunking for embeddings.

### Implementation Steps
1. Create `backend/app/core/rag.py`
2. Implement PDF text extraction using PyMuPDF
3. Implement DOCX text extraction using python-docx
4. Configure LangChain RecursiveCharacterTextSplitter (500 tokens, 50 overlap)
5. Add page number tracking to chunk metadata
6. Handle extraction errors gracefully

### Acceptance Criteria
- [ ] PDF text extraction preserves page numbers
- [ ] DOCX extraction handles formatting
- [ ] Chunks average 500 tokens with 50-token overlap
- [ ] Metadata includes source filename and page
- [ ] Async processing doesn't block API

---

## Task 5: ChromaDB Vector Store Integration
**Status:** pending
**Depends On:** Task 4

### Description
Set up ChromaDB for storing and retrieving document embeddings with metadata.

### Implementation Steps
1. Initialize ChromaDB client pointing to `data/chroma/`
2. Configure embedding model (OpenAI or Gemini based on env)
3. Implement `add_documents()` function with metadata
4. Implement `similarity_search()` function
5. Test embedding generation and storage
6. Add collection management utilities

### Acceptance Criteria
- [ ] ChromaDB persists to local directory
- [ ] Embeddings generated correctly (768 or 1536 dim)
- [ ] Metadata stored with each chunk
- [ ] Similarity search returns relevant results
- [ ] Handles empty/missing collections gracefully

---

## Task 6: BM25 Hybrid Search Implementation
**Status:** pending
**Depends On:** Task 5

### Description
Add BM25 sparse retrieval to complement vector search for hybrid retrieval.

### Implementation Steps
1. Install and configure rank-bm25 library
2. Build BM25 index from document chunks
3. Implement `bm25_search()` function
4. Create result merging logic (vector + BM25)
5. Add deduplication for merged results
6. Return top-10 candidates from hybrid search

### Acceptance Criteria
- [ ] BM25 index built from all documents
- [ ] Keyword-exact queries return correct matches
- [ ] Hybrid results merge vector and BM25 scores
- [ ] Deduplication removes identical chunks
- [ ] Returns top-10 diverse candidates

---

## Task 7: Cohere Reranking Integration
**Status:** pending
**Depends On:** Task 6

### Description
Integrate Cohere Rerank API to re-score hybrid search results by relevance.

### Implementation Steps
1. Add Cohere API key to environment config
2. Implement Cohere rerank API client
3. Send top-10 hybrid candidates to reranker
4. Extract top-3 highest-scoring chunks
5. Add relevance scores to citation metadata
6. Handle API failures gracefully (fallback to hybrid results)

### Acceptance Criteria
- [ ] Cohere API authenticated correctly
- [ ] Reranking improves retrieval relevance
- [ ] Top-3 chunks have highest cross-encoder scores
- [ ] Fallback works when API unavailable
- [ ] Reranking completes within 3 seconds

---

## Task 8: CSV to SQLite Ingestion
**Status:** pending
**Depends On:** Task 3

### Description
Parse CSV files and automatically create SQLite tables with inferred schemas.

### Implementation Steps
1. Create `backend/app/core/sql.py`
2. Implement CSV parser using Pandas
3. Add schema inference logic (detect column types)
4. Generate CREATE TABLE statements dynamically
5. Bulk insert CSV rows to SQLite in `data/sqlite/analyst.db`
6. Sanitize table names from filenames
7. Test with various CSV formats

### Acceptance Criteria
- [ ] CSV parsed to DataFrame successfully
- [ ] Column types inferred correctly (int, float, text)
- [ ] SQLite table created with proper schema
- [ ] All rows inserted via bulk operation
- [ ] Handles <10K rows within 45 seconds
- [ ] Error messages indicate parsing issues with row numbers

---

## Task 9: SQL Schema Extraction
**Status:** pending
**Depends On:** Task 8

### Description
Extract database schema metadata to provide context for SQL generation.

### Implementation Steps
1. Implement SQLAlchemy connection to SQLite
2. Use Inspector to get table names
3. Extract column names and types for each table
4. Query sample rows (LIMIT 3) from each table
5. Format schema as semantic text description
6. Cache schema to avoid repeated queries

### Acceptance Criteria
- [ ] Extracts all table names from database
- [ ] Lists columns with data types
- [ ] Includes 3 sample rows per table
- [ ] Formatted as LLM-readable description
- [ ] Updates when new tables added

---

## Task 10: SQL Guardian (AST Validator)
**Status:** pending
**Depends On:** Task 9

### Description
Build security validator that blocks destructive SQL operations via AST inspection.

### Implementation Steps
1. Create `SQLGuardian` class
2. Use sqlparse to parse SQL into AST
3. Check for prohibited keywords: INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE
4. Ensure only SELECT statements allowed
5. Return validation result with violation details
6. Add comprehensive test suite for all prohibited operations

### Acceptance Criteria
- [ ] Parses SQL to AST correctly
- [ ] Rejects all mutation operations
- [ ] Allows valid SELECT queries
- [ ] Returns descriptive violation messages
- [ ] Validation completes within 500ms
- [ ] 100% test coverage for security rules

---

## Task 11: Natural Language to SQL Generation
**Status:** pending
**Depends On:** Task 9, Task 10

### Description
Use LLM to generate SQL queries from natural language with schema context.

### Implementation Steps
1. Create SQL generation prompt template
2. Include schema metadata in prompt
3. Send prompt to configured LLM (Gemini/OpenAI)
4. Extract SQL query from LLM response
5. Validate generated SQL with SQL Guardian
6. Handle generation failures

### Acceptance Criteria
- [ ] LLM generates syntactically valid SQL
- [ ] Schema context helps with correct table/column names
- [ ] Extraction handles code blocks and plain text
- [ ] Guardian validation runs before execution
- [ ] Generation completes within 5 seconds

---

## Task 12: SQL Execution with Timeout
**Status:** pending
**Depends On:** Task 11

### Description
Execute validated SQL queries with timeout protection and result formatting.

### Implementation Steps
1. Implement SQLAlchemy execution wrapper
2. Add 5-second timeout to queries
3. Format results as list of dictionaries
4. Handle empty result sets
5. Capture SQLite errors with full messages
6. Log query execution time

### Acceptance Criteria
- [ ] Queries execute successfully
- [ ] Timeout enforced at 5 seconds
- [ ] Results formatted as JSON-serializable dicts
- [ ] Empty results return []
- [ ] Error messages captured correctly

---

## Task 13: Self-Correcting SQL Agent
**Status:** pending
**Depends On:** Task 12

### Description
Implement retry logic that auto-corrects failed SQL queries using error feedback.

### Implementation Steps
1. Create retry loop with max 3 attempts
2. On error, append error message to LLM context
3. Request corrected SQL query from LLM
4. Re-validate with SQL Guardian
5. Re-execute corrected query
6. Track retry count in agent state
7. Return final error if all retries fail

### Acceptance Criteria
- [ ] Retries up to 3 times on error
- [ ] Error context helps LLM correct mistakes
- [ ] Corrected queries re-validated
- [ ] Succeeds on fixable errors (typos, wrong columns)
- [ ] Returns failure message after 3 attempts

---

## Task 14: LangGraph State Machine Setup
**Status:** pending
**Depends On:** Task 7, Task 13

### Description
Build LangGraph state machine for orchestrating RAG and SQL workflows.

### Implementation Steps
1. Create `backend/app/core/agent.py`
2. Define `AgentState` TypedDict
3. Create StateGraph instance
4. Implement router node for intent classification
5. Implement RAG node
6. Implement SQL node
7. Implement merge node
8. Define conditional edges based on intent
9. Compile and test graph execution

### Acceptance Criteria
- [ ] AgentState tracks all required fields
- [ ] Router classifies intent correctly
- [ ] Conditional edges route to correct nodes
- [ ] State propagates through all nodes
- [ ] Graph compiles without errors

---

## Task 15: Answer Synthesis and Merging
**Status:** pending
**Depends On:** Task 14

### Description
Synthesize final answers by combining RAG chunks and SQL results.

### Implementation Steps
1. Implement merge node logic
2. Format document chunks with citations
3. Format SQL results as structured data
4. Create synthesis prompt combining all contexts
5. Send to LLM for answer generation
6. Extract and store synthesized answer
7. Preserve citation metadata

### Acceptance Criteria
- [ ] Combines RAG and SQL contexts
- [ ] LLM produces coherent synthesis
- [ ] Citations linked to answer
- [ ] Handles missing contexts gracefully
- [ ] Synthesis completes within 10 seconds

---

## Task 16: Chart Configuration Generator
**Status:** pending
**Depends On:** Task 15

### Description
Detect tabular SQL results and generate Recharts visualization configs.

### Implementation Steps
1. Create `ChartGenerator` class
2. Implement column type inference (numeric vs categorical)
3. Add chart type selection heuristics
4. Generate Recharts JSON configuration
5. Handle edge cases (< 2 rows, no numeric columns)
6. Test with various data patterns

### Acceptance Criteria
- [ ] Detects numeric and categorical columns
- [ ] Selects appropriate chart types
- [ ] Generates valid Recharts config
- [ ] Skips charts for unsuitable data
- [ ] Temporal data triggers line charts

---

## Task 17: RAGAS Evaluation Integration
**Status:** pending
**Depends On:** Task 15

### Description
Implement RAGAS metrics to evaluate answer quality.

### Implementation Steps
1. Create `backend/app/core/evaluator.py`
2. Configure RAGAS with faithfulness, answer_relevancy, context_recall
3. Format evaluation dataset
4. Run RAGAS evaluation
5. Extract metric scores
6. Store in agent state
7. Handle evaluation errors gracefully

### Acceptance Criteria
- [ ] RAGAS evaluates answers correctly
- [ ] Faithfulness detects hallucinations
- [ ] Answer relevancy scores accuracy
- [ ] Context recall measures retrieval quality
- [ ] Evaluation completes within 8 seconds

---

## Task 18: Session Logging and Observability
**Status:** pending
**Depends On:** Task 17

### Description
Add structured logging for query execution paths and metrics.

### Implementation Steps
1. Configure Python logging to `data/logs/session.log`
2. Log query inputs with timestamps
3. Log intent classification
4. Log node execution times
5. Log SQL queries and errors
6. Log evaluation metrics
7. Format as structured JSON

### Acceptance Criteria
- [ ] Logs persisted to file
- [ ] JSON format for easy parsing
- [ ] All execution paths logged
- [ ] Timestamps accurate
- [ ] No PII in logs

---

## Task 19: PDF Report Compiler
**Status:** pending
**Depends On:** Task 16

### Description
Generate exportable PDF reports with queries, answers, tables, and charts.

### Implementation Steps
1. Create `backend/app/core/reporter.py`
2. Use ReportLab for PDF generation
3. Add title and timestamp
4. Include query/answer pairs
5. Render SQL tables with ReportLab Table
6. Convert chart configs to matplotlib PNG images
7. Embed images in PDF
8. Add citations section

### Acceptance Criteria
- [ ] PDF generated with professional layout
- [ ] Tables formatted correctly
- [ ] Charts rendered as high-res images
- [ ] Citations included
- [ ] Generation completes within 15 seconds

---

## Task 20: Export PDF API Endpoint
**Status:** pending
**Depends On:** Task 19

### Description
Create endpoint for downloading PDF reports.

### Implementation Steps
1. Add `/api/export-pdf` GET endpoint
2. Accept session_id query parameter
3. Fetch session data from storage
4. Generate PDF using ReportCompiler
5. Stream PDF as downloadable file
6. Set proper Content-Type and headers

### Acceptance Criteria
- [ ] Endpoint returns PDF binary
- [ ] Filename includes timestamp
- [ ] Browser triggers download
- [ ] Works for active sessions
- [ ] Returns 404 for invalid sessions

---

## Task 21: Frontend Layout and Routing
**Status:** pending
**Depends On:** Task 2

### Description
Build React app shell with 3-column layout and routing.

### Implementation Steps
1. Create `frontend/src/App.jsx`
2. Implement 3-column grid layout (Sidebar | Chat | Charts)
3. Add Tailwind dark mode configuration
4. Create `ApiContext.jsx` for state management
5. Set up Axios for API calls
6. Configure Vite proxy for backend

### Acceptance Criteria
- [ ] 3-column layout renders correctly
- [ ] Dark mode enabled by default
- [ ] ApiContext provides session state
- [ ] Axios configured with base URL
- [ ] Frontend connects to backend

---

## Task 22: File Upload UI Component
**Status:** pending
**Depends On:** Task 21

### Description
Build drag-and-drop file upload interface.

### Implementation Steps
1. Create `FileUploader.jsx` component
2. Implement drag-and-drop handlers
3. Add click-to-browse file selection
4. Display upload progress indicator
5. Show uploaded files in sidebar
6. Call `/api/upload` endpoint
7. Handle upload errors

### Acceptance Criteria
- [ ] Drag-and-drop works smoothly
- [ ] Click-to-browse functional
- [ ] Progress indicator shows upload status
- [ ] Success notification displayed
- [ ] Error messages clear
- [ ] File list updates after upload

---

## Task 23: Chat Interface Component
**Status:** pending
**Depends On:** Task 21

### Description
Build conversational chat window with message rendering.

### Implementation Steps
1. Create `ChatWindow.jsx` component
2. Render user messages (right-aligned)
3. Render system messages (left-aligned)
4. Parse and display markdown
5. Render SQL tables as HTML
6. Add expandable citation footnotes
7. Implement query input field
8. Call `/api/chat` endpoint
9. Show loading states with node-specific messages

### Acceptance Criteria
- [ ] Messages render with proper alignment
- [ ] Markdown formatted correctly
- [ ] Tables display nicely
- [ ] Citations expandable
- [ ] Loading indicators show current node
- [ ] Input field sends queries
- [ ] Error messages displayed

---

## Task 24: Chart Visualization Component
**Status:** pending
**Depends On:** Task 21

### Description
Render interactive charts using Recharts library.

### Implementation Steps
1. Create `ChartRenderer.jsx` component
2. Parse chart config from API response
3. Render bar charts
4. Render line charts
5. Render pie charts
6. Add chart type toggle controls
7. Show tooltips on hover
8. Handle missing chart configs

### Acceptance Criteria
- [ ] Bar charts render correctly
- [ ] Line charts display properly
- [ ] Pie charts formatted well
- [ ] Tooltips interactive
- [ ] Toggle switches chart types
- [ ] Hides when no config available

---

## Task 25: Theme Toggle and Responsive Design
**Status:** pending
**Depends On:** Task 21

### Description
Add dark/light mode toggle and responsive styling.

### Implementation Steps
1. Create theme toggle button in Sidebar
2. Implement theme switching logic
3. Persist theme to localStorage
4. Apply Tailwind dark mode classes
5. Test responsive layout (1024px-2560px)
6. Add smooth transitions

### Acceptance Criteria
- [ ] Toggle switches between dark/light
- [ ] Theme persisted across reloads
- [ ] Dark mode uses slate backgrounds
- [ ] Light mode uses white backgrounds
- [ ] Layout responsive on various screens
- [ ] Transitions smooth

---

## Task 26: End-to-End Integration Testing
**Status:** pending
**Depends On:** Task 20, Task 24

### Description
Test complete user workflows from upload to export.

### Implementation Steps
1. Test: Upload PDF → Query document → Verify RAG response
2. Test: Upload CSV → Query data → Verify SQL execution → Check chart
3. Test: Hybrid query → Verify both RAG and SQL used
4. Test: Export PDF → Verify download
5. Test: Self-correction → Trigger SQL error → Verify retry
6. Test: Security → Attempt DROP query → Verify blocked
7. Fix discovered issues

### Acceptance Criteria
- [ ] All user workflows functional
- [ ] RAG retrieves correct documents
- [ ] SQL generates correct queries
- [ ] Charts display properly
- [ ] PDF exports successfully
- [ ] Self-correction works
- [ ] Security guardrails effective

---

## Task 27: Documentation and Deployment Preparation
**Status:** pending
**Depends On:** Task 26

### Description
Write README, setup instructions, and prepare for deployment.

### Implementation Steps
1. Write comprehensive README.md
2. Document .env configuration
3. Create setup script for dependencies
4. Write API documentation
5. Add architecture diagrams
6. Document troubleshooting steps
7. Prepare Docker configuration (optional)

### Acceptance Criteria
- [ ] README explains project purpose
- [ ] Setup instructions clear and complete
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Architecture diagrams included
- [ ] Troubleshooting guide helpful
