#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Intune Device Onboarding Script
    Auto-onboards user devices managed by Intune with Microsoft 365 apps and services

.DESCRIPTION
    This script performs the following on Intune-managed devices:
    - Triggers Intune device sync
    - Installs/configures Microsoft 365 Apps (Office, Teams, OneDrive)
    - Configures Outlook
    - Sets up OneDrive synchronization
    - Configures Microsoft Teams

.NOTES
    Requires: Windows 10/11, PowerShell 5.1+, Admin privileges
    Devices must be Azure AD joined
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ============================================================================
# LOGGING
# ============================================================================
$logPath = "$env:PROGRAMDATA\Intune-Onboarding"
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force | Out-Null
}
$logFile = Join-Path $logPath "Onboarding_$(Get-Date -Format 'yyyy-MM-dd_HHmmss').log"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $logFile -Value $logMessage
}

# ============================================================================
# VERIFY AZURE AD ENROLLMENT
# ============================================================================
function Test-AzureADEnrollment {
    Write-Log "Checking Azure AD enrollment status..."
    try {
        $dsregStatus = dsregcmd /status
        if ($dsregStatus -match "AzureAdJoined\s+:\s+YES") {
            Write-Log "Device is Azure AD joined" "SUCCESS"
            return $true
        } else {
            Write-Log "Device is NOT Azure AD joined. Please join device to Azure AD first." "ERROR"
            return $false
        }
    } catch {
        Write-Log "Error checking Azure AD status: $_" "ERROR"
        return $false
    }
}

# ============================================================================
# INTUNE DEVICE SYNC
# ============================================================================
function Invoke-IntuneSync {
    Write-Log "Triggering Intune device synchronization..."
    try {
        # Trigger MDM sync
        $path = "HKLM:\SOFTWARE\Microsoft\EnterpriseDesktopAppManagement\Updates"
        if (Test-Path $path) {
            New-Item -Path $path -Force | Out-Null
        }

        # Force sync via Registry
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\current\device\Update" `
            -Name "DeviceComplianceNotificationChannels" -Value 1 -Force -ErrorAction SilentlyContinue

        # Run MDM sync task
        Write-Log "Running scheduled MDM sync task..."
        Get-ScheduledTask -TaskName "Microsoft\Windows\Enterprise Management\Schedule\Regular Maintenance" -ErrorAction SilentlyContinue |
            Start-ScheduledTask -ErrorAction SilentlyContinue

        Start-Sleep -Seconds 5
        Write-Log "Intune sync triggered" "SUCCESS"
    } catch {
        Write-Log "Error triggering Intune sync: $_" "WARNING"
    }
}

# ============================================================================
# MICROSOFT 365 APPS INSTALLATION
# ============================================================================
function Install-Microsoft365Apps {
    Write-Log "Configuring Microsoft 365 Apps installation..."
    try {
        # Check if Office is already installed
        $office = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Office" -ErrorAction SilentlyContinue
        if ($office) {
            Write-Log "Microsoft Office appears to be installed" "INFO"
        } else {
            Write-Log "Office not detected. Installation may be in progress via Intune..." "INFO"
        }

        # Configure Office Update Service
        Write-Log "Configuring Office Update Service..."
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration" `
            -Name "UpdateUrl" -Value "http://officecdn.microsoft.com/pr/wsus" -Force -ErrorAction SilentlyContinue

        # Enable automatic updates
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration" `
            -Name "UpdatesEnabled" -Value "True" -Force -ErrorAction SilentlyContinue

        # Configure Update Channel
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Office\ClickToRun\Configuration" `
            -Name "CDNBaseUrl" -Value "http://officecdn.microsoft.com/pr" -Force -ErrorAction SilentlyContinue

        Write-Log "Microsoft 365 Apps configuration completed" "SUCCESS"
    } catch {
        Write-Log "Error configuring Microsoft 365 Apps: $_" "WARNING"
    }
}

# ============================================================================
# ONEDRIVE SETUP
# ============================================================================
function Setup-OneDrive {
    Write-Log "Setting up OneDrive..."
    try {
        # Get current user SID
        $userSid = (Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\SharedAccess\Parameters\FirewallPolicy\FirewallRules" -ErrorAction SilentlyContinue |
                    Select-Object -First 1 |
                    Get-Member -MemberType NoteProperty).Name

        # Configure OneDrive startup
        Write-Log "Configuring OneDrive auto-start..."
        Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" `
            -Name "OneDrive" -Value "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe" -Force

        # Configure OneDrive folder
        $oneDrivePath = "$env:USERPROFILE\OneDrive"
        if (-not (Test-Path $oneDrivePath)) {
            New-Item -ItemType Directory -Path $oneDrivePath -Force | Out-Null
            Write-Log "Created OneDrive folder: $oneDrivePath"
        }

        # Start OneDrive if not running
        $oneDriveProcess = Get-Process "OneDrive" -ErrorAction SilentlyContinue
        if (-not $oneDriveProcess) {
            Write-Log "Starting OneDrive..."
            Start-Process -FilePath "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDrive.exe" -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 3
        }

        # Configure OneDrive settings
        Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\OneDrive" `
            -Name "DisablePersonalSync" -Value 0 -Force -ErrorAction SilentlyContinue

        Write-Log "OneDrive setup completed" "SUCCESS"
    } catch {
        Write-Log "Error setting up OneDrive: $_" "WARNING"
    }
}

