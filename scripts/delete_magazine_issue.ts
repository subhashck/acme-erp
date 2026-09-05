/**
 * ============================================================================
 * ACME ERP: Magazine Issue Deletion & MinIO Cleanup CLI
 * ============================================================================
 *
 * This script safely deletes a magazine issue from PostgreSQL AND optionally
 * removes exclusive physical image/thumbnail objects from MinIO object storage.
 *
 * Features:
 *   - Locates issue by --slug, --issue-no, or --id
 *   - Identifies exclusive media vs. media shared with other issues
 *   - Physical deletion of WebP images & thumbnails from MinIO (when --delete-media is passed)
 *   - Preserves shared media so other issues are never broken
 *   - Comprehensive --dry-run mode for safe preview
 *   - Interactive list of existing issues when run without arguments
 *
 * Usage Examples:
 *   1. Dry run (preview impact without deleting anything):
 *      pnpm tsx scripts/delete_magazine_issue.ts --slug pediatric-innovations-2026-10 --dry-run
 *
 *   2. Delete issue but KEEP media in library (safe default):
 *      pnpm tsx scripts/delete_magazine_issue.ts --slug pediatric-innovations-2026-10
 *
 *   3. Complete purge (delete issue + purge exclusive MinIO images & thumbnails):
 *      pnpm tsx scripts/delete_magazine_issue.ts --slug pediatric-innovations-2026-10 --delete-media
 *
 *   4. Delete inside Docker web container:
 *      docker exec -it acme-erp-web pnpm tsx scripts/delete_magazine_issue.ts --slug <slug> --delete-media
 * 
 * 5. List All Available Issues
 *      pnpm tsx scripts/delete_magazine_issue.ts --help
 * ============================================================================
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Ensure environment variables are loaded prior to client imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      // Ignore errors if already loaded
    }
  }
}

import { eq, ne, inArray, and } from "drizzle-orm";
import { db, pool } from "../server/db/client.ts";
import {
  magazineIssues,
  magazineSections,
  magazineIssueMedia,
  magazineMedia,
} from "../server/db/schema-magazine.ts";
import { deleteFromMinio, MINIO_BUCKET } from "../server/utils/minio.ts";

interface CliOptions {
  slug?: string;
  issueNo?: string;
  id?: number;
  deleteMedia: boolean;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    deleteMedia: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--slug" && args[i + 1]) {
      options.slug = args[++i];
    } else if (arg === "--issue-no" && args[i + 1]) {
      options.issueNo = args[++i];
    } else if (arg === "--id" && args[i + 1]) {
      options.id = parseInt(args[++i], 10);
    } else if (arg === "--delete-media") {
      options.deleteMedia = true;
    } else if (arg === "--keep-media") {
      options.deleteMedia = false;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
ACME ERP: Delete Magazine Issue CLI

Usage:
  pnpm tsx scripts/delete_magazine_issue.ts [options]

Options:
  --slug <slug>        Target magazine issue slug (e.g. pediatric-innovations-2026-10)
  --issue-no <issueNo> Target magazine issue number (e.g. MAG/26-27/00001)
  --id <id>            Target magazine issue database ID
  --delete-media       Purge media assets exclusive to this issue from DB and MinIO
  --keep-media         Keep media assets in Media Library (default)
  --dry-run            Simulate execution and print impact without deleting anything
  --help, -h           Show this help message

Examples:
  pnpm tsx scripts/delete_magazine_issue.ts --slug my-magazine-issue --dry-run
  pnpm tsx scripts/delete_magazine_issue.ts --slug my-magazine-issue --delete-media
`);
}

async function listAllIssues() {
  const allIssues = await db
    .select({
      id: magazineIssues.id,
      issueNo: magazineIssues.issueNo,
      title: magazineIssues.title,
      slug: magazineIssues.slug,
      status: magazineIssues.status,
      month: magazineIssues.issueMonth,
      year: magazineIssues.issueYear,
    })
    .from(magazineIssues)
    .orderBy(magazineIssues.id);

  if (allIssues.length === 0) {
    console.log("ℹ️  No magazine issues found in database.");
  } else {
    console.log("\nExisting Magazine Issues:");
    console.table(allIssues);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    await listAllIssues();
    process.exit(0);
  }

  if (!options.slug && !options.issueNo && !options.id) {
    console.log("⚠️  Missing target issue identifier (--slug, --issue-no, or --id).");
    printHelp();
    await listAllIssues();
    process.exit(1);
  }

  // 1. Locate the issue
  let query = db.select().from(magazineIssues);
  if (options.id) {
    query = query.where(eq(magazineIssues.id, options.id)) as any;
  } else if (options.slug) {
    query = query.where(eq(magazineIssues.slug, options.slug)) as any;
  } else if (options.issueNo) {
    query = query.where(eq(magazineIssues.issueNo, options.issueNo)) as any;
  }

  const [issue] = await query.limit(1);

  if (!issue) {
    console.error("\n❌ Target magazine issue not found!");
    if (options.slug) console.error(`   Searched slug: "${options.slug}"`);
    if (options.issueNo) console.error(`   Searched issue_no: "${options.issueNo}"`);
    if (options.id) console.error(`   Searched id: ${options.id}`);
    await listAllIssues();
    process.exit(1);
  }

  console.log("\n" + "=".repeat(65));
  console.log("🎯 Target Magazine Issue Found:");
  console.log(`   ID:           ${issue.id}`);
  console.log(`   Title:        ${issue.title}`);
  console.log(`   Issue No:     ${issue.issueNo}`);
  console.log(`   Slug:         ${issue.slug}`);
  console.log(`   Period:       ${issue.issueMonth}/${issue.issueYear}`);
  console.log(`   Status:       ${issue.status}`);
  console.log("=".repeat(65));

  // 2. Find related sections
  const sections = await db
    .select({ id: magazineSections.id, title: magazineSections.title })
    .from(magazineSections)
    .where(eq(magazineSections.issueId, issue.id));

  // 3. Find connected media
  // a. Linked through magazine_issue_media
  const junctionLinks = await db
    .select()
    .from(magazineIssueMedia)
    .where(eq(magazineIssueMedia.issueId, issue.id));

  const connectedMediaIds = new Set<number>(junctionLinks.map((l) => l.mediaId));

  // b. Directly linked via legacy magazine_media.issue_id
  const directMedia = await db
    .select()
    .from(magazineMedia)
    .where(eq(magazineMedia.issueId, issue.id));

  directMedia.forEach((m) => connectedMediaIds.add(m.id));

  const mediaIdList = Array.from(connectedMediaIds);

  // 4. Classify media: Exclusive vs Shared
  let exclusiveMedia: typeof directMedia = [];
  let sharedMedia: typeof directMedia = [];

  if (mediaIdList.length > 0) {
    // Check if any of these media are linked to OTHER issues in magazine_issue_media
    const otherLinks = await db
      .select({ mediaId: magazineIssueMedia.mediaId })
      .from(magazineIssueMedia)
      .where(
        and(
          inArray(magazineIssueMedia.mediaId, mediaIdList),
          ne(magazineIssueMedia.issueId, issue.id)
        )
      );

    const sharedIdSet = new Set(otherLinks.map((l) => l.mediaId));

    // Also fetch full media details
    const allConnectedMedia = await db
      .select()
      .from(magazineMedia)
      .where(inArray(magazineMedia.id, mediaIdList));

    for (const media of allConnectedMedia) {
      if (sharedIdSet.has(media.id)) {
        sharedMedia.push(media);
      } else {
        exclusiveMedia.push(media);
      }
    }
  }

  console.log("\n📊 Analysis & Impact Preview:");
  console.log(`   - Article Sections to delete:      ${sections.length}`);
  console.log(`   - Media link associations:         ${junctionLinks.length}`);
  console.log(`   - Media assets shared with others: ${sharedMedia.length} (will be preserved)`);
  console.log(`   - Media assets exclusive to issue: ${exclusiveMedia.length}`);

  if (options.deleteMedia) {
    console.log(`   - MinIO Object Purge:              ENABLED (--delete-media)`);
    console.log(`     Bucket:                          ${MINIO_BUCKET}`);
  } else {
    console.log(`   - MinIO Object Purge:              DISABLED (Media library records preserved)`);
  }

  if (exclusiveMedia.length > 0) {
    console.log("\n🖼️  Exclusive Media Assets:");
    for (const m of exclusiveMedia) {
      console.log(`     • [#${m.id}] ${m.fileName}`);
      console.log(`       Main:  ${m.objectKey}`);
      if (m.thumbnailKey) console.log(`       Thumb: ${m.thumbnailKey}`);
    }
  }

  if (sharedMedia.length > 0) {
    console.log("\n🛡️  Shared Media Assets (Protected):");
    for (const m of sharedMedia) {
      console.log(`     • [#${m.id}] ${m.fileName} (used by other issues - will NOT be deleted)`);
    }
  }

  // Handle DRY-RUN
  if (options.dryRun) {
    console.log("\n" + "=".repeat(65));
    console.log("⚠️  DRY-RUN MODE: No database changes or MinIO deletions were performed.");
    console.log("   To perform the actual deletion, rerun without the --dry-run flag.");
    console.log("=".repeat(65) + "\n");
    process.exit(0);
  }

  console.log("\n⏳ Executing deletion...");

  // 5. If deleteMedia requested, delete MinIO objects & DB media rows
  if (options.deleteMedia && exclusiveMedia.length > 0) {
    console.log(`\n🗑️  Deleting ${exclusiveMedia.length} exclusive media files from MinIO & database...`);

    for (const media of exclusiveMedia) {
      // MinIO object removal
      try {
        if (media.objectKey) {
          await deleteFromMinio(media.objectKey, MINIO_BUCKET);
          console.log(`   ✓ MinIO deleted: ${media.objectKey}`);
        }
        if (media.thumbnailKey) {
          await deleteFromMinio(media.thumbnailKey, MINIO_BUCKET);
          console.log(`   ✓ MinIO deleted: ${media.thumbnailKey}`);
        }
      } catch (err: any) {
        console.warn(`   ⚠️ MinIO cleanup warning for media #${media.id}:`, err?.message || err);
      }

      // Delete DB record
      await db.delete(magazineMedia).where(eq(magazineMedia.id, media.id));
      console.log(`   ✓ Database record deleted: Media #${media.id} (${media.fileName})`);
    }
  } else if (!options.deleteMedia && exclusiveMedia.length > 0) {
    // Clear issueId on media so foreign key doesn't block or leave stale pointers
    await db
      .update(magazineMedia)
      .set({ issueId: null })
      .where(eq(magazineMedia.issueId, issue.id));
    console.log(`   ✓ Unlinked ${exclusiveMedia.length} media items from issue (retained in library)`);
  }

  // 6. Delete junction links (in case FK cascade is deferred)
  await db
    .delete(magazineIssueMedia)
    .where(eq(magazineIssueMedia.issueId, issue.id));

  // 7. Delete sections
  if (sections.length > 0) {
    await db
      .delete(magazineSections)
      .where(eq(magazineSections.issueId, issue.id));
    console.log(`   ✓ Deleted ${sections.length} article sections.`);
  }

  // 8. Delete the issue itself
  await db
    .delete(magazineIssues)
    .where(eq(magazineIssues.id, issue.id));

  console.log(`   ✓ Deleted magazine issue: "${issue.title}" (ID: ${issue.id}, Slug: ${issue.slug})`);

  console.log("\n" + "=".repeat(65));
  console.log("🎉 Deletion completed successfully!");
  console.log("=".repeat(65) + "\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Error during deletion:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
