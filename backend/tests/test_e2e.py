import time
import requests
import io

def run_e2e_tests():
    print("=== Starting End-to-End Live HTTP Integration Tests ===")
    base_url = "http://127.0.0.1:8000"
    session_id = "test_e2e_session"
    
    # 1. Health check test
    print("\n1. Running Health Check...")
    h_res = requests.get(f"{base_url}/health")
    print(f"Health response: {h_res.status_code} - {h_res.json()}")
    assert h_res.status_code == 200
    assert h_res.json()["status"] == "healthy"
    
    # 2. Upload CSV file test
    print("\n2. Uploading Test CSV...")
    csv_data = "month,sales_target,sales_actual\nJuly,150000,165000\nAugust,160000,158000\nSeptember,170000,185000\n"
    csv_file = io.BytesIO(csv_data.encode('utf-8'))
    
    files = {"file": ("q3_sales.csv", csv_file, "text/csv")}
    u_res = requests.post(f"{base_url}/api/upload", files=files)
    print(f"Upload response: {u_res.status_code} - {u_res.json()}")
    assert u_res.status_code == 202
    
    file_id = u_res.json()["file_id"]
    print(f"File uploaded. ID: {file_id}. Polling processing status...")
    
    # Poll status
    completed = False
    for i in range(10):
        s_res = requests.get(f"{base_url}/api/upload/status/{file_id}")
        status_data = s_res.json()
        print(f"Poll {i+1}: status = {status_data['status']}")
        if status_data["status"] == "completed":
            completed = True
            break
        elif status_data["status"] == "failed":
            print(f"Ingestion failed with error: {status_data['error']}")
            break
        time.sleep(1)
        
    assert completed is True
    print("CSV ingestion completed successfully in backend database.")
    
    # 3. Chat query test (SQL query generation and execution)
    print("\n3. Sending Chat Query...")
    chat_payload = {
        "query": "Show me a table of our sales actual compared to targets",
        "session_id": session_id
    }
    c_res = requests.post(f"{base_url}/api/chat", json=chat_payload)
    print(f"Chat response status: {c_res.status_code}")
    c_data = c_res.json()
    print("Answer response snippet:")
    print(c_data["answer"][:150] + "...")
    print(f"Intent classified: {c_data['intent']}")
    
    assert c_data["intent"] == "sql"
    assert c_data["sql_query"] is not None
    assert len(c_data["sql_results"]) > 0
    assert c_data["chart_config"] is not None
    print("SQL execution, data tables, and chart config verified.")
    
    # 4. Export PDF report test
    print("\n4. Exporting Session Report as PDF...")
    p_res = requests.get(f"{base_url}/api/export-pdf", params={"session_id": session_id})
    print(f"PDF download response: {p_res.status_code}")
    assert p_res.status_code == 200
    assert p_res.headers["content-type"] == "application/pdf"
    assert len(p_res.content) > 0
    print(f"Report compiled and downloaded successfully. Size: {len(p_res.content)} bytes.")
    
    print("\n=== E2E Live Integration Tests PASSED successfully! ===")

if __name__ == "__main__":
    run_e2e_tests()
