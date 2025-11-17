#!/bin/bash
# Database backup script for Hospital Management System

BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="hospital_management"
DB_USER="hospital_user"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U $DB_USER -d $DB_NAME -F c -f $BACKUP_DIR/db_backup_$DATE.dump

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: db_backup_$DATE.dump"
    
    # Keep only last 7 days of backups
    find $BACKUP_DIR -name "db_backup_*.dump" -mtime +7 -delete
    echo "Old backups cleaned up"
else
    echo "Backup failed!"
    exit 1
fi

