# Redis Setup and Configuration Guide

## Installation

### On CentOS/RHEL (Your Server)
```bash
# Install Redis
sudo yum install redis -y

# Start Redis service
sudo systemctl start redis

# Enable Redis to start on boot
sudo systemctl enable redis

# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping
# Should return: PONG
```

### On Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install redis-server -y
sudo systemctl start redis-server
sudo systemctl enable redis-server
redis-cli ping
```

## Configuration

### Environment Variables

Add to your `.env` file (or set in your environment):

**Option 1: Using Redis URL (Recommended)**
```bash
REDIS_URL=redis://localhost:6379
```

**Option 2: Using individual settings**
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty if no password
```

**Option 3: Remote Redis (if using Redis Cloud or separate server)**
```bash
REDIS_URL=redis://username:password@redis-server.example.com:6379
```

### Redis Configuration File

Edit `/etc/redis.conf` (or `/etc/redis/redis.conf` on Ubuntu):

```bash
# Allow connections from localhost (default)
bind 127.0.0.1

# Set max memory (optional, for production)
maxmemory 256mb
maxmemory-policy allkeys-lru

# Enable persistence (optional)
save 900 1
save 300 10
save 60 10000
```

## Testing Redis Connection

```bash
# Connect to Redis CLI
redis-cli

# Test commands
SET test "Hello Redis"
GET test
# Should return: "Hello Redis"

# Check info
INFO server
INFO memory

# Exit
exit
```

## Cache Configuration

The application uses the following cache TTLs (Time To Live):

- **Vehicle Lists**: 5 minutes (300 seconds)
- **Dashboard Stats**: 1 minute (60 seconds)
- **Filter Dropdowns** (categories, fuel-types, terminals, tracker-companies): 30 minutes (1800 seconds)

## Cache Invalidation

Caches are automatically invalidated when:
- New vehicle is registered
- Vehicle status is updated
- Vehicle is updated

## Monitoring Redis

### Check Redis Memory Usage
```bash
redis-cli INFO memory
```

### Check Connected Clients
```bash
redis-cli INFO clients
```

### Monitor Redis Commands (Real-time)
```bash
redis-cli MONITOR
```

### Check Cache Keys
```bash
redis-cli KEYS "*"
redis-cli KEYS "vehicles:*"
redis-cli KEYS "dashboard:*"
```

### Clear All Cache (Use with caution!)
```bash
redis-cli FLUSHALL
```

## Troubleshooting

### Redis Not Starting
```bash
# Check Redis logs
sudo journalctl -u redis -f

# Check Redis config
redis-cli CONFIG GET "*"
```

### Connection Refused
- Check if Redis is running: `sudo systemctl status redis`
- Check if port 6379 is open: `netstat -tuln | grep 6379`
- Check firewall: `sudo firewall-cmd --list-all`

### Memory Issues
```bash
# Check memory usage
redis-cli INFO memory

# Clear cache if needed
redis-cli FLUSHDB
```

## Production Recommendations

1. **Set a password** for Redis (if accessible from network):
   ```bash
   # In /etc/redis.conf
   requirepass your-strong-password-here
   
   # Then update .env
   REDIS_URL=redis://:your-strong-password-here@localhost:6379
   ```

2. **Configure max memory** to prevent Redis from using too much RAM:
   ```bash
   # In /etc/redis.conf
   maxmemory 512mb
   maxmemory-policy allkeys-lru
   ```

3. **Enable persistence** (if you want cache to survive restarts):
   ```bash
   # In /etc/redis.conf
   save 900 1
   save 300 10
   save 60 10000
   ```

4. **Monitor Redis** using `redis-cli INFO` or Redis monitoring tools

## Application Behavior

- **If Redis is not available**: The application will continue to work normally, but without caching (slower performance)
- **Cache misses**: Will fall back to database queries automatically
- **Cache hits**: Will return cached data with `X-Cache: HIT` header
- **Cache misses**: Will return fresh data with `X-Cache: MISS` header

## Performance Impact

**Expected improvements:**
- **Vehicle list queries**: 80-90% faster (from cache)
- **Dashboard stats**: 90-95% faster (from cache)
- **Filter dropdowns**: 85-95% faster (from cache)
- **Database load**: Reduced by 70-90%

## Restart Application After Redis Setup

```bash
cd /opt/DIG
npm install  # Install redis package
npm run build
pm2 restart front
pm2 logs front --lines 50  # Check logs for Redis connection
```

Look for: `Redis connected successfully` in the logs.

