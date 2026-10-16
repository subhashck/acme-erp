# Assessments production VPS deployment plan

Prepared 16 October 2026 from this checkout. This is a rollout plan, not evidence of a production deployment. VPS configuration, running release, database contents, proxy and backup arrangements still need inventory.

## Scope and release decision

Deploy Assessments as part of the existing ERP application, using the existing PostgreSQL database, staff records and Better-Auth login. There is no separate assessment service or database to provision. Frontend routes are `/assessments/*`; backend routes remain `/api/skill-assessment/*`. Preserve legacy HR redirects.

Assumption: the production VPS runs Linux and Docker Compose behind an HTTPS reverse proxy. If it uses a Node service instead, retain the migration, backup, testing and rollback gates below and substitute its service manager for Compose. Confirm the actual service names before using example commands.

Release owner: developer/operator. Functional acceptance: HR and nursing supervisor. Schedule the maintenance window only after staging establishes migration and restore duration; do not promise zero downtime.

## Release blockers found in the checkout

| Finding | Required action before production |
| --- | --- |
| Assessment files are untracked and shared files have unrelated changes. | Prepare a reviewed, committed release containing the full dependency closure. Compare it with the deployed SHA; avoid copying the working folder or blindly deploying all pending changes. Include route registration, generated routes, permissions, hospital settings, schema/client wiring, package changes and shared UI dependencies. |
| `docker-entrypoint.sh` executes `db:setup` and `db:push` on every start. `db:setup` includes unrelated modules and a payroll migration. | Prepare a production startup path that only starts the app. Apply reviewed migrations once in a separate job. Review unrelated release changes explicitly. |
| Assessment setup combines schema changes, sequence synchronization, default cycle/config creation and upserts of rubric/question content. | Separate schema migration from controlled bootstrap/content updates. Re-running the current setup can overwrite local edits; it must not run on ordinary restarts. |
| The setup script's direct-execution check constructs a Windows-style `file:///` URL. | Replace it with a portable `path.resolve`/`fileURLToPath` check and test direct execution inside the Linux image. Do not assume a successful process exit proves tables were created. |
| `drizzle.config.ts` excludes `skill_assessment` from both schema files and schema filters. | Keep assessment DDL under an explicit versioned migration, or deliberately add and validate Drizzle coverage. `db:push` alone does not install this module. Do not run an unreviewed full-schema push against production. |
| Runtime Docker image copies `server` and `dist`, but not `scripts`; the reviewed question seeder also imports sibling data/quality files. | Package the complete seeder dependency set in a dedicated migration image or copy the required scripts into the runtime image. Verify the command inside the final image. |
| Docker build calls `pnpm build`, which is Vite only. | Run type checking and assessment tests as release gates before image promotion. |
| Staff module access defaults to enabled in hospital settings. | Explicitly persist `enableStaffCompetencyModule=false` before new code accepts production traffic. Verify the actual settings row; missing rows/default fallback are not an access-off guarantee. |
| Checked-in Compose contains development credentials, localhost auth configuration and published database/storage ports. | Use the existing protected VPS configuration and secrets. Verify effective settings privately; never replace production configuration with the sample Compose file. |

These are preparation tasks; this document does not implement them.

## 1. Inventory and prepare the release

Record production SHA/image digest, Compose project/file paths, service names, PostgreSQL version, database name, environment source, proxy configuration, persistent volumes, available disk/memory and existing backup schedule. Preserve the running application image locally or in the registry under an immutable rollback tag.

Confirm production HTTPS origin in `BETTER_AUTH_URL` and `TRUSTED_ORIGINS`, stable `BETTER_AUTH_SECRET`, database connectivity and existing storage settings. Keep database and storage administration endpoints private. No new assessment-specific secret or public port is apparent in the inspected implementation.

Inventory whether `skill_assessment` already exists. If it does, capture table/sequence definitions, row counts by assessment/attempt status, current question bank and edited rubric/configuration content. Check duplicate cycle titles and `(staff_id, cycle_id)` pairs before adding the setup's unique indexes. Check existing staff-user mappings, active departments, department incharges, nursing supervisors and exact HR/Admin roles.

