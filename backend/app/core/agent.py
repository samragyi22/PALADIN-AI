import re
import time
from typing import TypedDict, List, Dict, Any, Optional
import pandas as pd
from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.core.sql import get_llm, translate_and_execute_sql
from app.core.rag import retrieve
from app.core.evaluator import evaluate_answer
from app.core.logger import log_session_event

# Define state structure
class AgentState(TypedDict):
    query: str
    intent: str  # "rag" | "sql" | "hybrid"
    retrieved_chunks: List[Dict[str, Any]]
    sql_query: Optional[str]
    sql_results: Optional[List[Dict[str, Any]]]
    sql_error: Optional[str]
    sql_retry_count: int
    response_text: str
    citations: List[Dict[str, Any]]
    chart_config: Optional[Dict[str, Any]]
    evaluation_metrics: Dict[str, Any]
    active_files: Optional[List[str]]
    history: Optional[List[Dict[str, Any]]]
    standalone_query: Optional[str]

# 0. Query Rewriter Node: Rewrites queries to resolve conversational context (it, his, her, they, etc.)
async def query_rewriter_node(state: AgentState) -> Dict[str, Any]:
    query = state["query"]
    history = state.get("history") or []
    
    if not history:
        return {"standalone_query": query}
        
    system_prompt = """You are a helpful conversational AI assistant. Your task is to analyze the conversation history and the latest user follow-up query, and rewrite it into a single, standalone search query that contains all necessary context (like names, nouns, and entities).

Rules:
- Do NOT answer the question. Only rewrite it.
- Keep it concise and search-oriented.
- If the question is already a standalone question that doesn't refer to pronouns or context from history, return it exactly as-is.
- Keep file names or specific keywords from the history if relevant.

Example:
History:
User: Tell me about employee Kartik Bhardwaj.
AI: Kartik Bhardwaj is a Software Engineer simulation candidate.
Follow-up: What is his salary?
Output: What is the salary of Kartik Bhardwaj?
"""
    
    # Format history turns (last 3 turns to keep it fast)
    formatted_turns = []
    for turn in history[-3:]:
        user_text = turn.get("query") or ""
        ai_text = turn.get("answer") or turn.get("response_text") or ""
        if user_text:
            formatted_turns.append(f"User: {user_text}")
        if ai_text:
            formatted_turns.append(f"AI: {ai_text}")
            
    history_text = "\n".join(formatted_turns)
    
    try:
        llm = get_llm()
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"History:\n{history_text}\n\nFollow-up query: {query}\n\nStandalone Query:")
        ])
        standalone = response.content.strip()
        print(f"[Query Rewriter] Rewrote: '{query}' -> '{standalone}'")
        return {"standalone_query": standalone}
    except Exception as e:
        print(f"[Query Rewriter] Failed: {e}")
        return {"standalone_query": query}

# 1. Router Node: Classifies query intent
async def router_node(state: AgentState) -> Dict[str, Any]:
    # Use standalone query for classification so it gets full historical context
    query = state.get("standalone_query") or state["query"]
    start_time = time.time()
    
    system_prompt = """You are a smart query intent classifier. Classify the user's query into exactly ONE of three categories:

1. "rag": Choose this when the user asks about:
   - Content of uploaded documents (PDFs, Word files, certificates, marksheets, resumes)
   - Policies, procedures, contracts, summaries, articles
   - Calculations or analysis BASED ON document content (e.g. "calculate my percentage", "what is my total marks", "what grade did I get", "summarize this document")
   - Any question where the answer requires reading/understanding an uploaded file

2. "sql": Choose this ONLY when the user asks about:
   - Structured database records from uploaded CSV or SQLite files
   - SQL-style aggregations: averages, counts, sums across database tables
   - Orders, transactions, products, revenue data from a database

3. "hybrid": Choose this when the query requires BOTH document content AND database data simultaneously.

CRITICAL RULES:
- If the user asks to calculate/compute something from a document (marksheet, transcript, report), classify as "rag" NOT "sql".
- If no database/CSV has been uploaded, NEVER classify as "sql".
- When in doubt between "rag" and "sql", prefer "rag".

Respond ONLY with one word: "rag", "sql", or "hybrid". No explanation."""
    
    try:
        llm = get_llm()
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=query)
        ])
        
        intent = response.content.strip().lower()
        intent = re.sub(r'[^a-z]', '', intent)
        if intent not in ["rag", "sql", "hybrid"]:
            intent = fallback_router(query)
    except Exception as e:
        print(f"Routing LLM call failed: {e}. Using fallback classifier.")
        intent = fallback_router(query)
        
    elapsed = time.time() - start_time
    log_session_event(
        "Intent classification completed",
        query=query,
        intent=intent,
        node="router",
        elapsed_seconds=elapsed
    )
    
    print(f"[Router Node] Classified query intent as: '{intent}'")
    return {"intent": intent}

