#!/bin/bash
# Database setup script for first-time deployment
# Run this on the CLIENT VPS after PostgreSQL is installed

set -e

echo "=========================================="
echo "Database Setup for DIG Traffic System"
echo "=========================================="

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "ERROR: PostgreSQL is not installed!"
    echo "Please install PostgreSQL first:"
    echo "  CentOS/RHEL: sudo yum install postgresql postgresql-server"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Get database credentials
read -p "Enter PostgreSQL superuser (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Enter database name to create (default: digtraffic): " DB_NAME
DB_NAME=${DB_NAME:-digtraffic}

read -p "Enter password for database user: " DB_PASSWORD
if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: Password is required!"
    exit 1
fi

echo ""
echo "Creating database and user..."

# Create database and user
sudo -u postgres psql <<EOF
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user
CREATE USER ${DB_NAME}_user WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO ${DB_NAME}_user;

-- Connect to database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO ${DB_NAME}_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_NAME}_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_NAME}_user;
EOF

echo "Database and user created successfully!"
echo ""
echo "=========================================="
echo "Database Information:"
echo "=========================================="
echo "Database Name: $DB_NAME"
echo "Database User: ${DB_NAME}_user"
echo "Database Password: $DB_PASSWORD"
echo ""
echo "Connection String:"
echo "postgresql://${DB_NAME}_user:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "Save this information - you'll need it for the .env file!"
echo "=========================================="

