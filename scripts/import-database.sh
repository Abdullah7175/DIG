#!/bin/bash
# Import existing database data
# Use this if you have an existing database dump to import

set -e

echo "=========================================="
echo "Database Import Script"
echo "=========================================="

read -p "Enter database name: " DB_NAME
read -p "Enter database user: " DB_USER
read -p "Enter path to SQL dump file: " DUMP_FILE

if [ ! -f "$DUMP_FILE" ]; then
    echo "ERROR: Dump file not found: $DUMP_FILE"
    exit 1
fi

echo "Importing database..."
PGPASSWORD=$(read -sp "Enter database password: " pwd; echo $pwd)
export PGPASSWORD

psql -U "$DB_USER" -d "$DB_NAME" -f "$DUMP_FILE"

unset PGPASSWORD

echo "Database import completed!"
echo "=========================================="

