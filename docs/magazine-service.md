# Standalone Magazine service

Implemented 16 October 2026. Magazine now lives in `services/magazine/`, with its own manifest, lockfile, build, API, editor, public renderer, media pipeline, database setup and Docker image. The ERP package no longer installs Tiptap.

Magazine is temporarily disabled by default. ERP hides its sidebar links and published feed unless `MAGAZINE_ENABLED=true`. The Magazine services use the `magazine` Compose profile, so normal ERP startup leaves them stopped. Existing database and storage data are retained. To re-enable, configure the Magazine credentials, set `MAGAZINE_ENABLED=true` in the ERP environment, then run `docker compose --profile magazine up -d --build`. Restart local ERP development after changing the flag.

## Ownership

| Resource | Owner |
|---|---|
| Issue editing, sections, media library, publishing, reader/gallery and PDF export | Magazine |
| Magazine database and role | `acme_magazine`, independent of `acme_erp` |
| Magazine media | Dedicated `acme-magazine` MinIO bucket and restricted user |
| Branding and MAG numbering | Magazine-local tables; no ERP joins or numbering calls |
| Users, passwords, sessions, bans and current roles | ERP |
| Editor membership | Magazine; Admin manages assignments |
| ERP login/dashboard promotion switch | ERP Admin Console → Hospital Profile |
| Hospital identity/contact details, payslip/PO/POS settings and assessment enablement | ERP |

The service retains the existing editor and public renderer. Its branding is configured independently; the Magazine settings form cannot edit ERP Hospital Settings. The ERP-only editorial division and copyright columns have been retired. Shared hospital fields remain.

## Authentication contract

Deploy under the **same public origin** as ERP. Route `/magazine`, `/magazine/*` and `/magazine-api/*` to Magazine; retain ERP `/`, `/login` and `/api/*` routing.

For each protected request, Magazine forwards the incoming ERP cookie **server-side** to `/api/integrations/magazine/session`, using `ERP_INTERNAL_URL` and `MAGAZINE_BRIDGE_SECRET`. ERP validates the session and the service key and reads the current user role/ban status. Magazine then checks Admin or active local editor membership. HR and `magazine_editor` roles alone do not bypass membership. Editor administration and identity search require Admin.

The Admin-only `/api/integrations/magazine/users?search=...` returns only IDs, names, emails and roles, capped at 500 results. The Magazine Add Editor dialog supports remote search. No passwords, payroll, patient or accounts data cross this boundary. The shared secret stays server-side and must contain at least 32 random characters. Protected responses are not cached; writes require the configured public Origin.

This is the initial ERP session adapter, not autonomous Magazine sign-in or a JWT/JWKS implementation. **ERP must be reachable for editorial operations.** Published catalogs, issues, galleries and images use only Magazine's own database/storage and remain readable while ERP is down. A separate public domain would require an additional sign-in/token design; do not expect ERP cookies to cross domains.

## Local development

ERP `.env`:

```dotenv
MAGAZINE_INTERNAL_URL=http://localhost:8790
MAGAZINE_PUBLIC_URL=http://localhost:5173
MAGAZINE_BRIDGE_SECRET=<random 32+ character value shared with Magazine>
MAGAZINE_DB_PASSWORD=<separate URL-safe random password>
MAGAZINE_MINIO_SECRET_KEY=<separate random storage secret>
```

Copy `services/magazine/.env.example` to that application's `.env` and configure its separate database/storage credentials. It reads only its own `.env`, never the parent ERP environment file. Both local environment files have already been configured in this workspace; secrets are ignored by Git.

Provision the separate database and bucket against the existing local PostgreSQL and MinIO containers:

```powershell
docker compose run --rm --no-deps magazine-db-init
docker compose run --rm --no-deps magazine-storage-init
```

Start ERP with `pnpm dev` at the repository root. In a second terminal:

```powershell
cd services/magazine
pnpm install --frozen-lockfile --ignore-scripts
pnpm db:setup
pnpm dev
```

Open **http://localhost:5173/magazine/admin**. ERP Vite forwards the Magazine editor to its own Vite server on 5175 and its API to 8790. ERP sign-in returns to the standalone editor with a full navigation. Restart ERP after changing its environment. For production-like local use, build Magazine and point the development `/magazine` proxy directly at API port 8790 instead of its Vite server.

Both the Magazine Vite server and its API must be running. Connection failures display an unavailable message with Retry; only a 401 displays Sign in to ERP. The sign-in link comes from the public `GET /magazine-api/auth-config` endpoint and always targets the configured ERP origin, including when the editor was opened directly on port 5175. Direct `/login` requests on the Magazine development server/API redirect to ERP rather than proxying its HTML with incompatible asset paths. If authenticated requests report a missing identity bridge, restart ERP so it loads `MAGAZINE_BRIDGE_SECRET` from its environment.

The public catalog is `/magazine`; readers use `/magazine/view/:slug` and `/magazine/view/:slug/gallery`. Images use `/magazine-api/public/magazine/images/magazine/...`. The editor has its own `/magazine/admin` namespace, preventing slug collisions with settings/editors. Old ERP API reader/image paths return 410; there is no mapping to discarded issues.

The public issue reader uses a persistent left sidebar for reading controls and contents on desktop. On screens below 1024px, Reader menu opens the same sidebar as a drawer with keyboard focus containment and Escape/backdrop dismissal. Article selection closes the mobile drawer. Page-flip dimensions use the remaining reading area; printing removes the sidebar and its reserved margin.

## Production deployment

