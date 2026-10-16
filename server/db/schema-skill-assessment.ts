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
import { user, staff, departments } from "./schema.ts";
import type { ExamQuestionSnapshot } from "../services/skill-assessment-engine.ts";

export const skillAssessmentSchema = pgSchema("skill_assessment");

const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// 1. NABH Competency Domains (e.g. HIC, MOM, PSQ, BLS, PROCEDURES, DOC_COMM)
// ---------------------------------------------------------------------------
export const competencyDomains = skillAssessmentSchema.table("competency_domains", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "HIC", "PSQ", "MOM", "COP_BLS", "PROCEDURES", "DOC_COMM"
  name: text("name").notNull(), // e.g. "Hospital Infection Control (HIC)"
  nabhStandardRef: text("nabh_standard_ref"), // e.g. "NABH 5th Ed: HIC.2, HIC.3"
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 2. Competency Criteria / Guidelines (Theoretical and Practical Objectives)
// ---------------------------------------------------------------------------
export const competencyCriteria = skillAssessmentSchema.table("competency_criteria", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id")
    .notNull()
    .references(() => competencyDomains.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(), // e.g. "HIC-01", "MOM-02", "BLS-01"
  title: text("title").notNull(), // e.g. "Five Moments of Hand Hygiene & Aseptic Technique"
  description: text("description").notNull(),
  clinicalScenario: text("clinical_scenario"), // Clinical case simulation / scenario presented during evaluation
  skillType: text("skill_type").notNull().default("both"), // "theoretical", "practical", "both"
  theoreticalGuideline: text("theoretical_guideline").notNull(), // Theoretical knowledge expected & questionnaire prompts
  practicalGuideline: text("practical_guideline").notNull(), // Practical / clinical skill demonstration checklist & OSCE rubric
  targetScore: numeric("target_score", { precision: 4, scale: 2 }).notNull().default("4.00"), // Benchmark out of 5
  weightage: numeric("weightage", { precision: 4, scale: 2 }).notNull().default("1.00"),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 3. Assessment Cycles (Periodic NABH Audit Cycles)
// ---------------------------------------------------------------------------
export const assessmentCycles = skillAssessmentSchema.table("assessment_cycles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().unique(), // e.g. "Annual NABH Clinical Staff Competency Audit 2026"
  year: integer("year").notNull().default(2026),
  quarter: text("quarter"), // "Q1", "Q2", "Q3", "Q4", "Annual", "Probation"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").notNull().default("active"), // "draft", "active", "closed"
  description: text("description"),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 4. Staff Skill Assessments (Master Header)
// Workflow: draft -> submitted_to_incharge -> submitted_to_nursing_super -> submitted_to_hr -> completed
// Enforces uniqueness for staff + assessment period (cycle_id)
// ---------------------------------------------------------------------------
export const staffSkillAssessments = skillAssessmentSchema.table(
  "staff_skill_assessments",
  {
    id: serial("id").primaryKey(),
    assessmentNo: text("assessment_no").notNull().unique(), // e.g. "SKL-2026-0001"
    cycleId: integer("cycle_id").references(() => assessmentCycles.id, { onDelete: "set null" }),
    staffId: integer("staff_id").notNull(), // Clinical staff member
    departmentId: integer("department_id").notNull(),
    designation: text("designation").notNull(),
    status: text("status").notNull().default("draft"),
    // Workflow statuses:
    // "draft" (Self assessment in progress)
    // "submitted_to_incharge" (Self done, pending Dept Incharge)
    // "submitted_to_nursing_super" (Incharge done, pending Nursing Supervisor)
    // "submitted_to_hr" (Nursing Super done, pending HR)
    // "completed" (Final HR sign-off)
    // "revision_requested" (Returned to earlier stage for correction)
    // "training_required" (Sign-off with required remediation)

    // Assessment Period Dates
    startDate: date("start_date"),
    endDate: date("end_date"),

    // Stage 1: Self Assessment (Clinical Staff)
    selfAssessedAt: timestamp("self_assessed_at"),
    selfOverallScore: numeric("self_overall_score", { precision: 5, scale: 2 }).default("0"),
    selfTheoreticalScore: numeric("self_theoretical_score", { precision: 5, scale: 2 }).default("0"),
    selfPracticalScore: numeric("self_practical_score", { precision: 5, scale: 2 }).default("0"),
    selfRemarks: text("self_remarks"),

    // Stage 2: Dept Incharge Assessment
    inchargeStaffId: integer("incharge_staff_id"),
    inchargeAssessedAt: timestamp("incharge_assessed_at"),
    inchargeOverallScore: numeric("incharge_overall_score", { precision: 5, scale: 2 }).default("0"),
    inchargeTheoreticalScore: numeric("incharge_theoretical_score", { precision: 5, scale: 2 }).default("0"),
    inchargePracticalScore: numeric("incharge_practical_score", { precision: 5, scale: 2 }).default("0"),
    inchargeDecision: text("incharge_decision"), // "recommended", "needs_supervised_practice", "remedial_training_needed", "revision_requested"
    inchargeRemarks: text("incharge_remarks"),

    // Stage 3: Nursing Supervisor Verification
    nursingSuperStaffId: integer("nursing_super_staff_id"),
    nursingSuperAssessedAt: timestamp("nursing_super_assessed_at"),
    nursingSuperOverallScore: numeric("nursing_super_overall_score", { precision: 5, scale: 2 }).default("0"),
    nursingSuperTheoreticalScore: numeric("nursing_super_theoretical_score", { precision: 5, scale: 2 }).default("0"),
    nursingSuperPracticalScore: numeric("nursing_super_practical_score", { precision: 5, scale: 2 }).default("0"),
    nursingSuperDecision: text("nursing_super_decision"), // "verified_competent", "conditional_training", "reassessment_recommended", "revision_requested"
    nursingSuperRemarks: text("nursing_super_remarks"),
    clinicalStrengths: text("clinical_strengths"),
    improvementAreas: text("improvement_areas"),

    // Stage 4: HR Final Review & Sign-Off
    hrUserId: text("hr_user_id"),
    hrCompletedAt: timestamp("hr_completed_at"),
    finalScore: numeric("final_score", { precision: 5, scale: 2 }).default("0"), // Consolidated 1-5 or 0-100%
    competencyLevel: text("competency_level"), // "Exemplary", "Competent", "Developing", "Needs Immediate Training"
    hrDecision: text("hr_decision"), // "approved", "training_assigned", "needs_reassessment"
    assignedTrainings: jsonb("assigned_trainings").default([]), // Training modules assigned
    nextAssessmentDueDate: date("next_assessment_due_date"),
    hrRemarks: text("hr_remarks"),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_skill_staff_cycle_unique").on(table.staffId, table.cycleId),
  ]
);

// ---------------------------------------------------------------------------
// 5. Staff Skill Assessment Line Items (Score breakdown per criterion)
// ---------------------------------------------------------------------------
export const staffSkillAssessmentItems = skillAssessmentSchema.table("staff_skill_assessment_items", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id")
    .notNull()
    .references(() => staffSkillAssessments.id, { onDelete: "cascade" }),
  criterionId: integer("criterion_id")
    .notNull()
    .references(() => competencyCriteria.id, { onDelete: "cascade" }),

  // Stage 1: Self Assessment Scores (1 to 5 scale)
  selfTheoreticalScore: numeric("self_theoretical_score", { precision: 4, scale: 2 }).default("0"),
  selfPracticalScore: numeric("self_practical_score", { precision: 4, scale: 2 }).default("0"),
  selfComments: text("self_comments"),

  // Stage 2: Dept Incharge Scores (1 to 5 scale)
  inchargeTheoreticalScore: numeric("incharge_theoretical_score", { precision: 4, scale: 2 }).default("0"),
  inchargePracticalScore: numeric("incharge_practical_score", { precision: 4, scale: 2 }).default("0"),
  inchargeComments: text("incharge_comments"),

  // Stage 3: Nursing Supervisor Scores (1 to 5 scale)
  nursingSuperTheoreticalScore: numeric("nursing_super_theoretical_score", { precision: 4, scale: 2 }).default("0"),
  nursingSuperPracticalScore: numeric("nursing_super_practical_score", { precision: 4, scale: 2 }).default("0"),
  nursingSuperComments: text("nursing_super_comments"),

  isSatisfactory: boolean("is_satisfactory").default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const competencyDomainsRelations = relations(competencyDomains, ({ many }) => ({
  criteria: many(competencyCriteria),
}));

export const competencyCriteriaRelations = relations(competencyCriteria, ({ one }) => ({
  domain: one(competencyDomains, {
    fields: [competencyCriteria.domainId],
    references: [competencyDomains.id],
  }),
}));

export const staffSkillAssessmentsRelations = relations(staffSkillAssessments, ({ one, many }) => ({
  cycle: one(assessmentCycles, {
    fields: [staffSkillAssessments.cycleId],
    references: [assessmentCycles.id],
  }),
  items: many(staffSkillAssessmentItems),
}));

export const staffSkillAssessmentItemsRelations = relations(staffSkillAssessmentItems, ({ one }) => ({
  assessment: one(staffSkillAssessments, {
    fields: [staffSkillAssessmentItems.assessmentId],
    references: [staffSkillAssessments.id],
  }),
  criterion: one(competencyCriteria, {
    fields: [staffSkillAssessmentItems.criterionId],
    references: [competencyCriteria.id],
  }),
}));

// ---------------------------------------------------------------------------
// 6. Theoretical Question Bank
// ---------------------------------------------------------------------------
export const theoreticalQuestions = skillAssessmentSchema.table("theoretical_questions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "MCQ-HIC-01"
  domainCode: text("domain_code").notNull(), // e.g. "HIC", "PSQ", "MOM", "COP_BLS", "PROCEDURES", "DOC_COMM"
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // string[] of 4 options
  correctOptionIndex: integer("correct_option_index").notNull(), // 0, 1, 2, or 3
  explanation: text("explanation"), // Clinical rationale & guidelines
  departmentTags: jsonb("department_tags").default([]), // string[] of department names, e.g. ["ICU/HDU", "OT"] or [] for all
  difficulty: text("difficulty").notNull().default("medium"), // "basic", "medium", "advanced"
  defaultTimeSeconds: integer("default_time_seconds").notNull().default(60), // Time per question
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 7. Exam Configuration (Total time, per-question time, pass benchmark)
// ---------------------------------------------------------------------------
export const examConfigs = skillAssessmentSchema.table("exam_configs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull().default("Clinical Staff NABH Theoretical Examination"),
  totalQuestions: integer("total_questions").notNull().default(20),
  basicPercentage: integer("basic_percentage").notNull().default(50),
  mediumPercentage: integer("medium_percentage").notNull().default(35),
  advancedPercentage: integer("advanced_percentage").notNull().default(15),
  departmentPercentage: integer("department_percentage").notNull().default(50),
  totalTimeSeconds: integer("total_time_seconds").notNull().default(1200), // 20 minutes (1200 seconds)
  perQuestionTimeSeconds: integer("per_question_time_seconds").notNull().default(60), // 60 seconds per question
  passPercentage: numeric("pass_percentage", { precision: 5, scale: 2 }).notNull().default("60.00"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

// ---------------------------------------------------------------------------
// 8. Exam Attempts (Online Candidate Test Sessions)
// ---------------------------------------------------------------------------
export const examAttempts = skillAssessmentSchema.table("exam_attempts", {
  id: serial("id").primaryKey(),
  attemptNo: text("attempt_no").notNull().unique(), // e.g. "EXAM-2026-0001"
  assessmentId: integer("assessment_id").references(() => staffSkillAssessments.id, { onDelete: "set null" }),
  staffId: integer("staff_id").notNull(),
  departmentId: integer("department_id"),
  departmentName: text("department_name"),
  status: text("status").notNull().default("in_progress"), // "in_progress", "completed", "timed_out", "abandoned"
  totalQuestions: integer("total_questions").notNull().default(20),
  totalTimeSeconds: integer("total_time_seconds").notNull().default(1200),
  perQuestionTimeSeconds: integer("per_question_time_seconds").notNull().default(60),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  timeSpentSeconds: integer("time_spent_seconds").default(0),
  score: numeric("score", { precision: 5, scale: 2 }).default("0"), // Percentage out of 100
  theoreticalRating: numeric("theoretical_rating", { precision: 4, scale: 2 }).default("0"), // Score out of 5
  correctCount: integer("correct_count").default(0),
  incorrectCount: integer("incorrect_count").default(0),
  unansweredCount: integer("unanswered_count").default(0),
  questionIds: jsonb("question_ids").notNull(), // number[]
  questionSnapshot: jsonb("question_snapshot").$type<ExamQuestionSnapshot[]>(),
  passPercentage: numeric("pass_percentage", { precision: 5, scale: 2 }).notNull().default("60.00"),
  answers: jsonb("answers").default({}), // Record<string, { selectedOptionIndex: number, isCorrect: boolean, timeSpentSeconds: number }>
  ...timestamps,
});

