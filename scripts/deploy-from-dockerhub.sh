#!/bin/bash
# Complete deployment script for client VPS
# Deploys application from Docker Hub

set -e

echo "=========================================="
echo "DIG Traffic System - Docker Hub Deployment"
echo "=========================================="

# Configuration
DOCKER_USERNAME="${DOCKER_USERNAME:-yourusername}"
IMAGE_NAME="${DOCKER_USERNAME}/digtraffic-app:latest"
CONTAINER_NAME="digtraffic-app"
PORT=5000

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed!"
    echo "Please install Docker first."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo "Creating .env file..."
    echo ""
    
    if [ -f scripts/create-env.sh ]; then
        chmod +x scripts/create-env.sh
        ./scripts/create-env.sh
    else
        echo "ERROR: create-env.sh script not found!"
        echo "Please create .env file manually."
        exit 1
    fi
fi

# Login to Docker Hub (if not already logged in)
echo ""
echo "Checking Docker Hub login..."
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo "Please login to Docker Hub:"
    docker login
fi

# Pull latest image
echo ""
echo "Pulling latest image from Docker Hub..."
echo "Image: ${IMAGE_NAME}"
docker pull ${IMAGE_NAME}

# Stop and remove old container (if exists)
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo ""
    echo "Stopping existing container..."
    docker stop ${CONTAINER_NAME} 2>/dev/null || true
    docker rm ${CONTAINER_NAME} 2>/dev/null || true
fi

# Create uploads directory
echo ""
echo "Creating uploads directory..."
mkdir -p uploads
chmod 755 uploads

# Run new container
echo ""
echo "Starting new container..."
echo "Container name: ${CONTAINER_NAME}"
echo "Port: ${PORT}"

# Determine network mode based on Redis configuration
if grep -q "REDIS_HOST=localhost" .env || grep -q "REDIS_HOST=127.0.0.1" .env; then
    echo "Using host network mode for Redis connection..."
    docker run -d \
      --name ${CONTAINER_NAME} \
      --restart unless-stopped \
      -p ${PORT}:${PORT} \
      --env-file .env \
      -v $(pwd)/uploads:/app/uploads \
      --network host \
      ${IMAGE_NAME}
else
    echo "Using bridge network mode..."
    docker run -d \
      --name ${CONTAINER_NAME} \
      --restart unless-stopped \
      -p ${PORT}:${PORT} \
      --env-file .env \
      -v $(pwd)/uploads:/app/uploads \
      --add-host=host.docker.internal:host-gateway \
      ${IMAGE_NAME}
fi

# Wait for container to start
echo ""
echo "Waiting for container to start..."
sleep 5

# Check if container is running
if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "✅ Container is running!"
else
    echo "❌ Container failed to start. Check logs:"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

# Check health
echo ""
echo "Checking application health..."
HEALTH_CHECK_URL="http://localhost:${PORT}/api/health"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s ${HEALTH_CHECK_URL} > /dev/null 2>&1; then
        echo "✅ Application is healthy!"
        echo ""
        echo "Health Status:"
        curl -s ${HEALTH_CHECK_URL} | python3 -m json.tool 2>/dev/null || curl -s ${HEALTH_CHECK_URL}
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "Waiting for application to be ready... (${RETRY_COUNT}/${MAX_RETRIES})"
            sleep 3
        else
            echo "⚠️  Application may not be ready yet."
            echo "Check logs with: docker logs -f ${CONTAINER_NAME}"
        fi
    fi
done

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Application Information:"
echo "  URL: http://localhost:${PORT}"
echo "  Health Check: http://localhost:${PORT}/api/health"
echo "  Container Name: ${CONTAINER_NAME}"
echo ""
echo "Useful Commands:"
echo "  View logs:        docker logs -f ${CONTAINER_NAME}"
echo "  Stop app:         docker stop ${CONTAINER_NAME}"
echo "  Start app:         docker start ${CONTAINER_NAME}"
echo "  Restart app:      docker restart ${CONTAINER_NAME}"
echo "  View status:      docker ps | grep ${CONTAINER_NAME}"
echo "  Remove container: docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}"
echo ""
echo "To update application:"
echo "  1. Run this script again: ./scripts/deploy-from-dockerhub.sh"
echo "  2. Or manually: docker pull ${IMAGE_NAME} && docker restart ${CONTAINER_NAME}"
echo ""
echo "=========================================="