Production infrastructure has not been changed by this workspace operation.

1. Set the five ERP environment values above for the production origin. Use fresh production secrets, never the generated local development values. `MAGAZINE_DB_PASSWORD` must be URL-safe, for example a random hexadecimal value. Set `ERP_POSTGRES_PASSWORD`, `MINIO_ADMIN_USER` and `MINIO_ADMIN_PASSWORD` to the actual existing infrastructure credentials for the provisioning containers.
2. Configure the reverse proxy using `services/magazine/deploy/nginx.conf.example`. Preserve request paths and cookies. Keep the API/upload body limit at 16 MiB or larger; each image is limited to 15 MiB and 40 million pixels.
3. Stop old ERP editorial writes. Build the ERP and Magazine images. Provision the independent database/bucket using the two init services. No content copy is required.
4. Preview and explicitly purge the production ERP Magazine data using the new ERP image (see below). Deploy the new ERP and Magazine service, reload the reverse proxy, and check both health and public/editorial routes.
5. Sign in as ERP Admin, open Magazine's editorial workspace, configure its branding, assign editors and create the first fresh issue. Enable ERP login/dashboard promotion in Hospital Profile when ready.

Enable Magazine explicitly using the main Compose file:

```powershell
docker compose --profile magazine up -d --build
```

This builds/restarts ERP too. The Magazine container runs its idempotent database setup before starting. Its database role owns only its dedicated database; its MinIO user policy permits only its dedicated bucket and `magazine/*` objects. Only the init containers receive infrastructure administrator credentials. The service port is bound to VPS loopback (`127.0.0.1:8790`). The Compose configuration does not reset existing volumes or migrate issues.

`GET /health` checks the process. `GET /ready` checks Magazine database initialization and bucket availability without contacting ERP. Compose uses `/ready`. VPS-level resilience and shared PostgreSQL/MinIO availability remain separate operational concerns.

## Discarding the old ERP content

The explicit root command previews the resources before deletion:

```powershell
pnpm magazine:purge
pnpm magazine:purge --apply
```

In a built ERP container, the same script is included:

```powershell
docker compose run --rm --no-deps --entrypoint pnpm web magazine:purge
docker compose run --rm --no-deps --entrypoint pnpm web magazine:purge --apply
```

Run these using the new image and the intended environment before allowing old editorial writers to resume. The operation deliberately deletes existing Magazine content. It never runs automatically on startup. It checks for unexpected tables and external foreign-key references, deletes only the `magazine/` prefix in the ERP bucket, drops the five old Magazine tables/type/schema without CASCADE, removes only `MAG` document counters, clears a hospital logo referencing a retired Magazine image and drops the two editorial-only hospital columns. Other objects, sequence codes and shared Hospital Settings stay intact. A count/object-key manifest is written under `scratch/` for operational verification; it is not a content backup.

Local execution completed: two issues, 13 sections, 38 media records, 17 assignments and one editor were purged from `acme_erp`. No Magazine objects remained under that local ERP bucket prefix. The separate Magazine database starts empty. Existing issue IDs, URLs and counters are intentionally not migrated.

## Media policy and verification

- Saved media URLs and thumbnails belong to the Magazine service. Media are publicly addressable by URL, including uploads not yet published; drafts are excluded from public issue/reader endpoints. Do not upload confidential clinical or staff documents.
- Images, including SVG input, are decoded and converted to WebP; arbitrary original image bytes are not served as an optimization fallback. Sharp uses bounded pixel input and concurrency.
- Deletion returns 409 while media remain assigned or referenced by saved issues, section HTML/JSON or Magazine branding. Unassign and remove references before deletion. Storage deletion failures leave metadata available for retry.
- JSON readers, SSR and galleries use both direct and many-to-many media assignments.
- ERP promotion applies the ERP switch, requests the service feed with a three-second timeout, and hides gracefully if the service is unavailable. The sidebar link opens the service catalog; editorial authorization remains in the service.

Run `pnpm typecheck`, `pnpm test` and `pnpm build` within Magazine. `pnpm test:smoke` is an explicit live check against an empty local Magazine database: it uses a loopback ERP identity fixture, creates temporary content, exercises numbering/upload/dedup/sections/publishing/reader/gallery/revocation/offline reading, and cleans its rows, objects and test counters afterward. It never changes ERP users or sessions. Root ERP tests cover the service feed and identity credential boundary.

Back up the new Magazine database and bucket together going forward. Because old issues are deliberately discarded, reverting to the former ERP publishing implementation would require restoring its old content separately; a proxy reversal does not recreate it.

## Validation on 16 October 2026

- ERP and Magazine frontend builds and TypeScript checks passed.
- Magazine unit suite: 33 passed. The sign-in/identity ERP regression suite has 11 passing tests. The last full ERP unit run had 366 passed; the same two pre-existing failures remain in `tests/unit/closing-export.test.ts` (missing revenue-sheet function and an obsolete two-sheet expectation). The export source and those tests were not changed.
- The live publishing smoke passed against the new database/bucket and removed its test content afterward.
- The independent Docker image built and its non-root runtime passed real HTTP startup, Linux schema initialization, readiness, catalog and editor checks. Native Sharp and editor asset serving were also exercised. The temporary verification container was removed.
- Direct checks confirmed zero ERP Magazine tables/MAG counters, retained Hospital Settings/assessment flag, an empty service database, no service cross-schema foreign keys, and denied Magazine access to ERP staff data and the ERP bucket.
- Production deployment and production content purging were not performed.
