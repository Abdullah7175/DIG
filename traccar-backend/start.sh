#!/bin/bash

# Traccar Backend Startup Script for PM2
# This script starts the Traccar server with the debug.xml configuration

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to script directory to ensure relative paths work
cd "$SCRIPT_DIR"

# Start Traccar server
java -jar "$SCRIPT_DIR/target/tracker-server.jar" "$SCRIPT_DIR/debug.xml"

