import { Hono } from "hono";
import { asc, eq, or, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { magazineIssues, magazineSections, magazineMedia } from "../db/schema-magazine.ts";
import { renderMagazineHtml, renderMagazineGalleryHtml } from "../services/magazine-ssr.ts";
import { getHospitalSettingsFromDb } from "../services/hospital-settings.ts";
export const readerRoutes = new Hono();
async function renderMagazineSsr(c: any) {
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
}

async function renderMagazineGallerySsr(c: any) {
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
}

readerRoutes.get("/magazine/view/:slug/gallery", renderMagazineGallerySsr);
readerRoutes.get("/magazine/ssr/:slug/gallery", renderMagazineGallerySsr);

readerRoutes.get("/magazine/view/:slug", renderMagazineSsr);
readerRoutes.get("/magazine/ssr/:slug", renderMagazineSsr);

