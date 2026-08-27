import { Hono } from "hono";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.ts";
import { user } from "../db/schema.ts";
import {
  magazineEditors,
  magazineIssues,
  magazineSections,
} from "../db/schema-magazine.ts";
import type { AuthEnv } from "../auth.ts";
import { requireAdmin, idParam, jsonBody } from "./shared.ts";
import { generateDocNumber } from "../services/sequence.ts";
import { uploadToMinio } from "../utils/minio.ts";
import {
  processAndStoreMedia,
  listMediaAssets,
  updateMediaAsset,
  deleteMediaAsset,
  getAllMediaTags,
} from "../services/media-engine.ts";

export const requireMagazineAccess = async (c: any, next: any) => {
  const session = c.get("session");
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (session.user.role === "admin") {
    return next();
  }

  const [editor] = await db
    .select()
    .from(magazineEditors)
    .where(
      and(
        eq(magazineEditors.userId, session.user.id),
        eq(magazineEditors.active, true)
      )
    )
    .limit(1);

  if (!editor) {
    return c.json({ error: "Forbidden: Magazine editor access required" }, 403);
  }

  await next();
};

const createIssueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  description: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  editorialTitle: z.string().optional().nullable(),
  editorialHtml: z.string().optional().nullable(),
  issueMonth: z.coerce.number().int().min(1).max(12),
  issueYear: z.coerce.number().int().min(2000).max(2100),
});

const updateIssueSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  description: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  editorialTitle: z.string().optional().nullable(),
  editorialHtml: z.string().optional().nullable(),
  issueMonth: z.coerce.number().int().min(1).max(12),
  issueYear: z.coerce.number().int().min(2000).max(2100),
});

