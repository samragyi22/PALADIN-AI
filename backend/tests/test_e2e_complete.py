"""
Task 26: End-to-End Integration Tests
========================================
Tests all acceptance criteria from tasks.md Task 26:

  Test 1: Health check - config/settings load correctly
  Test 2: Upload PDF -> Query document -> Verify RAG response + citations
  Test 3: Upload CSV -> Query data -> Verify SQL execution -> Check chart config
  Test 4: Hybrid query -> Verify both RAG + SQL nodes used -> Merged answer
  Test 5: Export PDF -> Verify valid binary PDF downloaded
  Test 6: Self-correction -> Trigger SQL error -> Verify retry loop works
  Test 7: Security -> Attempt DROP/DELETE queries -> Verify SQL Guardian blocks them

Run from backend/ directory:
    python tests/test_e2e_complete.py

All tests use Mock LLM and Mock Embeddings (no real API keys required).
"""

import os
import tempfile
# Setup isolated temporary directory for test storage to prevent conflicts
temp_data_dir = tempfile.TemporaryDirectory()
os.environ["DATA_DIR"] = temp_data_dir.name

import sys
import asyncio
import traceback
import pandas as pd
from sqlalchemy import create_engine, text
from fastapi.testclient import TestClient

# Bootstrap: Add backend to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

# ---------------------------------------------------------------------------
# Mock LLM and Embeddings (no real API keys required)
# ---------------------------------------------------------------------------
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatResult, ChatGeneration
from langchain_core.messages import AIMessage
from langchain_core.embeddings import Embeddings


class MockEmbeddings(Embeddings):
    def embed_documents(self, texts):
        return [[0.05] * 768 for _ in texts]

    def embed_query(self, text):
        return [0.05] * 768


class MockAnalystLLM(BaseChatModel):
    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        system_text = ""
        human_text = ""
        for m in messages:
            if m.type == "system":
                system_text = m.content
            elif m.type == "human":
                human_text = m.content

        hl = human_text.lower()

        # Router node
        if "smart query intent classifier" in system_text:
            if ("policy" in hl or "document" in hl or "contract" in hl) and \
               ("sales" in hl or "price" in hl or "revenue" in hl or "target" in hl):
                response = "hybrid"
            elif "policy" in hl or "document" in hl or "contract" in hl or "cancellation" in hl:
                response = "rag"
            else:
                response = "sql"

        # SQL generation node
        elif "expert in SQLite databases" in system_text:
            if "q3_sales" in system_text or "sales" in hl:
                response = "SELECT month, sales_target, sales_actual FROM q3_sales"
            elif "products" in system_text or "product" in hl:
                response = "SELECT name, price FROM products"
            else:
                response = "SELECT * FROM q3_sales"

        # Merge node
        elif "senior enterprise analyst" in system_text:
            response = (
                "## Q3 Analysis\n\n"
                "- **July**: Target $150k | Actual $165k (exceeded by $15k)\n"
                "- **August**: Target $160k | Actual $158k (missed by $2k)\n"
                "- **September**: Target $170k | Actual $185k (exceeded by $15k)\n\n"
                "According to the policy document [1], results are within acceptable variance."
            )

        # Evaluator / RAGAS judge
        elif "QA judge" in system_text or "quality assurance judge" in human_text:
            response = '{"faithfulness": 1.0, "answer_relevancy": 1.0, "context_recall": 1.0}'

        else:
            response = "Acknowledged."

        gen = ChatGeneration(message=AIMessage(content=response))
        return ChatResult(generations=[gen])

    @property
    def _llm_type(self) -> str:
        return "mock-analyst-llm"


# Patch BEFORE importing agent/rag
import app.core.rag as rag_module
import app.core.sql as sql_module

rag_module.get_embeddings_model = lambda: MockEmbeddings()
sql_module.get_llm = lambda: MockAnalystLLM()

from app.core.agent import compiled_graph
from app.core.sql import (
    ingest_csv_to_sqlite,
    SQLGuardian,
    translate_and_execute_sql,
)
from app.core.rag import chunk_documents, add_documents_to_store
from app.core.reporter import compile_pdf_report
from app.config import settings


# ---------------------------------------------------------------------------
# Test Utilities
# ---------------------------------------------------------------------------
results = []


def run_test(name, fn):
    print(f"\n{'─'*60}")
    print(f"  {name}")
    print(f"{'─'*60}")
    try:
        fn()
        print(f"  PASS")
        results.append((name, True, None))
    except AssertionError as ae:
        msg = str(ae) or "Assertion failed"
        print(f"  FAIL - AssertionError: {msg}")
        results.append((name, False, msg))
    except Exception as ex:
        msg = traceback.format_exc()
        print(f"  FAIL - Exception:\n{msg}")
        results.append((name, False, str(ex)))


