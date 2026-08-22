import { relations } from "drizzle-orm";
import { integer, pgTable as sqliteTable, text, boolean, timestamp, serial, varchar, primaryKey, foreignKey, unique, uniqueIndex, numeric, pgEnum, date, jsonb } from "drizzle-orm/pg-core";

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
  mustChangePassword: boolean("mustChangePassword").notNull().default(false),
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
  isClinical: boolean("is_clinical").notNull().default(false),
  ...timestamps
});

export const banks = sqliteTable("banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const managementApprovers = sqliteTable("management_approvers", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const nursingSupers = sqliteTable("nursing_supers", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(),
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
  effectiveDate: text("effective_date"),
  employmentType: text("employment_type").notNull().default("Permanent"),
  permanentConfirmationDate: text("permanent_confirmation_date"),
  employmentStartDate: text("employment_start_date"),
  employmentEndDate: text("employment_end_date"),
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
  skillAllowance: numeric("skill_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  special: numeric("special", { precision: 12, scale: 2 }).notNull().default("0"),
  epf: numeric("epf", { precision: 12, scale: 2 }).notNull().default("0"),
  esi: numeric("esi", { precision: 12, scale: 2 }).notNull().default("0"),
  professionalTax: numeric("professional_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  deductTds: boolean("deduct_tds").notNull().default(false),
  tdsPercent: numeric("tds_percent", { precision: 5, scale: 2 }).notNull().default("10"),
  tds: numeric("tds", { precision: 12, scale: 2 }).notNull().default("0"),
  securityDepositTotal: numeric("security_deposit_total", { precision: 12, scale: 2 }).notNull().default("0"),
  securityDeposit: numeric("security_deposit", { precision: 12, scale: 2 }).notNull().default("0"),
  securityDepositStartMonth: text("security_deposit_start_month"),
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
  nationality: text("nationality").default("Indian"), //d
  gender: text("gender"),
  maritalStatus: text("marital_status"),
  bloodGroup: text("blood_group"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  currentAddress: text("current_address"),
  landmarkCurrentAddress: text("landmar_current_address"), //d
  permanentAddress: text("permanent_address"),
  landmarkPermanentAddress: text("landmark_permanent_address"), //d
  educationHistory: jsonb("education_history").notNull().default([]),
  professionalHistory: jsonb("professional_history").notNull().default([]),
  uan: text("uan"),
  epfNumber: text("epf_number"),
  esiNumber: text("esi_number"),
  dateOfJoining: text("date_of_joining"),
  lastWorkingDate: text("last_working_date"),
  religion: text("religion"),
  nominees: text("nominees").notNull().default("[]"),
  certifications: jsonb("certifications").notNull().default([]),
  familyMembers: jsonb("family_members").notNull().default([]),
  mncRegistrationNo: text("mnc_registration_no"),
  mncValidityUpto: text("mnc_validity_upto"),
  mmcRegistrationNo: text("mmc_registration_no"),
  mmcValidityUpto: text("mmc_validity_upto"),
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
  /** Single calendar date (YYYY-MM-DD) — one row per staff per day. */
  date: text("date").notNull(),
  notes: text("notes"),
  ...timestamps
}, (table) => [
  unique("rosters_staff_id_date_unique").on(table.staffId, table.date)
]);

/**
 * staffOffDayRequests — an off-day change request submitted by a staff member.
 * Staff can request to move their scheduled off day from one date to another.
 * HR/admin reviews (approve / reject). Requester can cancel their own pending request.
 */
export const staffOffDayRequests = sqliteTable("staff_off_day_requests", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(), // stable staffId, no FK
  originalDate: text("original_date").notNull(),   // ISO date — the off day they currently have
  requestedDate: text("requested_date").notNull(),  // ISO date — the day they want off instead
  reason: text("reason"),
  status: text("status").notNull().default("Pending"), // Pending | Approved | Rejected | Cancelled
  reviewedById: text("reviewed_by_id").references(() => user.id, { onDelete: "set null" }),
  reviewerNote: text("reviewer_note"),
  ...timestamps
});

/**
 * staffWeeklyOffDays — recurring weekly off-day rules for staff.
 * daysOfWeek: jsonb array of day numbers (0 = Sunday, 1 = Monday, ..., 6 = Saturday).
 * effectiveFrom / effectiveTo: date range for when this rule applies.
 */
export const staffWeeklyOffDays = sqliteTable("staff_weekly_off_days", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(), // stable staffId, no FK
  daysOfWeek: jsonb("days_of_week").notNull().default([]),
  effectiveFrom: text("effective_from").notNull(),
  effectiveTo: text("effective_to"),
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
  skillAllowance: numeric("skill_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  special: numeric("special", { precision: 12, scale: 2 }).notNull().default("0"),
  earnedLeaveEncashment: numeric("earned_leave_encashment", { precision: 12, scale: 2 }).notNull().default("0"),
  extraDayAllowance: numeric("extra_day_allowance", { precision: 12, scale: 2 }).notNull().default("0"),
  epf: numeric("epf", { precision: 12, scale: 2 }).notNull().default("0"),
  esi: numeric("esi", { precision: 12, scale: 2 }).notNull().default("0"),
  professionalTax: numeric("professional_tax", { precision: 12, scale: 2 }).notNull().default("0"),
  tds: numeric("tds", { precision: 12, scale: 2 }).notNull().default("0"),
  securityDeposit: numeric("security_deposit", { precision: 12, scale: 2 }).notNull().default("0"),
  otherDeductions: numeric("other_deductions", { precision: 12, scale: 2 }).notNull().default("0"),
  lateAttendance: numeric("late_attendance", { precision: 12, scale: 2 }).notNull().default("0"),
  leaveDaysTaken: numeric("leave_days_taken", { precision: 5, scale: 2 }).notNull().default("0"),
  leaveDeduction: numeric("leave_deduction", { precision: 12, scale: 2 }).notNull().default("0"),
  netSalary: numeric("net_salary", { precision: 12, scale: 2 }).notNull().default("0"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("Draft"),
  paymentMode: text("payment_mode").notNull().default("Bank Transfer"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  chequeNumber: text("cheque_number"),
  chequeDate: text("cheque_date"),
  hrNotes: text("hr_notes"),
  cooNotes: text("coo_notes"),
  accountsNotes: text("accounts_notes"),
  ...timestamps
});

export const securityDepositRefunds = sqliteTable("security_deposit_refunds", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull(), // stable staffId
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  refundDate: text("refund_date").notNull(),
  notes: text("notes"),
  processedBy: text("processed_by").references(() => user.id, { onDelete: "set null" }),
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

// export const patientRelations = relations(patients, ({ many }) => ({
//   appointments: many(appointments),
//   prescriptions: many(prescriptions),
//   immunizations: many(immunizationRecords)
// }));

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
  cashReceipts: numeric("cash_receipts", { precision: 12, scale: 2 }).notNull().default("0"),
  bankReceiptsTotal: numeric("bank_receipts_total", { precision: 12, scale: 2 }).notNull().default("0"),
  bankReceiptSir: numeric("bank_receipt_sir", { precision: 12, scale: 2 }).notNull().default("0"),
  bankReceiptSirBank: text("bank_receipt_sir_bank"),
  bankDeposits: text("bank_deposits"),
  cashDenominations: jsonb("cash_denominations"),
  reconciliationTolerance: numeric("reconciliation_tolerance", { precision: 12, scale: 2 }).notNull().default("0"),
  soiledNotes: text("soiled_notes"),
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
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  isNightEntry: boolean("is_night_entry").notNull().default(false),
  narration: text("narration")
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
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  narration: text("narration")
});

export const dailyStaffAdvances = sqliteTable("daily_staff_advances", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => dailyClosingReports.id, { onDelete: "cascade" }),
  staffId: integer("staff_id"),
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

export const reportCategoryExclusions = sqliteTable("report_category_exclusions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull().default("monthly-report"),
  excludedCategories: jsonb("excluded_categories").notNull().default("[]"),
  ...timestamps
}, (table) => ({
  userReportUnique: unique().on(table.userId, table.reportType),
}));

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

// ---------------------------------------------------------------------------
// Bank Expenses (Monthly Fixed Expenses & Vendor Payables)
// ---------------------------------------------------------------------------

export const monthlyBankExpenses = sqliteTable("monthly_bank_expenses", {
  id: serial("id").primaryKey(),
  month: text("month").notNull(),                // "YYYY-MM" format
  category: text("category").notNull(),          // references expenseCategories.code / expenseCatalog
  label: text("label").notNull(),                // description of the expense
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMode: text("payment_mode").notNull().default("Bank Transfer"),
  paymentDate: text("payment_date"),             // YYYY-MM-DD (Clearance Date)
  chequeIssueDate: text("cheque_issue_date"),     // YYYY-MM-DD (Cheque / Instrument Issue Date)
  referenceNo: text("reference_no"),             // UTR / cheque no / transaction ref
  bankName: text("bank_name"),                   // which hospital bank account
  narration: text("narration"),
  isRecurring: boolean("is_recurring").notNull().default(false),
  isSalaryAuto: boolean("is_salary_auto").notNull().default(false),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  ...timestamps
});

export const monthlyBankExpensesRelations = relations(monthlyBankExpenses, ({ one }) => ({
  vendor: one(vendors, { fields: [monthlyBankExpenses.vendorId], references: [vendors.id] }),
  creator: one(user, { fields: [monthlyBankExpenses.createdBy], references: [user.id] }),
}));

// ---------------------------------------------------------------------------
// Bank Accounts Master (Entity-tagged Accounts)
// ---------------------------------------------------------------------------

export const bankAccounts = sqliteTable("bank_accounts", {
  id: serial("id").primaryKey(),
  accountName: text("account_name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  ifscCode: text("ifsc_code"),
  branchName: text("branch_name"),
  accountType: text("account_type").notNull().default("Current"), // Current, Savings, OD, CC
  legalEntity: text("legal_entity").notNull().default("ACME_HOSPITAL"), // ACME_HOSPITAL | ACME_NURSING | HUMANKIND
  openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
  active: boolean("active").notNull().default(true),
  notes: text("notes"),
  ...timestamps
});

// Purchase Orders Module Enums
export const poStatusEnum = pgEnum("po_status", ["open", "partial", "closed", "cancelled"]);
export const poPaymentStatusEnum = pgEnum("po_payment_status", ["unpaid", "partial", "paid"]);
export const paymentModeEnum = pgEnum("payment_mode", ["cash", "upi", "card", "rtgs", "cheque", "other"]);

// Purchase Orders Module Tables
export const itemTypes = sqliteTable("item_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
});

export const unitTypes = sqliteTable("unit_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  symbol: text("symbol").notNull(),
  category: text("category").notNull().default("Count/Quantity"),
  isBaseUnit: boolean("is_base_unit").notNull().default(false),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
});

