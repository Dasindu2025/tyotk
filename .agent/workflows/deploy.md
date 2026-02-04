---
description: How to deploy TyoTrack to VPS
---

# TyoTrack Deployment

## Deploy New Changes

Connect to VPS and run:

```bash
cd /path/to/tyotrack
git pull
docker compose up -d --build
```

// turbo-all

## After Deploy - Run Database Migrations

If there are schema changes:

```bash
docker exec -it tyotrack-app npx prisma migrate deploy
```

## Seed Database (First-time setup or reset)

```bash
docker exec -it tyotrack-app npx prisma db seed
```

## Check Logs

```bash
docker logs tyotrack-app
```

## Restart Containers

```bash
docker compose down
docker compose up -d
```
