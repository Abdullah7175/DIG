#!/bin/bash
# Automatic .env file creation script
# Run this on the CLIENT VPS to create .env file with proper values

set -e

echo "=========================================="
echo "Creating .env File for DIG Traffic System"
echo "=========================================="

# Check if .env already exists
if [ -f .env ]; then
    read -p ".env file already exists. Overwrite? (y/N): " OVERWRITE
    if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
        echo "Aborted. Existing .env file preserved."
        exit 0
    fi
    echo "Backing up existing .env to .env.backup..."
    cp .env .env.backup
fi

# Get database credentials
echo ""
echo "=== Database Configuration ==="
read -p "Enter PostgreSQL host (default: 202.61.47.28): " DB_HOST
DB_HOST=${DB_HOST:-202.61.47.28}

read -p "Enter PostgreSQL port (default: 5432): " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Enter PostgreSQL database name (default: DIG): " DB_NAME
DB_NAME=${DB_NAME:-DIG}

read -p "Enter PostgreSQL username (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Enter PostgreSQL password: " DB_PASSWORD
echo ""
if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: Password is required!"
    exit 1
fi

# URL encode the password (handle special characters)
# Note: @ becomes %40, / becomes %2F, # becomes %23
DB_PASSWORD_ENCODED=$(echo -n "$DB_PASSWORD" | sed 's/@/%40/g' | sed 's/\//%2F/g' | sed 's/#/%23/g')

# Get Redis configuration
echo ""
echo "=== Redis Configuration ==="
read -p "Enter Redis host (default: localhost): " REDIS_HOST
REDIS_HOST=${REDIS_HOST:-localhost}

read -p "Enter Redis port (default: 6379): " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}

read -sp "Enter Redis password (press Enter for no password): " REDIS_PASSWORD
echo ""

# Build Redis URL
if [ -z "$REDIS_PASSWORD" ]; then
    REDIS_URL="redis://${REDIS_HOST}:${REDIS_PORT}"
else
    REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
fi

# Get API Token
echo ""
echo "=== API Configuration ==="
read -p "Enter DIG API Token (default: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2): " DIG_API_TOKEN
DIG_API_TOKEN=${DIG_API_TOKEN:-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2}

read -p "Enter Public Base URL (leave empty if not needed): " PUBLIC_BASE_URL
PUBLIC_BASE_URL=${PUBLIC_BASE_URL:-}

# Generate secure secrets
echo ""
echo "=== Generating Secure Secrets ==="
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)

# Build DATABASE_URL (matching your exact format)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD_ENCODED}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=disable"

# Create .env file
cat > .env << EOF
# ============================================
# Environment Variables for DIG Traffic System
# Generated automatically on $(date)
# ============================================

# ============================================
# Database Configuration (PostgreSQL)
# ============================================
DATABASE_URL=${DATABASE_URL}

# Database Pool Settings
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=30000

# ============================================
# Redis Configuration
# ============================================
REDIS_URL=${REDIS_URL}
REDIS_HOST=${REDIS_HOST}
REDIS_PORT=${REDIS_PORT}
REDIS_PASSWORD=${REDIS_PASSWORD}

# ============================================
# Application Configuration
# ============================================
NODE_ENV=production
PORT=5000
PUBLIC_BASE_URL=${PUBLIC_BASE_URL}

# ============================================
# Security Secrets (Auto-generated)
# ============================================
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# ============================================
# API Tokens
# ============================================
DIG_API_TOKEN=${DIG_API_TOKEN}
TRAFFIC_API_TOKEN=${DIG_API_TOKEN}

# ============================================
# Traccar Integration (Optional)
# ============================================
TRACCAR_API_URL=
TRACCAR_USERNAME=
TRACCAR_PASSWORD=
TRACCAR_TIMEOUT=10000

# ============================================
# File Upload Settings
# ============================================
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# ============================================
# Logging
# ============================================
LOG_LEVEL=info
EOF

# Set proper permissions
chmod 600 .env

echo ""
echo "=========================================="
echo ".env file created successfully!"
echo "=========================================="
echo ""
echo "File location: $(pwd)/.env"
echo "File permissions: 600 (read/write for owner only)"
echo ""
echo "⚠️  IMPORTANT: Keep this file secure!"
echo "   - Never commit to version control"
echo "   - Never share publicly"
echo "   - Backup securely"
echo ""
echo "Next steps:"
echo "1. Review the .env file: cat .env"
echo "2. Start Docker container with: docker run --env-file .env ..."
echo "=========================================="

