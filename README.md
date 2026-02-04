# TyoTrack - Enterprise Workforce Management Platform

A production-grade, enterprise-grade workforce and time management system built with Next.js 16, React 19, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Development Setup

```bash
# 1. Start the database
docker compose up -d

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to database
npx prisma db push

# 5. Seed demo data
npx tsx prisma/seed.ts

# 6. Start development server
npm run dev
```

### Demo Credentials

| Role        | Email                 | Password     |
| ----------- | --------------------- | ------------ |
| Super Admin | admin@tyotrack.com    | Admin123!    |
| Admin       | manager@tyotrack.com  | Admin123!    |
| Employee    | employee@tyotrack.com | Employee123! |

## 📦 Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth v5
- **UI Components**: Radix UI, Framer Motion
- **Real-time**: Server-Sent Events

## 🔑 Key Features

### Time Tracking

- ✅ Cross-day time entry splitting (automatic)
- ✅ Project and workplace assignment
- ✅ Monthly calendar view with status indicators
- ✅ Export to CSV

### Employee Management

- ✅ Auto-generated employee codes (EMP001, EMP002...)
- ✅ Search and filter
- ✅ Role-based visibility

### Admin Features

- ✅ Time entry approval workflow
- ✅ Bulk approve/reject
- ✅ Team reports and analytics
- ✅ Project management (auto-codes: PRO001...)
- ✅ Workplace management (auto-codes: LOC001...)

### Security

- ✅ Role-based access control (RBAC)
- ✅ Workspace isolation
- ✅ Audit logging
- ✅ Secure session management

## 📁 Project Structure

```
src/
├── app/
│   ├── (protected)/
│   │   ├── admin/          # Admin dashboard pages
│   │   └── employee/       # Employee dashboard pages
│   ├── api/                # API routes
│   └── login/              # Auth pages
├── components/
│   └── ui/                 # Reusable UI components
├── hooks/                  # React hooks
└── lib/
    ├── services/           # Business logic
    └── auth.ts             # NextAuth config
```

## 🛠 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run db:push    # Push schema to database
npm run db:studio  # Open Prisma Studio
```

## 📝 License

Enterprise License - All Rights Reserved
