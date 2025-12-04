#!/bin/bash
# VPS Update Script
# Run this script on your VPS to update the Docker container with the latest image

# Configuration - UPDATE THESE VALUES
DOCKER_HUB_USERNAME="yourusername"  # Replace with your Docker Hub username
IMAGE_NAME="digtraffic-app"
IMAGE_TAG="latest"
CONTAINER_NAME="digtraffic-app"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== VPS Docker Container Update Script ===${NC}\n"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Step 1: Pull latest image
echo -e "${YELLOW}Step 1: Pulling latest image from Docker Hub...${NC}"
docker pull ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to pull image.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Image pulled successfully${NC}"

# Step 2: Stop old container
echo -e "\n${YELLOW}Step 2: Stopping old container...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop ${CONTAINER_NAME}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to stop container.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Container stopped${NC}"
else
    echo -e "${YELLOW}Container not found, skipping stop${NC}"
fi

# Step 3: Remove old container
echo -e "\n${YELLOW}Step 3: Removing old container...${NC}"
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker rm ${CONTAINER_NAME}
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to remove container.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Container removed${NC}"
else
    echo -e "${YELLOW}Container not found, skipping remove${NC}"
fi

# Step 4: Start new container
echo -e "\n${YELLOW}Step 4: Starting new container...${NC}"
echo -e "${YELLOW}Note: Update the docker run command below with your actual configuration${NC}"
echo -e "${YELLOW}Or use docker-compose if you're using that instead${NC}\n"

# Example docker run command (update with your actual settings)
docker run -d \
  --name ${CONTAINER_NAME} \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to start container.${NC}"
    echo -e "${YELLOW}Please check your docker run command or use docker-compose${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Container started successfully${NC}"

# Step 5: Verify
echo -e "\n${YELLOW}Step 5: Verifying container...${NC}"
sleep 3
docker ps | grep ${CONTAINER_NAME}
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Container is running${NC}"
    echo -e "\n${YELLOW}Check logs with:${NC}"
    echo -e "${GREEN}docker logs ${CONTAINER_NAME}${NC}"
    echo -e "\n${YELLOW}Check health with:${NC}"
    echo -e "${GREEN}curl http://localhost:5000/api/health${NC}"
else
    echo -e "${RED}Warning: Container may not be running. Check logs:${NC}"
    echo -e "${GREEN}docker logs ${CONTAINER_NAME}${NC}"
fi

echo -e "\n${GREEN}=== Update Complete ===${NC}"

