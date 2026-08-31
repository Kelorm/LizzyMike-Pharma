# LizzyMike Pharmacy - Remove Auto-Start Script
# 
# This script removes the Windows Scheduled Task that automatically
# starts the pharmacy Docker containers on PC boot.
#
# Run as Administrator: Right-click > Run with PowerShell > Run as Administrator

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
Write-ColorOutput "  LizzyMike Pharmacy Auto-Start Removal" "Blue"
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

# Task name
$taskName = "LizzyMikePharmacyAutoStart"

# Check if task exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-ColorOutput "Found scheduled task: $taskName" "Yellow"
    Write-Host ""
    
    # Show task info before removing
    $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
    Write-Host "  Last Run Time:  $($taskInfo.LastRunTime)"
    Write-Host "  Next Run Time:  $($taskInfo.NextRunTime)"
    Write-Host "  State:          $($taskInfo.State)"
    Write-Host ""
    
    # Confirm removal
    $confirmation = Read-Host "Remove this scheduled task? (y/n)"
    
    if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
        # Unregister the task
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        
        Write-ColorOutput "SUCCESS: Scheduled task removed!" "Green"
        Write-Host ""
        Write-Host "The pharmacy system will no longer auto-start on PC boot."
    } else {
        Write-ColorOutput "Cancelled - no changes made." "Yellow"
    }
} else {
    Write-ColorOutput "No scheduled task found: $taskName" "Yellow"
    Write-Host ""
    Write-Host "The auto-start was either never set up or has already been removed."
}

# Also check for the startup script
$projectPath = "C:\LizzyMikePharma"
$startupScriptPath = "$projectPath\startup_script.ps1"

if (Test-Path $startupScriptPath) {
    Write-Host ""
    $removeScript = Read-Host "Remove the startup script file? (y/n)"
    
    if ($removeScript -eq 'y' -or $removeScript -eq 'Y') {
        Remove-Item -Path $startupScriptPath -Force
        Write-ColorOutput "Removed startup script: $startupScriptPath" "Green"
    }
}

Write-Host ""
Write-ColorOutput "========================================" "Blue"
Write-ColorOutput "  Removal Complete!" "Green"
Write-ColorOutput "========================================" "Blue"
Write-Host ""
Write-Host "To manually start the system, run:"
Write-Host "  cd C:\LizzyMikePharma"
Write-Host "  docker-compose up -d"
Write-Host ""