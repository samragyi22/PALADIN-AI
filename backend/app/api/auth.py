from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

from app.database.session import get_db
from app.database.models import User, RefreshToken
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    hash_token,
    generate_csrf_token,
    check_rate_limit,
    decode_token,
    verify_csrf_protection
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime

class AuthResponse(BaseModel):
    status: str
    message: str
    user: UserResponse
    csrf_token: str

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    FastAPI dependency injection that validates access_token cookie or Authorization Bearer header.
    Returns current User object or raises HTTP 401 Unauthorized.
    """
    token = request.cookies.get("access_token")
    
    if not token:
        # Fallback to Authorization: Bearer <token> header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Missing or expired access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims."
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists."
        )
        
    return user

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    request: Request,
    response: Response,
    payload: SignupRequest,
    db: Session = Depends(get_db)
):
    # 1. Rate Limiting Check (5 attempts / minute per IP or Email)
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"signup_ip_{client_ip}", max_requests=5, window_seconds=60)
    check_rate_limit(f"signup_email_{payload.email.lower()}", max_requests=5, window_seconds=60)

    # 2. Check if email already registered
    existing_user = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # 3. Create new user with hashed password
    new_user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 4. Generate Access Token & Refresh Token (stored hashed)
    access_token = create_access_token(data={"sub": new_user.id, "email": new_user.email})
    raw_refresh_token, expires_at = create_refresh_token(data={"sub": new_user.id})
    hashed_ref_token = hash_token(raw_refresh_token)

    db_refresh_token = RefreshToken(
        user_id=new_user.id,
        hashed_token=hashed_ref_token,
        expires_at=expires_at,
        revoked=False
    )
    db.add(db_refresh_token)
    db.commit()

    # 5. Generate CSRF Token
    csrf_token = generate_csrf_token()

    # 6. Set Cookies
    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite="lax", max_age=1800, path="/")
    response.set_cookie(key="refresh_token", value=raw_refresh_token, httponly=True, samesite="lax", max_age=7*86400, path="/")
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, samesite="lax", max_age=7*86400, path="/")

    return AuthResponse(
        status="success",
        message="Account created successfully.",
        user=UserResponse(
            id=new_user.id,
            email=new_user.email,
            full_name=new_user.full_name,
            created_at=new_user.created_at
        ),
        csrf_token=csrf_token
    )

@router.post("/login", response_model=AuthResponse)
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: Session = Depends(get_db)
):
    # 1. Rate Limiting Check (5 attempts / minute per IP or Email)
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(f"login_ip_{client_ip}", max_requests=5, window_seconds=60)
    check_rate_limit(f"login_email_{payload.email.lower()}", max_requests=5, window_seconds=60)

    # 2. Verify Credentials
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password."
        )

    # 3. Generate Access Token & Refresh Token (stored hashed)
    access_token = create_access_token(data={"sub": user.id, "email": user.email})
    raw_refresh_token, expires_at = create_refresh_token(data={"sub": user.id})
    hashed_ref_token = hash_token(raw_refresh_token)

    db_refresh_token = RefreshToken(
        user_id=user.id,
        hashed_token=hashed_ref_token,
        expires_at=expires_at,
        revoked=False
    )
    db.add(db_refresh_token)
    db.commit()

    # 4. Generate CSRF Token
    csrf_token = generate_csrf_token()

    # 5. Set Cookies
    response.set_cookie(key="access_token", value=access_token, httponly=True, samesite="lax", max_age=1800, path="/")
    response.set_cookie(key="refresh_token", value=raw_refresh_token, httponly=True, samesite="lax", max_age=7*86400, path="/")
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, samesite="lax", max_age=7*86400, path="/")

    return AuthResponse(
        status="success",
        message="Login successful.",
        user=UserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            created_at=user.created_at
        ),
        csrf_token=csrf_token
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        created_at=current_user.created_at
    )

@router.post("/refresh")
async def refresh_tokens(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    raw_refresh_token = request.cookies.get("refresh_token")
    if not raw_refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing refresh token cookie.")

    hashed_ref = hash_token(raw_refresh_token)
    token_record = db.query(RefreshToken).filter(
        RefreshToken.hashed_token == hashed_ref,
        RefreshToken.revoked == False,
        RefreshToken.expires_at > datetime.utcnow()
    ).first()

    if not token_record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid, revoked, or expired refresh token.")

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Associated user account not found.")

    # Enforce Refresh Token Rotation: Revoke old refresh token, issue new one
    token_record.revoked = True
    
    new_access_token = create_access_token(data={"sub": user.id, "email": user.email})
    raw_new_refresh_token, new_expires_at = create_refresh_token(data={"sub": user.id})
    hashed_new_ref = hash_token(raw_new_refresh_token)

    new_db_refresh = RefreshToken(
        user_id=user.id,
        hashed_token=hashed_new_ref,
        expires_at=new_expires_at,
        revoked=False
    )
    db.add(new_db_refresh)
    db.commit()

    csrf_token = generate_csrf_token()

    response.set_cookie(key="access_token", value=new_access_token, httponly=True, samesite="lax", max_age=1800, path="/")
    response.set_cookie(key="refresh_token", value=raw_new_refresh_token, httponly=True, samesite="lax", max_age=7*86400, path="/")
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, samesite="lax", max_age=7*86400, path="/")

    return {"status": "success", "message": "Tokens refreshed and rotated successfully.", "csrf_token": csrf_token}

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.database.models import ChatSession, ChatMessage, UserDocument
    
    sessions_count = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).count()
    documents_count = db.query(UserDocument).filter(UserDocument.user_id == current_user.id).count()
    queries_count = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id, ChatMessage.role == "user").count()

    recent_sessions_db = db.query(ChatSession).filter(
        ChatSession.user_id == current_user.id
    ).order_by(ChatSession.updated_at.desc()).limit(6).all()

    recent_sessions = []
    for s in recent_sessions_db:
        turn_count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        recent_sessions.append({
            "id": s.id,
            "title": s.title,
            "queriesCount": turn_count,
            "updated_at": s.updated_at.isoformat()
        })

    return {
        "active_sessions_count": sessions_count,
        "indexed_documents_count": documents_count,
        "total_queries_count": queries_count,
        "recent_sessions": recent_sessions
    }

@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    raw_refresh_token = request.cookies.get("refresh_token")
    if raw_refresh_token:
        hashed_ref = hash_token(raw_refresh_token)
        db.query(RefreshToken).filter(RefreshToken.hashed_token == hashed_ref).update({"revoked": True})
        db.commit()

    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    response.delete_cookie(key="csrf_token", path="/")

    return {"status": "success", "message": "Logged out successfully."}
