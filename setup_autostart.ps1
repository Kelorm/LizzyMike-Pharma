# LizzyMike Pharmacy - Auto-Start Setup Script
# 
# This script registers a Windows Scheduled Task to automatically
# start the pharmacy Docker containers when the PC boots.
#
# Run as Administrator: Right-click > Run with PowerShell > Run as Administrator

param(
    [string]$ProjectPath = "C:\LizzyMikePharma",
    [int]$MaxRetries = 3,
    [int]$DockerWaitSeconds = 120
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    $colors = @{
        "Red" = "[31m"
        "Green" = "[32m"
        "Yellow" = "[33m"
        "Blue" = "[34m"
        "White" = "[37m"
    }
    $esc = [char]27
    Write-Host "$esc$($colors[$Color])[1m$Message$esc[0m"
}

Write-ColorOutput "========================================" "Blue"
Write-ColorOutput "  LizzyMike Pharmacy Auto-Start Setup" "Blue"
Write-ColorOutput "========================================" "Blue"
Write-Host ""

# Check for Administrator privileges
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-ColorOutput "ERROR: This script must be run as Administrator!" "Red"
    Write-Host "Right-click on PowerShell > Run as Administrator"
    exit 1
}

# Validate project path
if (-not (Test-Path $ProjectPath)) {
    Write-ColorOutput "ERROR: Project path not found: $ProjectPath" "Red"
    exit 1
}

# Create logs directory if it doesn't exist
$logDir = "$ProjectPath\logs"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    Write-ColorOutput "Created logs directory: $logDir" "Green"
}

# Task name
$taskName = "LizzyMikePharmacyAutoStart"
$taskDescription = "Starts LizzyMike Pharmacy Docker containers on system boot"

Write-ColorOutput "Registering scheduled task..." "Yellow"

# Create the PowerShell script that will be run by the scheduled task
$startupScriptContent = @'
param(
    [string]$ProjectPath = "C:\LizzyMikePharma",
    [int]$MaxRetries = 3,
    [int]$DockerWaitSeconds = 120
)

$ErrorActionPreference = "Continue"
$logFile = "$ProjectPath\logs\startup.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Add-Content -Path $logFile -Value $logMessage -Encoding UTF8
    Write-Host $logMessage
}

Write-Log "========================================"
Write-Log "  LizzyMike Pharmacy Auto-Start"
Write-Log "========================================"

# Wait for Docker Desktop to be ready
Write-Log "Waiting for Docker Desktop to be ready..."
$dockerReady = $false
$waitTime = 0

while (-not $dockerReady -and $waitTime -lt $DockerWaitSeconds) {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerReady = $true
        Write-Log "Docker Desktop is ready!"
    } else {
        Start-Sleep -Seconds 5
        $waitTime += 5
        Write-Log "Waiting for Docker... ($waitTime/$DockerWaitSeconds seconds)"
    }
}

if (-not $dockerReady) {
    Write-Log "ERROR: Docker Desktop did not start within $DockerWaitSeconds seconds"
    exit 1
}

# Change to project directory
Set-Location $ProjectPath
Write-Log "Changed to project directory: $ProjectPath"

# Try to start containers with retries
$success = $false
$retryCount = 0

while (-not $success -and $retryCount -lt $MaxRetries) {
    $retryCount++
    Write-Log "Attempt $retryCount of $MaxRetries to start containers..."
    
    # Run docker-compose up -d
    $output = docker-compose up -d 2>&1
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        $success = $true
        Write-Log "SUCCESS: Containers started successfully!"
        Write-Log $output
    } else {
        Write-Log "WARNING: docker-compose up failed with exit code $exitCode"
        Write-Log $output
        
        if ($retryCount -lt $MaxRetries) {
            Write-Log "Retrying in 10 seconds..."
            Start-Sleep -Seconds 10
        }
    }
}

if ($success) {
    # Wait for containers to be healthy
    Write-Log "Waiting for containers to be healthy..."
    Start-Sleep -Seconds 30
    
    # Check container status
    $containerStatus = docker-compose ps
    Write-Log "Container status:"
    Write-Log $containerStatus
    
    Write-Log "========================================"
    Write-Log "  Auto-Start Complete!"
    Write-Log "  Access the system at: http://192.168.1.100"
    Write-Log "========================================"
    exit 0
} else {
    Write-Log "ERROR: Failed to start containers after $MaxRetries attempts"
    exit 1
}
'@

# Save the startup script
$startupScriptPath = "$ProjectPath\startup_script.ps1"
$startupScriptContent | Out-File -FilePath $startupScriptPath -Encoding UTF8
Write-ColorOutput "Created startup script: $startupScriptPath" "Green"

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-ColorOutput "Removing existing scheduled task..." "Yellow"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create the scheduled task action
$scriptPath = "$ProjectPath\startup_script.ps1"
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$scriptPath`" -ProjectPath `"$ProjectPath`" -MaxRetries $MaxRetries -DockerWaitSeconds $DockerWaitSeconds"

# Create the trigger (on system startup)
$trigger = New-ScheduledTaskTrigger -AtStartup

# Create the principal (run as SYSTEM with highest privileges)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Create the settings
$settings = New-ScheduledTaskSettingsSet -AllowStartOnDemand -StartWhenAvailable -DontStopIfGoingOnBatteries -DontStopOnIdleDuration 0 -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Register the scheduled task
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description $taskDescription | Out-Null

Write-ColorOutput "SUCCESS: Scheduled task registered!" "Green"
Write-Host ""
Write-ColorOutput "Task Details:" "Yellow"
Write-Host "  Name:        $taskName"
Write-Host "  Trigger:     At system startup"
Write-Host "  Run as:      SYSTEM (Administrator)"
Write-Host "  Project:     $ProjectPath"
Write-Host "  Log file:    $logDir\startup.log"
Write-Host ""

# Test the task registration
$registeredTask = Get-ScheduledTask -TaskName $taskName
if ($registeredTask) {
    Write-ColorOutput "Task verification: PASSED" "Green"
} else {
    Write-ColorOutput "Task verification: FAILED" "Red"
    exit 1
}

Write-Host ""
Write-ColorOutput "========================================" "Blue"
Write-ColorOutput "  Setup Complete!" "Green"
Write-ColorOutput "========================================" "Blue"
Write-Host ""
Write-Host "The pharmacy system will now automatically start when the PC boots."
Write-Host ""
Write-Host "To manually start now, run:"
Write-Host "  docker-compose up -d"
Write-Host ""
Write-Host "To remove auto-start, run:"
Write-Host "  remove_autostart.ps1"
Write-Host ""