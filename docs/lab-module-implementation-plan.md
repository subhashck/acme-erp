# Lab Module — Implementation Plan

**Target repo:** `acme-erp` (`docker-version` branch)
**Stack:** Hono RPC + Drizzle ORM + Postgres, React 19 + TanStack Router/Query, shadcn-style UI
**Decision locked in:** Lab builds on the existing local `patients` table (used today only by the immunization module) — **not** the external Docterz EMR. Docterz integration is out of scope for this module; it can be revisited later as a phase-2 sync if needed.

---

## 1. Workflow

Standard lab lifecycle, matching how a real hospital lab operates:

```
Order → Sample Collection → Processing → Result Entry → Verification → Report Release
```

Result entry and verification are deliberately separate steps (two-person check) — a technician enters values, a pathologist/senior tech verifies before the report is visible to the ordering doctor. This also gives a natural point to compute abnormal-value flags automatically.

---

## 2. Schema — `server/db/schema-lab.ts` (new file)

Split into its own file, matching how `schema-inventory.ts` and `schema-magazine.ts` are separated from the core `schema.ts`.

| Table | Purpose | Key fields |
|---|---|---|
| `labTestCategories` | Master: Biochemistry, Hematology, Microbiology, etc. | `name`, `sortOrder`, `active` |
| `labTests` | Master: individual test catalog | `code`, `name`, `categoryId` FK, `specimenType`, `unit`, `price`, `turnaroundHours`, `active` |
| `labTestReferenceRanges` | Normal ranges per test, segmented by age/gender | `testId` FK, `gender`, `ageMin`, `ageMax`, `lowValue`, `highValue`, `textRange` (for qualitative ranges like "Negative") |
| `labPanels` | Bundled test groups (e.g. "CBC", "LFT") | `name`, `code`, `price` |
| `labPanelTests` | Join table: panel → tests | `panelId` FK, `testId` FK |
| `labOrders` | One order per patient visit | `orderNo` (generated), `patientId` FK → `patients`, `orderedByStaffId` (stable staffId, no FK — matches existing convention elsewhere in schema), `orderedAt`, `status` (`Ordered`/`Collected`/`InProgress`/`Completed`/`Cancelled`), `priority` (`Routine`/`Urgent`/`STAT`), `notes` |
| `labOrderItems` | Individual tests/panels within an order | `orderId` FK cascade, `testId` FK (nullable if panel), `panelId` FK (nullable), `status`, `price` |
| `labSamples` | Specimen tracking | `orderId` FK, `accessionNo` (generated), `specimenType`, `collectedAt`, `collectedByStaffId`, `receivedAt`, `rejected` boolean, `rejectionReason` |
| `labResults` | Result values per order item | `orderItemId` FK, `value` (text — allows numeric or qualitative), `unit`, `flag` (`Normal`/`High`/`Low`/`Critical`), `enteredByStaffId`, `enteredAt`, `verifiedByStaffId`, `verifiedAt`, `status` (`Draft`/`Verified`/`Released`) |
| `labResultAudit` | Change history for result edits (regulatory traceability) | `resultId` FK, `changedByStaffId`, `oldValue`, `newValue`, `changedAt`, `reason` |

Add `relations(...)` definitions for each table following the existing pattern (e.g. `immunizationRecordRelations` in `schema.ts`).

**Patient linkage:** `labOrders.patientId` references the existing `patients` table (`mrn`, `name`, `age`, `gender`, `phone`, `bloodGroup`, `allergies`). No changes needed to `patients` itself. If `age`/`gender` on the patient record aren't reliable at order time, consider snapshotting `patientAge`/`patientGender` onto `labOrders` at creation time so historical reference-range flagging stays correct even if the patient record is edited later.

---

## 3. Backend — `server/routes/lab.ts`

Single `Hono<AuthEnv>()` router, mounted in `server/routes.ts` alongside the other module routers. Gated by a new `requireLabAccess` middleware in `server/routes/shared.ts`, following the exact shape of `requireInventoryAccess`/`requireFrontOfficeAccess`:

```ts
export const hasLabAccess = async (c: Context<AuthEnv>): Promise<boolean> => {
  const session: any = c.get("session") || (await auth.api.getSession({ headers: c.req.raw.headers }));
  if (!session?.user) return false;

  const userRole = (session.user.role || "").trim().toLowerCase();
  if (userRole === "admin" || userRole === "lab" || userRole === "pathologist") return true;

  const currentStaff = await getCurrentStaff(c);
  if (!currentStaff) return false;

  const dept = (currentStaff.departmentName || "").replace(/\s+/g, " ").trim().toUpperCase();
  return dept === "LABORATORY" || dept.startsWith("LABORATORY");
};

export const requireLabAccess = async (c: Context<AuthEnv>, next: any) => {
  const allowed = await hasLabAccess(c);
  if (!allowed) {
    return c.json({ error: "Forbidden: Access to Lab Module is restricted to Admin and Laboratory staff." }, 403);
  }
  await next();
};
```

Route groups:

