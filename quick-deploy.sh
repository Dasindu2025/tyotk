#!/bin/bash
# Quick Deployment Script for Fresh AlmaLinux 10 VPS

echo "🚀 TyoTrack Quick Deployment Script"
echo "====================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "⚠️  Please don't run as root. Run as a regular user with sudo privileges."
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Confirm before proceeding
echo "This script will install:"
echo "  - Node.js 20.x"
echo "  - PostgreSQL 16"
echo "  - PM2"
echo "  - Nginx"
echo "  - TyoTrack application"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Update system
print_status "Updating system..."
sudo dnf update -y

# Install essential tools
print_status "Installing essential tools..."
sudo dnf install -y git curl wget nano vim htop

# Install Node.js 20.x
print_status "Installing Node.js 20.x..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
print_status "Node.js installed: $NODE_VERSION"

# Install PostgreSQL 16
print_status "Installing PostgreSQL 16..."
sudo dnf install -y postgresql16-server postgresql16-contrib

# Initialize PostgreSQL
sudo postgresql-setup --initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

print_status "PostgreSQL installed and started"

# Prompt for database password
echo ""
print_warning "Database Setup Required"
read -sp "Enter password for PostgreSQL 'tyotrack' user: " DB_PASSWORD
echo ""

# Create database and user
print_status "Creating database and user..."
sudo -u postgres psql << EOF
CREATE DATABASE tyotrack;
CREATE USER tyotrack WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE tyotrack TO tyotrack;
\c tyotrack
GRANT ALL ON SCHEMA public TO tyotrack;
EOF

# Configure PostgreSQL authentication
print_status "Configuring PostgreSQL authentication..."
sudo sed -i 's/local   all   all   peer/local   all   all   md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/host    all   all   127.0.0.1\/32   ident/host    all   all   127.0.0.1\/32   md5/g' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl restart postgresql

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Clone repository
print_status "Cloning TyoTrack repository..."
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/Dasindu2025/tyotk.git tyotrack
cd tyotrack
sudo chown -R $USER:$USER /var/www/tyotrack

# Install dependencies
print_status "Installing application dependencies..."
npm install

# Create logs directory
mkdir -p logs

# Generate AUTH_SECRET
print_status "Generating authentication secret..."
AUTH_SECRET=$(openssl rand -base64 32)

# Prompt for domain
echo ""
print_warning "Domain Configuration"
read -p "Enter your domain name (e.g., tyotrack.example.com): " DOMAIN_NAME

# Create .env file
print_status "Creating environment configuration..."
cat > .env << EOF
DATABASE_URL="postgresql://tyotrack:${DB_PASSWORD}@localhost:5432/tyotrack?schema=public"
AUTH_SECRET="${AUTH_SECRET}"
NEXTAUTH_URL="https://${DOMAIN_NAME}"
AUTH_TRUST_HOST="true"
NODE_ENV="production"
TZ="Asia/Colombo"
EOF

# Generate Prisma client and setup database
print_status "Setting up database schema..."
npx prisma generate
npx prisma db push --accept-data-loss

# Seed database
print_status "Seeding initial data..."
npx tsx prisma/seed.ts

# Build application
print_status "Building application..."
npm run build

# Install Nginx
print_status "Installing Nginx..."
sudo dnf install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall
print_status "Configuring firewall..."
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Setup PM2 startup
print_status "Configuring PM2 to start on boot..."
pm2 startup systemd | tail -1 | sudo bash

# Start application
print_status "Starting application..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "========================================="
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Configure Nginx for your domain:"
echo "   sudo nano /etc/nginx/conf.d/tyotrack.conf"
echo "   (See nginx.conf.example for template)"
echo ""
echo "2. Install SSL certificate:"
echo "   sudo dnf install -y certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN_NAME"
echo ""
echo "3. Access your application at:"
echo "   http://localhost:3000 (local)"
echo "   https://$DOMAIN_NAME (after SSL setup)"
echo ""
echo "Default login credentials:"
echo "  Super Admin: admin@tyotrack.com / Admin123!"
echo "  Admin: manager@tyotrack.com / Admin123!"
echo "  Employee: employee@tyotrack.com / Employee123!"
echo ""
echo "⚠️  IMPORTANT: Change these passwords immediately!"
echo ""
echo "Useful commands:"
echo "  pm2 status           - Check application status"
echo "  pm2 logs tyotrack    - View logs"
echo "  pm2 restart tyotrack - Restart application"
echo ""
