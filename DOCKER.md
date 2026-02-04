# Running TyoTrack with Docker

## Quick Start

### Option 1: Using the batch script (Windows)
```bash
docker-run.bat
```

### Option 2: Using Docker Compose directly
```bash
docker compose up --build -d
```

## Access the Application

- **URL**: http://localhost:3000
- **Database**: PostgreSQL on port 5432
- **Redis**: Redis on port 6379

## Default Login Credentials

After seeding, you can login with:

- **Super Admin**: admin@tyotrack.com / Admin123!
- **Admin**: manager@tyotrack.com / Admin123!
- **Employee**: employee@tyotrack.com / Employee123!

⚠️ **Important**: Change these passwords in production!

## Useful Commands

### View Logs
```bash
# Application logs
docker compose logs -f app

# Database logs
docker compose logs -f postgres

# All logs
docker compose logs -f
```

### Stop Containers
```bash
docker compose down
```

### Restart Application
```bash
docker compose restart app
```

### Rebuild and Restart
```bash
docker compose up --build -d
```

### Check Container Status
```bash
docker compose ps
```

### Access Database
```bash
docker compose exec postgres psql -U tyotrack -d tyotrack
```

### Access Application Container Shell
```bash
docker compose exec app sh
```

## Troubleshooting

### Application won't start
1. Check logs: `docker compose logs app`
2. Verify database is healthy: `docker compose ps`
3. Rebuild containers: `docker compose up --build -d`

### Database connection issues
1. Check if database is running: `docker compose ps`
2. Check database logs: `docker compose logs postgres`
3. Wait for database to be ready (healthcheck takes ~10-30 seconds)

### Port already in use
If port 3000, 5432, or 6379 is already in use:
1. Stop the conflicting service
2. Or modify ports in `docker-compose.yml`

### Reset Everything
```bash
# Stop and remove containers, volumes, and networks
docker compose down -v

# Rebuild and start fresh
docker compose up --build -d
```

## Environment Variables

The following environment variables are configured in `docker-compose.yml`:

- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: NextAuth.js secret
- `NEXTAUTH_URL`: Application URL (http://localhost:3000 for local)
- `AUTH_TRUST_HOST`: Trust host header
- `NODE_ENV`: production
- `TZ`: Asia/Colombo

To modify these, edit `docker-compose.yml` and rebuild.