- `/lab/tests`, `/lab/categories`, `/lab/panels` — master CRUD (mirrors `masters.ts`)
- `/lab/orders` — `POST` create, `GET` list/search (by patient, date range, status, priority), `GET /:id` detail
- `/lab/orders/:id/samples` — `POST` collect sample → generates accession number, sets order status to `Collected`
- `/lab/orders/:id/results` — `POST`/`PATCH` enter results per order item
- `/lab/results/:id/verify` — `POST`, role-gated to verifier roles (`admin`/`pathologist`), sets status `Verified`, writes a `labResultAudit` row
- `/lab/orders/:id/release` — `POST`, sets status `Released`, triggers notification to ordering doctor
- `/lab/orders/:id/report` — `GET`, returns data shaped for PDF generation

A separate patient-search endpoint already exists for immunization (`GET /immunization/patients`) — reuse it as-is from the lab frontend rather than duplicating server-side logic. If it needs to move, extract it into `shared.ts` as a helper both routers call.

---

## 4. Services — `server/services/lab-engine.ts`

Matches the `stock-engine.ts` / `fefo.ts` pattern of isolating domain logic out of route handlers.

- **Accession numbering:** reuse `generateDocNumber(tx, "LAB")` from `server/services/sequence.ts` — it already does atomic per-financial-year sequence generation (`documentSequences` table), so no new counter logic is needed.
- **Auto-flagging:** on result entry, look up the matching `labTestReferenceRanges` row by test + patient age/gender, compare the numeric value, and set `flag` automatically (`Normal`/`High`/`Low`). Reserve `Critical` for values outside a configurable critical-range threshold (can start as a fixed % beyond the normal range, refine later).

---

## 5. Frontend — `src/routes/_authenticated/lab/`

Follows the module folder convention used by `inventory/`, `masters/`, `front-office/`.

| File | Purpose |
|---|---|
| `lab/index.tsx` | Order worklist — filterable by status/date/priority |
| `lab/orders/new.tsx` | Order entry — patient search + test/panel picker |
| `lab/orders/$orderId.tsx` | Order detail — sample collection, result entry, verify/release actions (client-side role gating in addition to server-side enforcement) |
| `lab/masters/` | Test catalog, categories, panels, reference ranges (admin-only) |
| `lab/reports/$orderId.tsx` | Printable report, generated with `jspdf` + `jspdf-autotable` (already a project dependency, used for payslips — no new library needed) |

Route registration flows through `src/routeTree.gen.ts`, which is auto-generated by the TanStack Router Vite plugin on `pnpm dev`/`pnpm build` — no manual edits there.

Consider lifting the patient-search UI (used today only inside immunization) into a shared `usePatientSearch` hook so both modules use one implementation instead of diverging copies.

---

## 6. Notifications & dashboard integration

- On result `Released`, insert a row into the existing `notifications` table addressed to the ordering doctor's `userId` — same mechanism already used by `messages`/other modules.
- Add a lab summary tile to `server/routes/dashboard.ts` (pending orders, turnaround-time breaches). The dashboard route already aggregates cross-module counts, so this is additive.

---

## 7. Migration & seeding

- Add `schema-lab.ts` to whatever schema glob `drizzle.config.ts` uses to pick up `schema-inventory.ts`/`schema-magazine.ts` today — confirm the exact glob before assuming.
- `pnpm db:push` for dev — this repo uses push-based schema sync, not migration files.
- `server/db/seed-lab.ts` — seed a starter test catalog (CBC, LFT, KFT, common panels) with reference ranges, mirroring `seed-inventory.ts`.

---

## 8. Testing

- `tests/unit/lab-engine.test.ts` — auto-flagging logic against reference ranges (pure function, easiest to isolate).
- `tests/integration/lab.test.ts` — full order → collect → result → verify → release flow against the ephemeral test DB (`docker-compose.test.yml`), following the existing setup in `tests/setup/`.

---

## 9. Build order

1. Schema (`schema-lab.ts`) + `db:push` + seed data (`seed-lab.ts`)
2. `requireLabAccess` middleware + master CRUD (categories/tests/panels/reference ranges)
3. Order creation + patient search (reuse/extract from immunization)
4. Sample collection + accession numbering (`generateDocNumber`)
5. Result entry + auto-flagging (`lab-engine.ts`) + verification workflow
6. Report PDF + release + notification
7. Dashboard tile
8. Tests written alongside each step above, not bolted on at the end — start the integration test at step 3 and extend it as each subsequent step lands

---

## 10. Open questions to confirm before/during implementation

- Exact role/department naming to use for lab staff (`role = "lab"` vs a `"LABORATORY"` department name — confirm which convention matches how HR currently sets up staff records).
- Whether `labOrders` should snapshot patient age/gender at order time (recommended, see §2) or always read live from `patients`.
- Whether external/referral lab results (tests sent out to a partner lab) need a distinct status/flow, or are out of scope for v1.
- Critical-value threshold definition and whether critical results need a separate alerting path (e.g. phone call logging) beyond the standard notification.
