# Start CoogMusic Locally - PowerShell Script
# This script starts both the backend and frontend servers in separate windows

Write-Host "Starting CoogMusic Local Development Environment..." -ForegroundColor Green
Write-Host ""

# Start backend server in new PowerShell window
Write-Host "Starting Backend Server (port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; Write-Host 'Backend Server Starting...' -ForegroundColor Yellow; npm start"

# Wait for backend to initialize
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Start frontend client in new PowerShell window
Write-Host "Starting Frontend Client (port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; Write-Host 'Frontend Client Starting...' -ForegroundColor Yellow; npm run dev"

# Display information
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "CoogMusic is starting!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Two new PowerShell windows have opened:" -ForegroundColor Yellow
Write-Host "  1. Backend Server (running on port 3001)" -ForegroundColor White
Write-Host "  2. Frontend Client (running on port 5173)" -ForegroundColor White
Write-Host ""
Write-Host "To stop the servers, close those PowerShell windows" -ForegroundColor Yellow
Write-Host "or press Ctrl+C in each window." -ForegroundColor Yellow
Write-Host ""
Write-Host "Opening browser in 3 seconds..." -ForegroundColor Magenta
Start-Sleep -Seconds 3

# Open browser
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Browser opened! Happy coding! 🎵" -ForegroundColor Green
