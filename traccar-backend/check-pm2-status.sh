#!/bin/bash

# Check PM2 status and configuration for traccar-backend
echo "=========================================="
echo "PM2 Status for traccar-backend"
echo "=========================================="
echo ""

echo "1. PM2 Process List:"
pm2 list
echo ""

echo "2. Detailed Info for traccar-backend:"
pm2 describe traccar-backend
echo ""

echo "3. PM2 Logs (last 30 lines):"
pm2 logs traccar-backend --lines 30 --nostream
echo ""

echo "4. PM2 Monitor (showing restart count and memory):"
pm2 monit --no-interaction 2>/dev/null || echo "Monitor not available"
echo ""

echo "5. Check if watch mode is enabled:"
pm2 describe traccar-backend | grep -i watch || echo "Watch mode check failed"
echo ""

echo "6. Check restart reasons:"
pm2 describe traccar-backend | grep -E "restart|unstable|errored" || echo "No restart info found"