const sectionSchema = z.object({
  title: z.string().min(1, "Section title is required"),
  subtitle: z.string().optional().nullable(),
  authorName: z.string().optional().nullable(),
  authorRole: z.string().optional().nullable(),
  contentJson: z.any().optional().default({}),
  contentHtml: z.string().optional().default(""),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const magazineRoutes = new Hono<AuthEnv>()
  // -------------------------------------------------------------
  // Magazine Access Check (Current User)
  // -------------------------------------------------------------
  .get("/magazine/my-access", async (c) => {
    const session = c.get("session");
    if (!session?.user) {
      return c.json({ isEditor: false, isAdmin: false });
    }

    if (session.user.role === "admin") {
      return c.json({ isEditor: true, isAdmin: true });
    }

    const [editor] = await db
      .select({ id: magazineEditors.id, active: magazineEditors.active })
      .from(magazineEditors)
      .where(
        and(
          eq(magazineEditors.userId, session.user.id),
          eq(magazineEditors.active, true)
        )
      )
      .limit(1);

    return c.json({
      isEditor: !!editor,
      isAdmin: false,
    });
  })

  // -------------------------------------------------------------
  // Magazine Editors Management (Admin Only)
  // -------------------------------------------------------------
  .get("/magazine/editors", requireAdmin, async (c) => {
    const editors = await db
      .select({
        id: magazineEditors.id,
        userId: magazineEditors.userId,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        addedBy: magazineEditors.addedBy,
        active: magazineEditors.active,
        createdAt: magazineEditors.createdAt,
      })
      .from(magazineEditors)
      .innerJoin(user, eq(magazineEditors.userId, user.id))
      .orderBy(desc(magazineEditors.createdAt));

    return c.json(editors);
  })

  .post("/magazine/editors", requireAdmin, async (c) => {
    const body = await jsonBody(
      c,
      z.object({
        userId: z.string().min(1, "User ID is required"),
      })
    );
    const session = c.get("session")!;

    // Check if user exists
    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, body.userId))
      .limit(1);

    if (!targetUser) {
      return c.json({ error: "User not found" }, 404);
    }

    // Insert or activate
    const [existing] = await db
      .select()
      .from(magazineEditors)
      .where(eq(magazineEditors.userId, body.userId))
      .limit(1);

    if (existing) {
      if (!existing.active) {
        const [updated] = await db
          .update(magazineEditors)
          .set({ active: true, updatedAt: new Date() })
          .where(eq(magazineEditors.id, existing.id))
          .returning();
        return c.json(updated);
      }
      return c.json({ error: "User is already an active magazine editor" }, 400);
    }

    const [created] = await db
      .insert(magazineEditors)
      .values({
        userId: body.userId,
        addedBy: session.user.id,
        active: true,
      })
      .returning();

    return c.json(created, 201);
  })

  .patch("/magazine/editors/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const body = await jsonBody(c, z.object({ active: z.boolean() }));

    const [updated] = await db
      .update(magazineEditors)
      .set({ active: body.active, updatedAt: new Date() })
      .where(eq(magazineEditors.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Editor not found" }, 404);
    }

    return c.json(updated);
  })

  .delete("/magazine/editors/:id", requireAdmin, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const [deleted] = await db
      .delete(magazineEditors)
      .where(eq(magazineEditors.id, id))
      .returning();

    if (!deleted) {
      return c.json({ error: "Editor not found" }, 404);
    }

    return c.json({ success: true });
  })

  // -------------------------------------------------------------
  // Magazine Issues (Admin or Magazine Editor)
  // -------------------------------------------------------------
  .get("/magazine/issues", requireMagazineAccess, async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;
    const status = query.status;
    const year = query.year ? parseInt(query.year, 10) : undefined;
    const search = query.search?.trim();

    const conditions: any[] = [];

    if (status && ["draft", "published", "archived"].includes(status)) {
      conditions.push(eq(magazineIssues.status, status as any));
    }
    if (year) {
      conditions.push(eq(magazineIssues.issueYear, year));
    }
    if (search) {
      conditions.push(
        or(
          ilike(magazineIssues.title, `%${search}%`),
          ilike(magazineIssues.issueNo, `%${search}%`),
          ilike(magazineIssues.slug, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(magazineIssues)
      .where(whereClause);

    const totalRecords = countResult?.count || 0;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const items = await db
      .select({
        id: magazineIssues.id,
        issueNo: magazineIssues.issueNo,
        title: magazineIssues.title,
        slug: magazineIssues.slug,
        coverImageUrl: magazineIssues.coverImageUrl,
        description: magazineIssues.description,
        editorialTitle: magazineIssues.editorialTitle,
        editorialHtml: magazineIssues.editorialHtml,
        issueMonth: magazineIssues.issueMonth,
        issueYear: magazineIssues.issueYear,
        status: magazineIssues.status,
        publishedAt: magazineIssues.publishedAt,
        createdAt: magazineIssues.createdAt,
        updatedAt: magazineIssues.updatedAt,
        creatorName: user.name,
        sectionCount: sql<number>`(
          SELECT count(*)::int FROM ${magazineSections} 
          WHERE ${magazineSections.issueId} = ${magazineIssues.id}
        )`,
      })
      .from(magazineIssues)
      .leftJoin(user, eq(magazineIssues.createdBy, user.id))
      .where(whereClause)
      .orderBy(desc(magazineIssues.issueYear), desc(magazineIssues.issueMonth), desc(magazineIssues.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return c.json({
      data: items,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages,
      },
    });
  })

  .get("/magazine/issues/:id", requireMagazineAccess, async (c) => {
    const paramId = c.req.param("id");
    const isNumeric = /^\d+$/.test(paramId);

    const condition = isNumeric
      ? eq(magazineIssues.id, Number(paramId))
      : eq(magazineIssues.slug, paramId);

    const [issue] = await db
      .select({
        id: magazineIssues.id,
        issueNo: magazineIssues.issueNo,
        title: magazineIssues.title,
        slug: magazineIssues.slug,
        coverImageUrl: magazineIssues.coverImageUrl,
        description: magazineIssues.description,
        editorialTitle: magazineIssues.editorialTitle,
        editorialHtml: magazineIssues.editorialHtml,
        issueMonth: magazineIssues.issueMonth,
        issueYear: magazineIssues.issueYear,
        status: magazineIssues.status,
        publishedAt: magazineIssues.publishedAt,
        createdAt: magazineIssues.createdAt,
        updatedAt: magazineIssues.updatedAt,
        creatorName: user.name,
      })
      .from(magazineIssues)
      .leftJoin(user, eq(magazineIssues.createdBy, user.id))
      .where(condition)
      .limit(1);

    if (!issue) {
      return c.json({ error: "Magazine issue not found" }, 404);
    }

    const sections = await db
      .select()
      .from(magazineSections)
      .where(eq(magazineSections.issueId, issue.id))
      .orderBy(magazineSections.sortOrder, magazineSections.id);

    return c.json({
      ...issue,
      sections,
    });
  })

  .post("/magazine/issues", requireMagazineAccess, async (c) => {
    const body = await jsonBody(c, createIssueSchema);
    const session = c.get("session")!;

    // Check month-year uniqueness
    const [existingMonth] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(
        and(
          eq(magazineIssues.issueMonth, body.issueMonth),
          eq(magazineIssues.issueYear, body.issueYear)
        )
      )
      .limit(1);

    if (existingMonth) {
      return c.json(
        { error: `An issue already exists for month ${body.issueMonth} / ${body.issueYear}` },
        400
      );
    }

    // Check slug uniqueness
    const [existingSlug] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(eq(magazineIssues.slug, body.slug))
      .limit(1);

    if (existingSlug) {
      return c.json({ error: "Slug is already taken. Please choose another slug." }, 400);
    }

    // Generate concurrency-safe sequential issue number: MAG/26-27/00001
    const newIssue = await db.transaction(async (tx) => {
      const issueNo = await generateDocNumber(tx, "MAG");

      const [created] = await tx
        .insert(magazineIssues)
        .values({
          issueNo,
          title: body.title,
          slug: body.slug,
          coverImageUrl: body.coverImageUrl || null,
          description: body.description || null,
          editorialTitle: body.editorialTitle !== undefined ? (body.editorialTitle || "From the Editorial Desk") : "From the Editorial Desk",
          editorialHtml: body.editorialHtml || null,
          issueMonth: body.issueMonth,
          issueYear: body.issueYear,
          status: "draft",
          createdBy: session.user.id,
        })
        .returning();

      return created;
    });

    return c.json(newIssue, 201);
  })

  .put("/magazine/issues/:id", requireMagazineAccess, async (c) => {
    const paramId = c.req.param("id");
    const isNumeric = /^\d+$/.test(paramId);
    const issueCondition = isNumeric
      ? eq(magazineIssues.id, Number(paramId))
      : eq(magazineIssues.slug, paramId);

    const [currentIssue] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(issueCondition)
      .limit(1);

    if (!currentIssue) {
      return c.json({ error: "Issue not found" }, 404);
    }

    const id = currentIssue.id;
    const body = await jsonBody(c, updateIssueSchema);

    // Check month-year uniqueness excluding current
    const [existingMonth] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(
        and(
          eq(magazineIssues.issueMonth, body.issueMonth),
          eq(magazineIssues.issueYear, body.issueYear),
          sql`${magazineIssues.id} != ${id}`
        )
      )
      .limit(1);

    if (existingMonth) {
      return c.json(
        { error: `Another issue already exists for month ${body.issueMonth} / ${body.issueYear}` },
        400
      );
    }

    // Check slug uniqueness excluding current
    const [existingSlug] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(and(eq(magazineIssues.slug, body.slug), sql`${magazineIssues.id} != ${id}`))
      .limit(1);

    if (existingSlug) {
      return c.json({ error: "Slug is already taken by another issue" }, 400);
    }

    const [updated] = await db
      .update(magazineIssues)
      .set({
        title: body.title,
        slug: body.slug,
        coverImageUrl: body.coverImageUrl || null,
        description: body.description || null,
        editorialTitle: body.editorialTitle !== undefined ? (body.editorialTitle || "From the Editorial Desk") : undefined,
        editorialHtml: body.editorialHtml !== undefined ? (body.editorialHtml || null) : undefined,
        issueMonth: body.issueMonth,
        issueYear: body.issueYear,
        updatedAt: new Date(),
      })
      .where(eq(magazineIssues.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Issue not found" }, 404);
    }

    return c.json(updated);
  })

  .post("/magazine/issues/:id/publish", requireMagazineAccess, async (c) => {
    const paramId = c.req.param("id");
    const isNumeric = /^\d+$/.test(paramId);
    const issueCondition = isNumeric
      ? eq(magazineIssues.id, Number(paramId))
      : eq(magazineIssues.slug, paramId);

    const [currentIssue] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(issueCondition)
      .limit(1);

    if (!currentIssue) {
      return c.json({ error: "Issue not found" }, 404);
    }

    const id = currentIssue.id;

    // Verify sections exist
    const [sectionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(magazineSections)
      .where(eq(magazineSections.issueId, id));

    if (!sectionCount || sectionCount.count === 0) {
      return c.json({ error: "Cannot publish an issue without any sections/articles" }, 400);
    }

    const [updated] = await db
      .update(magazineIssues)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(magazineIssues.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Issue not found" }, 404);
    }

    return c.json(updated);
  })

  .post("/magazine/issues/:id/archive", requireMagazineAccess, async (c) => {
    const paramId = c.req.param("id");
    const isNumeric = /^\d+$/.test(paramId);
    const issueCondition = isNumeric
      ? eq(magazineIssues.id, Number(paramId))
      : eq(magazineIssues.slug, paramId);

    const [currentIssue] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(issueCondition)
      .limit(1);

    if (!currentIssue) {
      return c.json({ error: "Issue not found" }, 404);
    }

    const id = currentIssue.id;

    const [updated] = await db
      .update(magazineIssues)
      .set({
        status: "archived",
        updatedAt: new Date(),
      })
      .where(eq(magazineIssues.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Issue not found" }, 404);
    }

    return c.json(updated);
  })

  .post("/magazine/issues/:id/draft", requireMagazineAccess, async (c) => {
    const paramId = c.req.param("id");
    const isNumeric = /^\d+$/.test(paramId);
    const issueCondition = isNumeric
      ? eq(magazineIssues.id, Number(paramId))
      : eq(magazineIssues.slug, paramId);

    const [currentIssue] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(issueCondition)
      .limit(1);

    if (!currentIssue) {
      return c.json({ error: "Issue not found" }, 404);
    }

    const id = currentIssue.id;

    const [updated] = await db
      .update(magazineIssues)
      .set({
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(magazineIssues.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Issue not found" }, 404);
    }

    return c.json(updated);
  })

  .delete("/magazine/issues/:id", requireMagazineAccess, async (c) => {
    const paramId = c.req.param("id");
    const isNumeric = /^\d+$/.test(paramId);
    const issueCondition = isNumeric
      ? eq(magazineIssues.id, Number(paramId))
      : eq(magazineIssues.slug, paramId);

    const [deleted] = await db
      .delete(magazineIssues)
      .where(issueCondition)
      .returning();

    if (!deleted) {
      return c.json({ error: "Issue not found" }, 404);
    }

    return c.json({ success: true });
  })

  // -------------------------------------------------------------
  // Magazine Sections
  // -------------------------------------------------------------
  .post("/magazine/issues/:id/sections", requireMagazineAccess, async (c) => {
    const paramId = c.req.param("id");
    const isNumeric = /^\d+$/.test(paramId);
    const issueCondition = isNumeric
      ? eq(magazineIssues.id, Number(paramId))
      : eq(magazineIssues.slug, paramId);

    // Verify issue exists
    const [issue] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(issueCondition)
      .limit(1);

    if (!issue) {
      return c.json({ error: "Issue not found" }, 404);
    }

    const issueId = issue.id;
    const body = await jsonBody(c, sectionSchema);

    // Get max sort order if not provided
    let sortOrder = body.sortOrder;
    if (sortOrder === 0) {
      const [maxSort] = await db
        .select({ max: sql<number>`COALESCE(MAX(${magazineSections.sortOrder}), 0)::int` })
        .from(magazineSections)
        .where(eq(magazineSections.issueId, issueId));
      sortOrder = (maxSort?.max || 0) + 1;
    }

    const [created] = await db
      .insert(magazineSections)
      .values({
        issueId,
        title: body.title,
        subtitle: body.subtitle || null,
        authorName: body.authorName || null,
        authorRole: body.authorRole || null,
        contentJson: body.contentJson || {},
        contentHtml: body.contentHtml || "",
        sortOrder,
      })
      .returning();

    return c.json(created, 201);
  })

  .put("/magazine/sections/:sectionId", requireMagazineAccess, async (c) => {
    const sectionId = parseInt(c.req.param("sectionId"), 10);
    if (!sectionId || isNaN(sectionId)) {
      return c.json({ error: "Invalid section ID" }, 400);
    }

    const body = await jsonBody(c, sectionSchema);

    const [updated] = await db
      .update(magazineSections)
      .set({
        title: body.title,
        subtitle: body.subtitle || null,
        authorName: body.authorName || null,
        authorRole: body.authorRole || null,
        contentJson: body.contentJson || {},
        contentHtml: body.contentHtml || "",
        sortOrder: body.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(magazineSections.id, sectionId))
      .returning();

    if (!updated) {
      return c.json({ error: "Section not found" }, 404);
    }

    return c.json(updated);
  })

  .delete("/magazine/sections/:sectionId", requireMagazineAccess, async (c) => {
    const sectionId = parseInt(c.req.param("sectionId"), 10);
    if (!sectionId || isNaN(sectionId)) {
      return c.json({ error: "Invalid section ID" }, 400);
    }

    const [deleted] = await db
      .delete(magazineSections)
      .where(eq(magazineSections.id, sectionId))
      .returning();

    if (!deleted) {
      return c.json({ error: "Section not found" }, 404);
    }

    return c.json({ success: true });
  })

  .put("/magazine/issues/:id/sections/reorder", requireMagazineAccess, async (c) => {
    const paramId = c.req.param("id");
    const isNumeric = /^\d+$/.test(paramId);
    const issueCondition = isNumeric
      ? eq(magazineIssues.id, Number(paramId))
      : eq(magazineIssues.slug, paramId);

    const [issue] = await db
      .select({ id: magazineIssues.id })
      .from(magazineIssues)
      .where(issueCondition)
      .limit(1);

    if (!issue) {
      return c.json({ error: "Issue not found" }, 404);
    }

    const issueId = issue.id;
    const body = await jsonBody(
      c,
      z.object({
        sectionIds: z.array(z.number().int().positive()).min(1),
      })
    );

    await db.transaction(async (tx) => {
      for (let i = 0; i < body.sectionIds.length; i++) {
        await tx
          .update(magazineSections)
          .set({ sortOrder: i + 1, updatedAt: new Date() })
          .where(
            and(
              eq(magazineSections.id, body.sectionIds[i]),
              eq(magazineSections.issueId, issueId)
            )
          );
      }
    });

    const updatedSections = await db
      .select()
      .from(magazineSections)
      .where(eq(magazineSections.issueId, issueId))
      .orderBy(magazineSections.sortOrder, magazineSections.id);

    return c.json(updatedSections);
  })

  // -------------------------------------------------------------
  // Magazine Media Library & WebP Uploads
  // -------------------------------------------------------------
  .get("/magazine/media", requireMagazineAccess, async (c) => {
    const query = c.req.query();
    const page = query.page ? parseInt(query.page, 10) : 1;
    const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 24;
    const search = query.search?.trim();
    const tag = query.tag?.trim();
    const issueId = query.issueId ? parseInt(query.issueId, 10) : undefined;

    const result = await listMediaAssets({
      page,
      pageSize,
      search,
      tag,
      issueId,
    });

    return c.json(result);
  })

  .get("/magazine/media/tags", requireMagazineAccess, async (c) => {
    const tags = await getAllMediaTags();
    return c.json({ tags });
  })

  .patch("/magazine/media/:id", requireMagazineAccess, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const body = await jsonBody(
      c,
      z.object({
        originalName: z.string().min(1, "Name cannot be empty").optional(),
        tags: z.array(z.string()).optional(),
      })
    );

    const updated = await updateMediaAsset(id, {
      originalName: body.originalName,
      tags: body.tags,
    });

    if (!updated) {
      return c.json({ error: "Media asset not found" }, 404);
    }

    return c.json(updated);
  })

  .post("/magazine/upload-image", requireMagazineAccess, async (c) => {
    try {
      const session = c.get("session")!;
      const formData = await c.req.formData();
      const file = formData.get("file");

      if (!file || !(file instanceof File)) {
        return c.json({ error: "No file provided" }, 400);
      }

      // Allowed types
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
        "image/tiff",
        "image/avif",
      ];
      if (!allowedTypes.includes(file.type)) {
        return c.json({ error: "Only image files (JPEG, PNG, WebP, GIF, SVG, TIFF, AVIF) are allowed" }, 400);
      }

      // Max 15MB upload (sharp will compress it down to efficient WebP)
      if (file.size > 15 * 1024 * 1024) {
        return c.json({ error: "File size exceeds 15MB limit" }, 400);
      }

      const issueIdStr = formData.get("issueId");
      const issueId = issueIdStr && !isNaN(Number(issueIdStr)) ? Number(issueIdStr) : null;
      const tagsJson = formData.get("tags") ? String(formData.get("tags")) : null;
      let tags: string[] | undefined;
      if (tagsJson) {
        try {
          tags = JSON.parse(tagsJson);
        } catch {
          tags = tagsJson.split(",").map((s) => s.trim());
        }
      }

      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const result = await processAndStoreMedia({
        fileBuffer,
        originalName: file.name,
        mimeType: file.type,
        issueId,
        userId: session.user.id,
        tags,
      });

      return c.json(result);
    } catch (err: any) {
      console.error("[Magazine Image Upload Error]:", err);
      return c.json({ error: err.message || "Failed to process and upload image" }, 500);
    }
  })

  .delete("/magazine/media/:id", requireMagazineAccess, async (c) => {
    const { id } = idParam.parse(c.req.param());
    const deleted = await deleteMediaAsset(id);

    if (!deleted) {
      return c.json({ error: "Media asset not found" }, 404);
    }

    return c.json({ success: true });
  });
