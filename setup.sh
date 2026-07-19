#!/bin/bash
# =============================================================================
# Enterprise AI Analyst — One-Command Setup Script
# =============================================================================
# Usage: chmod +x setup.sh && ./setup.sh
# =============================================================================

set -e

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}${CYAN}============================================${RESET}"
echo -e "${BOLD}${CYAN}  Enterprise AI Analyst — Project Setup${RESET}"
echo -e "${BOLD}${CYAN}============================================${RESET}"
echo ""

# ── 1. Verify prerequisites ──────────────────────────────────────────────────
echo -e "${BOLD}[1/5] Checking prerequisites...${RESET}"

if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found. Install Python 3.10+ from https://python.org"
  exit 1
fi

PYTHON_VERSION=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
echo "  Python: $PYTHON_VERSION"

if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js not found. Install Node.js 18+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v)
echo "  Node.js: $NODE_VERSION"

echo -e "  ${GREEN}Prerequisites OK${RESET}"

# ── 2. Create data directories ───────────────────────────────────────────────
echo ""
echo -e "${BOLD}[2/5] Creating data directories...${RESET}"
mkdir -p data/documents data/sqlite data/chroma data/logs
echo -e "  ${GREEN}data/documents, data/sqlite, data/chroma, data/logs created${RESET}"

# ── 3. Backend: Python venv + dependencies ───────────────────────────────────
echo ""
echo -e "${BOLD}[3/5] Setting up Python backend...${RESET}"

cd backend

if [ ! -d "venv" ]; then
  echo "  Creating Python virtual environment..."
  python3 -m venv venv
fi

source venv/bin/activate
echo "  Virtual environment activated."

echo "  Installing Python dependencies (this may take a minute)..."
pip install --upgrade pip -q
pip install -r requirements.txt -q
echo -e "  ${GREEN}Python dependencies installed${RESET}"

# Configure .env
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "  ${YELLOW}.env created from .env.example — add your API keys to backend/.env${RESET}"
else
  echo "  .env already exists — skipping"
fi

cd ..

# ── 4. Frontend: npm dependencies ────────────────────────────────────────────
echo ""
echo -e "${BOLD}[4/5] Setting up React frontend...${RESET}"

cd frontend
echo "  Installing npm packages..."
npm install --silent
echo -e "  ${GREEN}Frontend dependencies installed${RESET}"
cd ..

# ── 5. Run E2E tests (offline mode) ──────────────────────────────────────────
echo ""
echo -e "${BOLD}[5/5] Running offline E2E integration tests...${RESET}"
cd backend
source venv/bin/activate
python3 tests/test_e2e_complete.py
cd ..

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}============================================${RESET}"
echo -e "${BOLD}${GREEN}  Setup Complete!${RESET}"
echo -e "${BOLD}${GREEN}============================================${RESET}"
echo ""
echo -e "${BOLD}Next steps:${RESET}"
echo ""
echo -e "  ${CYAN}1. Add your API keys to: backend/.env${RESET}"
echo -e "     LLM_PROVIDER=gemini"
echo -e "     GOOGLE_API_KEY=your_key_here"
echo ""
echo -e "  ${CYAN}2. Start the backend:${RESET}"
echo -e "     cd backend && source venv/bin/activate"
echo -e "     uvicorn app.main:app --port 8000 --reload"
echo ""
echo -e "  ${CYAN}3. Start the frontend (new terminal):${RESET}"
echo -e "     cd frontend && npm run dev"
echo ""
echo -e "  ${CYAN}4. Open your browser:${RESET}"
echo -e "     http://localhost:5173"
echo ""
echo -e "  ${CYAN}API docs:${RESET}  http://localhost:8000/docs"
echo ""
