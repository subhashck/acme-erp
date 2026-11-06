/**
 * ============================================================================
 * ACME ERP: Training Assessment 2026 Question Bank Importer
 * ============================================================================
 *
 * Imports the 545 questions extracted from "Acme Training Assessment 2026.docx":
 * - Part A: 195 Clinical MCQs (39 topics x 5 questions)
 * - Part B: 350 Non-Clinical Departmental MCQs (7 departments x 50 questions)
 *
 * Usage:
 *   pnpm tsx scripts/insert_training_assessment_2026.ts          # Apply inserts/updates
 *   pnpm tsx scripts/insert_training_assessment_2026.ts --check  # Dry run preview
 * ============================================================================
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { db } from "../server/db/client.ts";
import { theoreticalQuestions } from "../server/db/schema-skill-assessment.ts";
import { sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface QuestionEntry {
  code: string;
  domainCode: string;
  question: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation: string;
  departmentTags: string[];
  difficulty: string;
  defaultTimeSeconds: number;
  active: boolean;
  sectionNumber: number;
  sectionTitle: string;
}

async function main() {
  const isCheck = process.argv.includes("--check") || process.argv.includes("--dry-run");

  const jsonPath = path.resolve(__dirname, "parsed_training_assessment_questions.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Data file not found at ${jsonPath}. Run 'python scripts/build_assessment_questions.py' first.`);
  }

  const rawData = fs.readFileSync(jsonPath, "utf8");
  const questions: QuestionEntry[] = JSON.parse(rawData);

  console.log(`Loaded ${questions.length} questions from ${jsonPath}.`);

  // Domain breakdown
  const domainCounts: Record<string, number> = {};
  const deptCounts: Record<string, number> = {};
  for (const q of questions) {
    domainCounts[q.domainCode] = (domainCounts[q.domainCode] || 0) + 1;
    for (const tag of q.departmentTags) {
      deptCounts[tag] = (deptCounts[tag] || 0) + 1;
    }
  }

  console.log("\n--- DOMAIN DISTRIBUTION ---");
  for (const [dom, cnt] of Object.entries(domainCounts)) {
    console.log(`  ${dom.padEnd(14)}: ${cnt} questions`);
  }

  console.log("\n--- DEPARTMENT TAG DISTRIBUTION ---");
  for (const [dept, cnt] of Object.entries(deptCounts)) {
    console.log(`  ${dept.padEnd(35)}: ${cnt} questions`);
  }

  if (isCheck) {
    console.log("\n[DRY RUN] Check passed. No database mutations were performed.");
    process.exit(0);
  }

  console.log("\nInserting / upserting questions into 'skill_assessment.theoretical_questions'...");

  // Batch insert in chunks of 50
  const CHUNK_SIZE = 50;
  let insertedCount = 0;

  for (let i = 0; i < questions.length; i += CHUNK_SIZE) {
    const chunk = questions.slice(i, i + CHUNK_SIZE);
    
    await db
      .insert(theoreticalQuestions)
      .values(
        chunk.map((q) => ({
          code: q.code,
          domainCode: q.domainCode,
          question: q.question,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          departmentTags: q.departmentTags,
          difficulty: q.difficulty,
          defaultTimeSeconds: q.defaultTimeSeconds,
          active: q.active,
        }))
      )
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

    insertedCount += chunk.length;
    console.log(`  Processed ${insertedCount} / ${questions.length} questions...`);
  }

  // Verify total count in DB
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(theoreticalQuestions);

  console.log(`\nSuccess! Total questions now in database: ${totalRow.count}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed to insert assessment questions:", err);
  process.exit(1);
});
