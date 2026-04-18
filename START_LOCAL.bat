@echo off
echo ==========================================
echo Starting MSD-Project Development Environment
echo ==========================================

:: Start Backend in a new window
echo Starting Backend Server on port 5000...
start cmd /k "cd backend && npm run dev"

:: Start Frontend in a new window
echo Starting Frontend Development Server...
start cmd /k "cd FrontEnd && npm run dev"

echo.
echo Both services are starting. 
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
pause
