@echo off
echo 🐳 Starting TyoTrack with Docker Compose...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop and try again.
    exit /b 1
)

echo 📦 Building and starting containers...
docker compose up --build -d

echo.
echo ⏳ Waiting for services to be ready...
timeout /t 5 /nobreak >nul

echo.
echo ✅ TyoTrack is starting up!
echo.
echo 📊 Container status:
docker compose ps

echo.
echo 🔗 Application will be available at: http://localhost:3000
echo.
echo 📝 Default login credentials (after seeding):
echo    Super Admin: admin@tyotrack.com / Admin123!
echo    Admin: manager@tyotrack.com / Admin123!
echo    Employee: employee@tyotrack.com / Employee123!
echo.
echo 📋 Useful commands:
echo    View logs: docker compose logs -f app
echo    Stop: docker compose down
echo    Restart: docker compose restart app
echo    Database logs: docker compose logs -f postgres
echo.
echo ⏳ The application is initializing the database. This may take a minute...
echo    Check logs with: docker compose logs -f app
pause
