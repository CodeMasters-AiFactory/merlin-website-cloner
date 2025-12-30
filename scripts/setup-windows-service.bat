@echo off
REM ============================================================
REM Merlin Website Cloner - Windows Service Setup Script
REM ============================================================
REM This script sets up Merlin to run as a Windows service
REM using PM2 with boot persistence.
REM
REM Run this script as Administrator!
REM ============================================================

echo.
echo ============================================================
echo    MERLIN WEBSITE CLONER - SERVICE SETUP
echo ============================================================
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo       Node.js OK

echo.
echo [2/6] Installing PM2 globally...
call npm install -g pm2 pm2-windows-startup
if %errorLevel% neq 0 (
    echo ERROR: Failed to install PM2
    pause
    exit /b 1
)
echo       PM2 installed

echo.
echo [3/6] Creating logs directory...
if not exist "c:\Cursor Projects\Mirror Site\data\logs" (
    mkdir "c:\Cursor Projects\Mirror Site\data\logs"
)
echo       Logs directory ready

echo.
echo [4/6] Starting Merlin services with PM2...
cd /d "c:\Cursor Projects\Mirror Site"
call pm2 start ecosystem.config.cjs
if %errorLevel% neq 0 (
    echo ERROR: Failed to start PM2 processes
    pause
    exit /b 1
)
echo       Services started

echo.
echo [5/6] Saving PM2 process list...
call pm2 save
echo       Process list saved

echo.
echo [6/6] Setting up Windows startup...
call pm2-startup install
if %errorLevel% neq 0 (
    echo WARNING: pm2-startup failed, trying alternative method...
    REM Create a scheduled task as fallback
    schtasks /create /tn "Merlin-PM2-Startup" /tr "pm2 resurrect" /sc onstart /ru SYSTEM /f
    echo       Scheduled task created as fallback
) else (
    echo       Windows startup configured
)

echo.
echo ============================================================
echo    SETUP COMPLETE!
echo ============================================================
echo.
echo Services running:
call pm2 status

echo.
echo To manage Merlin:
echo   pm2 status      - View all processes
echo   pm2 logs        - View all logs
echo   pm2 restart all - Restart all services
echo   pm2 stop all    - Stop all services
echo   pm2 monit       - Real-time monitoring
echo.
echo Merlin will now start automatically on Windows boot.
echo.

pause
