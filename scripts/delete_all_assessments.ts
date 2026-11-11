/**
 * ============================================================================
 * ACME ERP: Delete All Skill Assessments Script
 * ============================================================================
 *
 * This script safely purges skill assessments from the PostgreSQL database
 * under the "skill_assessment" schema.
 *
 * Target Tables:
 *   1. "skill_assessment"."staff_skill_assessment_items" (Score line items, auto-cascaded)
 *   2. "skill_assessment"."staff_skill_assessments" (Main assessment headers)
 *   3. "skill_assessment"."exam_attempts" (Online CBT exam attempts, optional via --include-exams)
 *
 * Preserves Master Data:
 *   - "skill_assessment"."competency_domains" (NABH domains remain untouched)
 *   - "skill_assessment"."competency_criteria" (Rubrics & criteria remain untouched)
 *   - "skill_assessment"."theoretical_questions" (Question bank remains untouched)
 *   - "skill_assessment"."exam_configs" (Exam timing/passing settings remain untouched)
 *   - "skill_assessment"."assessment_cycles" (Cycles remain untouched unless --include-cycles is passed)
 *
 * CLI Flags:
 *   --dry-run           Preview affected records and statistics without deleting
 *   --include-exams     Also delete all online CBT exam attempts (skill_assessment.exam_attempts)
 *   --include-cycles    Also delete all assessment cycle definitions (skill_assessment.assessment_cycles)
 *   --keep-sequence     Do not reset sequence counters back to 1 (default resets to 1 on full purge)
 *   --id <id>           Target a single assessment ID instead of all
 *   --assessment-no <no> Target a single assessment number (e.g. SKL-2026-0004)
 *   --force, -y         Bypass confirmation prompt
 *   --help, -h          Display help guidelines
 *
 * Execution Examples:
 *   Dry Run Preview:
 *     pnpm tsx scripts/delete_all_assessments.ts --dry-run
 *
 *   Delete all assessments (keep exam attempts & cycles, reset sequence):
 *     pnpm tsx scripts/delete_all_assessments.ts --force
 *
 *   Delete all assessments + all online exam attempts + reset sequences:
 *     pnpm tsx scripts/delete_all_assessments.ts --include-exams --force
 *
 *   Delete a single specific assessment:
 *     pnpm tsx scripts/delete_all_assessments.ts --assessment-no SKL-2026-0004 --force
 *
 *   Inside Docker:
 *     docker exec -it acme-erp-web pnpm tsx scripts/delete_all_assessments.ts --dry-run
 * ============================================================================
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure environment variables are loaded
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../../.env"),
];

for (const envPath of candidates) {
  if (fs.existsSync(envPath)) {
    try {
      // @ts-ignore
      if (typeof process.loadEnvFile === "function") {
        // @ts-ignore
        process.loadEnvFile(envPath);
      }
    } catch {
      // ignore
    }
  }
}

import { pool } from "../server/db/client.ts";

interface CliOptions {
  dryRun: boolean;
  includeExams: boolean;
  includeCycles: boolean;
  keepSequence: boolean;
  targetId?: number;
  targetAssessmentNo?: string;
  force: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    includeExams: false,
    includeCycles: false,
    keepSequence: false,
    force: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--include-exams") {
      options.includeExams = true;
    } else if (arg === "--include-cycles") {
      options.includeCycles = true;
    } else if (arg === "--keep-sequence") {
      options.keepSequence = true;
    } else if (arg === "--force" || arg === "-y") {
      options.force = true;
    } else if (arg === "--id" && args[i + 1]) {
      options.targetId = parseInt(args[++i], 10);
    } else if (arg === "--assessment-no" && args[i + 1]) {
      options.targetAssessmentNo = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
=============================================================================
ACME ERP: Delete Skill Assessments Utility
=============================================================================

Usage:
  pnpm tsx scripts/delete_all_assessments.ts [options]

Options:
  --dry-run              Preview records that will be deleted without modifying the DB
  --include-exams        Purge CBT online exam attempts as well (skill_assessment.exam_attempts)
  --include-cycles       Purge assessment cycles as well (skill_assessment.assessment_cycles)
  --keep-sequence        Do not reset sequences back to 1
  --id <id>              Delete only the assessment with this specific database ID
  --assessment-no <no>   Delete only the assessment with this number (e.g. SKL-2026-0004)
  --force, -y            Execute immediately without interactive confirmation prompt
  --help, -h             Display this help message

Examples:
  1. Preview what will be deleted (safe preview):
     pnpm tsx scripts/delete_all_assessments.ts --dry-run

  2. Purge all assessments:
     pnpm tsx scripts/delete_all_assessments.ts --force

  3. Purge all assessments including CBT exams:
     pnpm tsx scripts/delete_all_assessments.ts --include-exams --force

  4. Purge a single assessment:
     pnpm tsx scripts/delete_all_assessments.ts --assessment-no SKL-2026-0004 --force
`);
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === "y" || trimmed === "yes");
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    await pool.end();
    process.exit(0);
  }

  console.log("\n=============================================================================");
  console.log(" 🩺 ACME ERP: Clinical Staff Skill Assessments Deletion Tool");
  console.log("=============================================================================\n");

  if (options.dryRun) {
    console.log("🔍 MODE: [DRY-RUN] No database modifications will be committed.\n");
  }

  // 1. Fetch current status & records to be impacted
  let assessmentWhereClause = "";
  const queryParams: any[] = [];

  if (options.targetId) {
    queryParams.push(options.targetId);
    assessmentWhereClause = `WHERE a.id = $${queryParams.length}`;
  } else if (options.targetAssessmentNo) {
    queryParams.push(options.targetAssessmentNo);
    assessmentWhereClause = `WHERE a.assessment_no = $${queryParams.length}`;
  }

  const assessmentsQuery = `
    SELECT 
      a.id,
      a.assessment_no,
      a.staff_id,
      COALESCE((SELECT s.name FROM staff s WHERE s.staff_id = a.staff_id LIMIT 1), 'Staff #' || a.staff_id) AS staff_name,
      a.designation,
      a.status,
      a.final_score,
      a.created_at,
      (SELECT COUNT(*) FROM skill_assessment.staff_skill_assessment_items i WHERE i.assessment_id = a.id) AS items_count,
      (SELECT COUNT(*) FROM skill_assessment.exam_attempts e WHERE e.assessment_id = a.id) AS linked_exams_count
    FROM skill_assessment.staff_skill_assessments a
    ${assessmentWhereClause}
    ORDER BY a.id ASC
  `;

  const assessmentsRes = await pool.query(assessmentsQuery, queryParams);
  const assessments = assessmentsRes.rows;

  const totalAssessmentsCount = assessments.length;
  const totalItemsCount = assessments.reduce((sum, r) => sum + parseInt(r.items_count, 10), 0);
  const totalLinkedExamsCount = assessments.reduce((sum, r) => sum + parseInt(r.linked_exams_count, 10), 0);

  const totalExamsRes = await pool.query(`SELECT COUNT(*) AS count FROM skill_assessment.exam_attempts`);
  const allExamsCount = parseInt(totalExamsRes.rows[0].count, 10);

  const totalCyclesRes = await pool.query(`SELECT COUNT(*) AS count FROM skill_assessment.assessment_cycles`);
  const allCyclesCount = parseInt(totalCyclesRes.rows[0].count, 10);

  console.log(`📊 Found ${totalAssessmentsCount} assessment(s) targeted for deletion:`);
  if (totalAssessmentsCount > 0) {
    console.table(
      assessments.map((a) => ({
        ID: a.id,
        "Assessment No": a.assessment_no,
        "Staff ID": a.staff_id,
        "Staff Name": a.staff_name,
        Designation: a.designation,
        Status: a.status,
        "Items Count": a.items_count,
        "Linked Exams": a.linked_exams_count,
        Created: new Date(a.created_at).toISOString().split("T")[0],
      }))
    );
  } else {
    console.log("   (No matching assessments found in database.)\n");
  }

  console.log("Summary of Items to Delete:");
  console.log(`  • Staff Skill Assessments:    ${totalAssessmentsCount}`);
  console.log(`  • Assessment Score Items:     ${totalItemsCount}`);
  if (options.includeExams) {
    console.log(`  • Exam Attempts (All):        ${allExamsCount} (flag --include-exams passed)`);
  } else {
    console.log(`  • Linked Exam Attempts:       ${totalLinkedExamsCount} will be unlinked (assessment_id set to null)`);
  }
  if (options.includeCycles) {
    console.log(`  • Assessment Cycles:          ${allCyclesCount} (flag --include-cycles passed)`);
  } else {
    console.log(`  • Assessment Cycles:          Kept intact (${allCyclesCount} cycles preserved)`);
  }
  console.log(`  • Competency Master Data:     Kept intact (Domains, Criteria, Question Bank, Configs)`);
  console.log(`  • Reset Sequences:            ${!options.keepSequence ? "Yes (reset to 1)" : "No"}\n`);

  if (totalAssessmentsCount === 0 && !options.includeExams && !options.includeCycles) {
    console.log("✅ Nothing to delete. Database is already clean.");
    await pool.end();
    return;
  }

  // Confirm if not forced and not dry-run
  if (!options.dryRun && !options.force) {
    const confirmed = await askConfirmation(
      "⚠️  Are you sure you want to permanently delete these assessments? This cannot be undone! (y/N): "
    );
    if (!confirmed) {
      console.log("\n❌ Operation aborted by user. No records were deleted.\n");
      await pool.end();
      return;
    }
  }

  if (options.dryRun) {
    console.log("✨ [DRY-RUN COMPLETE] No records were modified.");
    await pool.end();
    return;
  }

  // 2. Perform deletion inside an atomic transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (options.targetId || options.targetAssessmentNo) {
      const targetId = assessments[0].id;
      // Unlink any exam attempts
      await client.query(
        `UPDATE skill_assessment.exam_attempts SET assessment_id = NULL WHERE assessment_id = $1`,
        [targetId]
      );
      // Items cascade automatically, but deleting explicitly ensures clean triggers
      await client.query(
        `DELETE FROM skill_assessment.staff_skill_assessment_items WHERE assessment_id = $1`,
        [targetId]
      );
      await client.query(
        `DELETE FROM skill_assessment.staff_skill_assessments WHERE id = $1`,
        [targetId]
      );
      console.log(`\n🗑️  Deleted assessment #${targetId} (${assessments[0].assessment_no}) successfully.`);
    } else {
      // Purge all assessments
      if (options.includeExams) {
        await client.query(`DELETE FROM skill_assessment.exam_attempts`);
        console.log(`🗑️  Deleted all ${allExamsCount} exam attempt record(s).`);
      } else {
        await client.query(`UPDATE skill_assessment.exam_attempts SET assessment_id = NULL`);
        console.log(`🔗 Unlinked exam attempts from deleted assessments.`);
      }

      await client.query(`DELETE FROM skill_assessment.staff_skill_assessment_items`);
      console.log(`🗑️  Deleted all ${totalItemsCount} assessment score item(s).`);

      await client.query(`DELETE FROM skill_assessment.staff_skill_assessments`);
      console.log(`🗑️  Deleted all ${totalAssessmentsCount} staff skill assessment(s).`);

      if (options.includeCycles) {
        await client.query(`DELETE FROM skill_assessment.assessment_cycles`);
        console.log(`🗑️  Deleted all ${allCyclesCount} assessment cycle(s).`);
      }

      // Reset sequences
      if (!options.keepSequence) {
        await client.query(`SELECT setval('skill_assessment.staff_skill_assessments_seq', 1, false)`);
        await client.query(`ALTER SEQUENCE skill_assessment.staff_skill_assessments_id_seq RESTART WITH 1`);
        await client.query(`ALTER SEQUENCE skill_assessment.staff_skill_assessment_items_id_seq RESTART WITH 1`);

        if (options.includeExams) {
          await client.query(`SELECT setval('skill_assessment.exam_attempts_seq', 1, false)`);
          await client.query(`ALTER SEQUENCE skill_assessment.exam_attempts_id_seq RESTART WITH 1`);
        }
        console.log(`🔄 Reset PostgreSQL sequences back to 1.`);
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ Transaction committed successfully! All specified assessment records deleted.\n");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌ Error during assessment deletion, transaction rolled back:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
