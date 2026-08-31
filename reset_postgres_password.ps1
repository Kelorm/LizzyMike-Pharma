#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Reset PostgreSQL postgres user password

.DESCRIPTION
    This script resets the PostgreSQL 18 postgres user password
    Run as Administrator in PowerShell

.PARAMETER Password
    New password for postgres user (default: CHANGE_ME_DB_PASSWORD)
#>

param(
    [string]$Password = "CHANGE_ME_DB_PASSWORD"
)

$PGBin = "C:\Program Files\PostgreSQL\18\bin"
$PGData = "C:\Program Files\PostgreSQL\18\data"

if (!(Test-Path $PGBin)) {
    Write-Error "PostgreSQL not found at $PGBin"
    exit 1
}

Write-Host "╔════════════════════════════════════════════════════╗"
Write-Host "║     PostgreSQL Password Reset                     ║"
Write-Host "╚════════════════════════════════════════════════════╝"
Write-Host ""

Write-Host "[1/3] Stopping PostgreSQL service..."
try {
    Stop-Service -Name "postgresql-x64-18" -ErrorAction Stop
    Start-Sleep -Seconds 2
} catch {
    Write-Error "Failed to stop PostgreSQL service: $_"
    exit 1
}

Write-Host "[2/3] Starting PostgreSQL with single-user mode..."
# Start in single-user mode to bypass authentication
& "$PGBin\postgres.exe" `
    -D $PGData `
    -c shared_buffers=128MB `
    --single postgres 2>&1 | Out-Null &

Start-Sleep -Seconds 3

Write-Host "[3/3] Connecting and resetting password..."
# Create SQL command
$sql = @"
ALTER USER postgres WITH PASSWORD '$Password';
"@

# Write to temp file and execute
$tempFile = "$env:TEMP\reset_pw.sql"
$sql | Out-File -FilePath $tempFile -Encoding ASCII

try {
    # Execute as psql
    $env:PGPASSWORD = $Password
    & "$PGBin\psql.exe" `
        -U postgres `
        -h localhost `
        -c "ALTER USER postgres WITH PASSWORD '$Password';" 2>&1
} catch {
    Write-Host "Note: Single-user mode password reset - attempting standard connection..."
}

Start-Sleep -Seconds 2

Write-Host "[Cleanup] Restarting PostgreSQL service..."
Stop-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Service -Name "postgresql-x64-18"
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗"
Write-Host "║     Testing connection...                         ║"
Write-Host "╚════════════════════════════════════════════════════╝"
Write-Host ""

$env:PGPASSWORD = $Password
$testResult = & "$PGBin\psql.exe" -U postgres -h localhost -c "SELECT version();" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Password reset successful!"
    Write-Host ""
    Write-Host "PostgreSQL postgres user password has been set to:"
    Write-Host "  Password: $Password"
    Write-Host ""
    Write-Host "Next step: Run setup_postgresql.bat to create the database"
} else {
    Write-Host "✗ Connection test failed. Output:"
    Write-Host $testResult
}

Remove-Item -Path $tempFile -ErrorAction SilentlyContinue
