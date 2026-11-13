import { relations } from "drizzle-orm";
import {
  integer,
  text,
  timestamp,
  serial,
  numeric,
  pgSchema,
  date,
  jsonb,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user, staff } from "./schema.ts";

export const doctorCbtSchema = pgSchema("doctor_cbt");

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// 1. Master Table of Module Users (Staff + External Faculty / Assessors)
// ---------------------------------------------------------------------------
export const moduleUsers = doctorCbtSchema.table(
  "module_users",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    staffId: integer("staff_id"),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    mobile: text("mobile"),
    roleInModule: text("role_in_module").notNull().default("faculty_author"), // "module_admin", "faculty_author", "assessor"
    isExternal: boolean("is_external").notNull().default(false),
    institution: text("institution"), // Hospital or medical college affiliation
    designationTitle: text("designation_title"), // e.g. "Senior Consultant & HOD, Critical Care"
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_doctor_cbt_module_users_email").on(table.email),
  ]
);

// ---------------------------------------------------------------------------
// 2. Module Settings & Administration Configuration
// ---------------------------------------------------------------------------
export const moduleSettings = doctorCbtSchema.table("module_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(), // e.g. "assigned_module_admins", "default_pass_percentage", "enable_google_whitelist"
  settingValue: jsonb("setting_value").notNull(),
  updatedByUserId: text("updated_by_user_id").references(() => user.id, { onDelete: "set null" }),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 3. Doctor Profiles (Internal Staff Doctors & External Trainee Candidates)
// ---------------------------------------------------------------------------
export const doctorProfiles = doctorCbtSchema.table(
  "doctor_profiles",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    staffId: integer("staff_id"),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    mobile: text("mobile"),
    candidateId: text("candidate_id"), // e.g. "ACME-BRM-260101"
    address: text("address"), // Residential / clinic address
    universityInstitute: text("university_institute"), // Medical college / university
    yearOfPassing: text("year_of_passing"), // e.g. "2023", "2019 & 2025"
    experience: text("experience"), // e.g. "ENT Dept. JNIMS, 8 Months"
    nmcSmcNumber: text("nmc_smc_number"), // State / National Medical Council Registration Number
    qualifications: text("qualifications"), // e.g. "MBBS, MS OBGY"
    primarySpecialty: text("primary_specialty"), // e.g. "Critical Care", "Pediatrics"
    institutionName: text("institution_name"), // Medical college or hospital of origin
    candidateType: text("candidate_type").notNull().default("external_trainee"), // "internal_staff", "external_trainee"
    status: text("status").notNull().default("enrolled"), // "enrolled", "active", "alumni", "suspended"
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_doctor_cbt_profiles_email").on(table.email),
  ]
);

