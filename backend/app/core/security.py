from datetime import datetime, timedelta
from typing import Optional, Dict, List
from passlib.context import CryptContext
from jose import JWTError, jwt
import secrets
import hashlib
import time
from fastapi import HTTPException, status, Request
from app.config import settings

# Secret configuration for JWT signatures
SECRET_KEY = getattr(settings, "JWT_SECRET_KEY", "enterprise_ai_super_secret_jwt_key_2026_change_in_prod")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# CryptContext for bcrypt password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Simple thread-safe memory store for auth rate limiting (IP / email tracker)
# Format: { "rate_key": [timestamp1, timestamp2, ...] }
rate_limit_store: Dict[str, List[float]] = {}

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_token(token: str) -> str:
    """Hash raw token string using SHA-256 for secure DB storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(data: dict) -> tuple[str, datetime]:
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return raw_token, expires_at

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def generate_csrf_token() -> str:
    return secrets.token_hex(16)

def check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 60):
    """
    Sliding-window rate limiter for sensitive auth endpoints (/login, /signup).
    Throws 429 Too Many Requests if limit is exceeded.
    """
    now = time.time()
    cutoff = now - window_seconds
    
    if key not in rate_limit_store:
        rate_limit_store[key] = []
        
    # Filter timestamps older than sliding window
    timestamps = [t for t in rate_limit_store[key] if t > cutoff]
    
    if len(timestamps) >= max_requests:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Maximum {max_requests} attempts allowed per {window_seconds} seconds."
        )
        
    timestamps.append(now)
    rate_limit_store[key] = timestamps

def verify_csrf_protection(request: Request):
    """
    Double-Submit Cookie CSRF validation middleware.
    Validates X-CSRF-Token header against csrf_token cookie on POST/PUT/DELETE requests.
    """
    if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        # Skip CSRF check for API docs or open public auth endpoints if desired,
        # but enforce header check if cookie is set.
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("X-CSRF-Token")
        
        if csrf_cookie and (not csrf_header or csrf_header != csrf_cookie):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF validation failed: X-CSRF-Token header does not match csrf_token cookie."
            )
