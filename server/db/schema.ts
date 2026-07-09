import { relations } from "drizzle-orm";
import { integer, pgTable as sqliteTable, text, boolean, timestamp, serial, varchar, primaryKey, foreignKey, unique, numeric } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
};

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role").default("user"),
  banned: boolean("banned").default(false),
  banReason: text("banReason"),
  banExpires: timestamp("banExpires"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull()
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  impersonatedBy: text("impersonatedBy"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull()
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull()
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt")
});

export const designations = sqliteTable("designations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const leaveTypes = sqliteTable("leave_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  maxDays: integer("max_days").notNull().default(0),
  active: boolean("active").notNull().default(true),
  payable: boolean("payable").notNull().default(true),
  paymentRate: numeric("payment_rate", { precision: 12, scale: 2 }).notNull().default("100"),
  ...timestamps
});

export const departments = sqliteTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  floor: text("floor").notNull(),
  head: text("head").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const banks = sqliteTable("banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

/**
 * staff — versioned employee records.
 *
 * PRIMARY KEY: (staffId, version)
 *   - staffId: stable logical identity of the employee, never changes across updates
 *   - version: monotonically increasing integer per staffId; starts at 1
 *
 * active: exactly one row per staffId has active=true at any time.
 *         Query `WHERE staffId = X AND active = true` to get the current record.
 *
 * On every edit, the old active row is set active=false and a new row is
 * inserted with the same staffId, version+1, active=true.
 */
export const staff = sqliteTable("staff", {
  staffId: integer("staff_id").notNull(),
  employeeCode: text("employee_code").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  salary: numeric("salary", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("Active"),
  aadhar: text("aadhar").notNull().default(""),
  pan: text("pan").notNull().default(""),
  version: integer("version").notNull().default(1),
  active: boolean("active").notNull().default(true),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  isExecutive: boolean("is_executive").notNull().default(false),
  ...timestamps
}, (table) => [
  primaryKey({ columns: [table.staffId, table.version] })
]);

/**
 * departmentLeaders — maps each department to its head and subhead staff.
 * References stable staffId (logical identity), not a specific version.
 * FK dropped since staffId is no longer unique in the staff table.
 */
export const departmentLeaders = sqliteTable("department_leaders", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().unique().references(() => departments.id, { onDelete: "cascade" }),
  // Plain integers referencing the stable staffId; no FK since staff PK is composite
  headStaffId: integer("head_staff_id"),
  subheadStaffId: integer("subhead_staff_id"),
  ...timestamps
});

export const shifts = sqliteTable("shifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  active: boolean("active").notNull().default(true),
  isOffDay: boolean("is_off_day").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps
});

/**
 * staffSalaries — salary structure for a specific (staffId, version).
 * Each staff version has its own salary record.
 * FK: (staffId, staffVersion) → staff(staffId, version)
 */
export const staffSalaries = sqliteTable("staff_salaries", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  staffVersion: integer("staff_version").notNull().default(1),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  hra: numeric("hra", { precision: 12, scale: 2 }).notNull().default("0"),
  conveyance: numeric("conveyance", { precision: 12, scale: 2 }).notNull().default("0"),
  medical: numeric("medical", { precision: 12, scale: 2 }).notNull().default("0"),
  special: numeric("special", { precision: 12, scale: 2 }).notNull().default("0"),
  epf: numeric("epf", { precision: 12, scale: 2 }).notNull().default("0"),
  esi: numeric("esi", { precision: 12, scale: 2 }).notNull().default("0"),
  professionalTax: numeric("professional_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  otherDeductions: numeric("other_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  lateAttendance: numeric("late_attendance", { precision: 12, scale: 2 }).notNull().default("0"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  ...timestamps
}, (table) => [
  unique("staff_salaries_staff_id_version_unique").on(table.staffId, table.staffVersion),
  foreignKey({
    columns: [table.staffId, table.staffVersion],
    foreignColumns: [staff.staffId, staff.version],
  }).onDelete("cascade")
]);

/**
 * staffHrProfiles — HR profile for a specific (staffId, version).
 * Each staff version has its own HR profile record.
 * FK: (staffId, staffVersion) → staff(staffId, version)
 */
export const staffHrProfiles = sqliteTable("staff_hr_profiles", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  staffVersion: integer("staff_version").notNull().default(1),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  maritalStatus: text("marital_status"),
  bloodGroup: text("blood_group"),
  fatherName: text("father_name"),
  motherName: text("mother_name"),
  spouseName: text("spouse_name"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  currentAddress: text("current_address"),
  permanentAddress: text("permanent_address"),
  educationHistory: text("education_history").notNull().default("[]"),
  professionalHistory: text("professional_history").notNull().default("[]"),
  uan: text("uan"),
  epfNumber: text("epf_number"),
  esiNumber: text("esi_number"),
  dateOfJoining: text("date_of_joining"),
  lastWorkingDate: text("last_working_date"),
  ...timestamps
}, (table) => [
  unique("staff_hr_profiles_staff_id_version_unique").on(table.staffId, table.staffVersion),
  foreignKey({
    columns: [table.staffId, table.staffVersion],
    foreignColumns: [staff.staffId, staff.version],
  }).onDelete("cascade")
]);

/**
 * staffDepartments — department assignment history, tied to each staff version.
 * FK: (staffId, staffVersion) → staff(staffId, version)
 * The `version` field tracks the department-assignment version within a staff version
 * (e.g. if a department change occurs independently of a staff edit).
 */
export const staffDepartments = sqliteTable("staff_departments", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  staffVersion: integer("staff_version").notNull().default(1),
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("Active"),
  changedById: text("changed_by_id").references(() => user.id, { onDelete: "set null" }),
  changedByName: text("changed_by_name"),
  changedAt: timestamp("changed_at").notNull().defaultNow(),
  ...timestamps
}, (table) => [
  foreignKey({
    columns: [table.staffId, table.staffVersion],
    foreignColumns: [staff.staffId, staff.version],
  }).onDelete("cascade")
]);

