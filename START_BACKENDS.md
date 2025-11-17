# How to Run the Backends

This guide explains how to start both backend services for the Hospital Management System.

## Prerequisites

1. **Node.js** (v20+) - For the main application
2. **Java** (v17+) - For Traccar backend
3. **PostgreSQL** - Database server running
4. **Environment Variables** - `.env` file configured

## Starting the Backends

### Option 1: Manual Start (Recommended for Development)

#### Step 1: Start Traccar Backend (Port 8082)

Open a terminal/PowerShell window:

```powershell
# Navigate to traccar-backend directory
cd traccar-backend

# Start Traccar server
java -jar target\tracker-server.jar debug.xml
```

**Expected Output:**
```
[INFO] Starting Traccar Server...
[INFO] Server started on port 8082
```

**Note:** Keep this terminal window open. Traccar will run in the foreground.

#### Step 2: Start Main Application (Port 5000)

Open a **NEW** terminal/PowerShell window:

```powershell
# Navigate to project root
cd E:\DIGtraffic\HospitalManagementSystem

# Start the main application
npm run dev
```

**Expected Output:**
```
> rest-express@1.0.0 dev
> cross-env NODE_ENV=development NODE_OPTIONS='--max-old-space-size=4096' tsx server/index.ts

WebSocket service initialized
Database connection established successfully
serving on port 5000
```

### Option 2: PowerShell Script (Automated)

Create a file `start-backends.ps1`:

```powershell
# Start Traccar Backend
Write-Host "Starting Traccar Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd traccar-backend; java -jar target\tracker-server.jar debug.xml"

# Wait for Traccar to start
Start-Sleep -Seconds 5

# Start Main Application
Write-Host "Starting Main Application..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd $PSScriptRoot; npm run dev"

Write-Host "Both backends are starting..." -ForegroundColor Yellow
Write-Host "Traccar: http://localhost:8082" -ForegroundColor Cyan
Write-Host "Main App: http://localhost:5000" -ForegroundColor Cyan
```

Run it:
```powershell
.\start-backends.ps1
```

## Verification

### Check if Services are Running

```powershell
# Check Traccar (Port 8082)
Test-NetConnection -ComputerName localhost -Port 8082 -InformationLevel Quiet

# Check Main App (Port 5000)
Test-NetConnection -ComputerName localhost -Port 5000 -InformationLevel Quiet

# Or test with HTTP requests
Invoke-WebRequest -Uri "http://localhost:8082/api/server" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:5000/api/dashboard/stats" -UseBasicParsing
```

### Expected URLs

- **Traccar API**: http://localhost:8082
- **Main Application**: http://localhost:5000
- **Frontend**: http://localhost:5000 (served by main app)

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```powershell
# Find processes using ports
netstat -ano | findstr ":5000"
netstat -ano | findstr ":8082"

# Kill processes (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Traccar Not Starting

1. Check Java version: `java -version` (should be 17+)
2. Verify JAR file exists: `Test-Path traccar-backend\target\tracker-server.jar`
3. Check Traccar logs for errors

### Main App Not Starting

1. Check Node.js version: `node --version` (should be 20+)
2. Install dependencies: `npm install`
3. Check `.env` file exists and has correct `DATABASE_URL`
4. Verify PostgreSQL is running

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check `DATABASE_URL` in `.env` file
3. Test connection: `psql $DATABASE_URL`

## Stopping the Backends

### Manual Stop

- **Traccar**: Press `Ctrl+C` in the Traccar terminal window
- **Main App**: Press `Ctrl+C` in the main app terminal window

### Stop All Node/Java Processes

```powershell
# Stop all Node.js processes
Get-Process | Where-Object { $_.ProcessName -eq "node" } | Stop-Process -Force

# Stop Traccar Java processes
Get-Process | Where-Object { $_.ProcessName -eq "java" -and $_.Path -like "*traccar*" } | Stop-Process -Force
```

## Development vs Production

### Development Mode (Current)
- Uses `npm run dev` - Hot reload enabled
- Traccar runs with `debug.xml` config
- Both run in foreground (terminal windows)

### Production Mode
- Uses `npm run start` - No hot reload
- Traccar runs as Windows Service or background process
- See `DEPLOYMENT.md` for production setup

## Quick Start Commands

```powershell
# Terminal 1: Traccar
cd traccar-backend
java -jar target\tracker-server.jar debug.xml

# Terminal 2: Main App
cd E:\DIGtraffic\HospitalManagementSystem
npm run dev
```

---

**Note:** Always start Traccar first, then the main application. The main app will try to connect to Traccar on startup.

