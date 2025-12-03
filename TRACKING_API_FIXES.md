# Tracking API Connection Fixes

## Problem Analysis

Based on your server logs, the main issues were:

1. **Connection Timeouts**: The external API (`tracking.esspl.com.pk:8080`) was timing out
2. **No Retry Logic**: Failed requests weren't being retried
3. **Poor Error Handling**: Service continued trying even after consistent failures
4. **No Backoff Strategy**: Constant failed attempts without intelligent spacing

## API Performance Test Results

✅ **Good News**: The external API is working and returning data!

- **Last Hour**: 406 records in 13.4 seconds
- **Last 6 Hours**: 4,674 records in 11.7 seconds  
- **Yesterday**: 430 records in 14.1 seconds

⚠️ **Issue**: The API is slow (10-15 seconds response time), which was causing timeouts.

## Implemented Fixes

### 1. Enhanced Retry Logic
- **Exponential Backoff**: 2s, 4s, 8s delays between retries
- **Max 3 Retries**: Prevents infinite retry loops
- **Progressive Timeouts**: 30s, 40s, 50s, 60s for each retry attempt

### 2. Intelligent Failure Handling
- **Consecutive Failure Tracking**: Monitors API health
- **Dynamic Intervals**: Increases update frequency when API is failing
- **Backoff Multiplier**: Reduces load on failing API (up to 6x normal interval)
- **Auto-Recovery**: Returns to normal intervals when API recovers

### 3. Better Error Classification
- **Retryable Errors**: Timeouts, connection refused, DNS issues
- **Non-Retryable Errors**: Authentication, malformed requests
- **Detailed Logging**: Better error messages and diagnostics

### 4. Connection Improvements
- **Keep-Alive Headers**: Reuses connections when possible
- **AbortController**: Proper timeout handling
- **User-Agent**: Identifies requests from your system

## New Features Added

### 1. API Connectivity Test Endpoint
```
GET /api/tracking/test-connection
```
- Tests external API connectivity
- Measures response times
- Returns detailed diagnostics

### 2. Diagnostic Script
```bash
node scripts/test-external-api.cjs
```
- Tests multiple time ranges
- DNS resolution check
- Network diagnostics
- Sample data display

## Deployment Instructions

### Option 1: Manual Deployment
1. Build the application:
   ```bash
   npm run build
   ```

2. Copy the `dist` folder to your server at `/opt/DIG/`

3. Restart PM2:
   ```bash
   pm2 restart dig
   ```

### Option 2: Using the Deploy Script
```bash
# On your server
./scripts/deploy-updates.sh
```

## Monitoring & Troubleshooting

### Check API Health
1. **Via Frontend**: Go to Tracking Events page → Settings → "Test API Connection"
2. **Via API**: `GET /api/tracking/test-connection`
3. **Via Script**: `node scripts/test-external-api.cjs`

### Monitor Logs
```bash
# Check for connection issues
pm2 logs dig | grep "TrackingService"

# Check for successful data fetches
pm2 logs dig | grep "Successfully fetched"

# Check for backoff behavior
pm2 logs dig | grep "backing off"
```

### Expected Behavior After Fix
- **Normal Operation**: Updates every 5 minutes
- **During API Issues**: Gradually increases interval (7.5min, 11.25min, up to 30min max)
- **Recovery**: Returns to 5-minute intervals when API is healthy
- **Retry Logic**: 3 attempts with exponential backoff for each failed request

## Configuration Options

The service now automatically adapts to API performance:

- **Base Interval**: 5 minutes (configurable)
- **Max Failures**: 5 consecutive failures before backoff
- **Max Backoff**: 6x normal interval (30 minutes max)
- **Retry Attempts**: 3 per request
- **Timeout Progression**: 30s → 40s → 50s → 60s

## What to Expect

1. **Immediate**: Fewer timeout errors in logs
2. **Short Term**: Successful data fetching with retry attempts logged
3. **Long Term**: Stable data collection with intelligent failure handling

The system will now gracefully handle the slow external API while maintaining data collection reliability.


