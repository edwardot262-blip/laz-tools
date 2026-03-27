@echo off
REM Intune Onboarding Launcher - Handles elevation and PowerShell execution

setlocal enabledelayedexpansion

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This script requires Administrator privileges.
    echo Please run as Administrator.
    pause
    exit /b 1
)

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%Intune-Onboarding.ps1"

REM Verify PowerShell script exists
if not exist "!PS_SCRIPT!" (
    echo Error: Intune-Onboarding.ps1 not found in %SCRIPT_DIR%
    pause
    exit /b 1
)

REM Execute PowerShell script with proper execution policy
echo Starting Intune Onboarding...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "!PS_SCRIPT!"

if %errorLevel% equ 0 (
    echo.
    echo Onboarding completed. Check the log file for details.
) else (
    echo.
    echo Onboarding encountered errors. Check the log file for details.
)

pause
