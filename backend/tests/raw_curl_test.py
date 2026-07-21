import time
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def print_raw_response(title, response):
    print(f"\n=======================================================")
    print(f"  {title}")
    print(f"=======================================================")
    print(f"HTTP/1.1 {response.status_code} {response.reason}")
    for header, val in response.headers.items():
        print(f"{header}: {val}")
    print("\n" + response.text)

def run_raw_curl_verifications():
    # 1. Signup
    signup_data = {
        "full_name": "CSRF & Rotation Tester",
        "email": f"csrf_user_{int(time.time())}@enterprise.ai",
        "password": "SecurePassword123!"
    }
    session = requests.Session()
    signup_res = session.post(f"{BASE_URL}/api/auth/signup", json=signup_data)
    print_raw_response("1. POST /api/auth/signup", signup_res)

    cookies = session.cookies.get_dict()
    csrf_token = signup_res.json().get("csrf_token")
    old_refresh_token = cookies.get("refresh_token")

    # 2. State-changing POST endpoint WITH valid cookies + CORRECT X-CSRF-Token header -> 200 OK
    valid_csrf_headers = {"X-CSRF-Token": csrf_token}
    post_valid_res = session.post(
        f"{BASE_URL}/api/chat",
        json={"query": "test query", "session_id": "csrf_test_s1", "active_files": []},
        headers=valid_csrf_headers
    )
    print_raw_response("2. POST /api/chat WITH Valid Cookies & CORRECT X-CSRF-Token Header (200 OK)", post_valid_res)

    # 3. State-changing POST endpoint WITH valid cookies + WRONG X-CSRF-Token header -> 403 Forbidden
    invalid_csrf_headers = {"X-CSRF-Token": "INVALID_CSRF_TOKEN_12345"}
    post_invalid_res = session.post(
        f"{BASE_URL}/api/chat",
        json={"query": "test query", "session_id": "csrf_test_s1", "active_files": []},
        headers=invalid_csrf_headers
    )
    print_raw_response("3. POST /api/chat WITH Valid Cookies & INVALID X-CSRF-Token Header (403 Forbidden)", post_invalid_res)

    # 4. State-changing POST endpoint WITH valid cookies + MISSING X-CSRF-Token header -> 403 Forbidden
    post_missing_res = session.post(
        f"{BASE_URL}/api/chat",
        json={"query": "test query", "session_id": "csrf_test_s1", "active_files": []}
    )
    print_raw_response("4. POST /api/chat WITH Valid Cookies & MISSING X-CSRF-Token Header (403 Forbidden)", post_missing_res)

    # 5. Refresh Token Rotation
    print("\n=======================================================")
    print("  5. Refresh Token Rotation Check (/api/auth/refresh)")
    print("=======================================================")
    print(f"Old Refresh Token Cookie before refresh: {old_refresh_token}")
    refresh_res = session.post(f"{BASE_URL}/api/auth/refresh", headers=valid_csrf_headers)
    print_raw_response("5. POST /api/auth/refresh Response (Rotates Refresh Token)", refresh_res)
    new_refresh_token = session.cookies.get_dict().get("refresh_token")
    print(f"New Rotated Refresh Token Cookie after refresh: {new_refresh_token}")

    # 6. Verify Old Revoked Refresh Token Is Rejected
    old_cookie_dict = {"refresh_token": old_refresh_token}
    revoked_res = requests.post(f"{BASE_URL}/api/auth/refresh", cookies=old_cookie_dict)
    print_raw_response("6. POST /api/auth/refresh using REVOKED Old Refresh Token (401 Unauthorized)", revoked_res)

if __name__ == "__main__":
    run_raw_curl_verifications()
