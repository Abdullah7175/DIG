# PowerShell Script for Docker Build and Push
# Complete Docker Build and Push Script for Windows

$ErrorActionPreference = "Stop"

# Colors for output
function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Cyan "========================================"
Write-ColorOutput Cyan "  Docker Image Build & Push Script"
Write-ColorOutput Cyan "========================================"
Write-Output ""

# Step 0: Get Docker Hub username
if (-not $env:DOCKER_HUB_USERNAME) {
    $DOCKER_HUB_USERNAME = Read-Host "Enter your Docker Hub username"
    if (-not $DOCKER_HUB_USERNAME) {
        Write-ColorOutput Red "Error: Docker Hub username is required!"
        exit 1
    }
} else {
    $DOCKER_HUB_USERNAME = $env:DOCKER_HUB_USERNAME
}

$IMAGE_NAME = "digtraffic-app"
$IMAGE_TAG = "latest"
$FULL_IMAGE_NAME = "${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${IMAGE_TAG}"

# Check if Docker is running
Write-ColorOutput Yellow "Step 0: Checking Docker..."
try {
    docker info | Out-Null
    Write-ColorOutput Green "✓ Docker is running"
} catch {
    Write-ColorOutput Red "Error: Docker is not running. Please start Docker Desktop and try again."
    exit 1
}
Write-Output ""

# Step 1: Build the project
Write-ColorOutput Yellow "Step 1: Building project (npm run build)..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "Error: Build failed!"
    exit 1
}
Write-ColorOutput Green "✓ Project built successfully"
Write-Output ""

# Step 2: Login to Docker Hub
Write-ColorOutput Yellow "Step 2: Checking Docker Hub login..."
$dockerInfo = docker info 2>&1
if ($dockerInfo -notmatch "Username") {
    Write-ColorOutput Yellow "Please login to Docker Hub:"
    docker login
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput Red "Error: Docker login failed."
        exit 1
    }
} else {
    Write-ColorOutput Green "✓ Already logged in to Docker Hub"
}
Write-Output ""

# Step 3: Build Docker image
Write-ColorOutput Yellow "Step 3: Building Docker image..."
Write-ColorOutput Cyan "Image name: $FULL_IMAGE_NAME"
docker build -t $FULL_IMAGE_NAME .
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "Error: Docker build failed."
    exit 1
}
Write-ColorOutput Green "✓ Docker image built successfully"
Write-Output ""

# Step 4: Also tag as local image (for local use)
Write-ColorOutput Yellow "Step 4: Tagging image for local use..."
docker tag $FULL_IMAGE_NAME "${IMAGE_NAME}:${IMAGE_TAG}"
Write-ColorOutput Green "✓ Image tagged locally as ${IMAGE_NAME}:${IMAGE_TAG}"
Write-Output ""

# Step 5: Push to Docker Hub
Write-ColorOutput Yellow "Step 5: Pushing image to Docker Hub..."
Write-ColorOutput Yellow "This may take a few minutes depending on your internet speed..."
docker push $FULL_IMAGE_NAME
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput Red "Error: Docker push failed."
    exit 1
}
Write-ColorOutput Green "✓ Image pushed to Docker Hub successfully"
Write-Output ""

# Step 6: Show image info
Write-ColorOutput Yellow "Step 6: Image information..."
docker images | Select-String -Pattern "REPOSITORY|${IMAGE_NAME}|${DOCKER_HUB_USERNAME}/${IMAGE_NAME}" | Select-Object -First 3
Write-Output ""

# Step 7: Summary
Write-ColorOutput Green "========================================"
Write-ColorOutput Green "  Build & Push Complete!"
Write-ColorOutput Green "========================================"
Write-Output ""

Write-ColorOutput Cyan "Image Details:"
Write-ColorOutput Green "  Docker Hub: $FULL_IMAGE_NAME"
Write-ColorOutput Green "  Local Tag:  ${IMAGE_NAME}:${IMAGE_TAG}"
Write-ColorOutput Green "  Docker Hub URL: https://hub.docker.com/r/${DOCKER_HUB_USERNAME}/${IMAGE_NAME}"
Write-Output ""

Write-ColorOutput Yellow "Next Steps:"
Write-Output "1. On your VPS, pull the image:"
Write-ColorOutput Green "   docker pull $FULL_IMAGE_NAME"
Write-Output ""
Write-Output "2. Or use the deployment script:"
Write-ColorOutput Green "   `$env:DOCKER_USERNAME='$DOCKER_HUB_USERNAME'"
Write-ColorOutput Green "   ./scripts/deploy-from-dockerhub.sh"
Write-Output ""
Write-Output "3. Local image is also available:"
Write-ColorOutput Green "   docker images | Select-String '$IMAGE_NAME'"
Write-Output ""

Write-ColorOutput Green "========================================"


