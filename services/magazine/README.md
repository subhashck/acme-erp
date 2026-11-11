# ACME Magazine

Independent Magazine editor, API, public reader and media service. Start with an empty database; existing ERP issues are intentionally discarded.

See [the deployment and operating guide](../../docs/magazine-service.md) for environment configuration, ERP session integration, local development, production routing and the explicit ERP purge command.

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm db:setup
pnpm dev
```

Run ERP alongside this application. Open `http://localhost:5173/magazine/admin` through the ERP development proxy. Public requests do not require ERP; editorial requests validate the current ERP session.

```powershell
pnpm typecheck
pnpm test
pnpm build
# Explicit live integration check; requires an empty local Magazine database.
pnpm test:smoke
```