def fallback_router(query: str) -> str:
    query_lower = query.lower()
    sql_keywords = ["average", "count", "sum", "sales", "revenue", "price", "order", "product", "total", "table", "database", "csv"]
    rag_keywords = [
        # Document/policy terms
        "policy", "contract", "agreement", "guideline", "rule", "penalty", "term", "cancellation", "document",
        # Education/marksheet terms  
        "mark", "marks", "marksheet", "grade", "percentage", "subject", "score", "result", "exam",
        "certificate", "cbse", "board", "school", "college", "gpa", "cgpa", "transcript",
        # Calculation on document
        "calculate", "compute", "what is my", "how much", "how many", "tell me about", "summarize", "analyse",
        # Resume/profile
        "resume", "experience", "skill", "qualification", "education", "job", "work",
    ]
    
    has_sql = any(w in query_lower for w in sql_keywords)
    has_rag = any(w in query_lower for w in rag_keywords)
    
    if has_sql and has_rag:
        return "hybrid"
    elif has_sql:
        return "sql"
    else:
        return "rag"  # Default to RAG when no clear SQL signal

# 2. RAG Node: Performs document retrieval
async def rag_node(state: AgentState) -> Dict[str, Any]:
    query = state.get("standalone_query") or state["query"]
    active_files = state.get("active_files")
    start_time = time.time()
    print("[RAG Node] Retrieving relevant document chunks...")
    
    try:
        chunks = await retrieve(query, top_k=10, rerank_n=3, active_files=active_files)
        citations = []
        for c in chunks:
            citations.append({
                "source": c["metadata"].get("source", "unknown"),
                "page": c["metadata"].get("page", 1),
                "text": c["text"],
                "score": c.get("score", 0.0)
            })
        print(f"[RAG Node] Retrieved {len(chunks)} chunks.")
    except Exception as e:
        print(f"[RAG Node] Retrieval error: {e}")
        chunks = []
        citations = []
        
    elapsed = time.time() - start_time
    log_session_event(
        "Document retrieval completed",
        query=query,
        chunks_count=len(chunks),
        node="rag",
        elapsed_seconds=elapsed
    )
    
    return {
        "retrieved_chunks": chunks,
        "citations": citations
    }

# 3. SQL Node: Translates and executes SQL
async def sql_node(state: AgentState) -> Dict[str, Any]:
    query = state.get("standalone_query") or state["query"]
    active_files = state.get("active_files")
    start_time = time.time()
    print("[SQL Node] Translating query and executing SQL...")
    
    try:
        db_path = settings.sqlite_db_path
        result = await translate_and_execute_sql(query, db_path, active_files=active_files)
        print(f"[SQL Node] Execution success? {result['success']}. Rows returned: {len(result['sql_results']) if result['sql_results'] else 0}")
    except Exception as e:
        print(f"[SQL Node] SQL processing error: {e}")
        result = {
            "sql_query": None,
            "sql_results": [],
            "error": str(e),
            "retry_count": 0
        }
        
    elapsed = time.time() - start_time
    log_session_event(
        "SQL query translation and execution completed",
        query=query,
        sql_query=result["sql_query"],
        sql_retry_count=result["retry_count"],
        sql_error=result["error"],
        node="sql",
        elapsed_seconds=elapsed
    )
    
    return {
        "sql_query": result["sql_query"],
        "sql_results": result["sql_results"],
        "sql_error": result["error"],
        "sql_retry_count": result["retry_count"]
    }

