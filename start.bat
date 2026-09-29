@echo off
echo ==========================================
echo  Starting FailureLoop (Powered by Hindsight)
echo ==========================================

echo [1/2] Launching Backend on http://localhost:4000 ...
start "FailureLoop Backend" cmd /k "cd backend && npm run dev"

echo [2/2] Launching Frontend on http://127.0.0.1:5173 ...
start "FailureLoop Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Both services are spinning up!
echo Visit http://127.0.0.1:5173 once ready.
