#!/bin/bash
# Local dev startup script — runs backend and frontend concurrently
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Load backend env vars
if [ -f "$ROOT/ghostbit/backend/.env.local" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$ROOT/ghostbit/backend/.env.local"
    set +a
    echo "[dev] Loaded env from ghostbit/backend/.env.local"
fi

# Start backend
echo "[dev] Starting backend on http://localhost:8000"
cd "$ROOT"
python -m uvicorn ghostbit.backend.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Give backend a moment to bind
sleep 2

# Start frontend
echo "[dev] Starting frontend on http://localhost:3000"
cd "$ROOT/ghostbit/frontend"
npm run dev &
FRONTEND_PID=$!

# Wait and clean up on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