# 4. Merge Node: Synthesizes final answer
async def merge_node(state: AgentState) -> Dict[str, Any]:
    query = state["query"]
    history = state.get("history") or []
    retrieved_chunks = state.get("retrieved_chunks", [])
    sql_results = state.get("sql_results", [])
    sql_error = state.get("sql_error")
    start_time = time.time()
    
    print("[Merge Node] Synthesizing responses...")
    
    # Format history turns for context
    history_transcript = ""
    if history:
        history_transcript = "\n".join([
            f"User: {turn.get('query')}\nAI: {turn.get('answer') or turn.get('response_text')}"
            for turn in history[-4:]
        ])
        
    rag_context = ""
    if retrieved_chunks:
        rag_context = "\n".join([
            f"Document [{idx+1}] (Source: {chunk['metadata'].get('source')}, Page: {chunk['metadata'].get('page')}):\n{chunk['text']}"
            for idx, chunk in enumerate(retrieved_chunks)
        ])
        
    sql_context = ""
    if sql_results:
        try:
            sql_context = pd.DataFrame(sql_results).to_markdown(index=False)
        except Exception:
            sql_context = str(sql_results)

    system_prompt = """You are a world-class AI Document Analyst. Your goal is to synthesize a professional, highly structured, clean, and direct response to the user's query, matching the style of premium enterprise tools like ChatGPT.

## PRESENTATION & DESIGN PRINCIPLES (CHATGPT STYLE)

1. **Dynamic Formatting (No Rigid Templates)**: Do NOT use a forced general template (like "Document Overview", "Detailed Analysis", "Key Insights") for every response. Instead, dynamically structure your output based on the user's query and the document type:
   - For **Resumes/CVs**: Use bold headers, bullet lists, and clear sub-headers like **Duration**, **Description**, **Tech Stack**, and **Key Achievements** (matching professional resume parsers).
   - For **Marksheets/Transcripts**: Use clean Markdown tables for scores, followed by step-by-step math for any calculations.
   - For **Policies/Contracts**: Group key clauses logically with bold headings.
2. **Concise and Direct**: Answer the question immediately. Avoid conversational filler, intros (like "Based on the provided data...", "According to the PDF..."), or generic concluding remarks.
3. **Beautiful Lists & Spacing**: Use clean bullet points. Indent nested details properly. Ensure there is clear spacing between sections so the output is easily readable.
4. **Citations as Source Pills**: Cite your sources inline using the exact source file name in brackets, e.g., `[Kartik_Resume.pdf]` or `[12Th Marksheet.pdf]`. Place these naturally at the end of sections or items.
5. **Strict Grounding**: Only state facts supported by the provided context. Do not hallucinate or guess.

## MATHEMATICAL CALCULATIONS

When asked to calculate totals, percentages, or averages from document data:
- **Percentage** = (Total Marks Obtained / Total Maximum Marks) × 100
- **Grade** determination (CBSE scale):
  - 90-100%: A1
  - 80-89%: A2
  - 70-79%: B1
  - 60-69%: B2
  - 50-59%: C1
  - 33-49%: C2
  - Below 33%: F (Fail)
- Show your step-by-step arithmetic clearly.

## HIGHLIGHTING RULE (CRITICAL — always follow this)

Identify the **single most important result** directly answering the user's question (e.g., a final percentage, a specific grade, a key number, a name, a date). Wrap ONLY that value in HTML `<mark>` tags.
- Use it ONCE per response.
- Only wrap short values: numbers, percentages, grades, names — NOT full sentences.
- Example: Your overall percentage is <mark>70.0%</mark>
- Do NOT mark entire sentences or paragraphs.

## FOLLOW-UP QUESTIONS RULE (MANDATORY)

At the very end of EVERY response, you MUST append a section titled "### 💬 You Can Also Ask" containing exactly 2-3 logical, high-value follow-up questions the user might want to ask next, based on the document content or data analyzed.
Format this section exactly like this:
### 💬 You Can Also Ask
- "first follow-up question"
- "second follow-up question"
- "third follow-up question"

Do NOT skip this section. It is mandatory for maintaining the conversational loop.

Here is the context data:
---
"""
    if history_transcript:
        system_prompt += f"RECENT CONVERSATION HISTORY (for continuity context):\n{history_transcript}\n\n"
    if rag_context:
        system_prompt += f"EXTRACTED DOCUMENT CONTENT:\n{rag_context}\n\n"
    if sql_context:
        system_prompt += f"SQL DATABASE QUERY RESULTS:\n{sql_context}\n\n"
    if sql_error:
        system_prompt += f"NOTE: Database query failed with error: {sql_error}\n\n"
    if not rag_context and not sql_context:
        system_prompt += "NOTE: No document or database context was retrieved. Inform the user politely and ask them to upload a document or rephrase their question.\n\n"
        
    system_prompt += "---\nProvide a clear, beautifully styled ChatGPT-like response adhering strictly to the guidelines above."

    try:
        llm = get_llm()
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=query)
        ])
        response_text = response.content
    except Exception as e:
        print(f"[Merge Node] LLM call failed: {e}")
        response_text = "Failed to synthesize a response due to an LLM service error."
        
    elapsed = time.time() - start_time
    log_session_event(
        "Response synthesis completed",
        query=query,
        node="merge",
        elapsed_seconds=elapsed
    )
    
    return {"response_text": response_text}

