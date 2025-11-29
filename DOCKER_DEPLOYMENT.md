# Docker Deployment Guide - Secure Code Deployment

This guide explains how to deploy the DIG Traffic Management System using Docker, ensuring your source code remains secure and never exposed to the client.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Build Docker Image (On Your Machine)](#step-1-build-docker-image-on-your-machine)
4. [Step 2: Transfer to Client VPS](#step-2-transfer-to-client-vps)
5. [Step 3: Setup on Client VPS](#step-3-setup-on-client-vps)
6. [Step 4: Database Setup](#step-4-database-setup)
7. [Step 5: Redis Setup](#step-5-redis-setup)
8. [Step 6: Deploy Application](#step-6-deploy-application)
9. [Step 7: Import Existing Data (Optional)](#step-7-import-existing-data-optional)
10. [Maintenance & Updates](#maintenance--updates)
11. [Troubleshooting](#troubleshooting)

---

## Overview

### What the Client Sees:
- ✅ Docker image file (`.tar.gz`)
- ✅ Running container
- ✅ Environment variables (you control)
- ✅ Database (already on their VPS)

### What the Client Does NOT See:
- ❌ Your TypeScript/JavaScript source code
- ❌ Express backend logic
- ❌ Build configurations
- ❌ Business logic
- ❌ API secrets (if handled properly)

---

## Prerequisites

### On Your Machine (Developer):
- Docker installed
- Node.js 18+ (for building)
- Access to source code

### On Client VPS:
- Docker installed
- PostgreSQL installed and running
- Redis installed and running
- Root/sudo access
- Port 5000 available

---

## Step 1: Build Docker Image (On Your Machine)

### 1.1 Navigate to Project Directory
```bash
cd /path/to/HospitalManagementSystem
```

### 1.2 Make Build Script Executable
```bash
chmod +x scripts/docker-build.sh
```

### 1.3 Run Build Script
```bash
./scripts/docker-build.sh
```

This will:
- Build the multi-stage Docker image
- Compile TypeScript → JavaScript
- Build Vite frontend
- Create optimized production image
- Save as `digtraffic-app.tar.gz`

**Output:** `digtraffic-app.tar.gz` (this is what you send to client)

### 1.4 Verify Image Size
```bash
ls -lh digtraffic-app.tar.gz
```

Expected size: ~200-500 MB (depending on dependencies)

---

## Step 2: Transfer to Client VPS

### Option A: Using SCP
```bash
scp digtraffic-app.tar.gz user@client-vps-ip:/home/user/
```

### Option B: Using SFTP
```bash
sftp user@client-vps-ip
put digtraffic-app.tar.gz
```

### Option C: Using Cloud Storage
1. Upload to Google Drive/Dropbox
2. Client downloads from there

---

## Step 3: Setup on Client VPS

### 3.1 Install Docker (if not installed)

**CentOS/RHEL:**
```bash
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**Verify Docker:**
```bash
docker --version
docker ps
```

### 3.2 Load Docker Image

```bash
# Navigate to where you saved the tar file
cd /home/user

# Load the Docker image
gunzip -c digtraffic-app.tar.gz | docker load

# Verify image loaded
docker images | grep digtraffic-app
```

---

## Step 4: Database Setup

### 4.1 Install PostgreSQL (if not installed)

**CentOS/RHEL:**
```bash
sudo yum install -y postgresql postgresql-server
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 4.2 Create Database and User

**Option A: Using Setup Script**
```bash
chmod +x scripts/database-setup.sh
./scripts/database-setup.sh
```

**Option B: Manual Setup**
```bash
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE digtraffic;

-- Create user
CREATE USER digtraffic_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE digtraffic TO digtraffic_user;

-- Connect to database
\c digtraffic

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO digtraffic_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO digtraffic_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO digtraffic_user;

-- Exit
\q
```

### 4.3 Configure PostgreSQL for Remote Access (if needed)

Edit `/etc/postgresql/15/main/postgresql.conf` (Ubuntu) or `/var/lib/pgsql/15/data/postgresql.conf` (CentOS):
```conf
listen_addresses = 'localhost'
```

Edit `pg_hba.conf`:
```conf
host    digtraffic    digtraffic_user    127.0.0.1/32    md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## Step 5: Redis Setup

### 5.1 Install Redis (if not installed)

**CentOS/RHEL:**
```bash
sudo yum install -y redis
sudo systemctl start redis
sudo systemctl enable redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 5.2 Configure Redis

Edit `/etc/redis/redis.conf` or `/etc/redis.conf`:
```conf
bind 127.0.0.1
port 6379
# requirepass your_redis_password  # Optional: set password
maxmemory 256mb
maxmemory-policy allkeys-lru
```

Restart Redis:
```bash
sudo systemctl restart redis
# or
sudo systemctl restart redis-server
```

### 5.3 Test Redis
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 6: Deploy Application

### 6.1 Create Environment File

**Option A: Using Automatic Script (Recommended)**

```bash
# Make script executable
chmod +x scripts/create-env.sh

# Run the script - it will prompt for all values
./scripts/create-env.sh
```

The script will:
- Prompt for database credentials
- Prompt for Redis configuration  
- Prompt for API tokens
- Auto-generate secure JWT and Session secrets
- Create properly formatted .env file with URL encoding

**Option B: Manual Creation**

Create `.env` file:
```bash
nano .env
```

Add the following (replace with actual values):
```env
# Database (URL encoded password: @ becomes %40, / becomes %2F, # becomes %23)
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
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6.2 Create Uploads Directory
```bash
mkdir -p uploads
chmod 755 uploads
```

### 6.3 Run Docker Container

**Option A: Using Deployment Script (Recommended - for Docker Hub)**
```bash
# Set your Docker Hub username
export DOCKER_USERNAME=yourusername

# Make script executable
chmod +x scripts/deploy-from-dockerhub.sh

# Run deployment
./scripts/deploy-from-dockerhub.sh
```

**Option B: Using Docker Run (Local Image)**
```bash
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  digtraffic-app:latest
```

**Option C: Using Docker Run (Docker Hub Image)**
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

**Note:** Using `--network host` allows the container to access Redis on `localhost` directly. This is recommended for Redis on the host VPS.

**Option D: Using Docker Compose**
```bash
# Copy docker-compose.yml to VPS
# Edit docker-compose.yml with your Docker Hub username
# Edit docker-compose.yml with your environment variables
docker-compose up -d
```

### 6.4 Verify Container is Running
```bash
docker ps
docker logs digtraffic-app
```

### 6.5 Check Application Health
```bash
curl http://localhost:5000/api/health
# or
curl http://localhost:5000
```

---

## Step 7: Import Existing Data (Optional)

If you have an existing database to import:

### 7.1 Export from Source Database
```bash
# On source server
pg_dump -U username -d database_name > database_dump.sql
```

### 7.2 Import to New Database
```bash
# On client VPS
psql -U digtraffic_user -d digtraffic -f database_dump.sql
```

Or use the import script:
```bash
chmod +x scripts/import-database.sh
./scripts/import-database.sh
```

### 7.3 Run Database Migrations (if any)

If you have migration scripts:
```bash
docker exec -it digtraffic-app node /path/to/migration-script.js
```

---

## Maintenance & Updates

### View Logs
```bash
docker logs digtraffic-app
docker logs -f digtraffic-app  # Follow logs
```

### Restart Container
```bash
docker restart digtraffic-app
```

### Stop Container
```bash
docker stop digtraffic-app
```

### Update Application

1. **On Your Machine:**
   ```bash
   # Make changes to code
   ./scripts/docker-build.sh
   ```

2. **Transfer new image to VPS:**
   ```bash
   scp digtraffic-app.tar.gz user@vps:/home/user/
   ```

3. **On Client VPS:**
   ```bash
   # Stop old container
   docker stop digtraffic-app
   docker rm digtraffic-app
   
   # Load new image
   gunzip -c digtraffic-app.tar.gz | docker load
   
   # Start new container
   docker run -d \
     --name digtraffic-app \
     --restart unless-stopped \
     -p 5000:5000 \
     --env-file .env \
     -v $(pwd)/uploads:/app/uploads \
     --add-host=host.docker.internal:host-gateway \
     digtraffic-app:latest
   ```

### Backup Database
```bash
# Create backup
pg_dump -U digtraffic_user -d digtraffic > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U digtraffic_user -d digtraffic < backup_20250101.sql
```

---

## HTTP/HTTPS API Support

The application supports fetching data from external tracking APIs using both **HTTP** and **HTTPS** protocols. The system automatically handles:

- ✅ **HTTP APIs**: Standard HTTP requests work normally
- ✅ **HTTPS APIs**: HTTPS with valid SSL certificates work normally
- ✅ **Self-Signed Certificates**: HTTPS APIs with self-signed or invalid certificates are automatically handled (with a warning)

### Network Requirements

The Docker container **must have outbound internet access** to fetch data from external tracking APIs. By default, Docker containers have outbound access, but ensure:

1. **No Firewall Blocking**: The VPS firewall should allow outbound HTTP (port 80) and HTTPS (port 443) connections
2. **No Network Restrictions**: Docker network should not restrict outbound connections
3. **DNS Resolution**: Container should be able to resolve external domain names

### Testing API Connectivity

To test if the container can reach external APIs:

```bash
# Test HTTP API
docker exec digtraffic-app wget -O- http://tracking.esspl.com.pk:8080/api/api.php

# Test HTTPS API
docker exec digtraffic-app wget -O- https://example.com/api

# Test DNS resolution
docker exec digtraffic-app nslookup tracking.esspl.com.pk
```

### SSL Certificate Handling

The application uses a smart SSL handling approach:

1. **First Attempt**: Tries with strict SSL certificate validation (secure)
2. **Fallback**: If SSL validation fails (self-signed certificate), automatically retries with relaxed validation
3. **Warning**: Logs a warning when using relaxed SSL validation (for security awareness)

This ensures maximum compatibility while maintaining security for valid certificates.

### Firewall Configuration

If you need to allow outbound HTTP/HTTPS from the container:

**CentOS/RHEL:**
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**Ubuntu/Debian:**
```bash
sudo ufw allow out 80/tcp
sudo ufw allow out 443/tcp
sudo ufw reload
```

**Note**: Outbound connections are usually allowed by default. Only configure if you have restrictive firewall rules.

---

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs digtraffic-app

# Common issues:
# - Database connection failed → Check DATABASE_URL
# - Redis connection failed → Check REDIS_HOST (use host.docker.internal)
# - Port already in use → Change port or stop conflicting service
```

### Can't Connect to Database
```bash
# Test connection from host
psql -U digtraffic_user -d digtraffic -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check firewall
sudo firewall-cmd --list-all
```

### Can't Connect to Redis
```bash
# Test Redis from host
redis-cli ping

# For Docker, use host.docker.internal
# Or use host network mode:
docker run --network host ...
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

### External API Connection Issues

If tracking APIs are not working:

```bash
# Check container can reach external APIs
docker exec digtraffic-app wget -O- http://tracking.esspl.com.pk:8080/api/api.php

# Check DNS resolution
docker exec digtraffic-app nslookup tracking.esspl.com.pk

# Check container logs for API errors
docker logs digtraffic-app | grep -i "api\|ssl\|certificate"

# Test from inside container
docker exec -it digtraffic-app sh
wget -O- https://example.com
```

**Common Issues:**
- **DNS Resolution Failed**: Check `/etc/resolv.conf` in container
- **Firewall Blocking**: Ensure outbound HTTP/HTTPS is allowed
- **SSL Certificate Error**: Check logs for SSL warnings (self-signed certificates are handled automatically)
- **Network Mode**: If using `--network host`, ensure host can reach external APIs

### View Container Details
```bash
docker inspect digtraffic-app
```

### Access Container Shell
```bash
docker exec -it digtraffic-app sh
```

---

## Security Notes

1. **Environment Variables**: Never commit `.env` file to version control
2. **Database Passwords**: Use strong passwords
3. **JWT Secrets**: Use cryptographically secure random strings (32+ chars)
4. **Redis Password**: Set if Redis is accessible from network
5. **Firewall**: Only expose port 5000, block other ports
6. **Updates**: Regularly update Docker image with security patches

---

## Quick Reference

### Essential Commands
```bash
# Start
docker start digtraffic-app

# Stop
docker stop digtraffic-app

# Restart
docker restart digtraffic-app

# View logs
docker logs -f digtraffic-app

# Remove container
docker rm digtraffic-app

# Remove image
docker rmi digtraffic-app:latest
```

### Database Commands
```bash
# Connect to database
psql -U digtraffic_user -d digtraffic

# Backup
pg_dump -U digtraffic_user -d digtraffic > backup.sql

# Restore
psql -U digtraffic_user -d digtraffic < backup.sql
```

---

## Support

If you encounter issues:
1. Check container logs: `docker logs digtraffic-app`
2. Check database connection
3. Check Redis connection
4. Verify environment variables
5. Check firewall settings

---

**✅ Your source code is secure! The client only has the compiled Docker image.**