export const unitConversions = sqliteTable("unit_conversions", {
  id: serial("id").primaryKey(),
  fromUnitId: integer("from_unit_id").notNull().references(() => unitTypes.id, { onDelete: "cascade" }),
  toUnitId: integer("to_unit_id").notNull().references(() => unitTypes.id, { onDelete: "cascade" }),
  multiplier: numeric("multiplier", { precision: 12, scale: 6, mode: "number" }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
});


export const items = sqliteTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  itemTypeId: integer("item_type_id").notNull().references(() => itemTypes.id),
  unit: text("unit").notNull(),
  purchaseUnit: text("purchase_unit"),
  saleUnit: text("sale_unit"),
  rate: numeric("rate", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  salePrice: numeric("sale_price", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
});

export const itemUnitPrices = sqliteTable("item_unit_prices", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => items.id, { onDelete: "cascade" }),
  unit: text("unit").notNull(),
  costPrice: numeric("cost_price", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  salePrice: numeric("sale_price", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  conversionFactor: numeric("conversion_factor", { precision: 12, scale: 6, mode: "number" }).notNull().default(1),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
});

export const itemTypesRelations = relations(itemTypes, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one, many }) => ({
  itemType: one(itemTypes, { fields: [items.itemTypeId], references: [itemTypes.id] }),
  unitPrices: many(itemUnitPrices),
}));

