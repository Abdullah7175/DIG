#!/bin/bash

# Build and Run Traccar Backend Script for Linux
# This script builds the Traccar JAR and runs it

set -e  # Exit on error

echo "=========================================="
echo "  Building Traccar Backend"
echo "=========================================="
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "Error: Java is not installed or not in PATH"
    echo "Please install Java 17 or higher"
    exit 1
fi

# Check Java version
JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    echo "Error: Java 17 or higher is required. Found Java $JAVA_VERSION"
    exit 1
fi

echo "Java version: $(java -version 2>&1 | head -n 1)"
echo ""

# Check if Gradle wrapper exists
if [ ! -f "./gradlew" ]; then
    echo "Error: gradlew not found. Make sure you're in the traccar-backend directory"
    exit 1
fi

# Make gradlew executable
chmod +x ./gradlew

# Build the project
echo "Building Traccar backend..."
./gradlew build --no-daemon

if [ $? -ne 0 ]; then
    echo "Error: Build failed"
    exit 1
fi

echo ""
echo "Build completed successfully!"
echo ""

# Check if JAR exists
if [ ! -f "target/tracker-server.jar" ]; then
    echo "Error: JAR file not found at target/tracker-server.jar"
    echo "Build may have failed. Check the output above."
    exit 1
fi

echo "=========================================="
echo "  Starting Traccar Backend"
echo "=========================================="
echo ""

# Run the server
java -jar target/tracker-server.jar debug.xml

