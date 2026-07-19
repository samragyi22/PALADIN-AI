import os
import sys
import pandas as pd
from sqlalchemy import create_engine

# Add backend directory to sys.path so we can import app modules
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, backend_dir)

from app.core.sql import ingest_csv_to_sqlite, extract_database_schema, SQLGuardian

def test_schema_and_guardian():
    print("--- Running SQL Schema and Guardian Test ---")
    
    # 1. Setup SQLite database
    dummy_csv = "test_products.csv"
    db_path = "test_analyst.db"
    
    df = pd.DataFrame({
        "ID": [1, 2],
        "Name": ["Laptop", "Mouse"],
        "Price": [1200.50, 25.00]
    })
    df.to_csv(dummy_csv, index=False)
    
    try:
        # Ingest CSV
        ingest_csv_to_sqlite(dummy_csv, "products", db_path)
        
        # 2. Test schema extraction
        schema = extract_database_schema(db_path)
        print("Extracted Database Schema:")
        print(schema)
        
        assert "Table: products" in schema
        assert "id (BIGINT)" in schema or "id (INTEGER)" in schema
        assert "name (TEXT)" in schema
        assert "price (FLOAT)" in schema
        assert "Sample rows:" in schema
        assert "Laptop" in schema
        
        # 3. Test SQL Guardian (Valid Queries)
        valid_queries = [
            "SELECT * FROM products",
            "SELECT name, price FROM products WHERE price > 100",
            "SELECT COUNT(*), AVG(price) FROM products GROUP BY name",
            "SELECT name FROM (SELECT * FROM products WHERE price < 50) AS subquery",
            "SELECT a.name, b.price FROM products a JOIN products b ON a.id = b.id",
            "SELECT * FROM products UNION SELECT 1, 'Dummy', 0.0" # Safe read-only UNION
        ]
        
        for q in valid_queries:
            res = SQLGuardian.validate(q)
            print(f"Query: '{q}' -> Valid? {res['valid']}, Error: {res['error']}")
            assert res["valid"] is True
            
        # 4. Test SQL Guardian (Invalid/Malicious Queries)
        invalid_queries = [
            "INSERT INTO products (name, price) VALUES ('Keyboard', 45.00)",
            "UPDATE products SET price = 1000 WHERE id = 1",
            "DELETE FROM products WHERE id = 2",
            "DROP TABLE products",
            "ALTER TABLE products ADD COLUMN description TEXT",
            "CREATE TABLE hack (id INTEGER)",
            "TRUNCATE TABLE products",
            "SELECT * FROM products; DROP TABLE products", # Multi-query injection
            "SELECT * FROM products; INSERT INTO hack VALUES (1)"
        ]
        
        for q in invalid_queries:
            res = SQLGuardian.validate(q)
            print(f"Query: '{q}' -> Valid? {res['valid']}, Error: {res['error']}")
            assert res["valid"] is False
            assert "Security Violation" in res["error"] or "Prohibited" in res["error"]
            
        print("SQL Schema and Guardian Test PASSED!")
        
    finally:
        if os.path.exists(dummy_csv):
            os.remove(dummy_csv)
        if os.path.exists(db_path):
            os.remove(db_path)

if __name__ == "__main__":
    test_schema_and_guardian()