export const itemUnitPricesRelations = relations(itemUnitPrices, ({ one }) => ({
  item: one(items, { fields: [itemUnitPrices.itemId], references: [items.id] }),
}));


export const unitTypesRelations = relations(unitTypes, ({ many }) => ({
  conversionsFrom: many(unitConversions, { relationName: "fromUnit" }),
  conversionsTo: many(unitConversions, { relationName: "toUnit" }),
}));

export const unitConversionsRelations = relations(unitConversions, ({ one }) => ({
  fromUnit: one(unitTypes, { fields: [unitConversions.fromUnitId], references: [unitTypes.id], relationName: "fromUnit" }),
  toUnit: one(unitTypes, { fields: [unitConversions.toUnitId], references: [unitTypes.id], relationName: "toUnit" }),
}));


export const vendors = sqliteTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  gstNumber: text("gst_number"),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
});

export const purchaseOrders = sqliteTable("purchase_orders", {
  id: serial("id").primaryKey(),
  poNo: text("po_no").unique().notNull(),
  poDate: date("po_date").notNull(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  poStatus: poStatusEnum("po_status").notNull().default("open"),
  paymentStatus: poPaymentStatusEnum("payment_status").notNull().default("unpaid"),
  totalValue: numeric("total_value", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  remarks: text("remarks"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
});

export const poItems = sqliteTable("po_items", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  category: text("category"),
  unit: text("unit"),
  orderedQty: numeric("ordered_qty", { precision: 12, scale: 2, mode: "number" }).notNull(),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2, mode: "number" }).notNull(),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
  lineValue: numeric("line_value", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const grnStatusEnum = pgEnum("grn_status", ["draft", "posted", "correction"]);

export const grns = sqliteTable("grns", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").references(() => purchaseOrders.id),
  vendorId: integer("vendor_id").references(() => vendors.id),
  noPoReason: text("no_po_reason"),
  grnNo: text("grn_no").unique().notNull(),
  grnDate: date("grn_date").notNull(),
  dateOfDelivery: date("date_of_delivery"),
  remarks: text("remarks"),
  status: grnStatusEnum("status").notNull().default("draft"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

export const grnItems = sqliteTable("grn_items", {
  id: serial("id").primaryKey(),
  grnId: integer("grn_id").notNull().references(() => grns.id, { onDelete: "cascade" }),
  poItemId: integer("po_item_id").references(() => poItems.id),
  itemId: integer("item_id").references(() => items.id),
  itemName: text("item_name"),
  unit: text("unit"),
  receivedQty: numeric("received_qty", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  freeQty: numeric("free_qty", { precision: 12, scale: 2, mode: "number" }).notNull().default(0),
  unitRate: numeric("unit_rate", { precision: 12, scale: 2, mode: "number" }),
  salePrice: numeric("sale_price", { precision: 12, scale: 2, mode: "number" }),
  gstPercent: numeric("gst_percent", { precision: 5, scale: 2, mode: "number" }),
  lineValue: numeric("line_value", { precision: 12, scale: 2, mode: "number" }),
  batch: text("batch"),
  expiryDate: date("expiry_date"),
  notes: text("notes")
});

export const poPayments = sqliteTable("po_payments", {
  id: serial("id").primaryKey(),
  poId: integer("po_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  paymentDate: date("payment_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  referenceNo: text("reference_no"),
  remarks: text("remarks"),
  createdBy: text("created_by").references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Relations Definitions
export const vendorsRelations = relations(vendors, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  vendor: one(vendors, { fields: [purchaseOrders.vendorId], references: [vendors.id] }),
  createdBy: one(user, { fields: [purchaseOrders.createdBy], references: [user.id] }),
  items: many(poItems),
  grns: many(grns),
  payments: many(poPayments),
}));

export const poItemsRelations = relations(poItems, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [poItems.poId], references: [purchaseOrders.id] }),
  grnItems: many(grnItems),
}));

export const grnsRelations = relations(grns, ({ one, many }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [grns.poId], references: [purchaseOrders.id] }),
  vendor: one(vendors, { fields: [grns.vendorId], references: [vendors.id] }),
  createdBy: one(user, { fields: [grns.createdBy], references: [user.id] }),
  items: many(grnItems),
}));

