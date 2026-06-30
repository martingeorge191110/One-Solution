# ONE SOLUTIONS API

NestJS 11 + Prisma 6 + PostgreSQL backend for the finishing-operations management system.

## Prerequisites

- **Node 22** via nvm (the project requires Node 22; do NOT use system Node)
- PostgreSQL database

## Setup

### 1. Activate Node 22

```bash
export PATH="/root/.nvm/versions/node/v22.3.0/bin:$PATH"
# Or permanently: nvm use 22
node -v  # should print v22.x.x
```

### 2. Install dependencies

```bash
cd api
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env and set DATABASE_URL and other variables
```

Minimum required:
```
DATABASE_URL="postgresql://user:password@localhost:5432/one_solutions?schema=public"
JWT_SECRET=your-secret-key
```

### 4. Run database migrations

```bash
npm run prisma:migrate     # creates/updates schema in DB (development)
# OR for production:
npm run prisma:deploy      # applies existing migration files
```

### 5. Seed the database

```bash
npm run seed
```

Creates: one SUPER_ADMIN user, starter Terms with Items (Electrical, Painting, Plumbing, Flooring, HVAC), sample Terms & Conditions, and a global AlertThreshold.

### 6. Start the development server

```bash
npm run start:dev
```

API will be available at `http://localhost:5000/api`  
Health check: `GET http://localhost:5000/api/health`

## Available Scripts

| Script | Description |
|---|---|
| `npm run start` | Run compiled production build |
| `npm run start:dev` | Run with hot-reload (development) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run prisma:generate` | Regenerate Prisma client (no DB needed) |
| `npm run prisma:migrate` | Run migrations in development |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm run prisma:studio` | Open Prisma Studio UI |
| `npm run seed` | Run the database seeder |

## Docker

```bash
docker build -t one-solutions-api .
docker run -p 5000:5000 --env-file .env one-solutions-api
```

## Project Structure

```
src/
├── main.ts                    # Bootstrap (cors, cookie-parser, validation pipe)
├── app.module.ts              # Root module + health endpoint
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts      # PrismaClient wrapper
└── modules/
    ├── auth/                  # Authentication (stub)
    ├── users/                 # User management (stub)
    ├── clients/               # Client management (stub)
    ├── projects/              # Project management (stub)
    ├── system-data/           # Terms, Items, Conditions (stub)
    ├── quotations/            # Quotations (stub)
    ├── payments/              # Payments (stub)
    ├── daily-logs/            # Daily work logs (stub)
    ├── reports/               # Reports (stub)
    ├── audit/                 # Audit log (stub)
    └── dashboard/             # Dashboard summary (stub)
```
