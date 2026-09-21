import { desc, eq, asc, and, or, ilike, sql, gte, lte } from "drizzle-orm";
import { createHash } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  frontOfficeDailyReports,
  frontOfficePatientAppointments,
  frontOfficeRazorpayReconciliationRows,
  frontOfficeRazorpayReconciliations,
  frontOfficeShifts,
  docterzPatients,
  user,
} from "../db/schema.ts";
import {
  fetchDocterzFrontOfficeData,
  fetchDocterzPatientRecords,
  getDocterzConfig,
  saveDocterzConfig,
  testDocterzConnection,
  resolveDocterzPatientUrl,
  syncDocterzPatients,
  getDocterzSyncStatus,
  updateDocterzSyncConfig,
  resetStuckSync,
} from "../services/docterz.ts";
import { jsonBody, requireFrontOfficeAccess } from "./shared.ts";

function parseHistoryDate(value: unknown): Date | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?/i);
  if (match) {
    let hour = Number(match[4] || 0);
    const meridiem = match[6]?.toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    const parsed = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), hour, Number(match[5] || 0));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}



export const frontOfficeRoutes = new Hono<AuthEnv>()
  .use("/front-office/*", requireFrontOfficeAccess)

  .post("/front-office/appointment-history/sync", async (c) => {
    const input = await jsonBody(c, z.object({
      sourceLabel: z.string().trim().min(1).max(500),
      appointments: z.array(z.object({
        sourceType: z.enum(["consultation", "laboratory", "radiology"]),
        patientUid: z.string().max(200).default(""),
        patientName: z.string().trim().min(1).max(500),
        patientMobile: z.string().max(100).default(""),
        appointmentId: z.string().max(200).default(""),
        appointmentDate: z.string().max(100).default(""),
        doctorName: z.string().max(500).default(""),
        serviceName: z.string().max(1000).default(""),
        schedule: z.string().max(500).default(""),
        invoiceNo: z.string().max(200).default(""),
        billAmount: z.number().finite().default(0),
        collectedAmount: z.number().finite().default(0),
        pendingAmount: z.number().finite().default(0),
        paymentMode: z.string().max(500).default(""),
      })).min(1).max(10000),
    }));

    let insertedOrUpdated = 0;
    let patientsAdded = 0;
    let patientsUpdated = 0;
    await db.transaction(async (tx) => {
      const patientCandidates = new Map<string, { uid: string; name: string; mobile: string }>();
      for (const appointment of input.appointments) {
        const digits = appointment.patientMobile.replace(/\D/g, "");
        const mobile = digits.length > 10 ? digits.slice(-10) : digits;
        const key = appointment.patientUid.trim().toLowerCase()
          || (mobile ? `mobile:${mobile}` : `name:${appointment.patientName.trim().toLowerCase()}`);
        if (!patientCandidates.has(key)) {
          patientCandidates.set(key, {
            uid: appointment.patientUid.trim(),
            name: appointment.patientName.trim(),
            mobile,
          });
        }
      }

      for (const patient of patientCandidates.values()) {
        const strongConditions = [];
        if (patient.uid) strongConditions.push(sql`LOWER(COALESCE(${docterzPatients.uid}, '')) = LOWER(${patient.uid})`);
        if (patient.mobile) strongConditions.push(sql`RIGHT(REGEXP_REPLACE(COALESCE(${docterzPatients.mobile}, ''), '\\D', '', 'g'), 10) = ${patient.mobile}`);
        let existing = strongConditions.length
          ? (await tx.select().from(docterzPatients).where(or(...strongConditions)).limit(1))[0]
          : undefined;

        if (!existing && patient.name) {
          const nameMatches = await tx.select().from(docterzPatients)
            .where(sql`LOWER(COALESCE(${docterzPatients.name}, '')) = LOWER(${patient.name})`)
            .limit(2);
          if (nameMatches.length === 1) existing = nameMatches[0];
        }

        if (existing) {
          await tx.update(docterzPatients).set({
            ...(patient.uid ? { uid: patient.uid } : {}),
            ...(patient.name ? { name: patient.name } : {}),
            ...(patient.mobile ? { mobile: patient.mobile } : {}),
            lastSyncedAt: new Date(),
          }).where(eq(docterzPatients.id, existing.id)).execute();
          patientsUpdated += 1;
        } else {
          await tx.insert(docterzPatients).values({
            docterzId: null,
            uid: patient.uid || null,
            name: patient.name,
            mobile: patient.mobile || null,
            rawData: { source: "front_office_appointment_sync" },
          }).execute();
          patientsAdded += 1;
        }
      }

      for (let offset = 0; offset < input.appointments.length; offset += 400) {
        const chunk = input.appointments.slice(offset, offset + 400);
        const keysInChunk = new Set<string>();
        const values = chunk.flatMap((appointment) => {
          const identity = appointment.appointmentId
            ? `${appointment.sourceType}|appointment|${appointment.appointmentId}`
            : [appointment.sourceType, appointment.patientUid || appointment.patientName, appointment.appointmentDate,
                appointment.doctorName, appointment.serviceName, appointment.invoiceNo].join("|").toLowerCase();
          const sourceRecordKey = createHash("sha256").update(identity).digest("hex");
          if (keysInChunk.has(sourceRecordKey)) return [];
          keysInChunk.add(sourceRecordKey);
          return [{
            sourceRecordKey,
            sourceLabel: input.sourceLabel,
            sourceType: appointment.sourceType,
            patientUid: appointment.patientUid || null,
            patientName: appointment.patientName,
            patientMobile: appointment.patientMobile || null,
            appointmentId: appointment.appointmentId || null,
            appointmentDate: appointment.appointmentDate || null,
            doctorName: appointment.doctorName || null,
            serviceName: appointment.serviceName || null,
            schedule: appointment.schedule || null,
            invoiceNo: appointment.invoiceNo || null,
            billAmount: appointment.billAmount.toFixed(2),
            collectedAmount: appointment.collectedAmount.toFixed(2),
            pendingAmount: appointment.pendingAmount.toFixed(2),
            paymentMode: appointment.paymentMode || null,
          }];
        });
        await tx.insert(frontOfficePatientAppointments).values(values).onConflictDoUpdate({
          target: frontOfficePatientAppointments.sourceRecordKey,
          set: {
            sourceLabel: sql`excluded.source_label`,
            patientUid: sql`excluded.patient_uid`,
            patientName: sql`excluded.patient_name`,
            patientMobile: sql`excluded.patient_mobile`,
            appointmentDate: sql`excluded.appointment_date`,
            doctorName: sql`excluded.doctor_name`,
            serviceName: sql`excluded.service_name`,
            schedule: sql`excluded.schedule`,
            invoiceNo: sql`excluded.invoice_no`,
            billAmount: sql`excluded.bill_amount`,
            collectedAmount: sql`excluded.collected_amount`,
            pendingAmount: sql`excluded.pending_amount`,
            paymentMode: sql`excluded.payment_mode`,
            lastSeenAt: new Date(),
          },
        }).execute();
        insertedOrUpdated += values.length;
      }
    });
    return c.json({ success: true, recorded: insertedOrUpdated, patientsAdded, patientsUpdated });
  })

  // -------------------------------------------------------------------------
  // Razorpay reconciliation imports and appointment history
  // -------------------------------------------------------------------------
  .post("/front-office/razorpay-reconciliations", async (c) => {
    const rowSchema = z.object({
      rowNumber: z.number().int().positive(),
      paymentId: z.string().max(200).default(""),
      createdAt: z.string().max(100).default(""),
      status: z.string().max(100).default("unknown"),
      appointmentId: z.string().max(200).default(""),
      appointmentDate: z.string().max(100).default(""),
      paymentDate: z.string().max(100).default(""),
      doctorName: z.string().max(500).default(""),
      sourcePatientName: z.string().max(500).default(""),
      grossAmount: z.number().finite(),
      reversedAmount: z.number().finite(),
      amount: z.number().finite(),
      currency: z.string().max(10).default("INR"),
      patient: z.object({
        id: z.number().int().positive(),
        name: z.string().nullish(),
        uid: z.string().nullish(),
      }).nullable(),
      reconciliationStatus: z.enum(["matched", "review", "unmatched", "ignored"]),
      confidence: z.enum(["high", "medium", "low", "none"]),
      matchReason: z.string().max(2000),
      duplicate: z.boolean(),
      raw: z.record(z.string(), z.unknown()).optional(),
    });
    const input = await jsonBody(c, z.object({
      fileName: z.string().trim().min(1).max(500),
      rows: z.array(rowSchema).min(1).max(5000),
    }));
    const session: any = c.get("session");
    const counts = input.rows.reduce((result, row) => {
      result[row.reconciliationStatus] += 1;
      if (row.reconciliationStatus !== "ignored") result.netAmount += row.amount;
      return result;
    }, { matched: 0, review: 0, unmatched: 0, ignored: 0, netAmount: 0 });

    const saved = await db.transaction(async (tx) => {
      const [reconciliation] = await tx.insert(frontOfficeRazorpayReconciliations).values({
        fileName: input.fileName,
        totalRows: input.rows.length,
        matchedRows: counts.matched,
        reviewRows: counts.review,
        unmatchedRows: counts.unmatched,
        ignoredRows: counts.ignored,
        netAmount: counts.netAmount.toFixed(2),
        createdBy: session?.user?.id || null,
      }).returning().execute();

      for (let offset = 0; offset < input.rows.length; offset += 400) {
        const chunk = input.rows.slice(offset, offset + 400);
        await tx.insert(frontOfficeRazorpayReconciliationRows).values(chunk.map((row) => ({
          reconciliationId: reconciliation.id,
          sourceRowNumber: row.rowNumber,
          transferId: row.paymentId || null,
          settlementStatus: row.status,
          createdAtSource: row.createdAt || null,
          appointmentId: row.appointmentId || null,
          appointmentDate: row.appointmentDate || null,
          paymentDate: row.paymentDate || null,
          doctorName: row.doctorName || null,
          sourcePatientName: row.sourcePatientName || null,
          grossAmount: row.grossAmount.toFixed(2),
          reversedAmount: row.reversedAmount.toFixed(2),
          netAmount: row.amount.toFixed(2),
          currency: row.currency,
          matchedPatientId: row.patient?.id || null,
          matchedPatientName: row.patient?.name || null,
          matchedPatientUid: row.patient?.uid || null,
          reconciliationStatus: row.reconciliationStatus,
          confidence: row.confidence,
          matchReason: row.matchReason,
          isDuplicate: row.duplicate,
          rawData: row.raw || null,
        }))).execute();
      }
      return reconciliation;
    });

    return c.json({ ...saved, netAmount: Number(saved.netAmount) }, 201);
  })

  .get("/front-office/razorpay-reconciliations", async (c) => {
    const limit = Math.min(Math.max(parseInt(c.req.query("limit") || "20", 10), 1), 100);
    const rows = await db.select({
      id: frontOfficeRazorpayReconciliations.id,
      fileName: frontOfficeRazorpayReconciliations.fileName,
      totalRows: frontOfficeRazorpayReconciliations.totalRows,
      matchedRows: frontOfficeRazorpayReconciliations.matchedRows,
      reviewRows: frontOfficeRazorpayReconciliations.reviewRows,
      unmatchedRows: frontOfficeRazorpayReconciliations.unmatchedRows,
      ignoredRows: frontOfficeRazorpayReconciliations.ignoredRows,
      netAmount: frontOfficeRazorpayReconciliations.netAmount,
      createdAt: frontOfficeRazorpayReconciliations.createdAt,
      createdByName: user.name,
    }).from(frontOfficeRazorpayReconciliations)
      .leftJoin(user, eq(frontOfficeRazorpayReconciliations.createdBy, user.id))
      .orderBy(desc(frontOfficeRazorpayReconciliations.createdAt), desc(frontOfficeRazorpayReconciliations.id))
      .limit(limit);
    return c.json(rows.map((row) => ({ ...row, netAmount: Number(row.netAmount) })));
  })

  .get("/front-office/patients/appointment-history", async (c) => {
    const uid = c.req.query("uid")?.trim() || "";
    const name = c.req.query("name")?.trim() || "";
    const mobile = c.req.query("mobile")?.trim() || "";
    if (!uid && !name && !mobile) return c.json({ error: "Patient UID, name, or mobile is required" }, 400);
    const { pool } = await import("../db/client.ts");
    const result = await pool.query(
      `SELECT * FROM (
         SELECT CONCAT('appointment-', a."id") AS "history_key", 'front_office' AS "source_kind",
                a."id", NULL::TEXT AS "transfer_id", 'recorded' AS "settlement_status", NULL::TEXT AS "created_at_source",
                a."appointment_id", a."appointment_date", NULL::TEXT AS "payment_date", a."doctor_name",
                a."patient_name" AS "source_patient_name", a."bill_amount" AS "gross_amount",
                0::NUMERIC AS "reversed_amount", a."collected_amount" AS "net_amount", 'INR' AS "currency",
                'recorded' AS "reconciliation_status", 'source' AS "confidence",
                'Recorded from Front Office activity' AS "match_reason", false AS "is_duplicate",
                NULL::INTEGER AS "reconciliation_id", a."source_label" AS "file_name", a."last_seen_at" AS "imported_at",
                a."source_type", a."service_name", a."schedule", a."invoice_no", a."payment_mode",
                a."pending_amount", a."last_seen_at" AS "sort_at"
         FROM "front_office_patient_appointments" a
         WHERE ($1 <> '' AND LOWER(COALESCE(a."patient_uid", '')) = LOWER($1))
            OR ($2 <> '' AND LOWER(a."patient_name") = LOWER($2))
         UNION ALL
         SELECT CONCAT('razorpay-', r."id") AS "history_key", 'razorpay' AS "source_kind",
                r."id", r."transfer_id", r."settlement_status", r."created_at_source",
                r."appointment_id", r."appointment_date", r."payment_date", r."doctor_name",
                r."source_patient_name", r."gross_amount", r."reversed_amount", r."net_amount",
                r."currency", r."reconciliation_status", r."confidence", r."match_reason",
                r."is_duplicate", x."id" AS "reconciliation_id", x."file_name", x."created_at" AS "imported_at",
                'razorpay' AS "source_type", NULL::TEXT AS "service_name", NULL::TEXT AS "schedule",
                NULL::TEXT AS "invoice_no", NULL::TEXT AS "payment_mode", 0::NUMERIC AS "pending_amount",
                x."created_at" AS "sort_at"
         FROM "front_office_razorpay_reconciliation_rows" r
         JOIN "front_office_razorpay_reconciliations" x ON x."id" = r."reconciliation_id"
         WHERE ($1 <> '' AND LOWER(COALESCE(r."matched_patient_uid", '')) = LOWER($1))
            OR ($2 <> '' AND (LOWER(COALESCE(r."matched_patient_name", '')) = LOWER($2)
                           OR LOWER(COALESCE(r."source_patient_name", '')) = LOWER($2)))
       ) history
       ORDER BY "sort_at" DESC
       LIMIT 250`,
      [uid, name]
    );
    const localRows = result.rows.map((row) => ({
        ...row,
        gross_amount: Number(row.gross_amount),
        reversed_amount: Number(row.reversed_amount),
        net_amount: Number(row.net_amount),
        pending_amount: Number(row.pending_amount),
      }));

    const docterz = await fetchDocterzPatientRecords({ uid, name, mobile });
    const liveRows = docterz.records.map((record) => ({
      history_key: `docterz-record-${record.id}`,
      source_kind: "docterz_record",
      id: record.id,
      transfer_id: null,
      settlement_status: "clinical record",
      created_at_source: null,
      appointment_id: record.appointmentId,
      appointment_date: record.testDate,
      payment_date: null,
      doctor_name: record.uploadedBy,
      source_patient_name: name || null,
      gross_amount: 0,
      reversed_amount: 0,
      net_amount: 0,
      currency: "INR",
      reconciliation_status: "recorded",
      confidence: "live",
      match_reason: "Loaded live from the Docterz patient Records page",
      is_duplicate: false,
      reconciliation_id: null,
      file_name: "Docterz Records",
      imported_at: record.testDate || new Date().toISOString(),
      source_type: record.recordType || "clinical record",
      service_name: record.name,
      schedule: null,
      invoice_no: null,
      payment_mode: null,
      pending_amount: 0,
      record_url: record.fileUrl,
      records_page_url: docterz.recordsUrl || null,
      invoice_url: record.appointmentId
        ? docterz.invoicePdfUrls?.[`appointment:${String(record.appointmentId).trim().toLowerCase()}`] || null
        : null,
    }));

    const historyRows = localRows.map((row) => ({
      ...row,
      invoice_url: (row.appointment_id
        ? docterz.invoicePdfUrls?.[`appointment:${String(row.appointment_id).trim().toLowerCase()}`]
        : null) || (row.invoice_no
        ? docterz.invoicePdfUrls?.[`invoice:${String(row.invoice_no).trim().toLowerCase()}`]
        : null) || null,
    }));

    const knownAppointmentIds = new Set(
      [...historyRows, ...liveRows]
        .map((row) => row.appointment_id ? String(row.appointment_id).trim().toLowerCase() : "")
        .filter(Boolean),
    );
    const knownInvoiceNumbers = new Set(
      historyRows.map((row) => row.invoice_no ? String(row.invoice_no).trim().toLowerCase() : "").filter(Boolean),
    );
    const standaloneInvoices = (docterz.invoices || [])
      .filter((invoice) => {
        const appointmentKey = invoice.appointmentId?.trim().toLowerCase() || "";
        const invoiceKey = invoice.invoiceNo?.trim().toLowerCase() || "";
        return (!appointmentKey || !knownAppointmentIds.has(appointmentKey))
          && (!invoiceKey || !knownInvoiceNumbers.has(invoiceKey));
      })
      .map((invoice) => ({
        history_key: `docterz-invoice-${invoice.id}`,
        source_kind: "docterz_invoice",
        id: invoice.id,
        transfer_id: null,
        settlement_status: "invoice",
        created_at_source: invoice.invoiceDate,
        appointment_id: invoice.appointmentId,
        appointment_date: invoice.invoiceDate,
        payment_date: null,
        doctor_name: invoice.doctorName,
        source_patient_name: name || null,
        gross_amount: invoice.amount,
        reversed_amount: 0,
        net_amount: invoice.amount,
        currency: "INR",
        reconciliation_status: "recorded",
        confidence: "live",
        match_reason: "Loaded live from the Docterz invoice API",
        is_duplicate: false,
        reconciliation_id: null,
        file_name: "Docterz Invoice",
        imported_at: invoice.invoiceDate || new Date().toISOString(),
        source_type: "invoice",
        service_name: "Invoice",
        schedule: null,
        invoice_no: invoice.invoiceNo,
        payment_mode: null,
        pending_amount: 0,
        record_url: null,
        records_page_url: null,
        invoice_url: invoice.pdfUrl,
      }));

    const completeHistory = [...historyRows, ...liveRows, ...standaloneInvoices];
    const latestVisitedAt = completeHistory.reduce<Date | null>((latest, row) => {
      const parsed = parseHistoryDate(row.appointment_date || row.payment_date || row.imported_at);
      return parsed && (!latest || parsed > latest) ? parsed : latest;
    }, null);
    if (latestVisitedAt) {
      await pool.query(
        `UPDATE "docterz_patients"
            SET "last_visited_at" = GREATEST(COALESCE("last_visited_at", $1::timestamp), $1::timestamp)
          WHERE ($2 <> '' AND LOWER(COALESCE("uid", '')) = LOWER($2))
             OR ($3 <> '' AND LOWER(COALESCE("name", '')) = LOWER($3))
             OR ($4 <> '' AND RIGHT(REGEXP_REPLACE(COALESCE("mobile", ''), '\\D', '', 'g'), 10)
                              = RIGHT(REGEXP_REPLACE($4, '\\D', '', 'g'), 10))`,
        [latestVisitedAt, uid, name, mobile],
      );
    }

    return c.json({
      data: completeHistory,
      total: completeHistory.length,
      docterz: {
        recordsUrl: docterz.recordsUrl || null,
        invoicePdfsLoaded: Object.keys(docterz.invoicePdfUrls || {}).length,
        recordsLoaded: liveRows.length,
        standaloneInvoicesLoaded: standaloneInvoices.length,
        warning: docterz.warning || null,
      },
    });
  })

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
        appKey: z.string().optional().default(""),
        clinicId: z.string().optional().default(""),
        doctorIds: z.string().optional().default(""),
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
  })

  // -------------------------------------------------------------------------
  // Resolve Docterz patient deep-link URL (records and invoices)
  // -------------------------------------------------------------------------
  .post("/front-office/resolve-patient-url", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        uid: z.string().optional(),
        mobile: z.string().optional(),
        name: z.string().optional(),
        invoiceNo: z.string().optional(),
      })
    );

    const result = await resolveDocterzPatientUrl(input);
    return c.json(result);
  })

  // -------------------------------------------------------------------------
  // List locally-synced Docterz patients (paginated, searchable)
  // -------------------------------------------------------------------------
  .get("/front-office/patients", async (c) => {
    const search = c.req.query("search")?.trim() || "";
    const gender = c.req.query("gender")?.trim() || "";
    const isExport = c.req.query("export") === "true" || c.req.query("all") === "true";
    const page = Math.max(1, parseInt(c.req.query("page") || "1", 10));
    const pageSize = Math.min(Math.max(1, parseInt(c.req.query("pageSize") || "25", 10)), 100);
    const offset = (page - 1) * pageSize;
    const sortBy = c.req.query("sortBy") || "name";
    const sortDirection = c.req.query("sortOrder") === "desc" ? "DESC" : "ASC";
    const sortableColumns: Record<string, string> = {
      name: `"name"`,
      guardian: `"guardian_name"`,
      mobile: `"mobile"`,
      uid: `"uid"`,
      dob: `"dob"`,
      gender: `"gender"`,
      lastVisited: `"last_visited_at"`,
      lastSynced: `"last_synced_at"`,
    };
    const orderColumn = sortableColumns[sortBy] || sortableColumns.name;
    const orderClause = `ORDER BY ${orderColumn} ${sortDirection} NULLS LAST, "id" ASC`;

    const { pool } = await import("../db/client.ts");

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(`(LOWER(COALESCE("name",'')) LIKE $${pIdx}
                        OR LOWER(COALESCE("uid",'')) LIKE $${pIdx}
                        OR COALESCE("mobile",'') LIKE $${pIdx}
                        OR LOWER(COALESCE("guardian_name",'')) LIKE $${pIdx}
                        OR LOWER(COALESCE("aadhaar_no",'')) LIKE $${pIdx}
                        OR LOWER(COALESCE("third_party_application_uid",'')) LIKE $${pIdx})`);
    }

    if (gender && gender !== "all") {
      params.push(gender.toLowerCase());
      conditions.push(`LOWER(COALESCE("gender",'')) = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // If export=true, return all matching records without pagination limits
    if (isExport) {
      const rows = await pool.query(
        `SELECT "id","docterz_id","uid","name","guardian_name","mobile","dob",
                "gender","address","clinic_id","aadhaar_no",
                "third_party_application_uid","first_seen_at","last_synced_at",
                COALESCE("last_visited_at"::text, (SELECT MAX(NULLIF(a."appointment_date", ''))
                   FROM "front_office_patient_appointments" a
                  WHERE ("docterz_patients"."uid" IS NOT NULL AND LOWER(a."patient_uid") = LOWER("docterz_patients"."uid"))
                     OR ("docterz_patients"."mobile" IS NOT NULL AND a."patient_mobile" = "docterz_patients"."mobile")
                     OR ("docterz_patients"."name" IS NOT NULL AND LOWER(a."patient_name") = LOWER("docterz_patients"."name")))) AS "last_visited_at"
         FROM "docterz_patients"
         ${whereClause}
         ${orderClause}`,
        params
      );
      return c.json({
        data: rows.rows,
        total: rows.rows.length,
      });
    }

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM "docterz_patients" ${whereClause}`,
      params
    );
    const totalRecords = countRes.rows[0]?.cnt ?? 0;

    const limitParamIdx = params.length + 1;
    const offsetParamIdx = params.length + 2;
    params.push(pageSize, offset);

    const rows = await pool.query(
      `SELECT "id","docterz_id","uid","name","guardian_name","mobile","dob",
              "gender","address","clinic_id","aadhaar_no",
              "third_party_application_uid","first_seen_at","last_synced_at",
              COALESCE("last_visited_at"::text, (SELECT MAX(NULLIF(a."appointment_date", ''))
                 FROM "front_office_patient_appointments" a
                WHERE ("docterz_patients"."uid" IS NOT NULL AND LOWER(a."patient_uid") = LOWER("docterz_patients"."uid"))
                   OR ("docterz_patients"."mobile" IS NOT NULL AND a."patient_mobile" = "docterz_patients"."mobile")
                   OR ("docterz_patients"."name" IS NOT NULL AND LOWER(a."patient_name") = LOWER("docterz_patients"."name")))) AS "last_visited_at"
       FROM "docterz_patients"
       ${whereClause}
       ${orderClause}
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      params
    );

    return c.json({
      data: rows.rows,
      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.max(1, Math.ceil(totalRecords / pageSize)),
      },
    });
  })

  // -------------------------------------------------------------------------
  // Get patient sync status (latest log + patient count + schedule config)
  // -------------------------------------------------------------------------
  .get("/front-office/patients/sync-status", async (c) => {
    try {
      const status = await getDocterzSyncStatus();
      return c.json(status);
    } catch (err: any) {
      return c.json({ error: err.message || "Failed to fetch sync status" }, 500);
    }
  })

  // -------------------------------------------------------------------------
  // Trigger a manual patient sync
  // -------------------------------------------------------------------------
  .post("/front-office/patients/sync", async (c) => {
    const session: any = c.get("session");
    const triggeredBy = session?.user?.id || "manual";

    // Fire sync in background; respond immediately with accepted status
    const result = await syncDocterzPatients(triggeredBy).catch((err: any) => ({
      success: false,
      newRecords: 0,
      updatedRecords: 0,
      totalFetched: 0,
      pagesFetched: 0,
      errorMessage: err.message,
    }));

    return c.json(result, result.success ? 200 : 202);
  })

  // -------------------------------------------------------------------------
  // Force-reset a stuck sync (clears stale 'running' log rows + in-memory guard)
  // -------------------------------------------------------------------------
  .post("/front-office/patients/sync-reset", async (c) => {
    try {
      await resetStuckSync();
      return c.json({ success: true, message: "Stuck sync cleared. You can now start a fresh sync." });
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 500);
    }
  })

  // -------------------------------------------------------------------------
  // Update patient sync schedule config (enabled + interval)
  // -------------------------------------------------------------------------
  .put("/front-office/patients/sync-config", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        syncEnabled: z.boolean(),
        syncIntervalMinutes: z.number().int().min(5).max(1440),
      })
    );

    await updateDocterzSyncConfig(input.syncEnabled, input.syncIntervalMinutes);
    return c.json({ success: true });
  })

  // -------------------------------------------------------------------------
  // Update patient details (e.g. Aadhaar, mobile, guardian name)
  // -------------------------------------------------------------------------
  .patch("/front-office/patients/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const body = await c.req.json().catch(() => ({}));
    const { pool } = await import("../db/client.ts");

    const updates: string[] = [];
    const values: any[] = [];

    if (body.aadhaarNo !== undefined) {
      values.push(body.aadhaarNo ? String(body.aadhaarNo).trim() : null);
      updates.push(`"aadhaar_no" = $${values.length}`);
    }
    if (body.mobile !== undefined) {
      values.push(body.mobile ? String(body.mobile).trim() : null);
      updates.push(`"mobile" = $${values.length}`);
    }
    if (body.guardianName !== undefined) {
      values.push(body.guardianName ? String(body.guardianName).trim() : null);
      updates.push(`"guardian_name" = $${values.length}`);
    }

    if (updates.length === 0) {
      return c.json({ success: false, error: "No fields to update" }, 400);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE "docterz_patients" SET ${updates.join(", ")} WHERE "id" = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return c.json({ success: false, error: "Patient not found" }, 404);
    }

    return c.json({ success: true, data: result.rows[0] });
  });