export const grnItemsRelations = relations(grnItems, ({ one }) => ({
  grn: one(grns, { fields: [grnItems.grnId], references: [grns.id] }),
  poItem: one(poItems, { fields: [grnItems.poItemId], references: [poItems.id] }),
  item: one(items, { fields: [grnItems.itemId], references: [items.id] }),
}));

export const poPaymentsRelations = relations(poPayments, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, { fields: [poPayments.poId], references: [purchaseOrders.id] }),
  createdBy: one(user, { fields: [poPayments.createdBy], references: [user.id] }),
}));

// ===========================================================================
// Nursing College Module Schemas (Phase 1 & Phase 2)
// ===========================================================================

export const nursingCourses = sqliteTable("nursing_courses", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  durationYears: integer("duration_years").notNull().default(3),
  totalSeats: integer("total_seats").notNull().default(60),
  regulatoryBody: text("regulatory_body").notNull().default("INC / State Council"),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const nursingBatches = sqliteTable("nursing_batches", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => nursingCourses.id, { onDelete: "cascade" }),
  academicYear: text("academic_year").notNull(),
  section: text("section").notNull().default("A"),
  maxSeats: integer("max_seats").notNull().default(60),
  startDate: text("start_date"),
  endDate: text("end_date"),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const nursingReferrers = sqliteTable("nursing_referrers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  comments: text("comments"),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const nursingApplicants = sqliteTable("nursing_applicants", {
  id: serial("id").primaryKey(),
  applicationNo: text("application_no").notNull().unique(),
  courseId: integer("course_id").notNull().references(() => nursingCourses.id),
  academicYear: text("academic_year").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  aadharNo: text("aadhar_no"),
  gender: text("gender").notNull().default("Female"),
  dob: text("dob"),
  address: text("address"),
  // Referrer Details
  referrerId: integer("referrer_id").references(() => nursingReferrers.id, { onDelete: "set null" }),
  referralAmount: text("referral_amount"),
  referralComments: text("referral_comments"),
  // Parents Information
  fatherDeceased: boolean("father_deceased").default(false),
  fatherName: text("father_name"),
  fatherPhone: text("father_phone"),
  fatherAadharNo: text("father_aadhar_no"),
  fatherOccupation: text("father_occupation"),
  fatherOrganization: text("father_organization"),
  fatherAnnualIncome: numeric("father_annual_income", { precision: 14, scale: 2 }),
  motherDeceased: boolean("mother_deceased").default(false),
  motherName: text("mother_name"),
  motherPhone: text("mother_phone"),
  motherAadharNo: text("mother_aadhar_no"),
  motherOccupation: text("mother_occupation"),
  motherOrganization: text("mother_organization"),
  motherAnnualIncome: numeric("mother_annual_income", { precision: 14, scale: 2 }),
  // Guardian Information
  hasGuardian: boolean("has_guardian").default(false),
  guardianName: text("guardian_name"),
  guardianRelation: text("guardian_relation"),
  guardianPhone: text("guardian_phone"),
  guardianAadharNo: text("guardian_aadhar_no"),
  guardianOccupation: text("guardian_occupation"),
  guardianOrganization: text("guardian_organization"),
  guardianAnnualIncome: numeric("guardian_annual_income", { precision: 14, scale: 2 }),
  // Addresses (Present and Permanent)
  presentAddress: text("present_address"),
  presentDistrict: text("present_district"),
  presentPincode: text("present_pincode"),
  presentState: text("present_state"),
  permanentAddress: text("permanent_address"),
  permanentDistrict: text("permanent_district"),
  permanentPincode: text("permanent_pincode"),
  permanentState: text("permanent_state"),
  // Exams Passed (10th, 11th, 12th) with University/Board, Year, Subjects, Percentages
  academicHistory: jsonb("academic_history"),
  entranceMeritScore: numeric("entrance_merit_score", { precision: 5, scale: 2 }).notNull().default("0"),
  quotaCategory: text("quota_category").notNull().default("general"), // general, reserved, management
  status: text("status").notNull().default("pending"), // pending, approved, rejected, converted
  notes: text("notes"),
  seatBookingAmount: numeric("seat_booking_amount", { precision: 12, scale: 2 }).default("0"),
  seatBookingStatus: text("seat_booking_status").default("none"), // none, unadjusted, adjusted, refunded
  seatBookingReceiptNo: text("seat_booking_receipt_no"),
  seatBookingDate: text("seat_booking_date"),
  seatBookingPaymentMode: text("seat_booking_payment_mode"),
  seatBookingNotes: text("seat_booking_notes"),
  ...timestamps
});

