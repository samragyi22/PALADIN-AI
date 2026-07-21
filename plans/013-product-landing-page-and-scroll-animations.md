# Plan 013: Animated Product Landing Page

## Affected Surfaces
- **Files**: `frontend/src/pages/LandingPage.jsx` [NEW], `frontend/src/App.jsx`
- **Components**: Public Landing Page (`/`)

## Section Structure (Grounded in README Features)
1. **Hero Section**:
   - Badge: *"Powered by LangGraph Agentic Orchestration"*
   - Title: *"Multi-Modal Enterprise Intelligence Console"*
   - Subhead: *"Query, analyze, and visualize unstructured documents (PDF, DOCX) and structured databases (CSV, SQLite) simultaneously using natural language."*
   - CTA Buttons: **"Get Started Free"** (`/signup`), **"Live Workspace Demo"** (`/workspace`).
2. **How It Works (Pipeline Architecture)**:
   - Visual step-by-step pipeline cards:
     1. *Query Intent Router* -> 2. *Hybrid RAG + Text-to-SQL Execution* -> 3. *AST Validation & Recharts Synthesis* -> 4. *LLM-as-Judge Evaluation Metrics*.
3. **Key Feature Grid (6 Core Cards)**:
   - *Multi-Modal Hybrid RAG* (ChromaDB + BM25 + OCR)
   - *Dual SQL Engine & AST Guardian* (SQLite + Safety AST parser)
   - *Automated Recharts Visualizer* (Bar, Line, Area, Pie)
   - *Voice Ingestion* (Groq Whisper-large-v3-turbo)
   - *LLM-as-Judge Metrics* (Faithfulness & Relevancy scores)
   - *Enterprise PDF Reporting* (ReportLab compilation)
4. **Interactive Workspace Visual Mockup**:
   - Glowing preview container showcasing the 3-column AI console.
5. **Footer & Final CTA**:
   - *"Transform your enterprise data analytics today."*

## Motion Specifications
- **Scroll Reveal Animations**: IntersectionObserver triggered slide-up fade (`opacity: 0, translateY(20px)` -> `opacity: 1, translateY(0)`) over 300ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Reduced Motion**: Under `prefers-reduced-motion: reduce`, all scroll sections render at static `opacity: 1` without scroll transforms.
