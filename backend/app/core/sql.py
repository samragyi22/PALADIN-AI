import os
import re
import pandas as pd
import sqlparse
from sqlalchemy import create_engine, inspect, text
from typing import List, Dict, Any, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from app.config import settings

def sanitize_table_name(filename: str) -> str:
    """
    Sanitize filename to a valid SQLite table name.
    - Remove extension
    - Convert to lowercase
    - Replace spaces and special characters with underscores
    - Ensure it starts with a letter or underscore
    """
    base_name = os.path.splitext(os.path.basename(filename))[0]
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', base_name).lower()
    sanitized = re.sub(r'_+', '_', sanitized)
    if not re.match(r'^[a-z_]', sanitized):
        sanitized = 't_' + sanitized
    return sanitized.strip('_')

def ingest_csv_to_sqlite(file_path: str, table_name: str, db_path: str) -> int:
    """
    Parse a CSV file, infer column types, create an SQLite table, and insert records.
    Returns the number of rows inserted.
    """
    try:
        try:
            df = pd.read_csv(file_path)
        except pd.errors.ParserError as pe:
            err_msg = str(pe)
            line_match = re.search(r'line (\d+)', err_msg, re.IGNORECASE)
            row_info = f" around row {line_match.group(1)}" if line_match else ""
            raise ValueError(f"CSV Parsing Error{row_info}: {err_msg}")
        except Exception as e:
            raise ValueError(f"Failed to read CSV file: {str(e)}")

        if df.empty:
            raise ValueError("The uploaded CSV file is empty.")

        engine = create_engine(f"sqlite:///{db_path}")

        cleaned_columns = {}
        for col in df.columns:
            cleaned_col = re.sub(r'[^a-zA-Z0-9_]', '_', col)
            cleaned_col = re.sub(r'_+', '_', cleaned_col).strip('_').lower()
            if not cleaned_col or not re.match(r'^[a-z_]', cleaned_col):
                cleaned_col = f"col_{cleaned_col}"
            cleaned_columns[col] = cleaned_col
            
        df = df.rename(columns=cleaned_columns)

        df.to_sql(
            name=table_name,
            con=engine,
            if_exists='replace',
            index=False,
            chunksize=1000
        )
        
        return len(df)
    except Exception as e:
        print(f"Error ingesting CSV: {e}")
        raise e

def extract_database_schema(db_path: str, active_files: Optional[List[str]] = None) -> str:
    """
    Query database metadata to extract table names, column names, types, 
    and LIMIT 3 sample rows. Formats it as a semantic schema description.
    """
    if not os.path.exists(db_path):
        return "Database contains no tables."
        
    try:
        engine = create_engine(f"sqlite:///{db_path}")
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        if active_files:
            allowed_tables = []
            for f in active_files:
                # Standardize table name format derived from CSV file name
                name_without_ext = f.rsplit(".", 1)[0]
                table_name = name_without_ext.replace(".", "_").replace(" ", "_").replace("-", "_").lower()
                allowed_tables.append(table_name)
            # Filter tables
            tables = [t for t in tables if t.lower() in allowed_tables]
        
        if not tables:
            return "Database contains no tables."
            
        schema_descriptions = []
        for table in tables:
            columns = inspector.get_columns(table)
            col_desc = []
            for col in columns:
                col_name = col["name"]
                col_type = str(col["type"])
                col_desc.append(f"{col_name} ({col_type})")
                
            sample_rows_desc = ""
            try:
                with engine.connect() as conn:
                    result = conn.execute(text(f"SELECT * FROM {table} LIMIT 3"))
                    keys = result.keys()
                    rows = [dict(zip(keys, row)) for row in result.fetchall()]
                    if rows:
                        sample_rows = []
                        for r in rows:
                            truncated_row = {k: (str(v)[:100] + "..." if len(str(v)) > 100 else v) for k, v in r.items()}
                            sample_rows.append(str(truncated_row))
                        sample_rows_desc = "\n  Sample rows:\n" + "\n".join([f"    {r}" for r in sample_rows])
                    else:
                        sample_rows_desc = "\n  Sample rows: (No rows in table)"
            except Exception as e:
                sample_rows_desc = f"\n  Failed to fetch sample rows: {e}"
                
            schema_descriptions.append(
                f"Table: {table}\n"
                f"  Columns: {', '.join(col_desc)}"
                f"{sample_rows_desc}"
            )
            
        return "\n\n".join(schema_descriptions)
    except Exception as e:
        print(f"Error extracting schema: {e}")
        return f"Failed to extract schema: {str(e)}"

