import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import engine
from app.database.models import Base
import time

client = TestClient(app)

def run_manual_verification():
    print("\n=======================================================")
    print("      MANUAL BACKEND AUTHENTICATION VERIFICATION      ")
    print("=======================================================\n")

    # Ensure DB tables exist
    Base.metadata.create_all(bind=engine)

    test_email = f"manual_verify_{int(time.time())}@enterprise.ai"
    test_password = "SecurePassword123!"

    # -------------------------------------------------------------
    # Check 1: Signup a test user
    # -------------------------------------------------------------
    print("[1/6] Testing /api/auth/signup...")
    client.cookies.clear() # Ensure clean state
    signup_res = client.post(
        "/api/auth/signup",
        json={"full_name": "Manual Tester", "email": test_email, "password": test_password}
    )
    print(f"      HTTP Status: {signup_res.status_code}")
    print(f"      Response: {signup_res.json()}")
    assert signup_res.status_code == 201
    assert "access_token" in signup_res.cookies
    assert "csrf_token" in signup_res.cookies
    print("      -> Signup PASS!\n")

    # -------------------------------------------------------------
    # Check 2: Login and verify cookies (access_token, csrf_token, refresh_token)
    # -------------------------------------------------------------
    print("[2/6] Testing /api/auth/login...")
    client.cookies.clear() # Clear cookies before logging in
    login_res = client.post(
        "/api/auth/login",
        json={"email": test_email, "password": test_password}
    )
    print(f"      HTTP Status: {login_res.status_code}")
    print(f"      Cookies Received: {dict(login_res.cookies)}")
    assert login_res.status_code == 200
    assert "access_token" in login_res.cookies
    assert "csrf_token" in login_res.cookies
    assert "refresh_token" in login_res.cookies
    print("      -> Login & Cookies PASS!\n")

    auth_cookies = dict(login_res.cookies)

    # -------------------------------------------------------------
    # Check 3: Protected Endpoint WITHOUT cookies (expecting real 401)
    # -------------------------------------------------------------
    print("[3/6] Testing protected endpoint (/api/chat) WITHOUT cookies...")
    client.cookies.clear() # Explicitly clear cookies to simulate unauthenticated request
    unauth_res = client.post(
        "/api/chat",
        json={"query": "test query", "session_id": "test_s1", "active_files": []}
    )
    print(f"      HTTP Status: {unauth_res.status_code}")
    print(f"      Response Detail: {unauth_res.json()}")
    assert unauth_res.status_code == 401
    assert "Authentication required" in unauth_res.json()["detail"]
    print("      -> Real HTTP 401 Rejection PASS!\n")

    # -------------------------------------------------------------
    # Check 4: Protected Endpoint WITH valid cookies & X-CSRF-Token header
    # -------------------------------------------------------------
    print("[4/6] Testing protected endpoint (/api/session/test_s1) WITH valid cookies...")
    headers = {"X-CSRF-Token": auth_cookies.get("csrf_token")}
    auth_res = client.get("/api/session/test_s1", cookies=auth_cookies, headers=headers)
    print(f"      HTTP Status: {auth_res.status_code}")
    print(f"      Response: {auth_res.json()}")
    assert auth_res.status_code == 200
    print("      -> Authenticated Access PASS!\n")

    # -------------------------------------------------------------
    # Check 5: Rate Limiting Throttling on /api/auth/login (hit 6+ times)
    # -------------------------------------------------------------
    print("[5/6] Testing Rate Limiting on /api/auth/login (hitting 6+ times)...")
    client.cookies.clear()
    brute_email = f"brute_ip_test_{int(time.time())}@enterprise.ai"
    throttled = False
    for i in range(1, 7):
        res = client.post("/api/auth/login", json={"email": brute_email, "password": "wrongpassword"})
        print(f"      Attempt {i}: HTTP {res.status_code}")
        if res.status_code == 429:
            throttled = True
            print(f"      Throttled Response: {res.json()}")
            break

    assert throttled is True
    print("      -> Rate Limiter 429 PASS!\n")

    # -------------------------------------------------------------
    # Check 6: Refresh Token Flow End-to-End
    # -------------------------------------------------------------
    print("[6/6] Testing Refresh Token Flow (/api/auth/refresh)...")
    refresh_res = client.post("/api/auth/refresh", cookies=auth_cookies)
    print(f"      HTTP Status: {refresh_res.status_code}")
    print(f"      Response: {refresh_res.json()}")
    print(f"      New Cookies Issued: {dict(refresh_res.cookies)}")
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.cookies
    print("      -> End-to-End Token Refresh PASS!\n")

    print("=======================================================")
    print("      ALL MANUAL BACKEND AUTH VERIFICATIONS PASSED!    ")
    print("=======================================================\n")

if __name__ == "__main__":
    run_manual_verification()
