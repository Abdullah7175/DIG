# Docker Hub Deployment Guide

This guide explains how to build and push your Docker image to Docker Hub, then deploy it on the client VPS.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Create Docker Hub Account](#step-1-create-docker-hub-account)
3. [Step 2: Build and Tag Image](#step-2-build-and-tag-image)
4. [Step 3: Push to Docker Hub](#step-3-push-to-docker-hub)
5. [Step 4: Deploy on Client VPS](#step-4-deploy-on-client-vps)
6. [Step 5: Setup Environment](#step-5-setup-environment)
7. [Updating the Application](#updating-the-application)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### On Your Machine (Developer):
- Docker installed and running
- Docker Hub account (free)
- Node.js 20+ installed
- Access to source code

### On Client VPS:
- Docker installed
- PostgreSQL installed and running
- Redis installed and running
- Internet connection (to pull from Docker Hub)

---

## Step 1: Create Docker Hub Account

1. **Go to Docker Hub**: https://hub.docker.com/
2. **Sign Up** for a free account
3. **Verify your email**
4. **Note your username** (e.g., `yourusername`)

---

## Step 2: Build and Tag Image

### 2.1 Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

### 2.2 Build the Image

On your machine, navigate to the project directory:

```bash
cd /path/to/HospitalManagementSystem
```

Build the image with your Docker Hub username:

```bash
# Replace 'yourusername' with your Docker Hub username
docker build -t yourusername/digtraffic-app:latest .
```

**Example:**
```bash
docker build -t johndoe/digtraffic-app:latest .
```

### 2.3 Verify Image

```bash
docker images | grep digtraffic-app
```

You should see your image listed.

---

## Step 3: Push to Docker Hub

### 3.1 Push the Image

```bash
docker push yourusername/digtraffic-app:latest
```

**Example:**
```bash
docker push johndoe/digtraffic-app:latest
```

### 3.2 Verify on Docker Hub

1. Go to https://hub.docker.com/
2. Navigate to your repository: `yourusername/digtraffic-app`
3. You should see your image with tag `latest`

### 3.3 (Optional) Create Version Tags

For better version management:

```bash
# Tag with version
docker tag yourusername/digtraffic-app:latest yourusername/digtraffic-app:v1.0.0

# Push version tag
docker push yourusername/digtraffic-app:v1.0.0

# Keep latest tag
docker push yourusername/digtraffic-app:latest
```

---

## Step 4: Deploy on Client VPS

### 4.1 Login to Docker Hub on VPS

```bash
ssh user@client-vps-ip
docker login
```

Enter your Docker Hub credentials.

### 4.2 Pull the Image

```bash
docker pull yourusername/digtraffic-app:latest
```

**Example:**
```bash
docker pull johndoe/digtraffic-app:latest
```

### 4.3 Verify Image

```bash
docker images | grep digtraffic-app
```

---

## Step 5: Setup Environment

### 5.1 Create .env File

**Option A: Using Automatic Script (Recommended)**

```bash
# Make script executable
chmod +x scripts/create-env.sh

# Run the script
./scripts/create-env.sh
```

The script will:
- Prompt for database credentials
- Prompt for Redis configuration
- Prompt for API tokens
- Auto-generate secure JWT and Session secrets
- Create properly formatted .env file

**Option B: Manual Creation**

```bash
nano .env
```

Copy and paste the following, replacing with your actual values:

```env
# Database
DATABASE_URL=postgresql://postgres:**%40%2F%23Abc1@202.61.47.28:5432/DIG?sslmode=disable

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
NODE_ENV=production
PORT=5000
PUBLIC_BASE_URL=

# Security Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=your_jwt_secret_here_min_32_chars
SESSION_SECRET=your_session_secret_here_min_32_chars

# API Token
DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
TRAFFIC_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Generate Secure Secrets:**
```bash
openssl rand -hex 32
```

### 5.2 Set File Permissions

```bash
chmod 600 .env
```

### 5.3 Create Uploads Directory

```bash
mkdir -p uploads
chmod 755 uploads
```

---

## Step 6: Run the Container

### 6.1 Run with Docker Run

```bash
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --add-host=host.docker.internal:host-gateway \
  yourusername/digtraffic-app:latest
```

**For Linux VPS (Redis on host):**
```bash
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  yourusername/digtraffic-app:latest
```

**Note:** Using `--network host` allows the container to access Redis on `localhost` directly.

### 6.2 Verify Container is Running

```bash
docker ps
docker logs digtraffic-app
```

### 6.3 Check Health

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-11-28T...",
  "database": "connected",
  "redis": "connected",
  "uptime": 123.45
}
```

---

## Updating the Application

### On Your Machine:

1. **Make code changes**
2. **Rebuild image:**
   ```bash
   docker build -t yourusername/digtraffic-app:latest .
   ```
3. **Push to Docker Hub:**
   ```bash
   docker push yourusername/digtraffic-app:latest
   ```

### On Client VPS:

1. **Pull latest image:**
   ```bash
   docker pull yourusername/digtraffic-app:latest
   ```

2. **Stop and remove old container:**
   ```bash
   docker stop digtraffic-app
   docker rm digtraffic-app
   ```

3. **Start new container:**
   ```bash
   docker run -d \
     --name digtraffic-app \
     --restart unless-stopped \
     -p 5000:5000 \
     --env-file .env \
     -v $(pwd)/uploads:/app/uploads \
     --network host \
     yourusername/digtraffic-app:latest
   ```

**Or use this update script:**

```bash
#!/bin/bash
# update-app.sh
docker pull yourusername/digtraffic-app:latest
docker stop digtraffic-app
docker rm digtraffic-app
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  yourusername/digtraffic-app:latest
echo "Application updated successfully!"
```

---

## Complete Deployment Script

Create `deploy.sh` on client VPS:

```bash
#!/bin/bash
# Complete deployment script for client VPS

set -e

echo "=========================================="
echo "DIG Traffic System - Docker Deployment"
echo "=========================================="

# Your Docker Hub username
DOCKER_USERNAME="yourusername"
IMAGE_NAME="${DOCKER_USERNAME}/digtraffic-app:latest"

# Check if .env exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please run: ./scripts/create-env.sh"
    exit 1
fi

# Login to Docker Hub (if not already logged in)
echo "Checking Docker Hub login..."
if ! docker info | grep -q "Username"; then
    echo "Please login to Docker Hub:"
    docker login
fi

# Pull latest image
echo "Pulling latest image from Docker Hub..."
docker pull $IMAGE_NAME

# Stop and remove old container (if exists)
if docker ps -a | grep -q digtraffic-app; then
    echo "Stopping existing container..."
    docker stop digtraffic-app 2>/dev/null || true
    docker rm digtraffic-app 2>/dev/null || true
fi

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Run new container
echo "Starting new container..."
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  $IMAGE_NAME

# Wait for container to start
echo "Waiting for container to start..."
sleep 5

# Check health
echo "Checking application health..."
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Application is healthy!"
else
    echo "⚠️  Application may not be ready yet. Check logs:"
    echo "   docker logs digtraffic-app"
fi

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Application URL: http://localhost:5000"
echo "Health Check: http://localhost:5000/api/health"
echo ""
echo "Useful commands:"
echo "  View logs: docker logs -f digtraffic-app"
echo "  Stop app: docker stop digtraffic-app"
echo "  Restart app: docker restart digtraffic-app"
echo "=========================================="
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run it:
```bash
./deploy.sh
```

---

## Troubleshooting

### Docker Hub Login Issues

```bash
# Clear Docker credentials
docker logout

# Login again
docker login
```

### Can't Pull Image

```bash
# Check if you're logged in
docker info | grep Username

# Try pulling again
docker pull yourusername/digtraffic-app:latest
```

### Container Won't Start

```bash
# Check logs
docker logs digtraffic-app

# Common issues:
# - Database connection failed → Check DATABASE_URL in .env
# - Redis connection failed → Check REDIS_HOST (use localhost with --network host)
# - Port already in use → Change port or stop conflicting service
```

### Redis Connection Issues

If using `--network host`, Redis should be accessible at `localhost:6379`.

If not using host network, use:
```bash
REDIS_HOST=host.docker.internal
```

Or use host network mode:
```bash
docker run --network host ...
```

### Environment Variables Not Loading

```bash
# Verify .env file exists and has correct format
cat .env

# Check file permissions
ls -la .env

# Test environment loading
docker run --env-file .env --rm yourusername/digtraffic-app:latest env | grep DATABASE
```

---

## Security Best Practices

1. **Private Repository (Recommended)**
   - Upgrade Docker Hub to Pro/Team plan
   - Make repository private
   - Only you and client can access

2. **Environment Variables**
   - Never commit .env to version control
   - Use Docker secrets for production
   - Rotate secrets regularly

3. **Image Security**
   - Regularly update base image (Node.js)
   - Scan images for vulnerabilities: `docker scan yourusername/digtraffic-app`
   - Use specific version tags, not just `latest`

4. **Access Control**
   - Use strong Docker Hub password
   - Enable 2FA on Docker Hub
   - Limit who can pull the image

---

## Quick Reference

### Build and Push (Your Machine)
```bash
docker build -t yourusername/digtraffic-app:latest .
docker push yourusername/digtraffic-app:latest
```

### Deploy (Client VPS)
```bash
docker pull yourusername/digtraffic-app:latest
docker run -d --name digtraffic-app --restart unless-stopped \
  -p 5000:5000 --env-file .env --network host \
  yourusername/digtraffic-app:latest
```

### Update (Client VPS)
```bash
docker pull yourusername/digtraffic-app:latest
docker stop digtraffic-app && docker rm digtraffic-app
docker run -d --name digtraffic-app --restart unless-stopped \
  -p 5000:5000 --env-file .env --network host \
  yourusername/digtraffic-app:latest
```

---

## Summary

✅ **Your source code stays secure** - Only compiled Docker image on Docker Hub  
✅ **Easy updates** - Push new image, client pulls and restarts  
✅ **Professional deployment** - Industry standard approach  
✅ **Version control** - Tag images with versions  
✅ **Scalable** - Can deploy to multiple VPS easily  

**Your Docker Hub repository:** `https://hub.docker.com/r/yourusername/digtraffic-app`

