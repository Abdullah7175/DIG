# How to Use Docker Image from Docker Hub

Complete guide for pulling and using the Docker image from Docker Hub on any server/VPS.

## 📋 Prerequisites

1. **Docker installed** on the target server
2. **Docker Hub account** (to pull the image)
3. **.env file** with all configuration
4. **PostgreSQL** running (on host or separate container)
5. **Redis** running (on host or separate container)

---

## 🚀 Quick Start

### Step 1: Login to Docker Hub (Optional - for private images)

```bash
docker login
```

*Note: If image is public, login is not required*

### Step 2: Pull the Image

```bash
docker pull YOUR_USERNAME/digtraffic-app:latest
```

**Example:**
```bash
docker pull myusername/digtraffic-app:latest
```

### Step 3: Verify Image

```bash
docker images | grep digtraffic-app
```

You should see:
```
YOUR_USERNAME/digtraffic-app   latest   abc123def456   2 hours ago   250MB
```

---

## 📦 Method 1: Using Docker Run (Recommended for Simple Setup)

### Step 1: Create .env File

```bash
nano .env
```

Add your configuration:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/digtraffic?sslmode=disable

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Application
NODE_ENV=production
PORT=5000
JWT_SECRET=your_jwt_secret_here_min_32_chars
SESSION_SECRET=your_session_secret_here_min_32_chars

# API Tokens
DIG_API_TOKEN=your_token_here
TRAFFIC_API_TOKEN=your_token_here
```

### Step 2: Create Uploads Directory

```bash
mkdir -p uploads
chmod 755 uploads
```

### Step 3: Run Container

**For Linux (with host network for Redis):**
```bash
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  YOUR_USERNAME/digtraffic-app:latest
```

**For Docker Desktop / Windows (with bridge network):**
```bash
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --add-host=host.docker.internal:host-gateway \
  YOUR_USERNAME/digtraffic-app:latest
```

### Step 4: Check Status

```bash
# Check if container is running
docker ps | grep digtraffic-app

# View logs
docker logs digtraffic-app

# Follow logs
docker logs -f digtraffic-app
```

### Step 5: Test Application

```bash
# Health check
curl http://localhost:5000/api/health

# Or open in browser
# http://YOUR_SERVER_IP:5000
```

---

## 📦 Method 2: Using Docker Compose (Recommended for Production)

### Step 1: Update docker-compose.yml

Edit `docker-compose.yml` and replace `yourusername` with your Docker Hub username:

```yaml
services:
  app:
    image: YOUR_USERNAME/digtraffic-app:latest  # ← Update this
    container_name: digtraffic-app
    restart: unless-stopped
    # ... rest of config
```

### Step 2: Create .env File

Same as Method 1, Step 1.

### Step 3: Start Container

```bash
docker-compose up -d
```

### Step 4: Check Status

```bash
# View status
docker-compose ps

# View logs
docker-compose logs -f

# Stop
docker-compose stop

# Restart
docker-compose restart
```

---

## 🔄 Updating the Application

### Method 1: Manual Update

```bash
# 1. Stop and remove old container
docker stop digtraffic-app
docker rm digtraffic-app

# 2. Pull latest image
docker pull YOUR_USERNAME/digtraffic-app:latest

# 3. Run new container (same command as before)
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  YOUR_USERNAME/digtraffic-app:latest
```

### Method 2: Using Docker Compose

```bash
# 1. Pull latest image
docker-compose pull

# 2. Restart with new image
docker-compose up -d
```

### Method 3: Using Update Script

If you have the deployment script:

```bash
# Set your Docker Hub username
export DOCKER_USERNAME=YOUR_USERNAME

# Run update script
./scripts/deploy-from-dockerhub.sh
```

---

## 🛠️ Common Commands

### Container Management

```bash
# Start container
docker start digtraffic-app

# Stop container
docker stop digtraffic-app

# Restart container
docker restart digtraffic-app

# Remove container
docker stop digtraffic-app
docker rm digtraffic-app

# View logs
docker logs digtraffic-app
docker logs -f digtraffic-app  # Follow logs

# Execute command in container
docker exec -it digtraffic-app sh
```

### Image Management

```bash
# List images
docker images

# Remove old image
docker rmi YOUR_USERNAME/digtraffic-app:latest

# Pull specific version
docker pull YOUR_USERNAME/digtraffic-app:v1.0.0
```

---

## 🔍 Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs digtraffic-app

# Common issues:
# - Database connection failed → Check DATABASE_URL in .env
# - Redis connection failed → Check REDIS_HOST (use localhost for host network)
# - Port already in use → Change port or stop conflicting service
```

### Can't Connect to Database

```bash
# Test database connection from host
psql -U username -d digtraffic -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Can't Connect to Redis

```bash
# Test Redis from host
redis-cli ping

# For Docker, ensure you're using:
# - --network host (Linux)
# - --add-host=host.docker.internal:host-gateway (Docker Desktop)
```

### Application Not Accessible

```bash
# Check container is running
docker ps

# Check port is exposed
docker port digtraffic-app

# Check firewall
sudo firewall-cmd --add-port=5000/tcp --permanent
sudo firewall-cmd --reload
```

### Image Pull Failed

```bash
# Check internet connection
ping hub.docker.com

# Try login again
docker login

# Check image name is correct
docker search YOUR_USERNAME/digtraffic-app
```

---

## 📝 Complete Example

Here's a complete example for a fresh VPS setup:

```bash
# 1. Install Docker (if not installed)
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker

# 2. Create project directory
mkdir -p ~/digtraffic
cd ~/digtraffic

# 3. Create .env file
nano .env
# (Add your configuration)

# 4. Create uploads directory
mkdir -p uploads
chmod 755 uploads

# 5. Pull image
docker pull YOUR_USERNAME/digtraffic-app:latest

# 6. Run container
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  YOUR_USERNAME/digtraffic-app:latest

# 7. Check status
docker ps
docker logs digtraffic-app

# 8. Test
curl http://localhost:5000/api/health
```

---

## 🔐 Security Notes

1. **Never commit .env file** to version control
2. **Use strong passwords** for database and secrets
3. **Keep Docker Hub credentials secure**
4. **Regularly update** the Docker image for security patches
5. **Use firewall** to restrict access to port 5000

---

## 📞 Support

If you encounter issues:
1. Check container logs: `docker logs digtraffic-app`
2. Verify .env file configuration
3. Check database and Redis connections
4. Verify Docker image was pulled correctly: `docker images`

---

**✅ That's it! Your application is now running from Docker Hub image.**