export const nursingStudents = sqliteTable("nursing_students", {
  id: serial("id").primaryKey(),
  applicantId: integer("applicant_id").references(() => nursingApplicants.id, { onDelete: "set null" }),
  batchId: integer("batch_id").notNull().references(() => nursingBatches.id),
  enrollmentNo: text("enrollment_no").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  aadharNo: text("aadhar_no"),
  gender: text("gender").notNull().default("Female"),
  dob: text("dob"),
  address: text("address"),
  // Referrer Details
  referrerId: integer("referrer_id").references(() => nursingReferrers.id, { onDelete: "set null" }),
  referralAmount: text("referral_amount"),
  referralComments: text("referral_comments"),
  // Parents Information
  fatherDeceased: boolean("father_deceased").default(false),
  fatherName: text("father_name"),
  fatherPhone: text("father_phone"),
  fatherAadharNo: text("father_aadhar_no"),
  fatherOccupation: text("father_occupation"),
  fatherOrganization: text("father_organization"),
  fatherAnnualIncome: numeric("father_annual_income", { precision: 14, scale: 2 }),
  motherDeceased: boolean("mother_deceased").default(false),
  motherName: text("mother_name"),
  motherPhone: text("mother_phone"),
  motherAadharNo: text("mother_aadhar_no"),
  motherOccupation: text("mother_occupation"),
  motherOrganization: text("mother_organization"),
  motherAnnualIncome: numeric("mother_annual_income", { precision: 14, scale: 2 }),
  // Guardian Information
  hasGuardian: boolean("has_guardian").default(false),
  guardianName: text("guardian_name"),
  guardianRelation: text("guardian_relation"),
  guardianPhone: text("guardian_phone"),
  guardianAadharNo: text("guardian_aadhar_no"),
  guardianOccupation: text("guardian_occupation"),
  guardianOrganization: text("guardian_organization"),
  guardianAnnualIncome: numeric("guardian_annual_income", { precision: 14, scale: 2 }),
  // Addresses (Present and Permanent)
  presentAddress: text("present_address"),
  presentDistrict: text("present_district"),
  presentPincode: text("present_pincode"),
  presentState: text("present_state"),
  permanentAddress: text("permanent_address"),
  permanentDistrict: text("permanent_district"),
  permanentPincode: text("permanent_pincode"),
  permanentState: text("permanent_state"),
  // Exams Passed
  academicHistory: jsonb("academic_history"),
  status: text("status").notNull().default("active"), // active, promoted, graduated, dropped, transferred
  admissionDate: text("admission_date"),
  ...timestamps
});

