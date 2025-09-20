#!/bin/bash

# Script to generate secure secrets for the application
# Run this script to create a .env.secrets file with random secure values

set -e

echo "🔐 Generating secure secrets for the application..."

# Function to generate a random string
generate_secret() {
    local length=$1
    openssl rand -base64 $length | tr -d '\n'
}

# Create the secrets file
cat > .env.secrets << EOF
# Generated Secrets - $(date)
# This file contains randomly generated secure secrets
# DO NOT commit this file to version control

# JWT Secret (32 characters minimum)
JWT_SECRET=$(generate_secret 32)

# Database Passwords
MYSQL_ROOT_PASSWORD=$(generate_secret 16)
MYSQL_PASSWORD=$(generate_secret 16)

# RabbitMQ Credentials
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=$(generate_secret 12)

# Redis Password (optional)
REDIS_PASSWORD=$(generate_secret 16)
EOF

echo "✅ Secrets generated and saved to .env.secrets"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "1. Keep .env.secrets file secure and never commit it"
echo "2. Copy values to your deployment environment"
echo "3. Delete this file after copying secrets to production"
echo "4. Use a proper secrets management system in production"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.secrets values to your .env.docker file"
echo "2. Update your deployment scripts to use these secrets"
echo "3. Test your application with the new secrets"
echo ""
echo "🔒 Generated secrets are now ready for use!"