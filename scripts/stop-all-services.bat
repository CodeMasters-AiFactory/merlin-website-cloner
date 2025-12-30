@echo off
REM ============================================================
REM Merlin Website Cloner - Stop All Services
REM ============================================================

echo.
echo Stopping all Merlin services...
echo.

REM Kill all Merlin service windows
taskkill /FI "WINDOWTITLE eq Merlin-Backend*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Merlin-Frontend*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Merlin-AutoImprover*" /F 2>nul
taskkill /FI "WINDOWTITLE eq Merlin-Watchdog*" /F 2>nul

REM Also try to stop PM2 if running
pm2 stop all 2>nul

echo.
echo All Merlin services stopped.
echo.