/**
 * staffSupervisors — supervisor assignments for a specific (staffId, version).
 * supervisor1Id and supervisor2Id are stable staffIds (logical identities).
 * FK: (staffId, staffVersion) → staff(staffId, version)
 */
export const staffSupervisors = sqliteTable("staff_supervisors", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  staffVersion: integer("staff_version").notNull().default(1),
  // Plain integer stable staffIds for supervisors (no FK since staff PK is composite)
  supervisor1Id: integer("supervisor1_id"),
  supervisor2Id: integer("supervisor2_id"),
  ...timestamps
}, (table) => [
  unique("staff_supervisors_staff_id_version_unique").on(table.staffId, table.staffVersion),
  foreignKey({
    columns: [table.staffId, table.staffVersion],
    foreignColumns: [staff.staffId, staff.version],
  }).onDelete("cascade")
]);

/**
 * rosters — shift rosters for staff. References stable staffId only.
 * Plain integer, no FK (staffId is not unique in staff table after refactor).
 */
export const rosters = sqliteTable("rosters", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(), // stable staffId, no FK
  departmentId: integer("department_id").notNull().references(() => departments.id),
  shiftId: integer("shift_id").notNull().references(() => shifts.id),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  notes: text("notes"),
  ...timestamps
});

export const leaveRequests = sqliteTable("leave_requests", {
  id: serial("id").primaryKey(),
  requestNo: text("request_no").notNull().unique(),
  staffId: integer("staff_id").notNull(), // stable staffId, no FK
  leaveType: text("leave_type").notNull(),
  isHalfDay: boolean("is_half_day").notNull().default(false),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Pending"),
  reviewedAt: timestamp("reviewed_at"),
  reviewerNote: text("reviewer_note"),
  forwardedToStaffId: integer("forwarded_to_staff_id"), // stable staffId of the targeted supervisor
  approverIds: text("approver_ids").notNull().default("[]"),
  supportingDocument: text("supporting_document"),
  ...timestamps
});

export const payslips = sqliteTable("payslips", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(), // stable staffId, no FK
  month: text("month").notNull(),
  basicSalary: numeric("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  hra: numeric("hra", { precision: 12, scale: 2 }).notNull().default("0"),
  conveyance: numeric("conveyance", { precision: 12, scale: 2 }).notNull().default("0"),
  medical: numeric("medical", { precision: 12, scale: 2 }).notNull().default("0"),
  special: numeric("special", { precision: 12, scale: 2 }).notNull().default("0"),
  epf: numeric("epf", { precision: 12, scale: 2 }).notNull().default("0"),
  esi: numeric("esi", { precision: 12, scale: 2 }).notNull().default("0"),
  professionalTax: numeric("professional_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  otherDeductions: numeric("other_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  lateAttendance: numeric("late_attendance", { precision: 12, scale: 2 }).notNull().default("0"),
  leaveDaysTaken: integer("leave_days_taken").notNull().default(0),
  leaveDeduction: numeric("leave_deduction", { precision: 12, scale: 2 }).notNull().default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("Active"),
  ...timestamps
});

export const attendance = sqliteTable("attendance", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(), // stable staffId, no FK
  date: text("date").notNull(),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  status: text("status").notNull().default("Present"),
  notes: text("notes"),
  ...timestamps
});