class SQLGuardian:
    # Keywords that are never allowed, regardless of statement type
    PROHIBITED_KEYWORDS = {
        "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE",
        "TRUNCATE", "REPLACE", "RENAME", "GRANT", "REVOKE"
    }

    @staticmethod
    def _check_tokens(token_list) -> Optional[str]:
        """
        Recursively walk the sqlparse AST and return an error string if a
        prohibited keyword is found, otherwise return None.
        Defined at class level (not inside the loop) to avoid repeated re-definition.
        """
        for token in token_list:
            if token.is_group:
                err = SQLGuardian._check_tokens(token.tokens)
                if err:
                    return err
            else:
                val = str(token).upper().strip()
                if val in SQLGuardian.PROHIBITED_KEYWORDS:
                    return f"Security Violation: Prohibited keyword '{val}' detected in query."
        return None

    @staticmethod
    def validate(sql_query: str) -> Dict[str, Any]:
        """
        AST-based SQL Validator using sqlparse.
        Blocks INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, REPLACE statements.
        Allows only SELECT statements.
        """
        try:
            sql_clean = sql_query.strip()
            parsed = sqlparse.parse(sql_clean)
            if not parsed:
                return {"valid": False, "error": "Query is empty or could not be parsed."}

            for statement in parsed:
                stmt_type = statement.get_type()
                if stmt_type != 'SELECT':
                    return {
                        "valid": False,
                        "error": f"Security Violation: Only SELECT queries are allowed. "
                                 f"Prohibited statement type: {stmt_type or 'MUTATION'}."
                    }

                err = SQLGuardian._check_tokens(statement.tokens)
                if err:
                    return {"valid": False, "error": err}

            return {"valid": True, "error": None}
        except Exception as e:
            return {"valid": False, "error": f"Failed to parse SQL AST: {str(e)}"}

def get_llm():
    """
    Instantiate provider-agnostic ChatModel from LangChain, with an offline mock fallback for development.
    """
    provider = settings.LLM_PROVIDER.lower()
    google_key = settings.GOOGLE_API_KEY
    openai_key = settings.OPENAI_API_KEY
    groq_key = settings.GROQ_API_KEY
    
    # Check if we are running in offline/mock mode due to placeholder key configs
    is_mock = (
        (provider == "gemini" and (not google_key or "mock" in google_key or "your_" in google_key)) or
        (provider == "openai" and (not openai_key or "mock" in openai_key or "your_" in openai_key)) or
        (provider == "groq" and (not groq_key or "mock" in groq_key or "your_" in groq_key))
    )
    
    if is_mock:
        from langchain_core.language_models.chat_models import SimpleChatModel
        
        class FakeAnalystLLM(SimpleChatModel):
            def _call(self, messages, stop=None, run_manager=None, **kwargs):
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
                        return "hybrid"
                    elif "policy" in human_text.lower():
                        return "rag"
                    else:
                        return "sql"
                # 2. SQL Gen Call
                elif "expert in SQLite databases" in system_text:
                    return "SELECT month, sales_target, sales_actual FROM q3_sales"
                # 3. Merge Node Call
                elif "senior enterprise analyst" in system_text:
                    return "According to the database, the sales target for July was $150,000, and actual sales were $165,000. In August, actual sales dropped to $158,000, missing the target by $2,000. September recovered to $185,000."
                # 4. Evaluation Call
                elif "QA judge" in system_text or "quality assurance judge" in human_text:
                    return '{"faithfulness": 1.0, "answer_relevancy": 1.0, "context_recall": 1.0}'
                return "Mock LLM output"
                
            @property
            def _llm_type(self) -> str:
                return "fake-analyst-llm"
                
        return FakeAnalystLLM()

    if provider == "openai":
        return ChatOpenAI(
            api_key=openai_key,
            model="gpt-4o-mini",
            temperature=0.0
        )
    elif provider == "groq":
        return ChatOpenAI(
            api_key=groq_key,
            base_url="https://api.groq.com/openai/v1",
            model="llama-3.3-70b-versatile",
            temperature=0.0
        )
    else:
        return ChatGoogleGenerativeAI(
            google_api_key=google_key,
            model="gemini-1.5-flash",
            temperature=0.0
        )

def extract_sql_from_response(text: str) -> str:
    """
    Strip markdown triple-backtick wrappers from SQL code block if present.
    """
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(sql)?\n", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\n```$", "", text)
    return text.strip()

def execute_sql_query(sql_query: str, db_path: str, timeout_seconds: int = 5) -> List[Dict[str, Any]]:
    """
    Execute SQL query with transaction timeout guardrails.
    """
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"timeout": timeout_seconds})
    with engine.connect() as conn:
        result = conn.execute(text(sql_query))
        if not result.returns_rows:
            return []
        keys = result.keys()
        rows = [dict(zip(keys, row)) for row in result.fetchall()]
        return rows

