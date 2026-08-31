# LizzyMike Pharmacy - Startup Health Check Script
# 
# This script waits for all Docker containers to be healthy
# and then opens the browser to the pharmacy system.
#
# Run after docker-compose up -d completes

param(
    [string]$ProjectPath = "C:\LizzyMikePharma",
    [int]$MaxWaitMinutes = 5,
    [string]$SystemUrl = "http://192.168.1.100"
)

$ErrorActionPreference = "Continue"

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
Write-ColorOutput "  LizzyMike Pharmacy Health Check" "Blue"
Write-ColorOutput "========================================" "Blue"
Write-Host ""

# Change to project directory
Set-Location $ProjectPath

# Wait for containers to be healthy
Write-ColorOutput "Waiting for containers to be healthy..." "Yellow"

$maxSeconds = $MaxWaitMinutes * 60
$elapsed = 0
$checkInterval = 10

while ($elapsed -lt $maxSeconds) {
    # Get container status
    $containers = docker-compose ps --format json 2>&1 | ConvertFrom-Json
    
    $allHealthy = $true
    $containerStatuses = @()
    
    foreach ($container in $containers) {
        $state = $container.State
        $name = $container.Service
        
        # Check health status
        $health = "unknown"
        if ($container.Health) {
            $health = $container.Health
        }
        
        $status = "$name`: $state"
        if ($health -ne "unknown") {
            $status += " ($health)"
        }
        
        $containerStatuses += $status
        
        # Consider healthy if running or healthy health check
        if ($state -ne "running" -and $health -ne "healthy") {
            $allHealthy = $false
        }
    }
    
    if ($allHealthy -and $containers) {
        Write-ColorOutput "All containers are healthy!" "Green"
        Write-Host ""
        break
    }
    
    Write-Host "Waiting... ($elapsed/$maxSeconds seconds)"
    Start-Sleep -Seconds $checkInterval
    $elapsed += $checkInterval
}

# Show container status
Write-ColorOutput "Container Status:" "Yellow"
docker-compose ps
Write-Host ""

# Check if all containers are running
$runningContainers = docker-compose ps --filter "status=running" | Select-String -Pattern "Up" | Measure-Object
$totalContainers = (docker-compose ps --format json | ConvertFrom-Json).Count

if ($runningContainers.Count -eq $totalContainers -and $totalContainers -gt 0) {
    Write-ColorOutput "SUCCESS: All containers are running!" "Green"
    Write-Host ""
    
    # Try to access the system
    Write-ColorOutput "Testing system accessibility..." "Yellow"
    
    try {
        $response = Invoke-WebRequest -Uri "$SystemUrl/health" -TimeoutSec 10 -UseBasicParsing -ErrorAction SilentlyContinue
        
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput "System is accessible at: $SystemUrl" "Green"
            
            # Open browser
            Write-Host ""
            Write-ColorOutput "Opening browser..." "Blue"
            Start-Process $SystemUrl
        }
    } catch {
        Write-ColorOutput "Note: Could not verify system accessibility" "Yellow"
        Write-Host "The system may still be starting up."
        Write-Host ""
        
        # Still try to open browser
        Write-ColorOutput "Opening browser to: $SystemUrl" "Blue"
        Start-Process $SystemUrl
    }
    
    Write-Host ""
    Write-ColorOutput "========================================" "Green"
    Write-ColorOutput "  System Ready!" "Green"
    Write-ColorOutput "========================================" "Green"
    Write-Host ""
    Write-Host "Access the pharmacy system at: $SystemUrl"
    Write-Host ""
    
    exit 0
} else {
    Write-ColorOutput "WARNING: Some containers may not be running properly" "Yellow"
    Write-Host ""
    Write-Host "Container status:"
    docker-compose ps
    Write-Host ""
    
    Write-ColorOutput "========================================" "Yellow"
    Write-ColorOutput "  System May Not Be Fully Ready" "Yellow"
    Write-ColorOutput "========================================" "Yellow"
    Write-Host ""
    Write-Host "Try these steps:"
    Write-Host "  1. Check Docker Desktop is running"
    Write-Host "  2. Run: docker-compose logs"
    Write-Host "  3. Run: docker-compose restart"
    Write-Host ""
    Write-Host "The browser will still open to: $SystemUrl"
    Write-Host ""
    
    # Open browser anyway
    Start-Process $SystemUrl
    
    exit 1
}