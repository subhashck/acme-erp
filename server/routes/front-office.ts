import { desc, eq, asc, and, or, ilike, sql, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { frontOfficeDailyReports, frontOfficeShifts, user } from "../db/schema.ts";
import {
  fetchDocterzFrontOfficeData,
  getDocterzConfig,
  saveDocterzConfig,
  testDocterzConnection,
} from "../services/docterz.ts";
import { jsonBody, requireFrontOfficeAccess } from "./shared.ts";



export const frontOfficeRoutes = new Hono<AuthEnv>()
  .use("/front-office/*", requireFrontOfficeAccess)

  // -------------------------------------------------------------------------
  // Shift Master Routes
  // -------------------------------------------------------------------------
  .get("/front-office/shifts", async (c) => {
    const includeInactive = c.req.query("all") === "true";

    const query = db
      .select()
      .from(frontOfficeShifts);

    const rows = includeInactive
      ? await query.orderBy(asc(frontOfficeShifts.sortOrder), asc(frontOfficeShifts.id)).execute()
      : await query.where(eq(frontOfficeShifts.isActive, true)).orderBy(asc(frontOfficeShifts.sortOrder), asc(frontOfficeShifts.id)).execute();

    return c.json(rows);
  })

  .post("/front-office/shifts", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        name: z.string().min(1, "Shift name is required"),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:mm format"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be in HH:mm format"),
        sortOrder: z.number().int().default(0),
        isActive: z.boolean().default(true),
      })
    );

    const [saved] = await db
      .insert(frontOfficeShifts)
      .values({
        name: input.name,
        startTime: input.startTime,
        endTime: input.endTime,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      })
      .returning()
      .execute();

    return c.json(saved, 201);
  })

  .put("/front-office/shifts/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid shift ID" }, 400);

    const input = await jsonBody(
      c,
      z.object({
        name: z.string().min(1, "Shift name is required").optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be in HH:mm format").optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be in HH:mm format").optional(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    );

    const [updated] = await db
      .update(frontOfficeShifts)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(frontOfficeShifts.id, id))
      .returning()
      .execute();

    if (!updated) return c.json({ error: "Shift not found" }, 404);
    return c.json(updated);
  })

  .delete("/front-office/shifts/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid shift ID" }, 400);

    // Soft delete: set isActive to false
    const [updated] = await db
      .update(frontOfficeShifts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(frontOfficeShifts.id, id))
      .returning()
      .execute();

    if (!updated) return c.json({ error: "Shift not found" }, 404);
    return c.json({ success: true, shift: updated });
  })

  // -------------------------------------------------------------------------
  // List saved daily reports
  // -------------------------------------------------------------------------
  .get("/front-office/reports", async (c) => {
    const conditions = [];

    const showAll = c.req.query("all") === "true";
    if (!showAll) {
      conditions.push(eq(frontOfficeDailyReports.isActive, true));
    }

    const search = c.req.query("search")?.trim();
    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          sql`${frontOfficeDailyReports.reportDate}::text ILIKE ${searchPattern}`,
          ilike(frontOfficeDailyReports.shiftLabel, searchPattern),
          ilike(frontOfficeDailyReports.consultationFileName, searchPattern),
          ilike(frontOfficeDailyReports.procedureFileName, searchPattern),
          ilike(frontOfficeDailyReports.radiologyFileName, searchPattern),
          ilike(user.name, searchPattern)
        )
      );
    }

    const startDate = c.req.query("startDate")?.trim();
    if (startDate) {
      conditions.push(gte(frontOfficeDailyReports.reportDate, startDate));
    }

    const endDate = c.req.query("endDate")?.trim();
    if (endDate) {
      conditions.push(lte(frontOfficeDailyReports.reportDate, endDate));
    }

    const shiftLabel = c.req.query("shiftLabel")?.trim();
    if (shiftLabel && shiftLabel !== "all") {
      conditions.push(eq(frontOfficeDailyReports.shiftLabel, shiftLabel));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const pageParam = c.req.query("page");
    const isPaginated = pageParam !== undefined && pageParam !== null && pageParam !== "";
    const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
    const pageSize = Math.min(
      Math.max(1, parseInt(c.req.query("pageSize") || "10", 10) || 10),
      100
    );

    if (isPaginated) {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(frontOfficeDailyReports)
        .leftJoin(user, eq(frontOfficeDailyReports.createdBy, user.id))
        .where(whereClause);

      const totalRecords = countResult?.count || 0;
      const offset = (page - 1) * pageSize;

      const rows = await db
        .select({
          id: frontOfficeDailyReports.id,
          reportDate: frontOfficeDailyReports.reportDate,
          shiftLabel: frontOfficeDailyReports.shiftLabel,
          version: frontOfficeDailyReports.version,
          isActive: frontOfficeDailyReports.isActive,
          consultationFileName: frontOfficeDailyReports.consultationFileName,
          procedureFileName: frontOfficeDailyReports.procedureFileName,
          radiologyFileName: frontOfficeDailyReports.radiologyFileName,
          totalPatients: frontOfficeDailyReports.totalPatients,
          totalBill: frontOfficeDailyReports.totalBill,
          totalCollected: frontOfficeDailyReports.totalCollected,
          totalPending: frontOfficeDailyReports.totalPending,
          realizationRate: frontOfficeDailyReports.realizationRate,
          totalExpenses: frontOfficeDailyReports.totalExpenses,
          netCollections: frontOfficeDailyReports.netCollections,
          patientMix: frontOfficeDailyReports.patientMix,
          createdBy: frontOfficeDailyReports.createdBy,
          createdByName: user.name,
          createdAt: frontOfficeDailyReports.createdAt,
        })
        .from(frontOfficeDailyReports)
        .leftJoin(user, eq(frontOfficeDailyReports.createdBy, user.id))
        .where(whereClause)
        .orderBy(desc(frontOfficeDailyReports.reportDate), desc(frontOfficeDailyReports.id))
        .limit(pageSize)
        .offset(offset);

      return c.json({
        data: rows,
        pagination: {
          page,
          pageSize,
          totalRecords,
          totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
        },
      });
    }

    // Backward-compatible unpaginated query
    const limit = Math.min(Number(c.req.query("limit") || 100), 200);
    const offset = Math.max(Number(c.req.query("offset") || 0), 0);

    const rows = await db
      .select({
        id: frontOfficeDailyReports.id,
        reportDate: frontOfficeDailyReports.reportDate,
        shiftLabel: frontOfficeDailyReports.shiftLabel,
        version: frontOfficeDailyReports.version,
        isActive: frontOfficeDailyReports.isActive,
        consultationFileName: frontOfficeDailyReports.consultationFileName,
        procedureFileName: frontOfficeDailyReports.procedureFileName,
        radiologyFileName: frontOfficeDailyReports.radiologyFileName,
        totalPatients: frontOfficeDailyReports.totalPatients,
        totalBill: frontOfficeDailyReports.totalBill,
        totalCollected: frontOfficeDailyReports.totalCollected,
        totalPending: frontOfficeDailyReports.totalPending,
        realizationRate: frontOfficeDailyReports.realizationRate,
        totalExpenses: frontOfficeDailyReports.totalExpenses,
        netCollections: frontOfficeDailyReports.netCollections,
        patientMix: frontOfficeDailyReports.patientMix,
        createdBy: frontOfficeDailyReports.createdBy,
        createdByName: user.name,
        createdAt: frontOfficeDailyReports.createdAt,
      })
      .from(frontOfficeDailyReports)
      .leftJoin(user, eq(frontOfficeDailyReports.createdBy, user.id))
      .where(whereClause)
      .orderBy(desc(frontOfficeDailyReports.reportDate), desc(frontOfficeDailyReports.id))
      .limit(limit)
      .offset(offset);

    return c.json(rows);
  })

  // -------------------------------------------------------------------------
  // Get report detail by ID
  // -------------------------------------------------------------------------
  .get("/front-office/reports/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid report ID" }, 400);

    const [report] = await db
      .select({
        id: frontOfficeDailyReports.id,
        reportDate: frontOfficeDailyReports.reportDate,
        shiftLabel: frontOfficeDailyReports.shiftLabel,
        version: frontOfficeDailyReports.version,
        isActive: frontOfficeDailyReports.isActive,
        consultationFileName: frontOfficeDailyReports.consultationFileName,
        procedureFileName: frontOfficeDailyReports.procedureFileName,
        radiologyFileName: frontOfficeDailyReports.radiologyFileName,
        totalPatients: frontOfficeDailyReports.totalPatients,
        totalBill: frontOfficeDailyReports.totalBill,
        totalCollected: frontOfficeDailyReports.totalCollected,
        totalPending: frontOfficeDailyReports.totalPending,
        realizationRate: frontOfficeDailyReports.realizationRate,
        totalExpenses: frontOfficeDailyReports.totalExpenses,
        netCollections: frontOfficeDailyReports.netCollections,
        patientMix: frontOfficeDailyReports.patientMix,
        summaryData: frontOfficeDailyReports.summaryData,
        patientData: frontOfficeDailyReports.patientData,
        createdBy: frontOfficeDailyReports.createdBy,
        createdByName: user.name,
        createdAt: frontOfficeDailyReports.createdAt,
      })
      .from(frontOfficeDailyReports)
      .leftJoin(user, eq(frontOfficeDailyReports.createdBy, user.id))
      .where(eq(frontOfficeDailyReports.id, id))
      .limit(1)
      .execute();

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    return c.json(report);
  })

  // -------------------------------------------------------------------------
  // Save / Archive a daily report (Atomic versioning: date+shift unique active)
  // -------------------------------------------------------------------------
  .post("/front-office/reports", async (c) => {
    const session: any = c.get("session");
    const userId = session?.user?.id;

    const input = await jsonBody(
      c,
      z.object({
        reportDate: z.string().min(1),
        shiftLabel: z.string().default("Full Day"),
        consultationFileName: z.string().optional().nullable(),
        procedureFileName: z.string().optional().nullable(),
        radiologyFileName: z.string().optional().nullable(),
        totalPatients: z.number().int().default(0),
        totalBill: z.number().default(0),
        totalCollected: z.number().default(0),
        totalPending: z.number().default(0),
        realizationRate: z.number().default(0),
        totalExpenses: z.number().default(0),
        netCollections: z.number().default(0),
        patientMix: z.string().optional().nullable(),
        summaryData: z.any().optional(),
        patientData: z.any().optional(),
      })
    );

    const shiftLabel = input.shiftLabel || "Full Day";

    // Version update transaction:
    // 1. Fetch current max version for this (reportDate, shiftLabel)
    // 2. Mark previous reports for this (reportDate, shiftLabel) as isActive = false
    // 3. Insert new report as version = (maxVersion + 1) with isActive = true
    const saved = await db.transaction(async (tx) => {
      const existing = await tx
        .select({
          id: frontOfficeDailyReports.id,
          version: frontOfficeDailyReports.version,
        })
        .from(frontOfficeDailyReports)
        .where(
          and(
            eq(frontOfficeDailyReports.reportDate, input.reportDate),
            eq(frontOfficeDailyReports.shiftLabel, shiftLabel)
          )
        )
        .orderBy(desc(frontOfficeDailyReports.version))
        .execute();

      const maxVersion = existing.length > 0 ? Math.max(...existing.map((e) => Number(e.version) || 1)) : 0;
      const nextVersion = maxVersion + 1;

      // Deactivate existing versions for this date+shift
      if (existing.length > 0) {
        await tx
          .update(frontOfficeDailyReports)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(frontOfficeDailyReports.reportDate, input.reportDate),
              eq(frontOfficeDailyReports.shiftLabel, shiftLabel)
            )
          )
          .execute();
      }

      const [newRow] = await tx
        .insert(frontOfficeDailyReports)
        .values({
          reportDate: input.reportDate,
          shiftLabel,
          version: nextVersion,
          isActive: true,
          consultationFileName: input.consultationFileName,
          procedureFileName: input.procedureFileName,
          radiologyFileName: input.radiologyFileName,
          totalPatients: input.totalPatients,
          totalBill: String(input.totalBill),
          totalCollected: String(input.totalCollected),
          totalPending: String(input.totalPending),
          realizationRate: String(input.realizationRate),
          totalExpenses: String(input.totalExpenses),
          netCollections: String(input.netCollections),
          patientMix: input.patientMix,
          summaryData: input.summaryData ?? null,
          patientData: input.patientData ?? null,
          createdBy: userId || null,
        })
        .returning()
        .execute();

      return newRow;
    });

    return c.json(saved, 201);
  })

  // -------------------------------------------------------------------------
  // Delete a report
  // -------------------------------------------------------------------------
  .delete("/front-office/reports/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid report ID" }, 400);

    const [deleted] = await db
      .delete(frontOfficeDailyReports)
      .where(eq(frontOfficeDailyReports.id, id))
      .returning()
      .execute();

    if (!deleted) return c.json({ error: "Report not found" }, 404);

    // If the deleted record was the active version, activate the highest remaining version for this date+shift
    if (deleted.isActive) {
      const [latestRemaining] = await db
        .select({ id: frontOfficeDailyReports.id })
        .from(frontOfficeDailyReports)
        .where(
          and(
            eq(frontOfficeDailyReports.reportDate, deleted.reportDate),
            eq(frontOfficeDailyReports.shiftLabel, deleted.shiftLabel)
          )
        )
        .orderBy(desc(frontOfficeDailyReports.version))
        .limit(1)
        .execute();

      if (latestRemaining) {
        await db
          .update(frontOfficeDailyReports)
          .set({ isActive: true, updatedAt: new Date() })
          .where(eq(frontOfficeDailyReports.id, latestRemaining.id))
          .execute();
      }
    }

    return c.json({ success: true, id: deleted.id });
  })

  // -------------------------------------------------------------------------
  // Fetch live daily data from Docterz API
  // -------------------------------------------------------------------------
  .post("/front-office/fetch-live", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
      })
    );

    try {
      const data = await fetchDocterzFrontOfficeData(input.date);
      return c.json(data);
    } catch (err: any) {
      console.error("Failed to fetch Docterz live data:", err);
      return c.json(
        {
          error: err.message || "Failed to fetch data from Docterz API",
        },
        502
      );
    }
  })

  // -------------------------------------------------------------------------
  // Get active Docterz API configuration
  // -------------------------------------------------------------------------
  .get("/front-office/docterz-config", async (c) => {
    const config = await getDocterzConfig();
    return c.json(config);
  })

  // -------------------------------------------------------------------------
  // Update Docterz API configuration
  // -------------------------------------------------------------------------
  .put("/front-office/docterz-config", async (c) => {
    const session = c.get("session");
    const input = await jsonBody(
      c,
      z.object({
        authorization: z.string().min(1, "Authorization header token is required"),
        apiKey: z.string().min(1, "x-api-key token is required"),
        appKey: z.string().optional().default("79ca90b3"),
        clinicId: z.string().optional().default("5760"),
        doctorIds: z.string().optional().default("[11299,11300,11301,11302,11600,11601]"),
        baseUrl: z.string().url("Base URL must be valid").optional(),
        referer: z.string().optional(),
      })
    );

    const saved = await saveDocterzConfig(input, session?.user?.id);
    return c.json({ success: true, config: saved });
  })

  // -------------------------------------------------------------------------
  // Test Docterz API connection probe with given or saved headers
  // -------------------------------------------------------------------------
  .post("/front-office/docterz-config/test", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        authorization: z.string().optional(),
        apiKey: z.string().optional(),
        appKey: z.string().optional(),
        clinicId: z.string().optional(),
        doctorIds: z.string().optional(),
        baseUrl: z.string().optional(),
        referer: z.string().optional(),
        testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
    );

    const result = await testDocterzConnection(input, input.testDate);
    return c.json(result);
  });