SQL_GEN_SYSTEM_PROMPT = """You are a senior data analyst and expert in SQLite databases.
Your job is to translate natural language questions into valid, secure SQLite SELECT queries.

Given the following database schema context:
{schema_context}

Translate the user's question into a single, clean, valid SQLite SELECT query.
Follow these rules strictly:
1. ONLY write SELECT queries. Do NOT write INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, or TRUNCATE.
2. Only return the raw SQL query code block. Do NOT write any explanatory text. 
3. Do NOT wrap it in any formatting code block (like ```sql ... ```) unless necessary, but it is preferred to output just the SQL text directly.
4. Make sure to use existing table names and column names from the schema.
5. If the user query is not addressable by the schema, generate a SELECT query that returns empty or raise a clear syntax SELECT representation, but do your best to translate.
"""

async def translate_and_execute_sql(
    user_query: str, 
    db_path: str, 
    max_retries: int = 3,
    active_files: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Translates user query to SQL, validates query safety, runs query, and 
    automatically corrects query up to max_retries with error context.
    """
    schema_context = extract_database_schema(db_path, active_files=active_files)
    llm = get_llm()
    
    retry_count = 0
    errors_history = []
    current_prompt_input = f"User Question: {user_query}"
    
    while retry_count < max_retries:
        system_msg = SQL_GEN_SYSTEM_PROMPT.format(schema_context=schema_context)
        
        if retry_count > 0:
            system_msg += f"\n\nCRITICAL: Your previous SQL query failed. Here is the error history:\n"
            for err in errors_history:
                system_msg += f"- Query: {err['query']}\n  Error: {err['error']}\n"
            system_msg += "\nPlease correct the query. Check column names, table names, join syntax, and ensure it is valid SQLite SELECT."

        try:
            response = await llm.ainvoke([
                SystemMessage(content=system_msg),
                HumanMessage(content=current_prompt_input)
            ])
            
            generated_sql = extract_sql_from_response(response.content)
            
            # Validate via Guardian
            validation = SQLGuardian.validate(generated_sql)
            if not validation["valid"]:
                error_msg = validation["error"]
                errors_history.append({"query": generated_sql, "error": error_msg})
                retry_count += 1
                continue
                
            # Execute with timeout
            try:
                results = execute_sql_query(generated_sql, db_path)
                return {
                    "success": True,
                    "sql_query": generated_sql,
                    "sql_results": results,
                    "retry_count": retry_count,
                    "error": None
                }
            except Exception as execution_err:
                error_msg = str(execution_err)
                errors_history.append({"query": generated_sql, "error": error_msg})
                retry_count += 1
                
        except Exception as llm_err:
            return {
                "success": False,
                "sql_query": None,
                "sql_results": None,
                "retry_count": retry_count,
                "error": f"LLM Generation Error: {str(llm_err)}"
            }
            
    return {
        "success": False,
        "sql_query": errors_history[-1]["query"] if errors_history else None,
        "sql_results": None,
        "retry_count": retry_count,
        "error": f"Failed after {max_retries} attempts. Last error: {errors_history[-1]['error'] if errors_history else 'Unknown'}"
    }

def get_vision_llm():
    """
    Get configured Vision LLM instance. Reuses Gemini or OpenAI keys, or maps
    to Groq's llama-3.2-11b-vision-preview when using Groq.
    """
    provider = settings.LLM_PROVIDER
    openai_key = settings.OPENAI_API_KEY
    google_key = settings.GOOGLE_API_KEY
    groq_key = settings.GROQ_API_KEY
    
    is_mock = (
        (provider == "gemini" and (not google_key or "mock" in google_key or "your_" in google_key)) or
        (provider == "openai" and (not openai_key or "mock" in openai_key or "your_" in openai_key)) or
        (provider == "groq" and (not groq_key or "mock" in groq_key or "your_" in groq_key))
    )
    
    if is_mock:
        from langchain_core.language_models.chat_models import SimpleChatModel
        class FakeVisionLLM(SimpleChatModel):
            def _call(self, messages, stop=None, run_manager=None, **kwargs):
                return "[Extracted Text from Image] This is a mock OCR transcript of the uploaded image file."
            @property
            def _llm_type(self) -> str:
                return "fake-vision-llm"
        return FakeVisionLLM()
        
    if provider == "openai":
        return ChatOpenAI(
            api_key=openai_key,
            model="gpt-4o-mini",
            temperature=0.0
        )
    elif provider == "groq":
        return ChatOpenAI(
            api_key=groq_key,
            base_url="https://api.groq.com/openai/v1",
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.0
        )
    else:
        return ChatGoogleGenerativeAI(
            google_api_key=google_key,
            model="gemini-1.5-flash",
            temperature=0.0
        )
