import os
import sys
import asyncio
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.outputs import ChatResult, ChatGeneration
from langchain_core.messages import AIMessage
from langchain_core.embeddings import Embeddings

# Add backend directory to sys.path so we can import app modules
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

# 1. Mock Embeddings
class MockEmbeddings(Embeddings):
    def embed_documents(self, texts):
        return [[0.1] * 768 for _ in texts]
    def embed_query(self, text):
        return [0.1] * 768

# 2. Mock Chat Model that responds context-dependently
class MockStateGraphLLM(BaseChatModel):
    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        system_text = ""
        human_text = ""
        for m in messages:
            if m.type == "system":
                system_text = m.content
            elif m.type == "human":
                human_text = m.content
                
        # 1. Router Call
        if "smart query intent classifier" in system_text:
            if "policy" in human_text.lower() and "price" in human_text.lower():
                response = "hybrid"
            elif "policy" in human_text.lower():
                response = "rag"
            else:
                response = "sql"
                
        # 2. SQL Gen Call
        elif "expert in SQLite databases" in system_text:
            response = "SELECT name, price FROM products"
            
        # 3. Merge Node Call
        elif "senior enterprise analyst" in system_text:
            response = "Based on the products table, Laptop is priced at $1200.5 and Mouse is $25.0. According to document [1], this matches the pricing sheet."
            
        # 4. Evaluation Call
        elif "QA judge" in system_text or "quality assurance judge" in human_text:
            response = '{"faithfulness": 1.0, "answer_relevancy": 1.0, "context_recall": 1.0}'
            
        else:
            response = "Fallback mock response."
            
        generation = ChatGeneration(message=AIMessage(content=response))
        return ChatResult(generations=[generation])
        
    @property
    def _llm_type(self) -> str:
        return "mock-state-graph-llm"

# Patch the modules
import app.core.rag as rag
rag.get_embeddings_model = lambda: MockEmbeddings()

import app.core.sql as sql
sql.get_llm = lambda: MockStateGraphLLM()

from app.core.agent import compiled_graph
from app.core.sql import ingest_csv_to_sqlite
from app.config import settings

def test_full_graph_execution():
    print("--- Running Full StateGraph Execution Test ---")
    
    # Ingest dummy CSV to settings.sqlite_db_path
    import pandas as pd
    dummy_csv = "test_products.csv"
    db_path = settings.sqlite_db_path
    
    df = pd.DataFrame({
        "id": [1, 2],
        "name": ["Laptop", "Mouse"],
        "price": [1200.50, 25.00]
    })
    df.to_csv(dummy_csv, index=False)
    ingest_csv_to_sqlite(dummy_csv, "products", db_path)
    
    # Seed ChromaDB with policy
    pages = [
        {"text": "The price limits are set at $1500 for laptops.", "page": 1}
    ]
    chunks = rag.chunk_documents(pages, "pricing_policy.pdf")
    rag.add_documents_to_store(chunks)
    
    try:
        # Run hybrid query
        state = {
            "query": "Show me products and check if it matches the pricing policy price limits",
            "intent": "",
            "retrieved_chunks": [],
            "sql_query": None,
            "sql_results": [],
            "sql_error": None,
            "sql_retry_count": 0,
            "response_text": "",
            "citations": [],
            "chart_config": None,
            "evaluation_metrics": {}
        }
        
        # Invoke compiled graph
        result = asyncio.run(compiled_graph.ainvoke(state))
        
        print("Graph Execution Final State:")
        print(f"  Intent: {result['intent']}")
        print(f"  SQL Query: {result['sql_query']}")
        print(f"  SQL Results: {result['sql_results']}")
        print(f"  Citations Count: {len(result['citations'])}")
        print(f"  Chart Config: {result['chart_config']}")
        print(f"  Response Text: {result['response_text']}")
        print(f"  Metrics: {result['evaluation_metrics']}")
        
        assert result["intent"] == "hybrid"
        assert result["sql_query"] == "SELECT name, price FROM products"
        assert len(result["sql_results"]) == 2
        assert len(result["citations"]) > 0
        assert result["chart_config"] is not None
        assert result["chart_config"]["type"] == "bar"
        assert result["evaluation_metrics"]["faithfulness"] == 1.0
        
        print("Full StateGraph Execution Test PASSED!")
        
    finally:
        if os.path.exists(dummy_csv):
            os.remove(dummy_csv)
        try:
            from sqlalchemy import create_engine, text
            engine = create_engine(f"sqlite:///{db_path}")
            with engine.connect() as conn:
                conn.execute(text("DROP TABLE IF EXISTS products"))
        except Exception:
            pass

if __name__ == "__main__":
    test_full_graph_execution()
