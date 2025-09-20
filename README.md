# Arisan API Setup

This project is an Arisan API built with **Express.js**, **MySQL**, and **Prisma**. Monitoring and observability are supported via **Grafana**.

## Prerequisites

- Node.js & npm
- MySQL server
- [Grafana](https://grafana.com/) (optional, for monitoring)

## Configuration

### 🔐 Security Setup (IMPORTANT!)

**Never use hardcoded secrets in production!**

1. **For local development:**
   ```bash
   cp .env.example .env
   # Edit .env with your local database credentials
   ```

2. **For Docker deployment:**
   ```bash
   cp .env.docker.example .env.docker
   ./scripts/generate-secrets.sh
   # Copy secure values from .env.secrets to .env.docker
   ```

3. **For production:**
   - Use a proper secrets management system
   - See [SECURITY.md](SECURITY.md) for detailed security guidelines

### Example Environment Setup

```env
DATABASE_URL="mysql://username:password@localhost:3307/boiler_express"
JWT_SECRET="your-secure-32-character-secret-key"
REDIS_URL="redis://localhost:6379"
```

## Installation & Setup

```shell
npm install

npx prisma migrate dev

npx prisma generate

npm run build

npm run start
```

## Monitoring

To enable monitoring, configure Grafana to connect to your MySQL database or other relevant data sources.
