# FailureLoop One-Click Startup Script (PowerShell)
# Launches both the TypeScript Express Backend and Vite React Frontend

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Starting FailureLoop (Powered by Hindsight)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend
Write-Host "[1/2] Launching Backend on http://localhost:4000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\backend'; npm run dev"

# Start Frontend
Write-Host "[2/2] Launching Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\frontend'; npm run dev"

Write-Host ""
Write-Host "Services started! Open http://127.0.0.1:5173 in your browser." -ForegroundColor Yellow