// ---------------------------------------------------------------------------
// 4. Programs / Fellowships / Courses Master
// ---------------------------------------------------------------------------
export const programs = doctorCbtSchema.table("programs", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "DOC-PROG-EM-01"
  title: text("title").notNull(), // e.g. "Fellowship in Emergency & Critical Care Medicine"
  specialty: text("specialty").notNull(), // e.g. "Emergency Medicine"
  durationMonths: integer("duration_months").notNull().default(6),
  totalCmeCredits: numeric("total_cme_credits", { precision: 5, scale: 2 }).notNull().default("10.00"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 5. Clinical Curriculum Topics (Continuous Assessment Nodes)
// ---------------------------------------------------------------------------
export const clinicalTopics = doctorCbtSchema.table("clinical_topics", {
  id: serial("id").primaryKey(),
  programId: integer("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(), // e.g. "TOPIC-AIRWAY-01"
  title: text("title").notNull(), // e.g. "Difficult Airway & Rapid Sequence Intubation"
  description: text("description"),
  cmeCredits: numeric("cme_credits", { precision: 4, scale: 2 }).notNull().default("1.00"),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 6. Doctor Program Enrollments
// ---------------------------------------------------------------------------
export const doctorEnrollments = doctorCbtSchema.table(
  "doctor_enrollments",
  {
    id: serial("id").primaryKey(),
    doctorId: integer("doctor_id")
      .notNull()
      .references(() => doctorProfiles.id, { onDelete: "cascade" }),
    programId: integer("program_id")
      .notNull()
      .references(() => programs.id, { onDelete: "cascade" }),
    batchCode: text("batch_code").notNull().default("2026-Q1"), // e.g. "2026-Batch-A"
    enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
    status: text("status").notNull().default("enrolled"), // "enrolled", "in_progress", "completed", "withdrawn"
    completedAt: timestamp("completed_at"),
    preTestRetakeAllowed: boolean("pre_test_retake_allowed").notNull().default(false),
    exitTestRetakeAllowed: boolean("exit_test_retake_allowed").notNull().default(false),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_doctor_cbt_enrollment_unique").on(table.doctorId, table.programId, table.batchCode),
  ]
);

// ---------------------------------------------------------------------------
// 7. Clinical Vignette Question Bank
// ---------------------------------------------------------------------------
export interface QuestionAttachment {
  type: "image" | "ecg" | "radiology" | "lab_report";
  url: string;
  caption?: string;
  attribution?: string;
}

export const questionBank = doctorCbtSchema.table("question_bank", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "Q-CC-AIRWAY-01"
  topicId: integer("topic_id")
    .notNull()
    .references(() => clinicalTopics.id, { onDelete: "cascade" }),
  difficulty: text("difficulty").notNull().default("core"), // "core", "advanced", "specialist"
  cognitiveLevel: text("cognitive_level").notNull().default("clinical_management"), // "recall", "diagnostic_interpretation", "clinical_management"
  clinicalVignette: text("clinical_vignette").notNull(), // Markdown describing patient presentation, vitals, history
  attachments: jsonb("attachments").$type<QuestionAttachment[]>().notNull().default([]), // ECG, X-Ray, CT slices
  questionPrompt: text("question_prompt").notNull(), // Question query
  options: jsonb("options").$type<string[]>().notNull(), // Array of 4 or 5 options
  correctOptionIndex: integer("correct_option_index").notNull(), // 0-indexed
  clinicalExplanation: text("clinical_explanation"), // Detailed rationale with medical guideline citations
  authorUserId: text("author_user_id").references(() => user.id, { onDelete: "set null" }),
  approvedByUserId: text("approved_by_user_id").references(() => user.id, { onDelete: "set null" }),
  status: text("status").notNull().default("approved"), // "draft", "approved", "archived"
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 8. Assessment Blueprints (Continuous Topic Tests & Mock Exams)
// ---------------------------------------------------------------------------
export const assessmentBlueprints = doctorCbtSchema.table("assessment_blueprints", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id")
    .notNull()
    .references(() => clinicalTopics.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // e.g. "Basic Course in Reproductive Medicine - Pre-Test Assessment"
  examType: text("exam_type").notNull().default("pre_test"), // "pre_test" | "exit_test"
  totalQuestions: integer("total_questions").notNull().default(20),
  durationMinutes: integer("duration_minutes").notNull().default(20),
  passingPercentage: numeric("passing_percentage", { precision: 5, scale: 2 }).notNull().default("75.00"),
  hasNegativeMarking: boolean("has_negative_marking").notNull().default(false),
  negativeMarkingPenalty: numeric("negative_marking_penalty", { precision: 4, scale: 2 }).notNull().default("0.25"), // e.g. 0.25 subtracted per wrong answer
  maxAttempts: integer("max_attempts"), // null = unlimited self-paced attempts
  allowRetakes: boolean("allow_retakes").notNull().default(false),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 9. Exam Sessions (Candidate Test Attempts)
// ---------------------------------------------------------------------------
export interface QuestionSnapshot {
  id: number;
  code: string;
  clinicalVignette: string;
  attachments: QuestionAttachment[];
  questionPrompt: string;
  options: string[];
  correctOptionIndex: number;
  clinicalExplanation?: string | null;
}

export const examSessions = doctorCbtSchema.table("exam_sessions", {
  id: serial("id").primaryKey(),
  attemptNo: text("attempt_no").notNull().unique(), // e.g. "DOC-ATT-2026-0001"
  enrollmentId: integer("enrollment_id")
    .notNull()
    .references(() => doctorEnrollments.id, { onDelete: "cascade" }),
  blueprintId: integer("blueprint_id")
    .notNull()
    .references(() => assessmentBlueprints.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  examType: text("exam_type").notNull().default("pre_test"), // "pre_test" | "exit_test"
  status: text("status").notNull().default("in_progress"), // "in_progress", "completed", "timed_out", "abandoned"
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  scorePercentage: numeric("score_percentage", { precision: 5, scale: 2 }).default("0"),
  rawScore: numeric("raw_score", { precision: 6, scale: 2 }).default("0"),
  totalPossibleMarks: numeric("total_possible_marks", { precision: 6, scale: 2 }).default("0"),
  passed: boolean("passed").default(false),
  correctCount: integer("correct_count").default(0),
  incorrectCount: integer("incorrect_count").default(0),
  unansweredCount: integer("unanswered_count").default(0),
  questionSnapshots: jsonb("question_snapshots").$type<QuestionSnapshot[]>().notNull().default([]),
  proctoringFlags: jsonb("proctoring_flags").default([]), // Array of window blur, tab switch events
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 10. Exam Session Answers
// ---------------------------------------------------------------------------
export const examSessionAnswers = doctorCbtSchema.table("exam_session_answers", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id")
    .notNull()
    .references(() => examSessions.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questionBank.id, { onDelete: "cascade" }),
  selectedOptionIndex: integer("selected_option_index"), // null if unanswered
  isCorrect: boolean("is_correct"),
  marksAwarded: numeric("marks_awarded", { precision: 5, scale: 2 }).default("0"),
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  flaggedForReview: boolean("flagged_for_review").default(false),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 11. Doctor Certificates & Credentialing
// ---------------------------------------------------------------------------
export const doctorCertificates = doctorCbtSchema.table("doctor_certificates", {
  id: serial("id").primaryKey(),
  certificateNo: text("certificate_no").notNull().unique(), // e.g. "CERT-DOC-2026-0001"
  certificateType: text("certificate_type").notNull().default("modular_topic"), // "modular_topic", "program_milestone"
  enrollmentId: integer("enrollment_id")
    .notNull()
    .references(() => doctorEnrollments.id, { onDelete: "cascade" }),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  topicId: integer("topic_id").references(() => clinicalTopics.id, { onDelete: "set null" }),
  programId: integer("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  issueDate: date("issue_date").notNull(),
  cmeCreditsAwarded: numeric("cme_credits_awarded", { precision: 5, scale: 2 }).notNull().default("1.00"),
  verificationToken: text("verification_token").notNull().unique(), // UUID for public QR verification
  qrCodePayload: text("qr_code_payload").notNull(),
  pdfStoragePath: text("pdf_storage_path"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 12. Doctor Program Fee & Payment Transactions
// ---------------------------------------------------------------------------
export const doctorPayments = doctorCbtSchema.table("doctor_payments", {
  id: serial("id").primaryKey(),
  doctorId: integer("doctor_id")
    .notNull()
    .references(() => doctorProfiles.id, { onDelete: "cascade" }),
  enrollmentId: integer("enrollment_id")
    .references(() => doctorEnrollments.id, { onDelete: "set null" }),
  candidateId: text("candidate_id"), // e.g. "ACME-BRM-260101"
  receiptNo: text("receipt_no"), // e.g. "REC-BRM-2026-0001"
  paymentTerm: text("payment_term").notNull(), // "Advance", "1st Installment", "2nd Installment", "Full Payment"
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull(), // "Online (Gpay)", "Online (Phonepe)", "NEFT", "Cash"
  transactionId: text("transaction_id"), // UTR / bank reference number
  paymentDate: date("payment_date").notNull(),
  status: text("status").notNull().default("verified"), // "verified", "pending", "refunded"
  notes: text("notes"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Relations Definitions
// ---------------------------------------------------------------------------
export const moduleUsersRelations = relations(moduleUsers, ({ one }) => ({
  user: one(user, {
    fields: [moduleUsers.userId],
    references: [user.id],
  }),
  staff: one(staff, {
    fields: [moduleUsers.staffId],
    references: [staff.staffId],
  }),
}));

export const doctorProfilesRelations = relations(doctorProfiles, ({ one, many }) => ({
  user: one(user, {
    fields: [doctorProfiles.userId],
    references: [user.id],
  }),
  staff: one(staff, {
    fields: [doctorProfiles.staffId],
    references: [staff.staffId],
  }),
  enrollments: many(doctorEnrollments),
  sessions: many(examSessions),
  certificates: many(doctorCertificates),
  payments: many(doctorPayments),
}));

export const doctorPaymentsRelations = relations(doctorPayments, ({ one }) => ({
  doctor: one(doctorProfiles, {
    fields: [doctorPayments.doctorId],
    references: [doctorProfiles.id],
  }),
  enrollment: one(doctorEnrollments, {
    fields: [doctorPayments.enrollmentId],
    references: [doctorEnrollments.id],
  }),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  topics: many(clinicalTopics),
  enrollments: many(doctorEnrollments),
  certificates: many(doctorCertificates),
}));

export const clinicalTopicsRelations = relations(clinicalTopics, ({ one, many }) => ({
  program: one(programs, {
    fields: [clinicalTopics.programId],
    references: [programs.id],
  }),
  questions: many(questionBank),
  blueprints: many(assessmentBlueprints),
}));

export const doctorEnrollmentsRelations = relations(doctorEnrollments, ({ one, many }) => ({
  doctor: one(doctorProfiles, {
    fields: [doctorEnrollments.doctorId],
    references: [doctorProfiles.id],
  }),
  program: one(programs, {
    fields: [doctorEnrollments.programId],
    references: [programs.id],
  }),
  sessions: many(examSessions),
  certificates: many(doctorCertificates),
}));

export const questionBankRelations = relations(questionBank, ({ one }) => ({
  topic: one(clinicalTopics, {
    fields: [questionBank.topicId],
    references: [clinicalTopics.id],
  }),
  authorUser: one(user, {
    fields: [questionBank.authorUserId],
    references: [user.id],
  }),
  approvedByUser: one(user, {
    fields: [questionBank.approvedByUserId],
    references: [user.id],
  }),
}));

export const assessmentBlueprintsRelations = relations(assessmentBlueprints, ({ one, many }) => ({
  topic: one(clinicalTopics, {
    fields: [assessmentBlueprints.topicId],
    references: [clinicalTopics.id],
  }),
  sessions: many(examSessions),
}));

export const examSessionsRelations = relations(examSessions, ({ one, many }) => ({
  enrollment: one(doctorEnrollments, {
    fields: [examSessions.enrollmentId],
    references: [doctorEnrollments.id],
  }),
  blueprint: one(assessmentBlueprints, {
    fields: [examSessions.blueprintId],
    references: [assessmentBlueprints.id],
  }),
  doctor: one(doctorProfiles, {
    fields: [examSessions.doctorId],
    references: [doctorProfiles.id],
  }),
  answers: many(examSessionAnswers),
}));

export const examSessionAnswersRelations = relations(examSessionAnswers, ({ one }) => ({
  session: one(examSessions, {
    fields: [examSessionAnswers.sessionId],
    references: [examSessions.id],
  }),
  question: one(questionBank, {
    fields: [examSessionAnswers.questionId],
    references: [questionBank.id],
  }),
}));

export const doctorCertificatesRelations = relations(doctorCertificates, ({ one }) => ({
  enrollment: one(doctorEnrollments, {
    fields: [doctorCertificates.enrollmentId],
    references: [doctorEnrollments.id],
  }),
  doctor: one(doctorProfiles, {
    fields: [doctorCertificates.doctorId],
    references: [doctorProfiles.id],
  }),
  topic: one(clinicalTopics, {
    fields: [doctorCertificates.topicId],
    references: [clinicalTopics.id],
  }),
  program: one(programs, {
    fields: [doctorCertificates.programId],
    references: [programs.id],
  }),
}));
