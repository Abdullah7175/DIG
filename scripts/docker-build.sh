#!/bin/bash
# Build script for Docker image
# Run this on YOUR machine to create the Docker image
# Supports both local tar file and Docker Hub push

set -e

echo "=========================================="
echo "Building Docker Image for Secure Deployment"
echo "=========================================="

# Get Docker Hub username (optional)
read -p "Enter your Docker Hub username (or press Enter to skip Docker Hub): " DOCKER_USERNAME

# Build the Docker image
if [ -z "$DOCKER_USERNAME" ]; then
    # Local build only
    IMAGE_NAME="digtraffic-app:latest"
    echo "Building multi-stage Docker image (local only)..."
    docker build -t $IMAGE_NAME .
    
    # Save the image to a tar file
    echo "Saving Docker image to tar file..."
    docker save $IMAGE_NAME -o digtraffic-app.tar
    
    # Compress the tar file
    echo "Compressing Docker image..."
    gzip -f digtraffic-app.tar
    
    echo "=========================================="
    echo "Build Complete!"
    echo "=========================================="
    echo "Image saved as: digtraffic-app.tar.gz"
    echo "File size: $(du -h digtraffic-app.tar.gz | cut -f1)"
    echo ""
    echo "Next steps:"
    echo "1. Transfer digtraffic-app.tar.gz to client VPS"
    echo "2. Follow deployment instructions in DOCKER_DEPLOYMENT.md"
    echo "=========================================="
else
    # Build and push to Docker Hub
    IMAGE_NAME="${DOCKER_USERNAME}/digtraffic-app:latest"
    echo "Building multi-stage Docker image for Docker Hub..."
    docker build -t $IMAGE_NAME .
    
    # Login to Docker Hub
    echo "Logging in to Docker Hub..."
    docker login
    
    # Push to Docker Hub
    echo "Pushing image to Docker Hub..."
    docker push $IMAGE_NAME
    
    echo "=========================================="
    echo "Build and Push Complete!"
    echo "=========================================="
    echo "Image pushed to: ${IMAGE_NAME}"
    echo "Docker Hub URL: https://hub.docker.com/r/${DOCKER_USERNAME}/digtraffic-app"
    echo ""
    echo "Next steps:"
    echo "1. On client VPS, run: docker pull ${IMAGE_NAME}"
    echo "2. Follow deployment instructions in DOCKER_HUB_DEPLOYMENT.md"
    echo "=========================================="
fi

