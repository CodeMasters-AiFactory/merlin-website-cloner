@echo off
REM ============================================================
REM Install Merlin Autostart (No Admin Required)
REM ============================================================
REM This adds Merlin to Windows startup via Registry
REM Merlin will start when the current user logs in
REM ============================================================

echo.
echo Installing Merlin Autostart...
echo.

REM Add to registry Run key (current user - no admin needed)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MerlinWebsiteCloner" /t REG_SZ /d "\"c:\Cursor Projects\Mirror Site\scripts\start-all-services.bat\"" /f

if %errorLevel% equ 0 (
    echo.
    echo ============================================================
    echo   SUCCESS! Merlin will start automatically on login.
    echo ============================================================
    echo.
    echo   Merlin services will start every time you log into Windows.
    echo.
    echo   To remove autostart, run: uninstall-autostart.bat
    echo   Or delete the registry key manually.
    echo.
    echo ============================================================
) else (
    echo.
    echo ERROR: Failed to add registry entry
    echo.
)

pause
