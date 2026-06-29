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

export const banks = sqliteTable("banks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
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
  isOffDay: integer("is_off_day", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
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
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  ...timestamps
});

export const staffHrProfiles = sqliteTable("staff_hr_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  staffId: integer("staff_id").notNull().unique().references(() => staff.id, { onDelete: "cascade" }),
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

export const patients = sqliteTable("patients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => staff.id),
  departmentId: integer("department_id").notNull().references(() => departments.id),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Waiting"),
  token: text("token").notNull(),
  ...timestamps
});

export const encounters = sqliteTable("encounters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appointmentId: integer("appointment_id").notNull().references(() => appointments.id),
  symptoms: text("symptoms").notNull(),
  diagnosis: text("diagnosis"),
  vitals: text("vitals"),
  notes: text("notes"),
  ...timestamps
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  quantity: integer("quantity").notNull(),
  reorderLevel: integer("reorder_level").notNull(),
  supplier: text("supplier").notNull(),
  location: text("location").notNull(),
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
  ...timestamps
});

export const medicines = sqliteTable("medicines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  genericName: text("generic_name").notNull(),
  form: text("form").notNull(),
  strength: text("strength").notNull(),
  stock: integer("stock").notNull(),
  reorderLevel: integer("reorder_level").notNull(),
  price: real("price").notNull(),
  batchNo: text("batch_no").notNull(),
  expiryDate: integer("expiry_date", { mode: "timestamp" }).notNull(),
  ...timestamps
});

export const prescriptions = sqliteTable("prescriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  doctorId: integer("doctor_id").notNull().references(() => staff.id),
  encounterId: integer("encounter_id").references(() => encounters.id),
  status: text("status").notNull().default("Open"),
  ...timestamps
});

export const prescriptionLines = sqliteTable("prescription_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  prescriptionId: integer("prescription_id").notNull().references(() => prescriptions.id, { onDelete: "cascade" }),
  medicineId: integer("medicine_id").notNull().references(() => medicines.id),
  dosage: text("dosage").notNull(),
  duration: text("duration").notNull(),
  quantity: integer("quantity").notNull(),
  instructions: text("instructions").notNull()
});

export const immunizationSchedules = sqliteTable("immunization_schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps
});

export const immunizationRecords = sqliteTable("immunization_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  scheduleId: integer("schedule_id").references(() => immunizationSchedules.id, { onDelete: "set null" }),
  vaccineCode: text("vaccine_code").notNull(),
  vaccineName: text("vaccine_name").notNull(),
  doseLabel: text("dose_label").notNull(),
  administeredAt: text("administered_at").notNull(),
  administeredByStaffId: integer("administered_by_staff_id").references(() => staff.id, { onDelete: "set null" }),
  batchNo: text("batch_no"),
  manufacturer: text("manufacturer"),
  site: text("site"),
  route: text("route"),
  adverseEvent: text("adverse_event"),
  notes: text("notes"),
  status: text("status").notNull().default("Administered"),
  ...timestamps
});

export const staffRelations = relations(staff, ({ many, one }) => ({
  leaveRequests: many(leaveRequests),
  salaryStructure: one(staffSalaries),
  hrProfile: one(staffHrProfiles),
  payslips: many(payslips),
  attendanceLogs: many(attendance),
  biometricMapping: one(biometricMappings)
}));

export const staffSalariesRelations = relations(staffSalaries, ({ one }) => ({
  staff: one(staff, { fields: [staffSalaries.staffId], references: [staff.id] })
}));

export const staffHrProfilesRelations = relations(staffHrProfiles, ({ one }) => ({
  staff: one(staff, { fields: [staffHrProfiles.staffId], references: [staff.id] })
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
  administeredBy: one(staff, { fields: [immunizationRecords.administeredByStaffId], references: [staff.id] })
}));

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("info"),
  link: text("link"),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  ...timestamps
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, { fields: [notifications.userId], references: [user.id] })
}));

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  senderId: text("sender_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  receiverId: text("receiver_id").references(() => user.id, { onDelete: "cascade" }),
  channelType: text("channel_type").notNull().default("organization"), // "direct" | "department" | "organization"
  departmentId: integer("department_id").references(() => departments.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(user, { fields: [messages.senderId], references: [user.id] }),
  receiver: one(user, { fields: [messages.receiverId], references: [user.id] }),
  department: one(departments, { fields: [messages.departmentId], references: [departments.id] }),
}));

