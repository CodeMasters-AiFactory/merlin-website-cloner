@echo off
REM ============================================================
REM Merlin Website Cloner - Startup Script
REM ============================================================
REM This script starts all Merlin services using PM2.
REM It can be run manually or via Windows Task Scheduler.
REM ============================================================

cd /d "c:\Cursor Projects\Mirror Site"

REM Check if PM2 processes are already running
pm2 list | findstr "merlin-backend" >nul
if %errorLevel% equ 0 (
    echo Merlin services are already running
    pm2 status
    exit /b 0
)

REM Try to resurrect saved processes first
pm2 resurrect >nul 2>&1
if %errorLevel% equ 0 (
    echo Merlin services resurrected from saved state
    pm2 status
    exit /b 0
)

REM Start fresh if resurrect fails
echo Starting Merlin services...
pm2 start ecosystem.config.cjs

echo.
echo Merlin services started:
pm2 status

exit /b 0
