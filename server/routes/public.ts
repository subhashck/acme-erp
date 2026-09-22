/**
 * Public routes — no authentication required.
 * Mounted under /api/public/* in index.ts (bypasses the auth middleware).
 *
 * Endpoints:
 *   GET /public/reports/shared/:token   — verify signed URL and return report JSON
 */

import path from "node:path";
import { Hono } from "hono";
import { asc, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import {
  dailyClosingReports,
  dailyServiceLines,
  serviceCatalog,
  dailyPharmacyIncome,
  dailyExpenditures,
  dailyStaffAdvances,
  dailyIpdAdmissions,
  dailyIpdDischarges,
  dailyAdditionalIncome,
  dailyDiscountsReturns,
  dailyPaymentChannels,
  user,
} from "../db/schema.ts";
import {
  magazineIssues,
  magazineSections,
  magazineMedia,
} from "../db/schema-magazine.ts";
import { getDocumentStream } from "../utils/upload.ts";
import { renderMagazineHtml, renderMagazineGalleryHtml } from "../services/magazine-ssr.ts";
import { getHospitalSettingsFromDb } from "../services/hospital-settings.ts";

// ---------------------------------------------------------------------------
// HMAC helpers (Web Crypto — available natively in Node 18+)
// ---------------------------------------------------------------------------

const SECRET = process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-me";

async function getCryptoKey() {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64urlEncode(buf: ArrayBuffer): string {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function base64urlDecode(str: string): Uint8Array<ArrayBuffer> {
  // Pad back to standard base64 then decode
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  // Uint8Array.from gives a fresh typed array, but Node's Buffer types carry
  // ArrayBufferLike instead of ArrayBuffer. Cast to satisfy crypto.subtle.verify's
  // BufferSource requirement — at runtime this is always a plain ArrayBuffer.
  return Uint8Array.from(binary) as unknown as Uint8Array<ArrayBuffer>;
}

export interface SignedPayload {
  reportId: number;
  expiresAt: number; // Unix ms
}

/** Sign a payload and return a URL-safe token: `<b64url-payload>.<b64url-sig>` */
export async function signToken(payload: SignedPayload): Promise<string> {
  const enc = new TextEncoder();
  const key = await getCryptoKey();
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(enc.encode(payloadStr).buffer as ArrayBuffer);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  const sigB64 = base64urlEncode(sig);
  return `${payloadB64}.${sigB64}`;
}

/** Verify a token. Returns the payload if valid, throws otherwise. */
export async function verifyToken(token: string): Promise<SignedPayload> {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Malformed token");
  const [payloadB64, sigB64] = parts;

  const enc = new TextEncoder();
  const key = await getCryptoKey();
  const sigBuf = base64urlDecode(sigB64);

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBuf,
    enc.encode(payloadB64)
  );
  if (!valid) throw new Error("Invalid token signature");

  const payloadStr = Buffer.from(base64urlDecode(payloadB64)).toString("utf8");
  const payload: SignedPayload = JSON.parse(payloadStr);

  if (Date.now() > payload.expiresAt) {
    throw new Error("Token expired");
  }
  return payload;
}

// ---------------------------------------------------------------------------
// Public Hono routes (no auth)
// ---------------------------------------------------------------------------

export const publicRoutes = new Hono()
  /**
   * GET /public/reports/shared/:token
   * Verifies the signed token and returns full report detail JSON.
   */
  .get("/public/reports/shared/:token", async (c) => {
    const token = c.req.param("token");

    let payload: SignedPayload;
    try {
      payload = await verifyToken(token);
    } catch (err: any) {
      const isExpired = err?.message === "Token expired";
      return c.json(
        {
          error: isExpired ? "Link has expired" : "Invalid or tampered link",
          expired: isExpired,
        },
        isExpired ? 410 : 401
      );
    }

    const { reportId } = payload;

    const [report] = await db
      .select()
      .from(dailyClosingReports)
      .where(eq(dailyClosingReports.id, reportId))
      .limit(1)
      .execute();

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    // Fetch all nested details (same as the authenticated GET /daily-closing/reports/:id)
    const serviceLines = await db
      .select({
        id: dailyServiceLines.id,
        serviceId: dailyServiceLines.serviceId,
        rate: dailyServiceLines.rate,
        quantity: dailyServiceLines.quantity,
        amount: dailyServiceLines.amount,
        isNightEntry: dailyServiceLines.isNightEntry,
        narration: dailyServiceLines.narration,
        serviceName: serviceCatalog.serviceName,
        department: serviceCatalog.department,
        sortOrder: serviceCatalog.sortOrder,
      })
      .from(dailyServiceLines)
      .leftJoin(serviceCatalog, eq(dailyServiceLines.serviceId, serviceCatalog.id))
      .where(eq(dailyServiceLines.reportId, reportId))
      .orderBy(asc(serviceCatalog.sortOrder), asc(serviceCatalog.serviceName))
      .execute();

    const [pharmacyIncome] = await db
      .select()
      .from(dailyPharmacyIncome)
      .where(eq(dailyPharmacyIncome.reportId, reportId))
      .limit(1)
      .execute();

    const expenditures = await db
      .select()
      .from(dailyExpenditures)
      .where(eq(dailyExpenditures.reportId, reportId))
      .execute();

    const staffAdvances = await db
      .select()
      .from(dailyStaffAdvances)
      .where(eq(dailyStaffAdvances.reportId, reportId))
      .execute();

    const ipdAdmissions = await db
      .select()
      .from(dailyIpdAdmissions)
      .where(eq(dailyIpdAdmissions.reportId, reportId))
      .execute();

    const ipdDischarges = await db
      .select()
      .from(dailyIpdDischarges)
      .where(eq(dailyIpdDischarges.reportId, reportId))
      .execute();

    const additionalIncome = await db
      .select()
      .from(dailyAdditionalIncome)
      .where(eq(dailyAdditionalIncome.reportId, reportId))
      .execute();

    const discountsReturns = await db
      .select()
      .from(dailyDiscountsReturns)
      .where(eq(dailyDiscountsReturns.reportId, reportId))
      .execute();

    const paymentChannels = await db
      .select()
      .from(dailyPaymentChannels)
      .where(eq(dailyPaymentChannels.reportId, reportId))
      .execute();

    const [creator] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, report.createdBy))
      .limit(1)
      .execute();

    return c.json({
      ...report,
      creatorName: creator?.name ?? "Unknown",
      serviceLines,
      pharmacyIncome: pharmacyIncome ?? null,
      expenditures,
      staffAdvances,
      ipdAdmissions,
      ipdDischarges,
      additionalIncome,
      discountsReturns,
      paymentChannels,
      // Include expiry so the frontend can display it
      _linkExpiresAt: payload.expiresAt,
    });
  })

  // ---------------------------------------------------------------------------
  // Public Magazine Endpoints
  // ---------------------------------------------------------------------------

  /**
   * GET /public/magazine
   * Returns list of all published magazine issues.
   */
  .get("/public/magazine", async (c) => {
    const issues = await db
      .select({
        id: magazineIssues.id,
        issueNo: magazineIssues.issueNo,
        title: magazineIssues.title,
        slug: magazineIssues.slug,
        coverImageUrl: magazineIssues.coverImageUrl,
        description: magazineIssues.description,
        issueMonth: magazineIssues.issueMonth,
        issueYear: magazineIssues.issueYear,
        publishedAt: magazineIssues.publishedAt,
      })
      .from(magazineIssues)
      .where(eq(magazineIssues.status, "published"))
      .orderBy(desc(magazineIssues.issueYear), desc(magazineIssues.issueMonth));

    return c.json(issues);
  })

  /**
   * GET /public/magazine/:slug
   * Returns published issue details with sections in JSON format.
   */
  .get("/public/magazine/:slug", async (c) => {
    const slug = c.req.param("slug");

    // Slug validation regex
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return c.json({ error: "Invalid issue slug format" }, 400);
    }

    const [issue] = await db
      .select()
      .from(magazineIssues)
      .where(eq(magazineIssues.slug, slug))
      .limit(1);

    if (!issue || issue.status !== "published") {
      return c.json({ error: "Magazine issue not found or not published" }, 404);
    }

    const sections = await db
      .select({
        id: magazineSections.id,
        title: magazineSections.title,
        subtitle: magazineSections.subtitle,
        authorName: magazineSections.authorName,
        authorRole: magazineSections.authorRole,
        contentHtml: magazineSections.contentHtml,
        sortOrder: magazineSections.sortOrder,
      })
      .from(magazineSections)
      .where(eq(magazineSections.issueId, issue.id))
      .orderBy(magazineSections.sortOrder, magazineSections.id);

    const media = await db
      .select({
        id: magazineMedia.id,
        fileName: magazineMedia.fileName,
        originalName: magazineMedia.originalName,
        mimeType: magazineMedia.mimeType,
        fileSize: magazineMedia.fileSize,
        width: magazineMedia.width,
        height: magazineMedia.height,
        url: magazineMedia.url,
        thumbnailUrl: magazineMedia.thumbnailUrl,
        tags: magazineMedia.tags,
        createdAt: magazineMedia.createdAt,
      })
      .from(magazineMedia)
      .where(eq(magazineMedia.issueId, issue.id))
      .orderBy(asc(magazineMedia.id));

    return c.json({
      ...issue,
      sections,
      media,
    });
  })

  /**
   * GET /public/magazine/:slug/gallery
   * Returns media assets associated with a published magazine issue.
   */
  .get("/public/magazine/:slug/gallery", async (c) => {
    const slug = c.req.param("slug");

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return c.json({ error: "Invalid issue slug format" }, 400);
    }

    const [issue] = await db
      .select()
      .from(magazineIssues)
      .where(eq(magazineIssues.slug, slug))
      .limit(1);

    if (!issue || issue.status !== "published") {
      return c.json({ error: "Magazine issue not found or not published" }, 404);
    }

    const media = await db
      .select({
        id: magazineMedia.id,
        fileName: magazineMedia.fileName,
        originalName: magazineMedia.originalName,
        mimeType: magazineMedia.mimeType,
        fileSize: magazineMedia.fileSize,
        width: magazineMedia.width,
        height: magazineMedia.height,
        url: magazineMedia.url,
        thumbnailUrl: magazineMedia.thumbnailUrl,
        tags: magazineMedia.tags,
        createdAt: magazineMedia.createdAt,
      })
      .from(magazineMedia)
      .where(
        or(
          eq(magazineMedia.issueId, issue.id),
          sql`EXISTS (
            SELECT 1 FROM "magazine"."magazine_issue_media" "mim"
            WHERE "mim"."media_id" = "magazine_media"."id" AND "mim"."issue_id" = ${issue.id}
          )`
        )
      )
      .orderBy(asc(magazineMedia.id));

    return c.json({
      issue: {
        id: issue.id,
        issueNo: issue.issueNo,
        title: issue.title,
        slug: issue.slug,
        issueMonth: issue.issueMonth,
        issueYear: issue.issueYear,
      },
      total: media.length,
      media,
    });
  })

  /**
   * GET /public/magazine/view/:slug
   * Returns fully rendered standalone HTML reader (Flipbook & Scroll modes).
   */
  .get("/public/magazine/view/:slug", async (c) => {
    const slug = c.req.param("slug");

    // Slug validation regex
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return c.html(
        `<!DOCTYPE html><html><head><title>Invalid Request</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;color:#334155;}</style></head><body><h1>400 - Invalid Issue Slug</h1><p>The magazine slug format is invalid.</p></body></html>`,
        400
      );
    }

    const [issue] = await db
      .select()
      .from(magazineIssues)
      .where(eq(magazineIssues.slug, slug))
      .limit(1);

    if (!issue || issue.status !== "published") {
      return c.html(
        `<!DOCTYPE html><html><head><title>Magazine Issue Not Found</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;color:#334155;}a{color:#0284c7;text-decoration:none;font-weight:600;}</style></head><body><h1>404 - Magazine Issue Not Found</h1><p>The requested monthly edition is not published or does not exist.</p><p><a href="/">Return to Home</a></p></body></html>`,
        404
      );
    }

    const sections = await db
      .select({
        id: magazineSections.id,
        title: magazineSections.title,
        subtitle: magazineSections.subtitle,
        authorName: magazineSections.authorName,
        authorRole: magazineSections.authorRole,
        contentHtml: magazineSections.contentHtml,
        sortOrder: magazineSections.sortOrder,
      })
      .from(magazineSections)
      .where(eq(magazineSections.issueId, issue.id))
      .orderBy(magazineSections.sortOrder, magazineSections.id);

    const media = await db
      .select({
        id: magazineMedia.id,
        fileName: magazineMedia.fileName,
        originalName: magazineMedia.originalName,
        mimeType: magazineMedia.mimeType,
        fileSize: magazineMedia.fileSize,
        width: magazineMedia.width,
        height: magazineMedia.height,
        url: magazineMedia.url,
        thumbnailUrl: magazineMedia.thumbnailUrl,
        tags: magazineMedia.tags,
        createdAt: magazineMedia.createdAt,
      })
      .from(magazineMedia)
      .where(
        or(
          eq(magazineMedia.issueId, issue.id),
          sql`EXISTS (
            SELECT 1 FROM "magazine"."magazine_issue_media" "mim"
            WHERE "mim"."media_id" = "magazine_media"."id" AND "mim"."issue_id" = ${issue.id}
          )`
        )
      )
      .orderBy(asc(magazineMedia.id));

    const hospital = await getHospitalSettingsFromDb();

    const html = renderMagazineHtml(issue as any, sections as any, hospital as any, media as any);
    return c.html(html);
  })

  /**
   * GET /public/magazine/view/:slug/gallery
   * Returns fully rendered standalone public Photo Gallery HTML page.
   */
  .get("/public/magazine/view/:slug/gallery", async (c) => {
    const slug = c.req.param("slug");

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return c.html(
        `<!DOCTYPE html><html><head><title>Invalid Request</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;color:#334155;}</style></head><body><h1>400 - Invalid Issue Slug</h1><p>The magazine slug format is invalid.</p></body></html>`,
        400
      );
    }

    const [issue] = await db
      .select()
      .from(magazineIssues)
      .where(eq(magazineIssues.slug, slug))
      .limit(1);

    if (!issue || issue.status !== "published") {
      return c.html(
        `<!DOCTYPE html><html><head><title>Magazine Issue Not Found</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;color:#334155;}a{color:#0284c7;text-decoration:none;font-weight:600;}</style></head><body><h1>404 - Magazine Issue Not Found</h1><p>The requested monthly edition is not published or does not exist.</p><p><a href="/">Return to Home</a></p></body></html>`,
        404
      );
    }

    const media = await db
      .select({
        id: magazineMedia.id,
        fileName: magazineMedia.fileName,
        originalName: magazineMedia.originalName,
        mimeType: magazineMedia.mimeType,
        fileSize: magazineMedia.fileSize,
        width: magazineMedia.width,
        height: magazineMedia.height,
        url: magazineMedia.url,
        thumbnailUrl: magazineMedia.thumbnailUrl,
        tags: magazineMedia.tags,
        createdAt: magazineMedia.createdAt,
      })
      .from(magazineMedia)
      .where(
        or(
          eq(magazineMedia.issueId, issue.id),
          sql`EXISTS (
            SELECT 1 FROM "magazine"."magazine_issue_media" "mim"
            WHERE "mim"."media_id" = "magazine_media"."id" AND "mim"."issue_id" = ${issue.id}
          )`
        )
      )
      .orderBy(asc(magazineMedia.id));

    const hospital = await getHospitalSettingsFromDb();

    const html = renderMagazineGalleryHtml(issue as any, media as any, hospital as any);
    return c.html(html);
  })

  /**
   * GET /public/magazine/ssr/:slug
   * Alias for /public/magazine/view/:slug
   */
  .get("/public/magazine/ssr/:slug", async (c) => {
    return c.redirect(`/api/public/magazine/view/${c.req.param("slug")}`);
  })

  /**
   * GET /public/magazine/ssr/:slug/gallery
   * Alias for /public/magazine/view/:slug/gallery
   */
  .get("/public/magazine/ssr/:slug/gallery", async (c) => {
    return c.redirect(`/api/public/magazine/view/${c.req.param("slug")}/gallery`);
  })

  /**
   * GET /public/magazine/images/*
   * Stream magazine images stored in MinIO.
   * If the requested key does not exist, streams a sleek branded SVG placeholder
   * with HTTP 200 so that <img> tags never render broken image icons.
   */
  .get("/public/magazine/images/*", async (c) => {
    // Extract key after /public/magazine/images/ (handling both with/without /api prefix)
    const rawPath = c.req.path.replace(/^.*\/public\/magazine\/images\//, "");
    let decodedKey = decodeURIComponent(rawPath).replace(/^\/+/, "");

    // Validate key structure for safety: must start with "magazine/" and have no ".."
    if (!decodedKey.startsWith("magazine/") || decodedKey.includes("..")) {
      return c.json({ error: "Invalid image path" }, 400);
    }

    const docStream = await getDocumentStream(decodedKey);
    if (!docStream) {
      // Return a graceful SVG placeholder instead of a broken 404
      const svg = generateMagazineImagePlaceholderSvg(decodedKey);
      return new Response(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Asset-Fallback": "placeholder",
        },
      });
    }

    const headers: Record<string, string> = {
      "Content-Type": docStream.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${docStream.filename}"`,
    };

    return new Response(docStream.stream as any, { headers });
  });

