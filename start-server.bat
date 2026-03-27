@echo off
REM Intune Onboarding Server Launcher
REM Starts the HTTP server for device onboarding portal

setlocal enabledelayedexpansion

echo.
echo ╔════════════════════════════════════════════════════════╗
echo ║   Intune Onboarding Server Launcher                   ║
echo ╚════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorLevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo.
    echo Please download and install Node.js from:
    echo   https://nodejs.org/ (LTS version recommended)
    echo.
    echo After installation:
    echo   1. Restart this command prompt
    echo   2. Run this script again
    echo.
    pause
    exit /b 1
)

REM Get Node version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% detected
echo.

REM Check if server.js exists
if not exist "server.js" (
    echo ❌ Error: server.js not found in current directory
    echo Please ensure you're in the correct folder
    pause
    exit /b 1
)

echo ✓ server.js found
echo.

REM Start the server
echo Starting server...
echo Press CTRL+C to stop
echo.

node server.js %*

if errorLevel 1 (
    echo.
    echo ❌ Server encountered an error
    pause
)

endlocal
