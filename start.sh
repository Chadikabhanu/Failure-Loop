#!/usr/bin/env bash
# FailureLoop Startup Script for Linux / macOS / Git Bash

echo "=========================================="
echo " Starting FailureLoop (Powered by Hindsight)"
echo "=========================================="

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Start Backend
echo "[1/2] Launching Backend on http://localhost:4000 ..."
(cd "$DIR/backend" && npm run dev) &
BACKEND_PID=$!

# Start Frontend
echo "[2/2] Launching Frontend on http://127.0.0.1:5173 ..."
(cd "$DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

echo ""
echo "Services running! Press Ctrl+C to stop both."
wait
