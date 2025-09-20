# Docker Setup Guide

This guide explains how to run the Express TypeScript application with RabbitMQ using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- At least 4GB RAM available for containers

## Services Included

The Docker setup includes all required services:

- **Express App**: Main TypeScript application
- **MySQL**: Database server (port 3307)
- **Redis**: Cache server (port 6380)
- **RabbitMQ**: Message broker (ports 5672, 15672)

## Quick Start

### Production Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Development Mode

```bash
# Start development environment with hot reload
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop development services
docker-compose -f docker-compose.dev.yml down
```

## Environment Configuration

### 🔐 Security Setup (IMPORTANT!)

**Before deploying, you MUST set secure secrets:**

1. **Generate secure secrets:**
   ```bash
   ./scripts/generate-secrets.sh
   ```

2. **Create production environment file:**
   ```bash
   cp .env.docker.example .env.docker
   # Edit .env.docker with your secure values
   ```

3. **Never use default/example passwords in production!**

### Production Environment
The production setup uses environment variables from `.env.docker` file:

- **Database**: Configured via `DATABASE_URL` environment variable
- **Redis**: Configured via `REDIS_URL` environment variable
- **RabbitMQ**: Configured via `RABBITMQ_URL` environment variable
- **Security**: All secrets loaded from `.env.docker` file

**⚠️ Security Note**: Docker Compose now uses external environment files instead of hardcoded values.

### Development Environment
Development mode includes:
- Hot reload with volume mounting
- Debug logging enabled
- All source code mounted for real-time changes

## Database Setup

### Initial Migration
The database migrations run automatically when the app starts. However, you can run them manually:

```bash
# Run migrations manually
docker-compose exec app npx prisma migrate deploy

# Generate Prisma client
docker-compose exec app npx prisma generate

# Seed the database
docker-compose exec app npx prisma db seed
```

### Database Access
Connect to MySQL directly:
```bash
# Connect to MySQL container
docker-compose exec mysql mysql -u root -p

# Use the application database
USE boiler_express;
SHOW TABLES;
```

## Service URLs

When all services are running:

- **Application**: http://localhost:8888
- **Health Check**: http://localhost:8888/health
- **API Documentation**: http://localhost:8888/api
- **RabbitMQ Management**: http://localhost:15672 (admin/adminpassword)
- **MySQL**: localhost:3307 (root/rootpassword)
- **Redis**: localhost:6380

## Monitoring & Debugging

### Container Status
```bash
# Check all containers
docker-compose ps

# Check specific service health
docker-compose exec app curl -f http://localhost:8888/health
```

### Logs
```bash
# View all logs
docker-compose logs

# Follow app logs
docker-compose logs -f app

# View RabbitMQ logs
docker-compose logs rabbitmq

# View database logs
docker-compose logs mysql
```

### RabbitMQ Management
Access the RabbitMQ management interface at http://localhost:15672:
- Username: `admin`
- Password: `adminpassword`

Monitor:
- Queue depths
- Message rates
- Exchange bindings
- Consumer connections

## Troubleshooting

### Common Issues

**1. Port Conflicts**
```bash
# Stop conflicting services
sudo lsof -i :8888
sudo lsof -i :3307
sudo lsof -i :5672

# Or change ports in docker-compose.yml
```

**2. Database Connection Failed**
```bash
# Check MySQL health
docker-compose exec mysql mysqladmin ping -u root -p

# Restart MySQL service
docker-compose restart mysql
```

**3. RabbitMQ Connection Failed**
```bash
# Check RabbitMQ status
docker-compose exec rabbitmq rabbitmq-diagnostics ping

# Restart RabbitMQ
docker-compose restart rabbitmq
```

**4. Application Won't Start**
```bash
# Check application logs
docker-compose logs app

# Check environment variables
docker-compose exec app env | grep -E "(DATABASE|REDIS|RABBITMQ)"

# Restart application
docker-compose restart app
```

**5. Volume Permission Issues**
```bash
# Fix volume permissions (Linux/macOS)
sudo chown -R $USER:$USER .

# Or run with root (not recommended)
docker-compose exec --user root app sh
```

### Clean Restart
```bash
# Stop and remove all containers and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

## Development Workflow

### Hot Reload Development
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d

# Make code changes - they're automatically reflected
# Files are mounted from host to container

# View logs in real-time
docker-compose -f docker-compose.dev.yml logs -f app
```

### Running Commands in Container
```bash
# Access app container shell
docker-compose exec app sh

# Run npm commands
docker-compose exec app npm test
docker-compose exec app npm run build

# Run Prisma commands
docker-compose exec app npx prisma studio
docker-compose exec app npx prisma migrate dev
```

### Testing Message Broker
```bash
# Create a user (triggers user.created event)
curl -X POST http://localhost:8888/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"1234567890","password":"password123"}'

# Publish custom message
curl -X POST http://localhost:8888/api/messages/publish \
  -H "Content-Type: application/json" \
  -d '{"routingKey":"test.event","type":"test.event","data":{"message":"Hello from Docker!"}}'

# Check RabbitMQ queues at http://localhost:15672
```

## Production Considerations

### Security
- Change default passwords in production
- Use Docker secrets for sensitive data
- Implement proper network security groups
- Enable SSL/TLS for external connections

### Performance
- Increase memory limits for MySQL and RabbitMQ
- Configure connection pooling
- Monitor container resource usage
- Implement proper backup strategies

### Scaling
```bash
# Scale application instances
docker-compose up -d --scale app=3

# Use external load balancer
# Configure sticky sessions if needed
```

## File Structure

```
.
├── Dockerfile              # Production build
├── Dockerfile.dev          # Development build
├── docker-compose.yml      # Production services
├── docker-compose.dev.yml  # Development services
├── .dockerignore           # Docker ignore rules
├── .env.docker             # Docker environment template
└── DOCKER_SETUP.md         # This guide
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://root:rootpassword@mysql:3306/boiler_express` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `RABBITMQ_URL` | RabbitMQ connection string | `amqp://admin:adminpassword@rabbitmq:5672` |
| `RABBITMQ_EXCHANGE` | RabbitMQ exchange name | `app_exchange` |
| `RABBITMQ_QUEUE_PREFIX` | Queue name prefix | `app_queue` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret...` |
| `LOG_LEVEL` | Logging level | `info` |
| `NODE_ENV` | Environment mode | `production` |

For a complete list, see `.env.docker` file.