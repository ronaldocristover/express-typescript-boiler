# Redis Authentication Error Fix

## The Problem
Your Redis server requires authentication (NOAUTH Authentication required), but your application isn't providing credentials.

## Solutions (Choose One)

### Solution 1: Disable Redis Temporarily (Quickest Fix)
```bash
# In your .env file, comment out or remove REDIS_URL
REDIS_URL=
```
Your app will continue working without caching.

### Solution 2: Configure Redis Without Authentication

#### If using Docker Redis:
```bash
# Stop current Redis container
docker stop redis-container-name

# Start Redis without auth
docker run -d --name redis \
  -p 6380:6379 \
  redis:7-alpine \
  redis-server --requirepass ""

# Or without any password requirement
docker run -d --name redis \
  -p 6380:6379 \
  redis:7-alpine
```

#### If using local Redis installation:
```bash
# Find redis.conf file
find /usr/local/etc /etc -name "redis.conf" 2>/dev/null

# Edit redis.conf and comment out:
# requirepass your_password

# Restart Redis
brew services restart redis
# OR
sudo systemctl restart redis
```

### Solution 3: Add Password to Redis URL
If you know your Redis password:
```bash
# In .env file:
REDIS_URL=redis://:your_password@localhost:6380
```

### Solution 4: Find Redis Password
```bash
# Check if Redis is running with password
docker logs redis-container-name 2>&1 | grep -i password

# Or check Redis config
redis-cli -p 6380 config get requirepass
```

### Solution 5: Reset Redis Password
```bash
# Connect to Redis (if you have access)
redis-cli -p 6380

# Inside Redis CLI:
CONFIG SET requirepass ""
AUTH ""
```

## Recommended Quick Fix

For development, the easiest solution is to temporarily disable Redis:

1. **Edit your .env file:**
```bash
# Comment out or remove REDIS_URL
# REDIS_URL=redis://localhost:6380
```

2. **Restart your application:**
```bash
npm run dev
```

The application will continue working without caching. You'll see a log message:
```
Redis URL not configured, running without cache.
```

## Testing the Fix

After implementing any solution, test with:
```bash
# Check if app starts without Redis errors
npm run dev

# Test a cached endpoint
curl http://localhost:8888/api/users

# Check logs for Redis connection status
```

## Docker Solution

If you prefer to use Docker Redis without authentication:
```bash
# Stop existing Redis
docker stop $(docker ps -q --filter "ancestor=redis")

# Start Redis without auth
docker run -d --name redis-dev \
  -p 6380:6379 \
  redis:7-alpine

# Update your .env
REDIS_URL=redis://localhost:6380
```

## Production Considerations

For production:
1. Always use Redis with authentication
2. Use strong passwords
3. Consider Redis ACLs for fine-grained access control
4. Use TLS for Redis connections

## Verification

After fixing, you should see in your logs:
```
Redis client connected
Connected to Redis cache successfully.
```

Instead of:
```
Redis set error: NOAUTH Authentication required.
```