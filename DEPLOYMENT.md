# Hospital Management System - Deployment Guide for Rocky Linux

This guide covers deploying the complete Hospital Management System (including Node.js backend, React frontend, Traccar GPS tracking server, and PostgreSQL database) on Rocky Linux.

## System Requirements

### Minimum Hardware Configuration
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 8GB (16GB recommended for production)
- **Storage**: 100GB SSD (200GB+ recommended)
- **Network**: Stable internet connection

### Recommended Production Configuration
- **CPU**: 8+ cores
- **RAM**: 16GB+ (32GB for high-traffic)
- **Storage**: 500GB+ SSD with backups
- **Network**: Dedicated IP, firewall configured

## Prerequisites

### 1. Update System
```bash
sudo dnf update -y
sudo dnf install -y epel-release
```

### 2. Install Required Software

#### PostgreSQL 15+
```bash
sudo dnf install -y postgresql15-server postgresql15
sudo postgresql-15-setup initdb
sudo systemctl enable postgresql-15
sudo systemctl start postgresql-15
```

#### Node.js 20+ (using NodeSource)
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

#### Java 17+ (for Traccar)
```bash
sudo dnf install -y java-17-openjdk java-17-openjdk-devel
```

#### Nginx (Reverse Proxy)
```bash
sudo dnf install -y nginx
sudo systemctl enable nginx
```

#### Git
```bash
sudo dnf install -y git
```

#### Build Tools
```bash
sudo dnf install -y gcc-c++ make
```

## Database Setup

### 1. Configure PostgreSQL
```bash
sudo -u postgres psql
```

In PostgreSQL console:
```sql
-- Create database
CREATE DATABASE hospital_management;

-- Create user (replace with your credentials)
CREATE USER hospital_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hospital_management TO hospital_user;

-- Exit
\q
```

### 2. Configure PostgreSQL for Remote Access (if needed)
Edit `/var/lib/pgsql/15/data/postgresql.conf`:
```
listen_addresses = '*'
```

Edit `/var/lib/pgsql/15/data/pg_hba.conf`:
```
host    all             all             0.0.0.0/0               md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql-15
```

### 3. Configure Firewall
```bash
sudo firewall-cmd --permanent --add-service=postgresql
sudo firewall-cmd --reload
```

## Application Deployment

### 1. Create Application User
```bash
sudo useradd -m -s /bin/bash hospitalapp
sudo mkdir -p /opt/hospital-management
sudo chown hospitalapp:hospitalapp /opt/hospital-management
```

### 2. Clone and Setup Application
```bash
cd /opt/hospital-management
sudo -u hospitalapp git clone <your-repository-url> .
sudo -u hospitalapp npm install
```

### 3. Configure Environment Variables
Create `/opt/hospital-management/.env`:
```bash
sudo -u hospitalapp nano /opt/hospital-management/.env
```

Add the following (adjust values as needed):
```env
# Database
DATABASE_URL=postgresql://hospital_user:your_secure_password@localhost:5432/hospital_management
DB_POOL_MAX=20
DB_POOL_MIN=5
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=10000
DB_MAX_LIFETIME=1800000

# Application
NODE_ENV=production
PORT=5000

# Traccar Integration
TRACCAR_API_URL=http://localhost:8082
TRACCAR_USERNAME=admin
TRACCAR_PASSWORD=your_traccar_password
TRACCAR_TIMEOUT=10000

# JWT Secret (generate a secure random string)
JWT_SECRET=your_jwt_secret_here

# Session Secret (generate a secure random string)
SESSION_SECRET=your_session_secret_here
```

Generate secure secrets:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Build Application
```bash
cd /opt/hospital-management
sudo -u hospitalapp npm run build
```

### 5. Run Database Migrations
```bash
cd /opt/hospital-management
sudo -u hospitalapp npm run db:migrate
# Or use your migration tool
```

## Traccar GPS Server Setup

### 1. Download Traccar
```bash
cd /opt
sudo wget https://github.com/traccar/traccar/releases/download/v6.5/traccar-linux-64-6.5.zip
sudo unzip traccar-linux-64-6.5.zip
sudo mv traccar /opt/traccar
sudo chown -R hospitalapp:hospitalapp /opt/traccar
```

### 2. Configure Traccar
Edit `/opt/traccar/conf/traccar.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE properties SYSTEM 'http://java.sun.com/dtd/properties.dtd'>
<properties>
    <entry key='database.driver'>org.postgresql.Driver</entry>
    <entry key='database.url'>jdbc:postgresql://localhost:5432/hospital_management</entry>
    <entry key='database.user'>hospital_user</entry>
    <entry key='database.password'>your_secure_password</entry>
    
    <entry key='server.port'>8082</entry>
    <entry key='web.port'>8082</entry>
    
    <entry key='logger.console'>true</entry>
    <entry key='logger.file'>./logs/traccar.log</entry>
</properties>
```

