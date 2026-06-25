import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`)
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  role: text("role").default("user"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("banReason"),
  banExpires: integer("banExpires", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull()
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
});

export const roleTypes = sqliteTable("role_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps
});

export const leaveTypes = sqliteTable("leave_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  maxDays: integer("max_days").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  payable: integer("payable", { mode: "boolean" }).notNull().default(true),
  paymentRate: real("payment_rate").notNull().default(100.0),
  ...timestamps
});

export const departments = sqliteTable("departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  floor: text("floor").notNull(),
  head: text("head").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps
});

export const departmentLeaders = sqliteTable("department_leaders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  departmentId: integer("department_id").notNull().unique().references(() => departments.id, { onDelete: "cascade" }),
  headStaffId: integer("head_staff_id").references(() => staff.id, { onDelete: "set null" }),
  subheadStaffId: integer("subhead_staff_id").references(() => staff.id, { onDelete: "set null" }),
  ...timestamps
});

export const shifts = sqliteTable("shifts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  code: text("code").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps
});

export const staff = sqliteTable("staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  employeeCode: text("employee_code").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  supervisorLevel1Id: integer("supervisor_level_1_id").references((): any => staff.id),
  supervisorLevel2Id: integer("supervisor_level_2_id").references((): any => staff.id),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  salary: real("salary").notNull(),
  status: text("status").notNull().default("Active"),
  aadhar: text("aadhar").notNull().default(""),
  pan: text("pan").notNull().default(""),
  version: integer("version").notNull().default(1),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps
});

export const staffSalaries = sqliteTable("staff_salaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull().unique().references(() => staff.id, { onDelete: "cascade" }),
  basicSalary: real("basic_salary").notNull().default(0),
  hra: real("hra").notNull().default(0),
  conveyance: real("conveyance").notNull().default(0),
  medical: real("medical").notNull().default(0),
  special: real("special").notNull().default(0),
  epf: real("epf").notNull().default(0),
  esi: real("esi").notNull().default(0),
  professionalTax: real("professional_tax").notNull().default(0),
  otherDeductions: real("other_deductions").notNull().default(0),
  ...timestamps
});

export const staffDepartments = sqliteTable("staff_departments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("Active"),
  changedById: text("changed_by_id").references(() => user.id, { onDelete: "set null" }),
  changedByName: text("changed_by_name"),
  changedAt: integer("changed_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  ...timestamps
});

export const rosters = sqliteTable("rosters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull().references(() => staff.id),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  shiftId: integer("shift_id").notNull().references(() => shifts.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  notes: text("notes"),
  ...timestamps
});

export const leaveRequests = sqliteTable("leave_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requestNo: text("request_no").notNull().unique(),
  staffId: integer("staff_id").notNull().references(() => staff.id),
  leaveType: text("leave_type").notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Pending"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  reviewerNote: text("reviewer_note"),
  ...timestamps
});
export const payslips = sqliteTable("payslips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  month: text("month").notNull(),
  basicSalary: real("basic_salary").notNull().default(0),
  hra: real("hra").notNull().default(0),
  conveyance: real("conveyance").notNull().default(0),
  medical: real("medical").notNull().default(0),
  special: real("special").notNull().default(0),
  epf: real("epf").notNull().default(0),
  esi: real("esi").notNull().default(0),
  professionalTax: real("professional_tax").notNull().default(0),
  otherDeductions: real("other_deductions").notNull().default(0),
  leaveDaysTaken: integer("leave_days_taken").notNull().default(0),
  leaveDeduction: real("leave_deduction").notNull().default(0),
  netSalary: real("net_salary").notNull().default(0),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("Active"),
  ...timestamps
});

export const attendance = sqliteTable("attendance", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull().references(() => staff.id),
  date: text("date").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  status: text("status").notNull().default("Present"),
  notes: text("notes"),
  ...timestamps
});

export const biometricMappings = sqliteTable("biometric_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull().unique().references(() => staff.id, { onDelete: "cascade" }),
  biometricCode: text("biometric_code").notNull().unique(),
  ...timestamps
});

export const staffRelations = relations(staff, ({ many, one }) => ({
  leaveRequests: many(leaveRequests),
  salaryStructure: one(staffSalaries),
  payslips: many(payslips),
  attendanceLogs: many(attendance),
  biometricMapping: one(biometricMappings)
}));

export const staffSalariesRelations = relations(staffSalaries, ({ one }) => ({
  staff: one(staff, { fields: [staffSalaries.staffId], references: [staff.id] })
}));

export const leaveRequestRelations = relations(leaveRequests, ({ one }) => ({
  staff: one(staff, { fields: [leaveRequests.staffId], references: [staff.id] })
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  staff: one(staff, { fields: [payslips.staffId], references: [staff.id] })
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  staff: one(staff, { fields: [attendance.staffId], references: [staff.id] })
}));

export const biometricMappingsRelations = relations(biometricMappings, ({ one }) => ({
  staff: one(staff, { fields: [biometricMappings.staffId], references: [staff.id] })
}));
