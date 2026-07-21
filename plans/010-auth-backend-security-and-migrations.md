# Plan 010: Backend Auth, CSRF Protection, Token Revocation & Alembic Migrations

## Affected Surfaces
- **Files**: `backend/app/database/`, `backend/app/api/auth.py` [NEW], `backend/app/api/routes.py`, `backend/app/core/security.py` [NEW], `backend/alembic/` [NEW]
- **Components**: FastAPI Backend Auth System, Database Models, Security Middleware

## Technical Specifications

### 1. Security & CSRF Defense
- **Double-Submit Cookie Pattern**:
  - FastAPI issues an `access_token` cookie (`httpOnly`, `SameSite=Lax`, `Path=/`) and a readable `csrf_token` cookie.
  - Client JS reads `csrf_token` and passes it in `X-CSRF-Token` header on state-changing requests (`POST`, `PUT`, `DELETE`).
  - Middleware verifies `request.headers['X-CSRF-Token'] == request.cookies['csrf_token']`.

### 2. Token Lifetime & Revocation Strategy
- **Short-Lived Access Token (30 mins)** + **Refresh Token (7 days)**:
  - `/api/auth/login` sets `access_token` (30m) and `refresh_token` (7d) cookies.
  - `/api/auth/refresh` exchanges a valid `refresh_token` for a new `access_token`.
  - `/api/auth/logout` clears both cookies and invalidates the refresh token.

### 3. Alembic Database Migrations
- Migration path: `backend/alembic/versions/001_create_users_and_scoped_tables.py`
- Schema tables:
  - `users`: `id`, `email`, `hashed_password`, `full_name`, `created_at`
  - `chat_sessions`: `id`, `user_id` (FK), `title`, `created_at`, `updated_at`
  - `chat_messages`: `id`, `session_id` (FK), `user_id`, `role`, `content`, `metadata_json`, `created_at`
  - `user_documents`: `id`, `user_id` (FK), `filename`, `file_type`, `file_size`, `status`, `created_at`

## Verification Plan
- Test auth API endpoints via FastAPI Swagger (`/docs`): `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`, `/api/auth/logout`.
- Verify `401 Unauthorized` responses on protected `/api/chat` and `/api/upload` routes without token cookies.