export const nursingStudentDocuments = sqliteTable("nursing_student_documents", {
  id: serial("id").primaryKey(),
  applicantId: integer("applicant_id").references(() => nursingApplicants.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => nursingStudents.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(), // certificate, medical_fitness, id_proof, mark_sheet, other
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  verificationStatus: text("verification_status").notNull().default("pending"), // pending, verified, rejected
  verifiedBy: text("verified_by").references(() => user.id),
  verifiedAt: timestamp("verified_at"),
  ...timestamps
});

export const nursingFeeStructures = sqliteTable("nursing_fee_structures", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => nursingCourses.id, { onDelete: "cascade" }),
  quotaCategory: text("quota_category").notNull().default("general"),
  academicYear: text("academic_year").notNull(),
  feeType: text("fee_type").notNull().default("Tuition & Composite Fee"),
  paymentFrequency: text("payment_frequency").notNull().default("yearly"), // one_time, yearly, semester, quarterly, monthly
  oneTimeRebatePercent: numeric("one_time_rebate_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  tuitionFee: numeric("tuition_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  admissionFee: numeric("admission_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  securityDeposit: numeric("security_deposit", { precision: 12, scale: 2 }).notNull().default("0"),
  uniformFee: numeric("uniform_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  hostelFee: numeric("hostel_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  hostelMessMonthlyFee: numeric("hostel_mess_monthly_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  examFee: numeric("exam_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  miscFee: numeric("misc_fee", { precision: 12, scale: 2 }).notNull().default("0"),
  rebatesConfig: text("rebates_config"),
  surchargesConfig: text("surcharges_config"),
  componentsConfig: text("components_config"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  ...timestamps
}, (t) => [
  uniqueIndex("nursing_fee_structures_course_year_quota_idx").on(t.courseId, t.academicYear, t.quotaCategory),
]);

export const nursingFeeTransactions = sqliteTable("nursing_fee_transactions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => nursingStudents.id, { onDelete: "cascade" }),
  applicantId: integer("applicant_id").references(() => nursingApplicants.id, { onDelete: "set null" }),
  feeStructureId: integer("fee_structure_id").references(() => nursingFeeStructures.id),
  invoiceNo: text("invoice_no").notNull(),
  receiptNumber: text("receipt_number").notNull().unique(),
  feeType: text("fee_type"),
  paymentFrequency: text("payment_frequency"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMode: text("payment_mode").notNull().default("cash"), // cash, bank_transfer, upi, card, cheque
  paymentDate: text("payment_date").notNull(),
  status: text("status").notNull().default("paid"), // paid, pending, partially_paid, refunded, adjusted
  remarks: jsonb("remarks"),
  collectedBy: text("collected_by").references(() => user.id),
  ...timestamps
});

export const nursingStudentFeeFrequencies = sqliteTable("nursing_student_fee_frequencies", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => nursingStudents.id, { onDelete: "cascade" }),
  academicYear: text("academic_year").notNull(), // e.g. "2025-2026"
  componentId: text("component_id"),
  componentName: text("component_name").notNull(),
  frequencyKey: text("frequency_key").notNull(), // "monthly", "quarterly", "semester", "annually", "one_time"
  frequencyLabel: text("frequency_label"),
  installmentCount: integer("installment_count").notNull().default(1),
  baseAmount: numeric("base_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  installmentAmount: numeric("installment_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  lockedAt: timestamp("locked_at").notNull().defaultNow(),
  ...timestamps
}, (t) => [
  uniqueIndex("nursing_student_fee_frequencies_unique_idx").on(t.studentId, t.academicYear, t.componentName),
]);

export const nursingAttendanceRecords = sqliteTable("nursing_attendance_records", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => nursingStudents.id, { onDelete: "cascade" }),
  batchId: integer("batch_id").notNull().references(() => nursingBatches.id, { onDelete: "cascade" }),
  sessionDate: date("session_date").notNull(),
  subjectName: text("subject_name"),
  sessionType: text("session_type").notNull().default("theory"), // theory, practical
  status: text("status").notNull().default("present"), // present, absent, late, leave
  markedBy: text("marked_by").references(() => user.id),
  ...timestamps
});

export const nursingAuditLogs = sqliteTable("nursing_audit_logs", {
  id: serial("id").primaryKey(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  changedBy: text("changed_by").references(() => user.id),
  diff: jsonb("diff"),
  changedAt: timestamp("changed_at").notNull().defaultNow()
});

export const nursingSubjects = sqliteTable("nursing_subjects", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => nursingCourses.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  year: integer("year").notNull().default(1),
  semester: integer("semester").notNull().default(1),
  theoryMaxMarks: integer("theory_max_marks").notNull().default(75),
  practicalMaxMarks: integer("practical_max_marks").notNull().default(25),
  credits: integer("credits").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps
});

export const nursingAcademicSchedules = sqliteTable("nursing_academic_schedules", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => nursingBatches.id, { onDelete: "cascade" }),
  academicYear: text("academic_year").notNull(),
  semester: integer("semester").notNull().default(1),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  feeDueDate: text("fee_due_date"),
  feeDueOffsetDays: integer("fee_due_offset_days").notNull().default(15),
  remarks: text("remarks"),
  ...timestamps
});

