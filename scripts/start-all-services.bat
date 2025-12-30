@echo off
REM ============================================================
REM Merlin Website Cloner - Start All Services
REM ============================================================
REM This script starts all Merlin services directly.
REM Run on Windows startup for 24/7 operation.
REM ============================================================

cd /d "c:\Cursor Projects\Mirror Site"

echo.
echo ============================================================
echo   MERLIN WEBSITE CLONER - AUTONOMOUS SYSTEM
echo   Starting all services...
echo ============================================================
echo.

REM Create data directory if it doesn't exist
if not exist "data" mkdir data
if not exist "data\logs" mkdir data\logs

REM Start Backend Server
echo Starting Backend Server...
start "Merlin-Backend" /MIN cmd /c "cd /d \"c:\Cursor Projects\Mirror Site\" && npm run server"

REM Wait a moment for backend to initialize
ping 127.0.0.1 -n 6 > nul

REM Start Frontend Server
echo Starting Frontend Server...
start "Merlin-Frontend" /MIN cmd /c "cd /d \"c:\Cursor Projects\Mirror Site\" && npm run frontend"

REM Wait a moment for frontend to initialize
ping 127.0.0.1 -n 4 > nul

REM Start AutoImprover Service
echo Starting AutoImprover Service...
start "Merlin-AutoImprover" /MIN cmd /c "cd /d \"c:\Cursor Projects\Mirror Site\" && npx ts-node --esm src/services/autoImprover.ts"

REM Wait a moment
ping 127.0.0.1 -n 3 > nul

REM Start Watchdog Service
echo Starting Watchdog Service...
start "Merlin-Watchdog" /MIN cmd /c "cd /d \"c:\Cursor Projects\Mirror Site\" && npx ts-node --esm src/services/watchdog.ts"

echo.
echo ============================================================
echo   ALL SERVICES STARTED SUCCESSFULLY!
echo ============================================================
echo.
echo   Backend:      http://localhost:3000
echo   Frontend:     http://localhost:5000
echo   AutoImprover: Running (auto-improves every 6 hours)
echo   Watchdog:     Running (health checks every 5 minutes)
echo.
echo   Merlin is now ALIVE and running 24/7!
echo.
echo   To stop all services, run: stop-all-services.bat
echo ============================================================