export const biometricMappings = sqliteTable("biometric_mappings", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().unique(), // stable staffId, no FK
  biometricCode: text("biometric_code").notNull().unique(),
  ...timestamps
});

export const patients = sqliteTable("patients", {
  id: serial("id").primaryKey(),
  mrn: text("mrn").notNull().unique(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  bloodGroup: text("blood_group"),
  allergies: text("allergies"),
  ...timestamps
});

export const appointments = sqliteTable("appointments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull(), // stable staffId, no FK
  departmentId: integer("department_id").notNull().references(() => departments.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Waiting"),
  token: text("token").notNull(),
  ...timestamps
});

export const encounters = sqliteTable("encounters", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  symptoms: text("symptoms").notNull(),
  diagnosis: text("diagnosis"),
  vitals: text("vitals"),
  notes: text("notes"),
  ...timestamps
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  quantity: integer("quantity").notNull(),
  reorderLevel: integer("reorder_level").notNull(),
  supplier: text("supplier").notNull(),
  location: text("location").notNull(),
  expiryDate: timestamp("expiry_date"),
  ...timestamps
});

export const medicines = sqliteTable("medicines", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  genericName: text("generic_name").notNull(),
  form: text("form").notNull(),
  strength: text("strength").notNull(),
  stock: integer("stock").notNull(),
  reorderLevel: integer("reorder_level").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  batchNo: text("batch_no").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  ...timestamps
});

export const prescriptions = sqliteTable("prescriptions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull(), // stable staffId, no FK
  encounterId: integer("encounter_id").references(() => encounters.id),
  status: text("status").notNull().default("Open"),
  ...timestamps
});

export const prescriptionLines = sqliteTable("prescription_lines", {
  id: serial("id").primaryKey(),
  prescriptionId: integer("prescription_id").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  medicineId: integer("medicine_id").notNull().references(() => medicines.id),
  dosage: text("dosage").notNull(),
  duration: text("duration").notNull(),
  quantity: integer("quantity").notNull(),
  instructions: text("instructions").notNull()
});

export const immunizationSchedules = sqliteTable("immunization_schedules", {
  id: serial("id").primaryKey(),
  vaccineCode: text("vaccine_code").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  doseLabel: text("dose_label").notNull(),
  beneficiaryType: text("beneficiary_type").notNull().default("Child"),
  dueAgeDays: integer("due_age_days"),
  dueAgeLabel: text("due_age_label").notNull(),
  maxAgeDays: integer("max_age_days"),
  doseAmount: text("dose_amount").notNull(),
  route: text("route").notNull(),
  site: text("site").notNull(),
  appliesIn: text("applies_in").notNull().default("National"),
  source: text("source").notNull().default("India UIP National Immunization Schedule"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps
});

export const immunizationRecords = sqliteTable("immunization_records", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  scheduleId: integer("schedule_id").references(() => immunizationSchedules.id, { onDelete: "set null" }),
  vaccineCode: text("vaccine_code").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  doseLabel: text("dose_label").notNull(),
  administeredAt: text("administered_at").notNull(),
  administeredByStaffId: integer("administered_by_staff_id"), // stable staffId, no FK
  batchNo: text("batch_no"),
  manufacturer: text("manufacturer"),
  site: text("site"),
  route: text("route"),
  adverseEvent: text("adverse_event"),
  notes: text("notes"),
  status: text("status").notNull().default("Administered"),
  ...timestamps
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const staffRelations = relations(staff, ({ many, one }) => ({
  leaveRequests: many(leaveRequests),
  salaryStructure: one(staffSalaries, {
    fields: [staff.staffId, staff.version],
    references: [staffSalaries.staffId, staffSalaries.staffVersion]
  }),
  hrProfile: one(staffHrProfiles, {
    fields: [staff.staffId, staff.version],
    references: [staffHrProfiles.staffId, staffHrProfiles.staffVersion]
  }),
  payslips: many(payslips),
  attendanceLogs: many(attendance),
  biometricMapping: one(biometricMappings)
}));

export const staffSalariesRelations = relations(staffSalaries, ({ one }) => ({
  staff: one(staff, {
    fields: [staffSalaries.staffId, staffSalaries.staffVersion],
    references: [staff.staffId, staff.version]
  })
}));

export const staffHrProfilesRelations = relations(staffHrProfiles, ({ one }) => ({
  staff: one(staff, {
    fields: [staffHrProfiles.staffId, staffHrProfiles.staffVersion],
    references: [staff.staffId, staff.version]
  })
}));

export const staffSupervisorsRelations = relations(staffSupervisors, ({ one }) => ({
  staff: one(staff, {
    fields: [staffSupervisors.staffId, staffSupervisors.staffVersion],
    references: [staff.staffId, staff.version]
  })
}));

export const leaveRequestRelations = relations(leaveRequests, ({ one }) => ({
  staff: one(staff, { fields: [leaveRequests.staffId], references: [staff.staffId] })
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  staff: one(staff, { fields: [payslips.staffId], references: [staff.staffId] })
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  staff: one(staff, { fields: [attendance.staffId], references: [staff.staffId] })
}));

export const biometricMappingsRelations = relations(biometricMappings, ({ one }) => ({
  staff: one(staff, { fields: [biometricMappings.staffId], references: [staff.staffId] })
}));

export const patientRelations = relations(patients, ({ many }) => ({
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  immunizations: many(immunizationRecords)
}));

export const immunizationScheduleRelations = relations(immunizationSchedules, ({ many }) => ({
  records: many(immunizationRecords)
}));

export const immunizationRecordRelations = relations(immunizationRecords, ({ one }) => ({
  patient: one(patients, { fields: [immunizationRecords.patientId], references: [patients.id] }),
  schedule: one(immunizationSchedules, { fields: [immunizationRecords.scheduleId], references: [immunizationSchedules.id] }),
}));

export const notifications = sqliteTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  link: text("link"),
  read: boolean("read").notNull().default(false),
  ...timestamps
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, { fields: [notifications.userId], references: [user.id] })
}));