// Nursing Relations Definitions
export const nursingCoursesRelations = relations(nursingCourses, ({ many }) => ({
  batches: many(nursingBatches),
  applicants: many(nursingApplicants),
  feeStructures: many(nursingFeeStructures),
  subjects: many(nursingSubjects),
}));

export const nursingBatchesRelations = relations(nursingBatches, ({ one, many }) => ({
  course: one(nursingCourses, { fields: [nursingBatches.courseId], references: [nursingCourses.id] }),
  students: many(nursingStudents),
  attendanceRecords: many(nursingAttendanceRecords),
  academicSchedules: many(nursingAcademicSchedules),
}));

export const nursingAcademicSchedulesRelations = relations(nursingAcademicSchedules, ({ one }) => ({
  batch: one(nursingBatches, { fields: [nursingAcademicSchedules.batchId], references: [nursingBatches.id] }),
}));

export const nursingReferrerPayments = sqliteTable("nursing_referrer_payments", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").notNull().references(() => nursingReferrers.id, { onDelete: "cascade" }),
  voucherNo: text("voucher_no").notNull().unique(),
  paymentDate: text("payment_date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentMode: text("payment_mode").notNull().default("cash"), // cash, bank_transfer, upi, cheque, card
  referenceNumber: text("reference_number"), // UTR / Cheque No / Tx ID
  paidBy: text("paid_by").references(() => user.id),
  notes: text("notes"),
  ...timestamps
});

