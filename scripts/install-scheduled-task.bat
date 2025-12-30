@echo off
REM ============================================================
REM Install Merlin Startup Scheduled Task
REM ============================================================
REM Run this as Administrator to register the startup task
REM ============================================================

echo.
echo Installing Merlin Startup Scheduled Task...
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

REM Delete existing task if it exists
schtasks /delete /tn "Merlin-Startup" /f >nul 2>&1

REM Create the task from XML
schtasks /create /tn "Merlin-Startup" /xml "c:\Cursor Projects\Mirror Site\scripts\merlin-startup-task.xml"

if %errorLevel% equ 0 (
    echo.
    echo SUCCESS: Merlin startup task installed!
    echo.
    echo Merlin will now start automatically when Windows boots.
    echo.
    echo To verify, open Task Scheduler and look for "Merlin-Startup"
    echo.
) else (
    echo.
    echo ERROR: Failed to install scheduled task
    echo.
    echo Try manually importing the task:
    echo 1. Open Task Scheduler (taskschd.msc)
    echo 2. Click "Import Task..."
    echo 3. Select: c:\Cursor Projects\Mirror Site\scripts\merlin-startup-task.xml
    echo.
)

pause
