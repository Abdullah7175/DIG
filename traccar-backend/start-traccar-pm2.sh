#!/bin/bash

# Proper PM2 startup script for Traccar Backend
# This ensures Traccar runs stably without unnecessary restarts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Stop existing process if running
pm2 delete traccar-backend 2>/dev/null || true

# Start with proper PM2 configuration
# Key settings:
# - max-memory-restart: 2G (only restart if memory exceeds 2GB)
# - restart-delay: 5000ms (wait 5s before restarting)
# - max-restarts: 10 (max 10 restarts, then stop)
# - watch: false (disable file watching)
pm2 start "$SCRIPT_DIR/start.sh" \
  --name traccar-backend \
  --interpreter bash \
  --cwd "$SCRIPT_DIR" \
  --max-memory-restart 2G \
  --kill-timeout 10000 \
  --restart-delay 5000 \
  --max-restarts 10 \
  --watch false

# Save PM2 configuration
pm2 save

echo "Traccar backend started with PM2"
echo "Check status: pm2 list"
echo "View logs: pm2 logs traccar-backend"