# 5. Chart Node: Auto-detects chart configurations
def generate_chart_config(sql_results: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not sql_results or len(sql_results) < 2:
        return None
        
    keys = list(sql_results[0].keys())
    if len(keys) < 2:
        return None
        
    categorical_col = None
    numeric_col = None
    
    for key in keys:
        is_numeric = True
        for row in sql_results:
            val = row.get(key)
            if val is None:
                continue
            try:
                float(val)
            except (ValueError, TypeError):
                is_numeric = False
                break
                
        if is_numeric and numeric_col is None:
            numeric_col = key
        elif not is_numeric and categorical_col is None:
            categorical_col = key

    if numeric_col is None:
        for key in keys:
            try:
                float(sql_results[0].get(key))
                numeric_col = key
                break
            except (ValueError, TypeError):
                continue
                
    if categorical_col is None:
        for key in keys:
            if key != numeric_col:
                categorical_col = key
                break
                
    if not numeric_col or not categorical_col:
        return None
        
    chart_type = "bar"
    is_time_series = False
    for row in sql_results:
        val_str = str(row.get(categorical_col, "")).lower()
        if any(w in val_str for w in ["month", "year", "date", "day", "week", "-", "/"]):
            is_time_series = True
            break
            
    if is_time_series:
        chart_type = "line"
    else:
        total_val = 0
        all_vals = []
        for row in sql_results:
            try:
                total_val += float(row.get(numeric_col, 0))
                all_vals.append(float(row.get(numeric_col, 0)))
            except (ValueError, TypeError):
                pass
        if len(all_vals) > 0 and 95 <= total_val <= 105:
            chart_type = "pie"
            
    return {
        "type": chart_type,
        "data": sql_results,
        "xAxis": categorical_col,
        "yAxis": numeric_col,
        "title": f"{numeric_col.replace('_', ' ').title()} by {categorical_col.replace('_', ' ').title()}"
    }

async def chart_node(state: AgentState) -> Dict[str, Any]:
    query = state["query"]
    response_text = state.get("response_text", "")
    sql_results = state.get("sql_results") or []
    
    # Check if the query explicitly asks for graphical representation, chart, plot, or visualization
    query_lower = query.lower()
    needs_chart = any(w in query_lower for w in ["chart", "graph", "plot", "visualize", "represenation", "representation", "bar", "pie", "line"])
    
    # If the user didn't ask for a chart and there are no SQL results, skip
    if not needs_chart and not sql_results:
        return {"chart_config": None}
        
    print(f"[Chart Node] LLM detecting and generating chart config...")
    
    system_prompt = """You are a specialized Chart Data Generator. Your task is to analyze the user's query and the AI response, and determine if there is numerical/tabular data that should be plotted as a chart (Bar, Line, or Pie chart).

If yes, you must output a valid JSON object matching the schema below.
If no (or if the query/data does not warrant a chart), output exactly the word: null

JSON Schema to return:
{
  "type": "bar" | "line" | "pie",
  "title": "A descriptive title of the chart",
  "xAxis": "the key for the labels/categories",
  "yAxis": "the key for the numerical values",
  "data": [
    {"category_key": "Category A", "value_key": 45},
    {"category_key": "Category B", "value_key": 67}
  ]
}

Rules:
- xAxis and yAxis must match the keys inside the objects in the 'data' array.
- Value fields must be pure numbers (e.g. 74, NOT "74" or "74%").
- If the grade points are letter grades (A+, A, B) or gradesheet scores, map them to numeric values (e.g. GPA or score out of 100) so Recharts can render it.
- Do NOT output any explanation, notes, or markdown formatting (no ```json). Just the raw JSON or 'null'.
"""

    user_prompt = f"User Query: {query}\n\nAI Response Text:\n{response_text}\n\nSQL Results Context: {sql_results}\n\nOutput:"

    try:
        llm = get_llm()
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        
        content = response.content.strip()
        # Clean markdown wrap if present
        if content.startswith("```"):
            # Strip first line
            content = re.sub(r"^```[a-zA-Z0-9]*\n", "", content)
            # Strip last line
            content = re.sub(r"\n```$", "", content)
            content = content.strip()
            
        if content.lower() == "null":
            return {"chart_config": None}
            
        import json
        config = json.loads(content)
        # Validate keys
        if "type" in config and "xAxis" in config and "yAxis" in config and "data" in config:
            print(f"[Chart Node] Successfully generated chart config of type '{config['type']}' with {len(config['data'])} rows.")
            return {"chart_config": config}
        return {"chart_config": None}
    except Exception as e:
        print(f"[Chart Node] Failed to parse chart config: {e}")
        # Fallback to heuristic for SQL results if LLM fails
        if sql_results:
            fallback_config = generate_chart_config(sql_results)
            return {"chart_config": fallback_config}
        return {"chart_config": None}

# 6. Evaluation Node: Evaluates quality metrics
async def evaluation_node(state: AgentState) -> Dict[str, Any]:
    query = state["query"]
    response_text = state.get("response_text", "")
    retrieved_chunks = state.get("retrieved_chunks", [])
    start_time = time.time()
    
    contexts = [c["text"] for c in retrieved_chunks]
    metrics = await evaluate_answer(query, response_text, contexts)
    
    elapsed = time.time() - start_time
    log_session_event(
        "Evaluation completed",
        query=query,
        metrics=metrics,
        node="evaluate",
        elapsed_seconds=elapsed
    )
    
    print(f"[Evaluation Node] Calculated quality scores: {metrics}")
    return {"evaluation_metrics": metrics}

# Define LangGraph routing functions
def route_after_router(state: AgentState):
    """
    Routes to rag, sql, or both branches (hybrid).
    For hybrid: LangGraph supports returning a list of node names to fan out in parallel.
    """
    intent = state["intent"]
    if intent == "hybrid":
        return ["rag", "sql"]
    elif intent == "sql":
        return ["sql"]
    else:
        return ["rag"]

# Compile the Graph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("rewriter", query_rewriter_node)
workflow.add_node("router", router_node)
workflow.add_node("rag", rag_node)
workflow.add_node("sql", sql_node)
workflow.add_node("merge", merge_node)
workflow.add_node("chart", chart_node)
workflow.add_node("evaluate", evaluation_node)

# Set Entry Point
workflow.set_entry_point("rewriter")

# Define Routing Edges
workflow.add_edge("rewriter", "router")

workflow.add_conditional_edges(
    "router",
    route_after_router,
    {
        "rag": "rag",
        "sql": "sql",
    }
)

# Both branches converge at merge
workflow.add_edge("rag", "merge")
workflow.add_edge("sql", "merge")
workflow.add_edge("merge", "chart")
workflow.add_edge("chart", "evaluate")
workflow.add_edge("evaluate", END)

# Final compiled graph instance
compiled_graph = workflow.compile()
