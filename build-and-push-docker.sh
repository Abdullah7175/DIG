#!/bin/bash
# Complete Docker Build and Push Script
# This script builds the project, creates Docker image, and pushes to Docker Hub
# Also keeps a local copy of the image

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Docker Image Build & Push Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 0: Get Docker Hub username
if [ -z "$DOCKER_HUB_USERNAME" ]; then
    echo -e "${YELLOW}Enter your Docker Hub username:${NC}"
    read DOCKER_HUB_USERNAME
    if [ -z "$DOCKER_HUB_USERNAME" ]; then
        echo -e "${RED}Error: Docker Hub username is required!${NC}"
        exit 1
    fi
fi

IMAGE_NAME="digtraffic-app"
IMAGE_TAG="latest"
FULL_IMAGE_NAME="${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"

# Check if Docker is running
echo -e "${YELLOW}Step 0: Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}\n"

# Step 1: Build the project
echo -e "${YELLOW}Step 1: Building project (npm run build)...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Project built successfully${NC}\n"

# Step 2: Login to Docker Hub
echo -e "${YELLOW}Step 2: Checking Docker Hub login...${NC}"
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo -e "${YELLOW}Please login to Docker Hub:${NC}"
    docker login
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Docker login failed.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Already logged in to Docker Hub${NC}"
fi
echo ""

# Step 3: Build Docker image
echo -e "${YELLOW}Step 3: Building Docker image...${NC}"
echo -e "Image name: ${BLUE}${FULL_IMAGE_NAME}${NC}"
docker build -t ${FULL_IMAGE_NAME} .
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Docker build failed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker image built successfully${NC}\n"

# Step 4: Also tag as local image (for local use)
echo -e "${YELLOW}Step 4: Tagging image for local use...${NC}"
docker tag ${FULL_IMAGE_NAME} ${IMAGE_NAME}:${IMAGE_TAG}
echo -e "${GREEN}✓ Image tagged locally as ${IMAGE_NAME}:${IMAGE_TAG}${NC}\n"

# Step 5: Push to Docker Hub
echo -e "${YELLOW}Step 5: Pushing image to Docker Hub...${NC}"
echo -e "This may take a few minutes depending on your internet speed..."
docker push ${FULL_IMAGE_NAME}
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Docker push failed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Image pushed to Docker Hub successfully${NC}\n"

# Step 6: Show image info
echo -e "${YELLOW}Step 6: Image information...${NC}"
docker images | grep -E "REPOSITORY|${IMAGE_NAME}|${DOCKER_HUB_USERNAME}/${IMAGE_NAME}" | head -3
echo ""

# Step 7: Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Build & Push Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}Image Details:${NC}"
echo -e "  Docker Hub: ${GREEN}${FULL_IMAGE_NAME}${NC}"
echo -e "  Local Tag:  ${GREEN}${IMAGE_NAME}:${IMAGE_TAG}${NC}"
echo -e "  Docker Hub URL: ${GREEN}https://hub.docker.com/r/${DOCKER_HUB_USERNAME}/${IMAGE_NAME}${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. On your VPS, pull the image:"
echo -e "   ${GREEN}docker pull ${FULL_IMAGE_NAME}${NC}\n"
echo -e "2. Or use the deployment script:"
echo -e "   ${GREEN}export DOCKER_USERNAME=${DOCKER_HUB_USERNAME}${NC}"
echo -e "   ${GREEN}./scripts/deploy-from-dockerhub.sh${NC}\n"
echo -e "3. Local image is also available:"
echo -e "   ${GREEN}docker images | grep ${IMAGE_NAME}${NC}\n"

echo -e "${GREEN}========================================${NC}"