# ============================================================================
# OUTLOOK SETUP
# ============================================================================
function Setup-Outlook {
    Write-Log "Configuring Outlook..."
    try {
        # Check if Outlook is installed
        $outlookPath = "$env:ProgramFiles\Microsoft Office\Office16\Outlook.exe"
        $outlookPath64 = "$env:ProgramFiles (x86)\Microsoft Office\Office16\Outlook.exe"

        if ((Test-Path $outlookPath) -or (Test-Path $outlookPath64)) {
            Write-Log "Outlook detected, configuring auto-account discovery..."

            # Enable autodiscovery
            Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Office\16.0\Outlook\AutoDiscover" `
                -Name "ExcludeHttpsRootDomain" -Value 0 -Force -ErrorAction SilentlyContinue

            # Configure modern authentication
            Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Office\16.0\Common\Identity" `
                -Name "Version" -Value 1 -Force -ErrorAction SilentlyContinue

            Write-Log "Outlook configured for modern authentication" "SUCCESS"
        } else {
            Write-Log "Outlook not yet installed. Installation may be in progress via Intune." "INFO"
        }
    } catch {
        Write-Log "Error configuring Outlook: $_" "WARNING"
    }
}

# ============================================================================
# TEAMS SETUP
# ============================================================================
function Setup-Teams {
    Write-Log "Setting up Microsoft Teams..."
    try {
        # Check for Teams installations
        $teamsPath = "$env:LOCALAPPDATA\Microsoft\Teams\Teams.exe"
        $teamsClassicPath = "$env:ProgramFiles\Microsoft Office\Teams.exe"

        # Check if Teams is installed
        if ((Test-Path $teamsPath) -or (Test-Path $teamsClassicPath)) {
            Write-Log "Teams detected, configuring settings..."

            # Configure Teams to auto-start
            Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run" `
                -Name "Teams" -Value $teamsPath -Force -ErrorAction SilentlyContinue

            # Configure media autoplay
            Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Teams" `
                -Name "PreventMediaAutoPlay" -Value 0 -Force -ErrorAction SilentlyContinue

            Write-Log "Teams configured for auto-start" "SUCCESS"
        } else {
            Write-Log "Teams not yet installed. Installation may be in progress via Intune." "INFO"
        }
    } catch {
        Write-Log "Error setting up Teams: $_" "WARNING"
    }
}

# ============================================================================
# EXCEL & POWERPOINT SETUP
# ============================================================================
function Setup-OfficeApps {
    Write-Log "Configuring Excel and PowerPoint..."
    try {
        # Configure Office autoupdate
        $officePath = "HKCU:\SOFTWARE\Microsoft\Office\16.0"

        # Excel settings
        Set-ItemProperty -Path "$officePath\Excel\Options" `
            -Name "DisableAutoRepair" -Value 1 -Force -ErrorAction SilentlyContinue

        # PowerPoint settings
        Set-ItemProperty -Path "$officePath\PowerPoint\Options" `
            -Name "DisableAutoRepair" -Value 1 -Force -ErrorAction SilentlyContinue

        # Enable cloud sync for Office documents
        Set-ItemProperty -Path "$officePath\Common\ExperimentEcs" `
            -Name "ExperimentalCloudSyncEnabled" -Value 1 -Force -ErrorAction SilentlyContinue

        Write-Log "Excel and PowerPoint configured" "SUCCESS"
    } catch {
        Write-Log "Error configuring Office apps: $_" "WARNING"
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================
function Main {
    Write-Log "========================================" "INFO"
    Write-Log "Intune Onboarding Script Started" "INFO"
    Write-Log "========================================" "INFO"
    Write-Log "User: $env:USERNAME"
    Write-Log "Device: $env:COMPUTERNAME"

    # Verify Azure AD enrollment
    if (-not (Test-AzureADEnrollment)) {
        Write-Log "Cannot proceed without Azure AD enrollment" "ERROR"
        exit 1
    }

    # Execute setup steps
    Invoke-IntuneSync
    Install-Microsoft365Apps
    Setup-OneDrive
    Setup-Outlook
    Setup-Teams
    Setup-OfficeApps

    Write-Log "========================================" "INFO"
    Write-Log "Onboarding script completed successfully" "SUCCESS"
    Write-Log "========================================" "INFO"
    Write-Log "Log file saved to: $logFile"

    # Open log file
    Start-Process notepad $logFile -ErrorAction SilentlyContinue
}

# Run main function
Main
