#!/bin/bash
# Cmeet — School ERP Live Classroom & Video Conferencing Runner

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "========================================================"
echo " Starting School ERP Video Conferencing Module (Cmeet)"
echo "========================================================"

# 1. Start Backend
echo "-> Starting Backend on http://localhost:8000..."
cd "$DIR/apps/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 2. Start Frontend
echo "-> Starting Frontend on http://localhost:3000..."
cd "$DIR/apps/admin-web"
npm run dev &
FRONTEND_PID=$!

# Cleanup on exit (Ctrl+C)
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM EXIT

echo ""
echo "🚀 Backend:  http://localhost:8000 (Docs: http://localhost:8000/docs)"
echo "🚀 Frontend: http://localhost:3000/meetings"
echo "Press Ctrl+C to stop both servers."
echo "========================================================"

wait
