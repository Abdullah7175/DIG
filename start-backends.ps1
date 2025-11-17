# Start Both Backends Script
# This script starts both Traccar and the main application in separate windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Hospital Management System" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Traccar Backend
Write-Host "[1/2] Starting Traccar Backend (Port 8082)..." -ForegroundColor Yellow
$traccarPath = Join-Path $scriptDir "traccar-backend"
$traccarJar = Join-Path $traccarPath "target\tracker-server.jar"
$traccarConfig = Join-Path $traccarPath "debug.xml"

if (Test-Path $traccarJar) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$traccarPath'; Write-Host 'Traccar Backend Starting...' -ForegroundColor Green; java -jar target\tracker-server.jar debug.xml"
    Write-Host "  ✓ Traccar window opened" -ForegroundColor Green
} else {
    Write-Host "  ✗ Traccar JAR not found at: $traccarJar" -ForegroundColor Red
    Write-Host "  Please build Traccar first or check the path." -ForegroundColor Yellow
}

# Wait for Traccar to initialize
Write-Host ""
Write-Host "Waiting 5 seconds for Traccar to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Start Main Application
Write-Host "[2/2] Starting Main Application (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir'; Write-Host 'Main Application Starting...' -ForegroundColor Green; npm run dev"
Write-Host "  ✓ Main application window opened" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Services Starting..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Traccar Backend:  http://localhost:8082" -ForegroundColor Cyan
Write-Host "Main Application: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Keep both terminal windows open." -ForegroundColor Yellow
Write-Host "Press Ctrl+C in each window to stop the services." -ForegroundColor Yellow
Write-Host ""

# Wait a bit and check if services are up
Start-Sleep -Seconds 10

Write-Host "Checking service status..." -ForegroundColor Gray
$traccarUp = Test-NetConnection -ComputerName localhost -Port 8082 -InformationLevel Quiet -WarningAction SilentlyContinue
$mainAppUp = Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet -WarningAction SilentlyContinue

Write-Host ""
if ($traccarUp) {
    Write-Host "  ✓ Traccar is running on port 8082" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Traccar not responding yet (may still be starting)" -ForegroundColor Yellow
}

if ($mainAppUp) {
    Write-Host "  ✓ Main application is running on port 5000" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Main application not responding yet (may still be starting)" -ForegroundColor Yellow
}

Write-Host ""

