#!/bin/bash
# Docker Image Update Script
# This script builds and pushes the updated Docker image to Docker Hub

# Configuration - UPDATE THESE VALUES
DOCKER_HUB_USERNAME="yourusername"  # Replace with your Docker Hub username
IMAGE_NAME="digtraffic-app"
IMAGE_TAG="latest"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Docker Image Update Script ===${NC}\n"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Step 1: Login to Docker Hub (if not already logged in)
echo -e "${YELLOW}Step 1: Checking Docker Hub login...${NC}"
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}Please login to Docker Hub:${NC}"
    docker login
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Docker login failed.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Already logged in to Docker Hub${NC}"
fi

# Step 2: Build the image
echo -e "\n${YELLOW}Step 2: Building Docker image...${NC}"
docker build -t ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG} .
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Docker build failed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Image built successfully${NC}"

# Step 3: Push to Docker Hub
echo -e "\n${YELLOW}Step 3: Pushing image to Docker Hub...${NC}"
docker push ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Docker push failed.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Image pushed successfully${NC}"

# Step 4: Summary
echo -e "\n${GREEN}=== Update Complete ===${NC}"
echo -e "Image: ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"
echo -e "\n${YELLOW}Next steps on your VPS:${NC}"
echo -e "1. Pull the latest image:"
echo -e "   ${GREEN}docker pull ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}${NC}"
echo -e "\n2. Stop and remove old container:"
echo -e "   ${GREEN}docker stop digtraffic-app${NC}"
echo -e "   ${GREEN}docker rm digtraffic-app${NC}"
echo -e "\n3. Start new container (use your existing docker run command or docker-compose)"
echo -e "\n${YELLOW}Or use the update script on VPS (update-vps.sh)${NC}"