### 3. Install Traccar Service
```bash
sudo /opt/traccar/bin/traccar install
sudo systemctl enable traccar
sudo systemctl start traccar
```

## Nginx Configuration

### 1. Create Nginx Configuration
Create `/etc/nginx/conf.d/hospital-management.conf`:
```nginx
upstream hospital_backend {
    server localhost:5000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Redirect HTTP to HTTPS (uncomment after SSL setup)
    # return 301 https://$server_name$request_uri;

    # For now, proxy to backend
    location / {
        proxy_pass http://hospital_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support
    location /api/websocket {
        proxy_pass http://hospital_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 3600s;
    }
}

# Traccar WebSocket (if exposing publicly)
server {
    listen 8082;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8082;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### 2. Test and Reload Nginx
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Configure Firewall
```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8082/tcp
sudo firewall-cmd --reload
```

## SSL Certificate (Let's Encrypt)

### 1. Install Certbot
```bash
sudo dnf install -y certbot python3-certbot-nginx
```

### 2. Obtain Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

Follow the prompts. Certbot will automatically configure Nginx.

## Systemd Service Files

### 1. Create Application Service
Create `/etc/systemd/system/hospital-management.service`:
```ini
[Unit]
Description=Hospital Management System
After=network.target postgresql-15.service

[Service]
Type=simple
User=hospitalapp
WorkingDirectory=/opt/hospital-management
Environment=NODE_ENV=production
EnvironmentFile=/opt/hospital-management/.env
ExecStart=/usr/bin/node dist/server/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=hospital-management

# Resource limits
LimitNOFILE=65536
MemoryLimit=4G

[Install]
WantedBy=multi-user.target
```

### 2. Enable and Start Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable hospital-management
sudo systemctl start hospital-management
sudo systemctl status hospital-management
```

## Monitoring and Logs

### View Application Logs
```bash
sudo journalctl -u hospital-management -f
```

### View Traccar Logs
```bash
sudo journalctl -u traccar -f
# Or
tail -f /opt/traccar/logs/traccar.log
```

### View Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Backup Strategy

### 1. Database Backup Script
Create `/opt/scripts/backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="hospital_management"
DB_USER="hospital_user"

mkdir -p $BACKUP_DIR
pg_dump -U $DB_USER -d $DB_NAME -F c -f $BACKUP_DIR/db_backup_$DATE.dump

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.dump" -mtime +7 -delete
```

Make executable:
```bash
chmod +x /opt/scripts/backup-db.sh
```

### 2. Setup Cron Job
```bash
sudo crontab -e
```

Add:
```
0 2 * * * /opt/scripts/backup-db.sh
```

## Performance Optimization

### 1. PostgreSQL Tuning
Edit `/var/lib/pgsql/15/data/postgresql.conf`:
```
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 20MB
min_wal_size = 1GB
max_wal_size = 4GB
max_connections = 200
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql-15
```

### 2. Node.js Process Manager (PM2) - Alternative
If you prefer PM2 over systemd:
```bash
sudo npm install -g pm2
pm2 start dist/server/index.js --name hospital-management
pm2 save
pm2 startup
```

## Troubleshooting

### Database Connection Issues
1. Check PostgreSQL is running: `sudo systemctl status postgresql-15`
2. Verify connection: `psql -U hospital_user -d hospital_management`
3. Check firewall: `sudo firewall-cmd --list-all`
4. Review logs: `sudo journalctl -u postgresql-15`

### Application Not Starting
1. Check logs: `sudo journalctl -u hospital-management -n 50`
2. Verify environment variables: `sudo cat /opt/hospital-management/.env`
3. Check Node.js version: `node --version`
4. Verify build: `ls -la /opt/hospital-management/dist`

### Traccar Connection Issues
1. Check Traccar service: `sudo systemctl status traccar`
2. Verify port: `sudo netstat -tlnp | grep 8082`
3. Check Traccar logs: `sudo journalctl -u traccar`
4. Test connection: `curl http://localhost:8082/api/server`

## Security Checklist

- [ ] Change all default passwords
- [ ] Configure firewall (firewalld)
- [ ] Enable SSL/TLS certificates
- [ ] Set up regular backups
- [ ] Configure fail2ban for SSH protection
- [ ] Keep system updated: `sudo dnf update`
- [ ] Review and restrict file permissions
- [ ] Enable PostgreSQL SSL connections
- [ ] Configure rate limiting in Nginx
- [ ] Set up monitoring and alerts

## Maintenance

### Regular Updates
```bash
# System updates
sudo dnf update -y

# Node.js dependencies
cd /opt/hospital-management
sudo -u hospitalapp npm update

# Restart services
sudo systemctl restart hospital-management
```

### Health Checks
Create a simple health check script:
```bash
#!/bin/bash
curl -f http://localhost:5000/api/health || exit 1
```

## Support

For issues or questions:
1. Check application logs
2. Review system logs
3. Verify all services are running
4. Check network connectivity
5. Review firewall rules

---

**Last Updated**: November 2024
**Version**: 1.0

