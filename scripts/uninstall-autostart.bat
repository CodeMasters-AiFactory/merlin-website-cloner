@echo off
REM ============================================================
REM Remove Merlin Autostart
REM ============================================================

echo.
echo Removing Merlin from Windows startup...
echo.

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "MerlinWebsiteCloner" /f

if %errorLevel% equ 0 (
    echo.
    echo SUCCESS: Merlin autostart removed.
    echo.
) else (
    echo.
    echo Note: Entry may not have existed.
    echo.
)

pause
