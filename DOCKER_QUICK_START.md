# Docker Quick Start Guide

## 🚀 Quick Deployment Steps

### On Your Machine (Developer)

1. **Build Docker Image**
   ```bash
   ./scripts/docker-build.sh
   ```
   This creates `digtraffic-app.tar.gz`

2. **Transfer to Client VPS**
   ```bash
   scp digtraffic-app.tar.gz user@client-vps:/home/user/
   ```

### On Client VPS

1. **Load Docker Image**
   ```bash
   gunzip -c digtraffic-app.tar.gz | docker load
   ```

2. **Setup Database** (First time only)
   ```bash
   ./scripts/database-setup.sh
   ```

3. **Create .env File**
   ```bash
   cp .env.example .env
   nano .env
   # Fill in your values
   ```

4. **Run Container**
   ```bash
   docker run -d \
     --name digtraffic-app \
     --restart unless-stopped \
     -p 5000:5000 \
     --env-file .env \
     -v $(pwd)/uploads:/app/uploads \
     --add-host=host.docker.internal:host-gateway \
     digtraffic-app:latest
   ```

5. **Verify**
   ```bash
   docker logs digtraffic-app
   curl http://localhost:5000/api/health
   ```

## 📝 Environment Variables Required

```env
DATABASE_URL=postgresql://user:password@localhost:5432/database
REDIS_HOST=host.docker.internal
REDIS_PORT=6379
JWT_SECRET=your_secret_here
SESSION_SECRET=your_secret_here
NODE_ENV=production
PORT=5000
```

## 🔄 Updating Application

1. Build new image on your machine
2. Transfer to VPS
3. Stop old container: `docker stop digtraffic-app && docker rm digtraffic-app`
4. Load new image: `gunzip -c digtraffic-app.tar.gz | docker load`
5. Run new container (same command as above)

## 📚 Full Documentation

See `DOCKER_DEPLOYMENT.md` for complete instructions.

