# Docker Hub Deployment Checklist

## ✅ Pre-Deployment Checklist

### On Your Machine (Developer)

- [ ] Docker installed and running
- [ ] Node.js 20+ installed (for building)
- [ ] Docker Hub account created
- [ ] Docker Hub username noted
- [ ] Source code ready and tested

### On Client VPS

- [ ] Docker installed (version 20+)
- [ ] PostgreSQL installed and running
- [ ] Redis installed and running
- [ ] Port 5000 available
- [ ] SSH access to VPS
- [ ] Root/sudo access

---

## 🚀 Deployment Steps

### Phase 1: Build and Push (Your Machine)

- [ ] **Step 1:** Login to Docker Hub
  ```bash
  docker login
  ```

- [ ] **Step 2:** Build Docker image
  ```bash
  docker build -t yourusername/digtraffic-app:latest .
  ```

- [ ] **Step 3:** Push to Docker Hub
  ```bash
  docker push yourusername/digtraffic-app:latest
  ```

- [ ] **Step 4:** Verify on Docker Hub
  - Visit: https://hub.docker.com/r/yourusername/digtraffic-app
  - Confirm image is visible

### Phase 2: Deploy on Client VPS

- [ ] **Step 1:** SSH to VPS
  ```bash
  ssh root@202.61.47.28
  ```

- [ ] **Step 2:** Install Docker (if needed)
  ```bash
  sudo yum install -y docker
  sudo systemctl start docker
  sudo systemctl enable docker
  ```

- [ ] **Step 3:** Login to Docker Hub
  ```bash
  docker login
  ```

- [ ] **Step 4:** Create .env file
  ```bash
  chmod +x scripts/create-env.sh
  ./scripts/create-env.sh
  ```
  - [ ] Database URL configured correctly
  - [ ] Redis settings configured
  - [ ] API tokens set
  - [ ] Secrets generated

- [ ] **Step 5:** Deploy application
  ```bash
  export DOCKER_USERNAME=yourusername
  chmod +x scripts/deploy-from-dockerhub.sh
  ./scripts/deploy-from-dockerhub.sh
  ```

- [ ] **Step 6:** Verify deployment
  - [ ] Container is running: `docker ps`
  - [ ] Health check passes: `curl http://localhost:5000/api/health`
  - [ ] Application accessible: `curl http://localhost:5000`
  - [ ] Logs show no errors: `docker logs digtraffic-app`

---

## 🔍 Verification Tests

### Test 1: Container Status
```bash
docker ps | grep digtraffic-app
```
**Expected:** Container should be running

### Test 2: Health Endpoint
```bash
curl http://localhost:5000/api/health
```
**Expected:**
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected"
}
```

### Test 3: Application Access
```bash
curl http://localhost:5000
```
**Expected:** HTML response (frontend)

### Test 4: Database Connection
```bash
docker logs digtraffic-app | grep -i "database connection"
```
**Expected:** "Database connection established successfully"

### Test 5: Redis Connection
```bash
docker logs digtraffic-app | grep -i redis
```
**Expected:** "Redis connected successfully" or "Redis not configured"

---

## 📝 Environment Variables Verification

Check `.env` file contains:

- [ ] `DATABASE_URL` - Properly formatted with URL-encoded password
- [ ] `REDIS_URL` - Correct Redis connection string
- [ ] `REDIS_HOST` - Set to `localhost`
- [ ] `REDIS_PORT` - Set to `6379`
- [ ] `DIG_API_TOKEN` - Your API token
- [ ] `JWT_SECRET` - 32+ character hex string
- [ ] `SESSION_SECRET` - 32+ character hex string
- [ ] `NODE_ENV` - Set to `production`
- [ ] `PORT` - Set to `5000`

---

## 🔄 Update Process Checklist

When updating the application:

- [ ] **On Your Machine:**
  - [ ] Make code changes
  - [ ] Test locally
  - [ ] Build new image: `docker build -t yourusername/digtraffic-app:latest .`
  - [ ] Push to Docker Hub: `docker push yourusername/digtraffic-app:latest`

- [ ] **On Client VPS:**
  - [ ] Pull latest image: `docker pull yourusername/digtraffic-app:latest`
  - [ ] Stop old container: `docker stop digtraffic-app`
  - [ ] Remove old container: `docker rm digtraffic-app`
  - [ ] Start new container: `./scripts/deploy-from-dockerhub.sh`
  - [ ] Verify update: `curl http://localhost:5000/api/health`

---

## 🆘 Troubleshooting Checklist

If something goes wrong:

- [ ] Check Docker is running: `docker ps`
- [ ] Check container logs: `docker logs digtraffic-app`
- [ ] Verify .env file exists: `ls -la .env`
- [ ] Check .env file permissions: `ls -l .env` (should be 600)
- [ ] Test database connection: `psql $DATABASE_URL`
- [ ] Test Redis connection: `redis-cli ping`
- [ ] Check port 5000 is free: `netstat -tuln | grep 5000`
- [ ] Verify Docker Hub login: `docker info | grep Username`
- [ ] Check image exists: `docker images | grep digtraffic-app`

---

## 📋 Important Notes

1. **Node.js Version:** Dockerfile uses Node.js 20 (matches VPS: v20.19.5)
2. **Redis Connection:** Uses `--network host` for direct localhost access
3. **Password Encoding:** Database password is URL-encoded (@=%40, /=%2F, #=%23)
4. **Source Code:** Never exposed - only compiled Docker image
5. **Environment File:** Auto-created with proper formatting and permissions

---

## ✅ Success Criteria

Deployment is successful when:

- ✅ Container is running
- ✅ Health endpoint returns "healthy"
- ✅ Database connection established
- ✅ Redis connection established (if configured)
- ✅ Application is accessible on port 5000
- ✅ No errors in logs
- ✅ Frontend loads correctly

---

**Ready to deploy!** Follow the steps in `DOCKER_HUB_DEPLOYMENT.md` for detailed instructions.

