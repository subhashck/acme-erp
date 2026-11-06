/**
 * ============================================================================
 * ACME FERTILITY & HEALTHCARE CENTRE
 * October 2026 — Training Assessment Question Bank (Part A — Clinical Staff)
 * ============================================================================
 *
 * Imports 75 Clinical Staff Multiple Choice Questions (MCQ-OCT26-CLN-01 to 75)
 * into `skill_assessment.theoretical_questions` and registers the monthly
 * question bank in `skill_assessment.department_monthly_question_banks`.
 *
 * Usage:
 *   pnpm tsx scripts/insert_october_2026_clinical_assessment.ts
 *   pnpm tsx scripts/insert_october_2026_clinical_assessment.ts --check
 * ============================================================================
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { db } from "../server/db/client.ts";
import { theoreticalQuestions, departmentMonthlyQuestionBanks } from "../server/db/schema-skill-assessment.ts";
import { sql, eq, and, asc } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuestionEntry {
  qNum: number;
  section: string;
  question: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation: string;
  existingCode?: string;
  domainCode: string;
  departmentTags: string[];
}

async function main() {
  const isCheck = process.argv.includes("--check") || process.argv.includes("--dry-run");

  const jsonPath = path.resolve(__dirname, "october_2026_clinical_questions.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Data file not found at ${jsonPath}.`);
  }

  const rawData = fs.readFileSync(jsonPath, "utf8");
  const questions: QuestionEntry[] = JSON.parse(rawData);

  console.log(`Loaded ${questions.length} questions from ${jsonPath}.`);
  console.log("Exam Specifications:");
  console.log("  - Title: October 2026 — Training Assessment Question Bank (Part A — Clinical Staff)");
  console.log("  - Total Questions: 75");
  console.log("  - Duration: 50 minutes");
  console.log("  - Time per question: 40 seconds");

  // Summary by domain
  const domainCounts: Record<string, number> = {};
  for (const q of questions) {
    domainCounts[q.domainCode] = (domainCounts[q.domainCode] || 0) + 1;
  }
  console.log("\n--- DOMAIN DISTRIBUTION ---");
  for (const [dom, cnt] of Object.entries(domainCounts)) {
    console.log(`  ${dom.padEnd(12)}: ${cnt} questions`);
  }

  if (isCheck) {
    console.log("\n[DRY RUN] Check passed. No database mutations performed.");
    process.exit(0);
  }

  console.log("\nUpserting questions into 'skill_assessment.theoretical_questions'...");

  const formattedQuestions = questions.map((q) => {
    const code = `MCQ-OCT26-CLN-${String(q.qNum).padStart(2, "0")}`;
    const departmentTags = Array.from(new Set([...q.departmentTags, "Clinical"]));
    return {
      code,
      domainCode: q.domainCode,
      question: q.question,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      departmentTags,
      difficulty: "medium",
      defaultTimeSeconds: 40,
      active: true,
    };
  });

  // Batch insert in chunks of 25
  const CHUNK_SIZE = 25;
  for (let i = 0; i < formattedQuestions.length; i += CHUNK_SIZE) {
    const chunk = formattedQuestions.slice(i, i + CHUNK_SIZE);
    await db
      .insert(theoreticalQuestions)
      .values(chunk)
      .onConflictDoUpdate({
        target: theoreticalQuestions.code,
        set: {
          domainCode: sql`excluded.domain_code`,
          question: sql`excluded.question`,
          options: sql`excluded.options`,
          correctOptionIndex: sql`excluded.correct_option_index`,
          explanation: sql`excluded.explanation`,
          departmentTags: sql`excluded.department_tags`,
          difficulty: sql`excluded.difficulty`,
          defaultTimeSeconds: sql`excluded.default_time_seconds`,
          active: sql`excluded.active`,
          updatedAt: new Date(),
        },
      });
    console.log(`  Upserted questions ${i + 1} to ${Math.min(i + CHUNK_SIZE, formattedQuestions.length)}...`);
  }

  // Fetch the inserted questions to get their IDs
  const insertedDbQuestions = await db
    .select({ id: theoreticalQuestions.id, code: theoreticalQuestions.code })
    .from(theoreticalQuestions)
    .where(
      sql`code >= 'MCQ-OCT26-CLN-01' AND code <= 'MCQ-OCT26-CLN-75'`
    )
    .orderBy(asc(theoreticalQuestions.code));

  console.log(`Found ${insertedDbQuestions.length} inserted/updated questions in database.`);
  const questionIds = insertedDbQuestions.map((q) => q.id);

  // Register in department_monthly_question_banks
  console.log("\nRegistering 'Clinical Staff' question bank for October 2026 ('2026-10')...");
  await db
    .insert(departmentMonthlyQuestionBanks)
    .values({
      departmentName: "Clinical Staff",
      monthYear: "2026-10",
      title: "October 2026 — Training Assessment Question Bank (Part A — Clinical Staff)",
      description: "ACME FERTILITY & HEALTHCARE CENTRE - October 2026 Training Assessment Question Bank for Clinical Staff (75 Questions, 50 minutes, 40s per question)",
      totalQuestions: questionIds.length,
      questionIds,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [departmentMonthlyQuestionBanks.departmentName, departmentMonthlyQuestionBanks.monthYear],
      set: {
        title: sql`excluded.title`,
        description: sql`excluded.description`,
        totalQuestions: sql`excluded.total_questions`,
        questionIds: sql`excluded.question_ids`,
        status: sql`excluded.status`,
        updatedAt: new Date(),
      },
    });

  console.log("Successfully registered monthly question bank!");

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(theoreticalQuestions);

  console.log(`\nAll done! Total theoretical questions in database: ${totalRow.count}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to insert assessment questions:", err);
  process.exit(1);
});