export const nursingReferrerPaymentAllocations = sqliteTable("nursing_referrer_payment_allocations", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").notNull().references(() => nursingReferrerPayments.id, { onDelete: "cascade" }),
  studentId: integer("student_id").references(() => nursingStudents.id, { onDelete: "set null" }),
  applicantId: integer("applicant_id").references(() => nursingApplicants.id, { onDelete: "set null" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  ...timestamps
});

export const nursingReferrersRelations = relations(nursingReferrers, ({ many }) => ({
  applicants: many(nursingApplicants),
  students: many(nursingStudents),
  payments: many(nursingReferrerPayments),
}));

export const nursingApplicantsRelations = relations(nursingApplicants, ({ one, many }) => ({
  course: one(nursingCourses, { fields: [nursingApplicants.courseId], references: [nursingCourses.id] }),
  referrer: one(nursingReferrers, { fields: [nursingApplicants.referrerId], references: [nursingReferrers.id] }),
  documents: many(nursingStudentDocuments),
  student: one(nursingStudents, { fields: [nursingApplicants.id], references: [nursingStudents.applicantId] }),
  feeTransactions: many(nursingFeeTransactions),
  referrerPaymentAllocations: many(nursingReferrerPaymentAllocations),
}));

export const nursingStudentsRelations = relations(nursingStudents, ({ one, many }) => ({
  applicant: one(nursingApplicants, { fields: [nursingStudents.applicantId], references: [nursingApplicants.id] }),
  referrer: one(nursingReferrers, { fields: [nursingStudents.referrerId], references: [nursingReferrers.id] }),
  batch: one(nursingBatches, { fields: [nursingStudents.batchId], references: [nursingBatches.id] }),
  documents: many(nursingStudentDocuments),
  feeTransactions: many(nursingFeeTransactions),
  feeFrequencies: many(nursingStudentFeeFrequencies),
  attendanceRecords: many(nursingAttendanceRecords),
  referrerPaymentAllocations: many(nursingReferrerPaymentAllocations),
}));

export const nursingStudentFeeFrequenciesRelations = relations(nursingStudentFeeFrequencies, ({ one }) => ({
  student: one(nursingStudents, { fields: [nursingStudentFeeFrequencies.studentId], references: [nursingStudents.id] }),
}));

export const nursingStudentDocumentsRelations = relations(nursingStudentDocuments, ({ one }) => ({
  applicant: one(nursingApplicants, { fields: [nursingStudentDocuments.applicantId], references: [nursingApplicants.id] }),
  student: one(nursingStudents, { fields: [nursingStudentDocuments.studentId], references: [nursingStudents.id] }),
  verifiedByUser: one(user, { fields: [nursingStudentDocuments.verifiedBy], references: [user.id] }),
}));

export const nursingFeeStructuresRelations = relations(nursingFeeStructures, ({ one, many }) => ({
  course: one(nursingCourses, { fields: [nursingFeeStructures.courseId], references: [nursingCourses.id] }),
  transactions: many(nursingFeeTransactions),
}));

export const nursingFeeTransactionsRelations = relations(nursingFeeTransactions, ({ one }) => ({
  student: one(nursingStudents, { fields: [nursingFeeTransactions.studentId], references: [nursingStudents.id] }),
  applicant: one(nursingApplicants, { fields: [nursingFeeTransactions.applicantId], references: [nursingApplicants.id] }),
  feeStructure: one(nursingFeeStructures, { fields: [nursingFeeTransactions.feeStructureId], references: [nursingFeeStructures.id] }),
  collectedByUser: one(user, { fields: [nursingFeeTransactions.collectedBy], references: [user.id] }),
}));

export const nursingAttendanceRecordsRelations = relations(nursingAttendanceRecords, ({ one }) => ({
  student: one(nursingStudents, { fields: [nursingAttendanceRecords.studentId], references: [nursingStudents.id] }),
  batch: one(nursingBatches, { fields: [nursingAttendanceRecords.batchId], references: [nursingBatches.id] }),
  markedByUser: one(user, { fields: [nursingAttendanceRecords.markedBy], references: [user.id] }),
}));

export const nursingSubjectsRelations = relations(nursingSubjects, ({ one }) => ({
  course: one(nursingCourses, { fields: [nursingSubjects.courseId], references: [nursingCourses.id] }),
}));

export const nursingReferrerPaymentsRelations = relations(nursingReferrerPayments, ({ one, many }) => ({
  referrer: one(nursingReferrers, { fields: [nursingReferrerPayments.referrerId], references: [nursingReferrers.id] }),
  paidByUser: one(user, { fields: [nursingReferrerPayments.paidBy], references: [user.id] }),
  allocations: many(nursingReferrerPaymentAllocations),
}));

export const nursingReferrerPaymentAllocationsRelations = relations(nursingReferrerPaymentAllocations, ({ one }) => ({
  payment: one(nursingReferrerPayments, { fields: [nursingReferrerPaymentAllocations.paymentId], references: [nursingReferrerPayments.id] }),
  student: one(nursingStudents, { fields: [nursingReferrerPaymentAllocations.studentId], references: [nursingStudents.id] }),
  applicant: one(nursingApplicants, { fields: [nursingReferrerPaymentAllocations.applicantId], references: [nursingApplicants.id] }),
}));




