# Acme Hospital ERP

Modern hospital management system built with Hono RPC, Drizzle ORM, Postgres, Better Auth with admin plugin, React Vite, shadcn-style UI, React Hook Form, TanStack Router, TanStack Query, and TanStack Store.

## Modules

- HR: staff records, shifts, salaries, departments
- Accounts: Daily Closing

## Run

```bash
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

Open `http://localhost:5173`.

Demo admin:

- Email: `admin@acmehospital.local`
- Password: `Admin@12345`

The API runs on `http://localhost:8787` and exposes Better Auth at `/api/auth/*` plus typed Hono RPC routes under `/api`.

Leave Policy
CL = > 8/yr
SL = > 4/year
Festival = > 4/year
Earned: 13/yr
Maternity: 6months on half pay
Paternity: 10days
Leave without pay: Only with management permission (mostly for medical reasons)

docker compose down

docker compose up --build

git pull origin docker-version