def make_state(query):
    return {
        "query": query,
        "intent": "",
        "retrieved_chunks": [],
        "sql_query": None,
        "sql_results": [],
        "sql_error": None,
        "sql_retry_count": 0,
        "response_text": "",
        "citations": [],
        "chart_config": None,
        "evaluation_metrics": {},
    }


def setup_csv_data():
    csv_content = (
        "month,sales_target,sales_actual\n"
        "July,150000,165000\n"
        "August,160000,158000\n"
        "September,170000,185000\n"
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as f:
        f.write(csv_content)
        tmp_path = f.name
    try:
        rows = ingest_csv_to_sqlite(tmp_path, "q3_sales", settings.sqlite_db_path)
        print(f"  CSV ingested: {rows} rows into 'q3_sales'")
        return rows
    finally:
        os.unlink(tmp_path)


def setup_rag_data():
    pages = [{
        "text": (
            "Q3 Sales Policy: All monthly sales actuals within 10% variance of the "
            "sales target are considered acceptable performance. Cancellation fees apply "
            "if a contract is terminated before the agreed period ends."
        ),
        "page": 1,
    }]
    chunks = chunk_documents(pages, "q3_policy.pdf")
    add_documents_to_store(chunks)
    print(f"  RAG seeded: {len(chunks)} chunk(s) from 'q3_policy.pdf'")


def teardown_sql():
    try:
        engine = create_engine(f"sqlite:///{settings.sqlite_db_path}")
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS q3_sales"))
            conn.execute(text("DROP TABLE IF EXISTS products"))
            conn.commit()
    except Exception:
        pass


# ===========================================================================
# TEST 1: Health Check
# ===========================================================================
def test_1_health_check():
    assert settings.ENV is not None, "ENV setting missing"
    assert settings.LLM_PROVIDER in ("gemini", "openai", "groq"), "Invalid LLM_PROVIDER"
    print(f"  ENV={settings.ENV}, LLM_PROVIDER={settings.LLM_PROVIDER}")
    print(f"  SQLite path: {settings.sqlite_db_path}")
    print(f"  ChromaDB dir: {settings.chroma_dir}")
    print("  All config settings loaded correctly.")


# ===========================================================================
# TEST 2: RAG Flow
# ===========================================================================
def test_2_rag_flow():
    setup_rag_data()
    query = "What is the cancellation policy rule in our Q3 policy?"
    result = asyncio.run(compiled_graph.ainvoke(make_state(query)))

    print(f"  Intent: '{result['intent']}'")
    print(f"  Citations: {len(result['citations'])}")
    print(f"  Response snippet: {result['response_text'][:100]}...")
    print(f"  Metrics: {result['evaluation_metrics']}")

    assert result["intent"] == "rag", f"Expected 'rag', got '{result['intent']}'"
    assert result["response_text"], "Response text empty"
    assert len(result["citations"]) > 0, "No citations returned"
    assert result["citations"][0]["source"] == "q3_policy.pdf", \
        f"Wrong citation source: {result['citations'][0]['source']}"
    assert "faithfulness" in result["evaluation_metrics"], "Missing faithfulness metric"
    print("  RAG flow OK: intent=rag, citations present, metrics computed.")


# ===========================================================================
# TEST 3: SQL Flow
# ===========================================================================
def test_3_sql_flow():
    try:
        rows = setup_csv_data()
        assert rows == 3, f"Expected 3 rows, got {rows}"

        query = "Show me a table of our sales actual compared to targets for Q3"
        result = asyncio.run(compiled_graph.ainvoke(make_state(query)))

        print(f"  Intent: '{result['intent']}'")
        print(f"  SQL: {result['sql_query']}")
        print(f"  Rows: {len(result['sql_results']) if result['sql_results'] else 0}")
        chart = result['chart_config']
        print(f"  Chart type: {chart['type'] if chart else 'None'}")

        assert result["intent"] == "sql", f"Expected 'sql', got '{result['intent']}'"
        assert result["sql_query"] is not None, "No SQL generated"
        assert result["sql_results"] and len(result["sql_results"]) > 0, "No SQL rows returned"
        assert result["chart_config"] is not None, "No chart config generated"
        assert result["chart_config"]["type"] in ("bar", "line", "pie"), \
            f"Invalid chart type: {result['chart_config']['type']}"
        assert result["chart_config"]["xAxis"] is not None, "Missing xAxis"
        assert result["chart_config"]["yAxis"] is not None, "Missing yAxis"
        print("  SQL flow OK: intent=sql, data returned, chart generated.")
    finally:
        teardown_sql()


# ===========================================================================
# TEST 4: Hybrid Flow
# ===========================================================================
def test_4_hybrid_flow():
    try:
        setup_rag_data()
        setup_csv_data()

        query = "Do our Q3 actual sales meet the targets described in the policy document?"
        result = asyncio.run(compiled_graph.ainvoke(make_state(query)))

        print(f"  Intent: '{result['intent']}'")
        print(f"  Citations: {len(result['citations'])}")
        print(f"  SQL rows: {len(result['sql_results']) if result['sql_results'] else 0}")
        print(f"  Response snippet: {result['response_text'][:120]}...")

        assert result["intent"] == "hybrid", f"Expected 'hybrid', got '{result['intent']}'"
        assert result["response_text"], "Response text empty"
        assert len(result["citations"]) > 0, "No citations in hybrid mode"
        assert result["sql_results"] and len(result["sql_results"]) > 0, \
            "No SQL results in hybrid mode"
        print("  Hybrid flow OK: intent=hybrid, both RAG citations and SQL data present.")
    finally:
        teardown_sql()


# ===========================================================================
# TEST 5: PDF Export
# ===========================================================================
def test_5_pdf_export():
    session_history = [{
        "query": "Show Q3 sales data",
        "answer": "**Q3 Summary**: July exceeded target by $15k.",
        "sql_query": "SELECT month, sales_target, sales_actual FROM q3_sales",
        "sql_results": [
            {"month": "July", "sales_target": 150000, "sales_actual": 165000},
            {"month": "August", "sales_target": 160000, "sales_actual": 158000},
            {"month": "September", "sales_target": 170000, "sales_actual": 185000},
        ],
        "chart_config": {
            "type": "bar",
            "data": [
                {"month": "July", "sales_actual": 165000},
                {"month": "August", "sales_actual": 158000},
                {"month": "September", "sales_actual": 185000},
            ],
            "xAxis": "month",
            "yAxis": "sales_actual",
            "title": "Sales Actual by Month",
        },
        "citations": [{
            "source": "q3_policy.pdf",
            "page": 1,
            "text": "Within 10% variance is acceptable.",
            "score": 0.92,
        }],
    }]

    pdf_bytes = compile_pdf_report(session_history, session_id="e2e_test_session")

    print(f"  PDF size: {len(pdf_bytes)} bytes")
    print(f"  PDF header: {pdf_bytes[:8]}")

    assert isinstance(pdf_bytes, bytes), "PDF output must be bytes"
    assert len(pdf_bytes) > 1000, f"PDF too small: {len(pdf_bytes)} bytes"
    assert pdf_bytes[:4] == b"%PDF", "PDF magic bytes missing"
    print("  PDF export OK: valid PDF binary, correct header, non-empty.")


# ===========================================================================
# TEST 6: Self-Correction SQL Retry Loop
# ===========================================================================
def test_6_self_correction():
    try:
        setup_csv_data()

        call_count = [0]

        class RetryMockLLM(BaseChatModel):
            def _generate(self, messages, stop=None, run_manager=None, **kwargs):
                call_count[0] += 1
                if call_count[0] == 1:
                    sql = "SELECT nonexistent_column FROM q3_sales"
                else:
                    sql = "SELECT month, sales_actual FROM q3_sales"
                gen = ChatGeneration(message=AIMessage(content=sql))
                return ChatResult(generations=[gen])

            @property
            def _llm_type(self) -> str:
                return "retry-mock-llm"

        original_get_llm = sql_module.get_llm
        sql_module.get_llm = lambda: RetryMockLLM()

        try:
            result = asyncio.run(translate_and_execute_sql(
                "Show me actual sales by month",
                settings.sqlite_db_path,
                max_retries=3,
            ))

            print(f"  LLM calls: {call_count[0]}")
            print(f"  Success: {result['success']}")
            print(f"  SQL used: {result['sql_query']}")
            print(f"  Retry count: {result['retry_count']}")
            print(f"  Rows: {len(result['sql_results']) if result['sql_results'] else 0}")

            assert result["success"] is True, f"Expected success. Error: {result.get('error')}"
            assert result["retry_count"] >= 1, "Expected at least 1 retry"
            assert len(result["sql_results"]) > 0, "Corrected query returned no data"
        finally:
            sql_module.get_llm = original_get_llm

        print("  Self-correction OK: failed attempt 1, succeeded on retry.")
    finally:
        teardown_sql()


# ===========================================================================
# TEST 7: SQL Guardian Security
# ===========================================================================
def test_7_security_guardrail():
    malicious = [
        ("DROP TABLE q3_sales",                       "DROP"),
        ("DELETE FROM q3_sales",                      "DELETE"),
        ("INSERT INTO q3_sales VALUES (1,2,3)",        "INSERT"),
        ("UPDATE q3_sales SET month='x'",             "UPDATE"),
        ("ALTER TABLE q3_sales ADD COLUMN x TEXT",    "ALTER"),
        ("CREATE TABLE hack (id INTEGER)",             "CREATE"),
        ("TRUNCATE TABLE q3_sales",                   "TRUNCATE"),
        ("SELECT * FROM q3_sales; DROP TABLE q3_sales","SQL injection"),
    ]

    safe = [
        "SELECT * FROM q3_sales",
        "SELECT month, sales_actual FROM q3_sales WHERE sales_actual > 160000",
        "SELECT COUNT(*) FROM q3_sales",
        "SELECT AVG(sales_actual) FROM q3_sales",
    ]

    print("  Checking malicious queries are BLOCKED:")
    for sql, label in malicious:
        res = SQLGuardian.validate(sql)
        print(f"    [{label}] blocked={not res['valid']}")
        assert res["valid"] is False, f"Guardian should have blocked: '{sql}'"
        assert res["error"] is not None, f"Error message missing for: '{sql}'"

    print("  Checking safe SELECT queries are ALLOWED:")
    for sql in safe:
        res = SQLGuardian.validate(sql)
        print(f"    [SELECT] allowed={res['valid']}")
        assert res["valid"] is True, f"Guardian wrongly blocked: '{sql}'"

    print(f"  Security OK: {len(malicious)} attacks blocked, {len(safe)} safe queries allowed.")


# ===========================================================================
# TEST 8: Voice Transcription
# ===========================================================================
def test_8_voice_transcription():
    from app.main import app
    client = TestClient(app)
    
    # Generate a valid minimal silent WAV file to avoid 400 format errors on the real Groq API
    import wave
    import io
    wav_io = io.BytesIO()
    with wave.open(wav_io, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(16000)  # 16kHz
        wav_file.writeframes(b'\x00' * 16000)  # 0.5 seconds of silent frame bytes
    file_content = wav_io.getvalue()
    
    files = {"file": ("test.wav", file_content, "audio/wav")}
    
    response = client.post("/api/transcribe", files=files)
    print(f"  Transcribe Status: {response.status_code}")
    print(f"  Transcribe Text: {response.json()}")
    
    assert response.status_code == 200, f"Expected 200 status, got {response.status_code}"
    assert "text" in response.json(), "Transcribed response missing 'text' key"
    assert response.json()["text"] != "", "Transcribed text should not be empty"


# ===========================================================================
# MAIN
# ===========================================================================
def main():
    print("\n" + "="*60)
    print("  TASK 26: END-TO-END INTEGRATION TEST SUITE")
    print("  Enterprise AI Analyst")
    print("="*60)

    run_test("Test 1: Health Check - Config & Settings Load",     test_1_health_check)
    run_test("Test 2: RAG Flow - Document Query + Citations",     test_2_rag_flow)
    run_test("Test 3: SQL Flow - CSV Upload + SQL + Chart",       test_3_sql_flow)
    run_test("Test 4: Hybrid Flow - RAG + SQL Merged Answer",     test_4_hybrid_flow)
    run_test("Test 5: PDF Export - Report Compiler Valid PDF",    test_5_pdf_export)
    run_test("Test 6: Self-Correction - SQL Retry Loop",          test_6_self_correction)
    run_test("Test 7: Security Guardrail - SQL Guardian Blocks",  test_7_security_guardrail)
    run_test("Test 8: Voice Transcription (Groq Whisper API)",    test_8_voice_transcription)

    print("\n" + "="*60)
    print("  RESULTS SUMMARY")
    print("="*60)
    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)

    for name, ok, err in results:
        icon = "[PASS]" if ok else "[FAIL]"
        print(f"  {icon}  {name}")
        if err:
            print(f"       -> {err[:120]}")

    print(f"\n  Total: {passed}/{len(results)} tests passed")
    if failed == 0:
        print("  ALL TESTS PASSED - Task 26 Complete!")
    else:
        print(f"  {failed} test(s) failed - review above errors.")
    print("="*60 + "\n")

    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