export const messages = sqliteTable("messages", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").references(() => user.id, { onDelete: "cascade" }),
  channelType: text("channel_type").notNull().default("organization"), // "direct" | "department" | "organization"
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(user, { fields: [messages.senderId], references: [user.id] }),
  receiver: one(user, { fields: [messages.receiverId], references: [user.id] }),
  department: one(departments, { fields: [messages.departmentId], references: [departments.id] }),
}));

export const transactions = sqliteTable("transactions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  ...timestamps
});

export const transactionsRelations = relations(transactions, ({ }) => ({}));

export const consultantRates = sqliteTable("consultant_rates", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id").notNull().unique(),
  baseRate: numeric("base_rate", { precision: 12, scale: 2 }).notNull().default("500"),
  doctorSharePercent: numeric("doctor_share_percent", { precision: 12, scale: 2 }).notNull().default("70"),
  ...timestamps
});

export const consultantRatesRelations = relations(consultantRates, ({ one }) => ({
  doctor: one(staff, {
    fields: [consultantRates.doctorId],
    references: [staff.staffId]
  })
}));

export const dailyClosingReports = sqliteTable("daily_closing_reports", {
  id: serial("id").primaryKey(),
  reportDate: text("report_date").notNull().unique(),
  createdBy: text("created_by").notNull().references(() => user.id),
  openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  bankDeposit: numeric("bank_deposit", { precision: 12, scale: 2 }).notNull().default("0"),
  fundHandoverSir: numeric("fund_handover_sir", { precision: 12, scale: 2 }).notNull().default("0"),
  fundHandoverMadam: numeric("fund_handover_madam", { precision: 12, scale: 2 }).notNull().default("0"),
  totalIncome: numeric("total_income", { precision: 12, scale: 2 }).notNull().default("0"),
  totalExpenditure: numeric("total_expenditure", { precision: 12, scale: 2 }).notNull().default("0"),
  closingBalance: numeric("closing_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  cashReceiptSir: numeric("cash_receipt_sir", { precision: 12, scale: 2 }).notNull().default("0"),
  cashReceiptMam: numeric("cash_receipt_mam", { precision: 12, scale: 2 }).notNull().default("0"),
  cashReceiptAcon: numeric("cash_receipt_acon", { precision: 12, scale: 2 }).notNull().default("0"),
  cashReceiptsTotal: numeric("cash_receipts_total", { precision: 12, scale: 2 }).notNull().default("0"),
  bankReceiptsTotal: numeric("bank_receipts_total", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("draft"),
  ...timestamps
});

export const serviceCategories = sqliteTable("service_categories", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  isVariableAmount: boolean("is_variable_amount").notNull().default(false),
  ...timestamps
});

export const serviceCatalog = sqliteTable("service_catalog", {
  id: serial("id").primaryKey(),
  department: text("department").notNull(),
  serviceName: text("service_name").notNull(),
  defaultRate: numeric("default_rate", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  defaultShow: boolean("default_show").notNull().default(true),
  ...timestamps
});

export const expenseCategories = sqliteTable("expense_categories", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const expenseCatalog = sqliteTable("expense_catalog", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  itemName: text("item_name").notNull(),
  defaultAmount: numeric("default_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const dailyServiceLines = sqliteTable("daily_service_lines", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  serviceId: integer("service_id").references(() => serviceCatalog.id, { onDelete: "set null" }),
  rate: numeric("rate", { precision: 12, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0")
});

export const dailyPharmacyIncome = sqliteTable("daily_pharmacy_income", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().unique().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  otWardTotal: numeric("ot_ward_total", { precision: 12, scale: 2 }).notNull().default("0"),
  acmeNewTotal: numeric("acme_new_total", { precision: 12, scale: 2 }).notNull().default("0"),
  parking: numeric("parking", { precision: 12, scale: 2 }).notNull().default("0"),
  coffeeShop: numeric("coffee_shop", { precision: 12, scale: 2 }).notNull().default("0"),
  canteenIncome: numeric("canteen_income", { precision: 12, scale: 2 }).notNull().default("0"),
  creditCardChargesNight: numeric("credit_card_charges_night", { precision: 12, scale: 2 }).notNull().default("0"),
  trainingFee: numeric("training_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  humankindSales: numeric("humankind_sales", { precision: 12, scale: 2 }).notNull().default("0"),
  miscIncome: text("misc_income").notNull().default("[]")
});

export const dailyExpenditures = sqliteTable("daily_expenditures", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  details: text("details").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0")
});

export const dailyStaffAdvances = sqliteTable("daily_staff_advances", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  staffName: text("staff_name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0")
});

export const dailyIpdAdmissions = sqliteTable("daily_ipd_admissions", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  patientName: text("patient_name").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0")
});

export const dailyIpdDischarges = sqliteTable("daily_ipd_discharges", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  patientName: text("patient_name").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0")
});

export const dailyAdditionalIncome = sqliteTable("daily_additional_income", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0")
});

