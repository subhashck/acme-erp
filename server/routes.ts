import { Hono } from "hono";
import type { AuthEnv } from "./auth.ts";
import { attendanceRoutes } from "./routes/attendance.ts";
import { dashboardRoutes } from "./routes/dashboard.ts";
import { immunizationRoutes } from "./routes/immunization.ts";
import { leavesRoutes } from "./routes/leaves.ts";
import { mastersRoutes } from "./routes/masters.ts";
import { messagesRoutes } from "./routes/messages.ts";
import { notificationRoutes } from "./routes/notifications.ts";
import { payrollRoutes } from "./routes/payroll.ts";
import { rosterRoutes } from "./routes/roster.ts";
import { staffRoutes } from "./routes/staff.ts";
import { accountsRoutes } from "./routes/accounts.ts";
import { dailyClosingRoutes } from "./routes/daily-closing.ts";
import { monthlyReportRoutes } from "./routes/monthly-report.ts";
import { adminUserRoutes } from "./routes/admin-users.ts";
import { purchasesRoutes } from "./routes/purchases.ts";
import { offDaysRoutes } from "./routes/off-days.ts";
import { bankExpensesRoutes } from "./routes/bank-expenses.ts";
import { bankAccountsRoutes } from "./routes/bank-accounts.ts";
import { nursingRoutes } from "./routes/nursing.ts";
import { inventoryRoutes } from "./routes/inventory.ts";
import { transfersRoutes } from "./routes/transfers.ts";
import { posRoutes } from "./routes/pos.ts";

export const api = new Hono<AuthEnv>()
  .route("/", dashboardRoutes)
  .route("/", notificationRoutes)
  .route("/", immunizationRoutes)
  .route("/", mastersRoutes)
  .route("/", staffRoutes)
  .route("/", leavesRoutes)
  .route("/", attendanceRoutes)
  .route("/", rosterRoutes)
  .route("/", payrollRoutes)
  .route("/", messagesRoutes)
  .route("/", monthlyReportRoutes)
  .route("/", accountsRoutes)
  .route("/", dailyClosingRoutes)
  .route("/", adminUserRoutes)
  .route("/", purchasesRoutes)
  .route("/", offDaysRoutes)
  .route("/", bankExpensesRoutes)
  .route("/", bankAccountsRoutes)
  .route("/", nursingRoutes)
  .route("/", inventoryRoutes)
  .route("/", transfersRoutes)
  .route("/", posRoutes);

export type AppType = typeof api;
