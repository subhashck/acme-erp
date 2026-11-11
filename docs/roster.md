# Walkthrough: Clinical Roster Visibility for HR

We have updated the roster module so that **HR users** can select and view the rosters of **all clinical departments** (`isClinical = true`) in read-only mode, while restricting shift assignment and modification capabilities to Nursing Supers, Department Leaders, and Administrators.

## Summary of Roster Permissions

| Role | Clinical Dept Roster View | Clinical Dept Roster Edit/Assign | Non-Clinical Dept Roster View | Non-Clinical Dept Roster Edit/Assign |
| :--- | :--- | :--- | :--- | :--- |
| **Administrator** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Nursing Super** | ✅ Allowed | ✅ Allowed | ❌ Read-Only / Own Dept | ❌ Restricted |
| **HR User** | ✅ Allowed (Read-Only) | ❌ Restricted | ✅ Allowed | ✅ Allowed |
| **Dept Leader** | ✅ Assigned Dept Only | ✅ Assigned Dept Only | ✅ Assigned Dept Only | ✅ Assigned Dept Only |

## Code Changes

- **Frontend Roster UI ([roster.tsx](file:///d:/dev/acme/acme-erp/src/routes/_authenticated/hr/roster.tsx))**:
  - Updated department selection filter so that HR users can select any department (including all clinical departments) to view its roster calendar and daily shift table.
  - Restricted `canAssign` (drag-and-drop and shift assignment form) to `false` for HR users when viewing clinical departments unless they hold Nursing Super, Admin, or Dept Leader status.

## Verification

- Executed `pnpm typecheck` (`tsc -b`). Result: Clean build with **0 errors**.
