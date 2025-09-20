# Security Guide

This document outlines security best practices and setup procedures for the Express TypeScript API.

## 🔐 Secrets Management

### Overview
All sensitive information (passwords, API keys, tokens) has been removed from code and configuration files. The application now uses environment variables and secure secret management.

### Before Production Deployment

**⚠️ CRITICAL: Never deploy with default or example secrets!**

### 1. Generate Secure Secrets

Use the provided script to generate random, secure secrets:

```bash
./scripts/generate-secrets.sh
```

This creates a `.env.secrets` file with randomly generated secure values.

### 2. Manual Secret Generation

If you prefer to generate secrets manually:

```bash
# JWT Secret (32+ characters)
openssl rand -base64 32

# Database passwords
openssl rand -base64 16

# RabbitMQ password
openssl rand -base64 12
```

### 3. Environment Files Security

#### Development (.env)
- Contains real secrets for local development
- **NEVER commit to version control**
- Copy from `.env.example` and set your values

#### Docker (.env.docker)
- Used by Docker Compose
- **NEVER commit to version control**
- Copy from `.env.docker.example` and set secure values

#### Production
- Use your deployment platform's secret management
- Examples: Kubernetes Secrets, AWS Secrets Manager, Azure Key Vault

## 🛡️ Security Checklist

### Before Going Live

- [ ] All default passwords changed
- [ ] JWT_SECRET is 32+ characters and randomly generated
- [ ] Database passwords are strong and unique
- [ ] RabbitMQ credentials are secure
- [ ] Redis password set (if using AUTH)
- [ ] Environment files are not committed to Git
- [ ] Secrets are stored in secure secret management system
- [ ] SSL/TLS enabled for all external communications
- [ ] Rate limiting configured appropriately
- [ ] CORS origins restricted to known domains
- [ ] **Trust proxy configured securely (CRITICAL)**
- [ ] IP validation enabled for production
- [ ] Proxy headers validated and monitored

### Environment Variables to Secure

| Variable | Purpose | Security Level |
|----------|---------|----------------|
| `JWT_SECRET` | JWT token signing | **CRITICAL** |
| `DATABASE_URL` | Database connection | **HIGH** |
| `MYSQL_ROOT_PASSWORD` | Database admin | **CRITICAL** |
| `MYSQL_PASSWORD` | App database user | **HIGH** |
| `RABBITMQ_DEFAULT_PASS` | Message queue | **HIGH** |
| `REDIS_PASSWORD` | Cache authentication | **MEDIUM** |
| `TRUST_PROXY` | Proxy configuration | **CRITICAL** |
| `TRUSTED_PROXY_IPS` | Trusted proxy sources | **HIGH** |

## 🚀 Secure Deployment Workflow

### 1. Local Development
```bash
# Copy and customize environment files
cp .env.example .env
cp .env.docker.example .env.docker

# Generate secure secrets
./scripts/generate-secrets.sh

# Update .env and .env.docker with generated secrets
```

### 2. Docker Deployment
```bash
# Ensure .env.docker has secure values
# Never use example/default values in production

docker-compose up -d
```

### 3. Production Deployment
```bash
# Use your platform's secret management
# Examples:

# Kubernetes
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret="$JWT_SECRET" \
  --from-literal=db-password="$DB_PASSWORD"

# AWS (using AWS CLI)
aws secretsmanager create-secret \
  --name "app/jwt-secret" \
  --secret-string "$JWT_SECRET"
```

## 🔍 Security Monitoring

### Regular Tasks
1. **Rotate secrets** every 90 days
2. **Monitor for secret leaks** in logs and code
3. **Review access logs** for suspicious activity
4. **Update dependencies** regularly
5. **Scan for vulnerabilities** with `npm audit`

### Security Headers
The application includes security middleware:
- Helmet.js for security headers
- CORS with restricted origins
- Rate limiting to prevent abuse

## 🚨 Security Incident Response

If you suspect a security breach:

1. **Immediately rotate all secrets**
2. **Check access logs** for unauthorized activity
3. **Update all environment variables**
4. **Deploy with new secrets**
5. **Monitor for continued suspicious activity**

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## 🔗 Files to Review

- `.env.example` - Template for local development
- `.env.docker.example` - Template for Docker deployment
- `.env.secrets.example` - Template for secure secrets
- `scripts/generate-secrets.sh` - Secret generation utility
- `.gitignore` - Ensures secrets are not committed

## 🔗 Trust Proxy Security

### ⚠️ **CRITICAL SECURITY ISSUE RESOLVED**

The application previously had `app.set("trust proxy", true)` which created a **severe security vulnerability** allowing rate limit bypass. This has been fixed with environment-based configuration.

### 🛡️ **Secure Trust Proxy Configuration**

#### Environment Variables

```bash
# Secure options for TRUST_PROXY:
TRUST_PROXY=false              # Default: No proxy trusted (secure)
TRUST_PROXY=loopback          # Trust localhost only
TRUST_PROXY=linklocal         # Trust link-local addresses (Docker)
TRUST_PROXY=uniquelocal       # Trust private network ranges
TRUST_PROXY=1                 # Trust first proxy (hop count)
TRUST_PROXY=2                 # Trust up to 2 proxies

# For specific proxy IPs/subnets:
TRUSTED_PROXY_IPS=10.0.0.1,192.168.1.0/24,172.16.0.0/12
```

#### Deployment Scenarios

| Environment | Recommended Setting | Use Case |
|-------------|-------------------|----------|
| **Development** | `TRUST_PROXY=true` | Local development only |
| **Docker/Kubernetes** | `TRUST_PROXY=linklocal` | Container orchestration |
| **Nginx/Apache** | `TRUST_PROXY=loopback` | Reverse proxy setup |
| **AWS ALB** | `TRUST_PROXY=linklocal` | Application Load Balancer |
| **Cloudflare** | `TRUSTED_PROXY_IPS=cloudflare-ranges` | CDN/DDoS protection |
| **Production Direct** | `TRUST_PROXY=false` | Direct internet connection |

#### Cloudflare Configuration Example

```bash
# For Cloudflare protection
TRUST_PROXY=false
TRUSTED_PROXY_IPS=173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22
```

### 🔍 **Security Monitoring**

The application now includes enhanced IP validation:

- **Suspicious Activity Detection**: Monitors for header spoofing attempts
- **Rate Limit Protection**: Multiple validation layers prevent bypass
- **Security Logging**: Detailed logs for investigation
- **Production Blocking**: Automatically blocks suspicious requests in production

#### Monitoring Logs

```bash
# Watch for suspicious activity
tail -f app.log | grep "Suspicious IP/proxy activity"

# Monitor trust proxy configuration
tail -f app.log | grep "Trust proxy configured"
```

### 🚨 **Red Flags to Watch For**

1. **Conflicting IP Headers**: Different IPs in X-Forwarded-For vs X-Real-IP
2. **Excessive Proxy Headers**: More than 8 proxy-related headers
3. **Private IPs without Proxy**: Private IP ranges when trust proxy is disabled
4. **Header Injection**: Suspicious characters in proxy headers
5. **Rate Limit Anomalies**: Sudden spikes from single "IP" addresses

### 🔧 **Testing Proxy Configuration**

```bash
# Test with curl to verify IP detection
curl -H "X-Forwarded-For: 1.2.3.4" http://localhost:8888/health

# Check application logs for IP resolution
grep "Client IP resolution" app.log

# Verify rate limiting works correctly
for i in {1..10}; do curl http://localhost:8888/api/users; done
```

---

**Remember: Security is an ongoing process, not a one-time setup!**