/**
 * Helper to generate a placeholder SVG image when a requested magazine media
 * asset is missing from storage, preventing broken <img> tags across the UI and SSR.
 */
function generateMagazineImagePlaceholderSvg(rawKey: string): string {
  const baseName = path.basename(rawKey, path.extname(rawKey));
  const cleanTitle = baseName
    .replace(/^(med|thumb|raw)_[0-9]+_[a-f0-9]+$/i, "Editorial Asset")
    .replace(/_[a-f0-9]{8,12}$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  const title = cleanTitle.length > 0
    ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)
    : "ACME Magazine";

  const escapeSvg = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="tealCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0d9488" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <radialGradient id="ambientGlow" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="#0d9488" stop-opacity="0.22" />
      <stop offset="60%" stop-color="#0284c7" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <pattern id="dotPattern" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#334155" fill-opacity="0.5" />
    </pattern>
  </defs>

  <!-- Background Base -->
  <rect width="100%" height="100%" fill="url(#bgGradient)" />
  <rect width="100%" height="100%" fill="url(#dotPattern)" />
  <rect width="100%" height="100%" fill="url(#ambientGlow)" />

  <!-- Subtle Outer Border Accent -->
  <rect x="24" y="24" width="752" height="452" rx="16" fill="none" stroke="#334155" stroke-width="1.5" stroke-dasharray="6 6" stroke-opacity="0.6" />

  <!-- Central Card Icon Emblem -->
  <g transform="translate(400, 205)">
    <rect x="-65" y="-65" width="130" height="130" rx="28" fill="#1e293b" fill-opacity="0.85" stroke="#475569" stroke-width="1.5" />
    <rect x="-35" y="-35" width="70" height="70" rx="18" fill="url(#tealCyanGrad)" />
    <!-- Medical Cross / Sparkle Symbol -->
    <path d="M-8 -18 h16 v10 h10 v16 h-10 v10 h-16 v-10 h-10 v-16 h10 z" fill="#ffffff" fill-opacity="0.95" />
    <circle cx="20" cy="-20" r="3" fill="#38bdf8" />
    <circle cx="-20" cy="20" r="2.5" fill="#2dd4bf" />
  </g>

  <!-- Image Title -->
  <text x="400" y="325" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="700" fill="#f1f5f9" letter-spacing="0.4">
    ${escapeSvg(title)}
  </text>

  <!-- Subtitle -->
  <text x="400" y="355" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#94a3b8" letter-spacing="0.3">
    ACME HEALTHCARE &bull; DIGITAL DIGEST
  </text>

  <!-- Badge Pill -->
  <g transform="translate(400, 395)">
    <rect x="-95" y="-14" width="190" height="28" rx="14" fill="#0f172a" stroke="#0d9488" stroke-width="1.2" stroke-opacity="0.8" />
    <text x="0" y="4.5" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', monospace" font-size="11" font-weight="600" fill="#2dd4bf" letter-spacing="0.8">
      PREVIEW PLACEHOLDER
    </text>
  </g>
</svg>`;
}