export const dailyDiscountsReturns = sqliteTable("daily_discounts_returns", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0")
});

export const dailyPaymentChannels = sqliteTable("daily_payment_channels", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  bank: text("bank").notNull(),
  channel: text("channel").notNull(),
  sourceLabel: text("source_label").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0")
});

export const dailyClosingReportsRelations = relations(dailyClosingReports, ({ many, one }) => ({
  creator: one(user, { fields: [dailyClosingReports.createdBy], references: [user.id] }),
  serviceLines: many(dailyServiceLines),
  pharmacyIncome: one(dailyPharmacyIncome, {
    fields: [dailyClosingReports.id],
    references: [dailyPharmacyIncome.reportId]
  }),
  expenditures: many(dailyExpenditures),
  staffAdvances: many(dailyStaffAdvances),
  ipdAdmissions: many(dailyIpdAdmissions),
  ipdDischarges: many(dailyIpdDischarges),
  additionalIncome: many(dailyAdditionalIncome),
  discountsReturns: many(dailyDiscountsReturns),
  paymentChannels: many(dailyPaymentChannels)
}));

export const dailyServiceLinesRelations = relations(dailyServiceLines, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyServiceLines.reportId], references: [dailyClosingReports.id] }),
  service: one(serviceCatalog, { fields: [dailyServiceLines.serviceId], references: [serviceCatalog.id] })
}));

export const dailyPharmacyIncomeRelations = relations(dailyPharmacyIncome, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyPharmacyIncome.reportId], references: [dailyClosingReports.id] })
}));

export const dailyExpendituresRelations = relations(dailyExpenditures, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyExpenditures.reportId], references: [dailyClosingReports.id] })
}));

export const dailyStaffAdvancesRelations = relations(dailyStaffAdvances, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyStaffAdvances.reportId], references: [dailyClosingReports.id] })
}));

export const dailyIpdAdmissionsRelations = relations(dailyIpdAdmissions, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyIpdAdmissions.reportId], references: [dailyClosingReports.id] })
}));

export const dailyIpdDischargesRelations = relations(dailyIpdDischarges, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyIpdDischarges.reportId], references: [dailyClosingReports.id] })
}));

export const dailyAdditionalIncomeRelations = relations(dailyAdditionalIncome, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyAdditionalIncome.reportId], references: [dailyClosingReports.id] })
}));

export const dailyPaymentChannelsRelations = relations(dailyPaymentChannels, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyPaymentChannels.reportId], references: [dailyClosingReports.id] })
}));

export const dailyDiscountsReturnsRelations = relations(dailyDiscountsReturns, ({ one }) => ({
  report: one(dailyClosingReports, { fields: [dailyDiscountsReturns.reportId], references: [dailyClosingReports.id] })
}));
