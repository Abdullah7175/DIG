# Docker Hub Quick Start Guide

## 🚀 Complete Step-by-Step Process

### Part 1: Build and Push to Docker Hub (On Your Machine)

#### Step 1: Create Docker Hub Account
1. Go to https://hub.docker.com/
2. Sign up for free account
3. Verify email
4. Note your username (e.g., `johndoe`)

#### Step 2: Login to Docker Hub
```bash
docker login
```
Enter your Docker Hub username and password.

#### Step 3: Build and Push Image
```bash
# Navigate to project directory
cd /path/to/HospitalManagementSystem

# Build and push (replace 'yourusername' with your Docker Hub username)
docker build -t yourusername/digtraffic-app:latest .
docker push yourusername/digtraffic-app:latest
```

**Example:**
```bash
docker build -t johndoe/digtraffic-app:latest .
docker push johndoe/digtraffic-app:latest
```

#### Step 4: Verify on Docker Hub
- Go to https://hub.docker.com/r/yourusername/digtraffic-app
- You should see your image with `latest` tag

---

### Part 2: Deploy on Client VPS

#### Step 1: SSH to Client VPS
```bash
ssh user@202.61.47.28
```

#### Step 2: Install Docker (if not installed)
```bash
# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

#### Step 3: Login to Docker Hub
```bash
docker login
```

#### Step 4: Create .env File
```bash
# Make script executable
chmod +x scripts/create-env.sh

# Run the script (it will prompt for values)
./scripts/create-env.sh
```

**Or create manually:**
```bash
nano .env
```

Paste this (update with your actual values):
```env
DATABASE_URL=postgresql://postgres:**%40%2F%23Abc1@202.61.47.28:5432/DIG?sslmode=disable
PUBLIC_BASE_URL=
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
DIG_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
TRAFFIC_API_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
NODE_ENV=production
PORT=5000
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)
```

**Generate secrets:**
```bash
openssl rand -hex 32
```

#### Step 5: Deploy Application

**Option A: Using Deployment Script (Easiest)**
```bash
# Set your Docker Hub username
export DOCKER_USERNAME=yourusername

# Make script executable
chmod +x scripts/deploy-from-dockerhub.sh

# Deploy
./scripts/deploy-from-dockerhub.sh
```

**Option B: Manual Deployment**
```bash
# Pull image
docker pull yourusername/digtraffic-app:latest

# Create uploads directory
mkdir -p uploads
chmod 755 uploads

# Run container
docker run -d \
  --name digtraffic-app \
  --restart unless-stopped \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/uploads \
  --network host \
  yourusername/digtraffic-app:latest
```

#### Step 6: Verify Deployment
```bash
# Check container status
docker ps

# Check logs
docker logs digtraffic-app

# Test health endpoint
curl http://localhost:5000/api/health
```

---

## 🔄 Updating Application

### On Your Machine:
```bash
# Make changes to code
docker build -t yourusername/digtraffic-app:latest .
docker push yourusername/digtraffic-app:latest
```

### On Client VPS:
```bash
# Option 1: Run deployment script again
./scripts/deploy-from-dockerhub.sh

# Option 2: Manual update
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
```

---

## 📝 Important Notes

1. **Node.js Version**: Dockerfile uses Node.js 20 (matching your VPS)
2. **Redis Connection**: Using `--network host` allows direct access to Redis on localhost
3. **Database URL**: Password is URL-encoded (@ = %40, / = %2F, # = %23)
4. **Environment File**: `.env` file is created automatically with proper formatting
5. **Security**: Source code is never exposed - only compiled Docker image

---

## ✅ Checklist

- [ ] Docker Hub account created
- [ ] Image built and pushed to Docker Hub
- [ ] Docker installed on client VPS
- [ ] .env file created with correct values
- [ ] Container running successfully
- [ ] Health check passing
- [ ] Application accessible

---

## 🆘 Troubleshooting

**Can't login to Docker Hub:**
```bash
docker logout
docker login
```

**Container won't start:**
```bash
docker logs digtraffic-app
```

**Can't connect to Redis:**
- Make sure Redis is running: `sudo systemctl status redis`
- Use `--network host` in docker run command

**Can't connect to Database:**
- Check DATABASE_URL in .env
- Test connection: `psql $DATABASE_URL`

---

**For detailed instructions, see `DOCKER_HUB_DEPLOYMENT.md`**