Build an immutable candidate image from the reviewed commit. Retain lockfile-based installation and record its digest. Pin the build toolchain used by the release. Complete the startup/migration/image packaging changes above first.

## 2. Rehearse on staging

Restore a recent production backup into an isolated staging database with restricted access. Disable production integrations, scheduled syncs and outbound notifications. Use a separate HTTPS hostname/auth configuration and storage destination; staging must never connect to production data services.

Run these release checks from the candidate source tree:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm exec vitest run tests/unit/skill-assessment-engine.test.ts tests/unit/skill-assessment-security.test.ts tests/unit/skill-assessment-workspace.test.ts tests/unit/assessment-settings.test.tsx tests/unit/assessments-home.test.tsx tests/unit/online-cbt.test.tsx tests/unit/cbt-monthly-limit.test.ts tests/unit/cbt-domain-grading.test.ts tests/unit/cbt-certificate.test.tsx tests/unit/exam-question-mix.test.ts tests/unit/question-bank-quality.test.ts
pnpm exec tsx scripts/seed_500_questions.ts --check
pnpm build
```

Rehearse the exact migration and content commands inside the Linux migration image. Run schema migrations twice on staging to establish repeatability, inspect resulting columns/indexes/sequences and confirm a normal app restart makes no schema or content changes. Rehearse application rollback and a full database restore. Record durations and logs without secrets.

Test representative concurrent candidates saving answers and submitting near deadlines. Choose the concurrency target from the expected exam batch, and verify VPS resources and database connections remain adequate.

## 3. Database migration and content strategy

Create a versioned, reviewed migration from `server/db/setup-skill-assessment-db.ts` and the Drizzle assessment schema. Include all eight assessment tables, indexes, document sequences, assessment date fields, question snapshots, per-attempt pass threshold, question-mix columns and the hospital staff-access flag. Validate DDL against the actual production schema. Use bounded lock/statement timeouts and transactional execution where supported; stop on any error.

For an existing module, freeze legacy attempt snapshots **before** updating questions. The current backfill can only capture presently available question content, not recover original exam-time wording. Validate snapshot length against question IDs and resolve missing questions; do not silently accept partial snapshots. Confirm the legacy pass-threshold policy before assigning historical attempts the migration's default 60%. Preserve finalized results without regrading. Synchronize document sequences only while writes are stopped, without lowering an existing sequence value.

For a first install, explicitly bootstrap required domains, rubric, an approved assessment cycle and exam configuration after schema creation. Do not enable a hard-coded/default period without HR verifying its dates.

Treat reviewed question-bank loading as a separate, recorded content change. The command below upserts seeded question codes, reactivates matching questions and deactivates an explicit list of retired codes; it is not insert-only. Export and compare existing content first. It inserts new department scenarios without replacing existing scenario codes.

```sh
# Only after packaging scripts and reviewing the staging content diff:
pnpm assessments:seed-questions
```

`pnpm assessments:migrate-question-mix` is schema-only and adds four configuration columns, but requires an existing `exam_configs` table. It is not a complete installation command. Do not run the general `db:seed`, `assessments:delete`, deletion SQL, or `docker compose down -v` during this rollout.

## 4. Production maintenance window

1. Announce the window, stop new exam starts and let active attempts finish. Disabling staff access during an active CBT may prevent saves; drain attempts first. Quiesce all ERP writes for the final backup/migration, including background workers and integrations. Use a proxy maintenance page and stop the old web process. Keep PostgreSQL/storage running.
2. Take a full database backup plus a protected copy of production configuration and the current release manifest. Include storage backup according to the existing ERP backup policy. Verify the dump is nonempty/readable and has already passed a staging restore drill. Store a copy off the VPS.
3. Apply the exact rehearsed schema migration using the candidate migration image and production network/environment. Keep the application stopped. Explicitly set staff access off. Verify tables, columns, indexes, sequence state, historical row counts and snapshot integrity.
4. Apply the reviewed bootstrap/content update if required. Capture inserted/updated/retired counts and compare with staging expectations. Do not import development assessment attempts or staff data.
5. Start only the candidate web service with the startup-only entrypoint. Leave the maintenance page in place while the operator checks logs, database connectivity, login and module routing through a restricted operator path.
6. Restore normal ERP traffic with staff assessment access still off. HR/Admin verify configuration and run the role checks below. Enable staff access only after functional acceptance. The current toggle is broad, so use staging for a small staff pilot rather than assuming per-staff rollout controls exist.

Illustrative Linux backup command, after confirming service/database names and quiescing writes:

```sh
mkdir -p backups
chmod 700 backups
BACKUP_FILE="backups/pre-assessments-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T db pg_dump -U postgres -d acme_erp -Fc > "$BACKUP_FILE"
test -s "$BACKUP_FILE"
docker compose exec -T db pg_restore --list < "$BACKUP_FILE" > "$BACKUP_FILE.list"
```

Use a shell configured to stop on command errors. A readable archive listing is only a basic check; the staging restore drill is the recovery proof. Do not paste database passwords into command history. Exact production migration and image-promotion commands must be filled in after VPS inventory and the preparation changes; the current entrypoint is not safe for this sequence.

## 5. Acceptance checks

| Area | Required result |
| --- | --- |
| Authentication/routes | HTTPS login works; direct load/refresh of `/assessments`, `/assessments/settings`, `/assessments/question-bank`, `/assessments/online-cbt` and certificate routes works; old HR links redirect. |
| Access off | Ordinary staff cannot use the module through UI or direct API requests; HR/Admin can configure it. |
| Staff isolation | After enabling access, candidate sees only personal history; another staff ID/attempt ID cannot expose or change someone else's exam. Missing staff mappings produce an explanatory state. |
| Settings | HR/Admin can configure access, periods, rubric and exam mix; incharges, supervisors, management approvers and ordinary staff cannot write settings through direct API calls. |
| CBT | Opening instructions consumes no attempt. Start/resume, answer persistence, refresh, navigation warning, monthly limit, submission and server-enforced timeout work. Active responses contain no answer keys/explanations. |
| Saved results | Changing bank/configuration does not alter saved attempt snapshots, pass threshold, completed score or certificate. |
| Assessment workflow | Draft/revision, self submission, incharge, nursing supervisor and HR completion follow authorization/status rules. Pending CBT blocks final self submission; legitimate zero scores remain zero. CBT-derived theory follows assessment date boundaries in India time. |
| Content/configuration | Approved active cycle/dates, question availability per department/difficulty, mix percentages, duration and benchmark permit exams for every intended department. |
| Certificates | Candidate and HR/Admin can print finalized result certificates; unfinished and unauthorized attempts are rejected. Hospital identity, score, outcome and QR details match the saved result. |
| ERP regression | Login, staff directory, HR/payroll, daily closing and existing key workflows continue to work. No unrelated schema drift or unexpected seeds. |

Perform exam-consuming smoke tests on staging or with an explicitly designated production test staff account; do not consume a real employee's monthly attempt. Do not delete real records to repeat testing.

## 6. Monitoring and rollback

Monitor during rollout, the first exam batch and the next business day: container restarts, API failures/latency, database locks/connections, resource usage, failed answer saves, stuck attempts, duplicate document numbers and reported access problems. Record release SHA/image, migration/content versions, backup path, counts, test evidence and HR acceptance.

Stop rollout if migration fails, existing data changes unexpectedly, access isolation fails, saved answers/results are inconsistent, or ordinary ERP operation degrades. Block new assessments; preserve logs and current database evidence.

Prefer application rollback to the recorded previous image while leaving compatible additive schema in place and staff access disabled. Verify this compatibility in staging; the rollback image's own startup may also run migrations/seeds, so use a verified startup-only rollback path. A UI access toggle alone is not a replacement for rolling back a broken API or blocking requests at the proxy.

If schema/data recovery is necessary, keep all ERP writers stopped, take a post-failure backup and restore the pre-release backup using the rehearsed recovery procedure. A full restore rewinds **all ERP modules** and loses writes since that backup; reconcile any intervening activity with the operator and business owners before restoring. Recheck sequences, settings, login and ERP workflows before reopening. Do not drop the assessment schema as a routine rollback.

## Completion criteria

The release is complete when the blockers are resolved, staging migration/restore and role tests pass, production backup is verified, production smoke checks pass, HR accepts configuration, staff access is deliberately enabled, and the first monitored exam batch completes without unresolved data or access defects.
