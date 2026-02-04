# TyoTrack Production Deployment Guide for AlmaLinux 10

## Server Requirements
- AlmaLinux 10
- Minimum 2GB RAM (4GB recommended)
- 20GB+ disk space
- Root or sudo access

## Git Repository
**GitHub URL:** https://github.com/Dasindu2025/tyotk.git

---

## Step-by-Step Deployment Instructions

### 1. Initial Server Setup

```bash
# Update system
sudo dnf update -y

# Install essential tools
sudo dnf install -y git curl wget nano vim htop

# Set timezone (optional)
sudo timedatectl set-timezone Asia/Colombo
```

### 2. Install Node.js 20.x

```bash
# Install Node.js 20.x from NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x
```

### 3. Install PostgreSQL 16

```bash
# Install PostgreSQL 16
sudo dnf install -y postgresql16-server postgresql16-contrib

# Initialize database
sudo postgresql-setup --initdb

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Configure PostgreSQL
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'your_secure_postgres_password';"

# Create TyoTrack database and user
sudo -u postgres psql << EOF
CREATE DATABASE tyotrack;
CREATE USER tyotrack WITH ENCRYPTED PASSWORD 'your_secure_tyotrack_password';
GRANT ALL PRIVILEGES ON DATABASE tyotrack TO tyotrack;
\c tyotrack
GRANT ALL ON SCHEMA public TO tyotrack;
EOF

# Configure PostgreSQL to allow password authentication
sudo nano /var/lib/pgsql/data/pg_hba.conf
# Change the following lines from 'peer' or 'ident' to 'md5':
# local   all   all   md5
# host    all   all   127.0.0.1/32   md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 4. Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command that PM2 outputs
```

### 5. Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /var/www
cd /var/www

# Clone repository
sudo git clone https://github.com/Dasindu2025/tyotk.git tyotrack
cd tyotrack

# Set correct permissions
sudo chown -R $USER:$USER /var/www/tyotrack

# Install dependencies
npm install

# Create logs directory
mkdir -p logs
```

### 6. Configure Environment Variables

```bash
# Create .env file
nano .env
```

Add the following content (replace with your values):

```env
# Database Configuration
DATABASE_URL="postgresql://tyotrack:your_secure_tyotrack_password@localhost:5432/tyotrack?schema=public"

# NextAuth Configuration (generate a random secret)
AUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="https://your-domain.com"
AUTH_TRUST_HOST="true"

# Environment
NODE_ENV="production"

# Timezone
TZ="Asia/Colombo"
```

Generate AUTH_SECRET:
```bash
openssl rand -base64 32
# Copy the output and paste it as AUTH_SECRET value
```

### 7. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Push database schema
npx prisma db push

# Seed initial data (creates demo users)
npx tsx prisma/seed.ts
```

### 8. Build Application

```bash
# Build for production
npm run build

# Copy static assets for standalone deployment
chmod +x post-build.sh
./post-build.sh
```

### 9. Install and Configure Nginx

```bash
# Install Nginx
sudo dnf install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Copy nginx configuration
sudo nano /etc/nginx/conf.d/tyotrack.conf
```

Paste the Nginx configuration (see nginx.conf.example file) and update:
- Replace `your-domain.com` with your actual domain

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 10. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

### 11. Install SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 12. Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# View logs
pm2 logs tyotrack

# Monitor
pm2 monit
```

### 13. Verify Deployment

```bash
# Check if application is running
pm2 status

# Test locally
curl http://localhost:3000

# Test from outside
curl https://your-domain.com
```

---

## Useful Commands

### Application Management

```bash
# Restart application
pm2 restart tyotrack

# Stop application
pm2 stop tyotrack

# View logs
pm2 logs tyotrack

# Monitor resources
pm2 monit
```

### Database Management

```bash
# Access PostgreSQL
sudo -u postgres psql -d tyotrack

# Backup database
sudo -u postgres pg_dump tyotrack > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
sudo -u postgres psql tyotrack < backup_file.sql
```

### Update Application

```bash
cd /var/www/tyotrack

# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart tyotrack
```

### View Logs

```bash
# Application logs
pm2 logs tyotrack

# Nginx logs
sudo tail -f /var/log/nginx/tyotrack.access.log
sudo tail -f /var/log/nginx/tyotrack.error.log

# PostgreSQL logs
sudo tail -f /var/lib/pgsql/data/log/postgresql-*.log
```

---

## Security Best Practices

1. **Change default passwords** immediately
2. **Setup firewall** properly (only open necessary ports)
3. **Enable automatic security updates**:
   ```bash
   sudo dnf install -y dnf-automatic
   sudo systemctl enable --now dnf-automatic.timer
   ```
4. **Setup fail2ban** for SSH protection:
   ```bash
   sudo dnf install -y fail2ban
   sudo systemctl enable --now fail2ban
   ```
5. **Regular backups** of database and application
6. **Monitor logs** regularly
7. **Keep system updated**:
   ```bash
   sudo dnf update -y
   ```

---

## Troubleshooting

### Application won't start
```bash
# Check logs
pm2 logs tyotrack

# Check if port 3000 is in use
sudo netstat -tlnp | grep 3000

# Restart PM2
pm2 restart tyotrack
```

### Database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -U tyotrack -h localhost -d tyotrack

# Check pg_hba.conf
sudo nano /var/lib/pgsql/data/pg_hba.conf
```

### Nginx issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Default Login Credentials (After Seeding)

- **Super Admin**: admin@tyotrack.com / Admin123!
- **Admin**: manager@tyotrack.com / Admin123!
- **Employee**: employee@tyotrack.com / Employee123!

**⚠️ IMPORTANT: Change these passwords immediately in production!**

---

## Performance Optimization

1. **Enable Gzip** in Nginx (already in config)
2. **Setup caching** for static assets
3. **Use PM2 cluster mode** (already configured)
4. **Setup Redis** for session storage (optional)
5. **Monitor with PM2 Plus** or similar tools

---

## Support

For issues, check:
- Application logs: `pm2 logs tyotrack`
- Nginx logs: `/var/log/nginx/`
- PostgreSQL logs: `/var/lib/pgsql/data/log/`
- GitHub Issues: https://github.com/Dasindu2025/tyotk/issues
