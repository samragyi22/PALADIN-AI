import pytest
import uuid
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import engine
from app.database.models import Base
from app.core.security import rate_limit_store

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    rate_limit_store.clear() # Reset rate limits between tests
    yield

def test_unauthenticated_request_rejected():
    """Verify that hitting protected endpoints without tokens returns real HTTP 401."""
    client.cookies.clear()
    response = client.get("/api/session/test_session")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]

    response = client.post("/api/chat", json={"query": "test", "session_id": "s1", "active_files": []})
    assert response.status_code == 401

def test_signup_and_login_flow():
    """Test user signup, login, cookie setting, /me profile, and logout."""
    client.cookies.clear()
    email = f"pytest_user_{uuid.uuid4().hex[:8]}@enterprise.ai"
    password = "SecurePassword123!"

    # 1. Signup
    signup_res = client.post(
        "/api/auth/signup",
        json={"full_name": "Test User", "email": email, "password": password}
    )
    assert signup_res.status_code == 201
    data = signup_res.json()
    assert data["status"] == "success"
    assert data["user"]["email"] == email
    assert "access_token" in signup_res.cookies
    assert "csrf_token" in signup_res.cookies

    # 2. Access protected /me endpoint with cookies
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email

    # 3. Access protected workspace route /api/session/s1 with cookies
    session_res = client.get("/api/session/s1")
    assert session_res.status_code == 200

    # 4. Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # 5. Access /me after logout (should fail 401)
    client.cookies.clear()
    post_logout_res = client.get("/api/auth/auth/me")
    assert post_logout_res.status_code == 404 or post_logout_res.status_code == 401

def test_rate_limiting():
    """Test that submitting excessive login requests triggers HTTP 429 Rate Limited."""
    client.cookies.clear()
    rate_limit_store.clear()
    for i in range(6):
        res = client.post(
            "/api/auth/login",
            json={"email": f"brute_{i}@test.com", "password": "wrong"}
        )
        if i >= 5:
            assert res.status_code == 429
            assert "Rate limit exceeded" in res.json()["detail"]
