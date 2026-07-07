import { and, desc, eq, sql, gte, lte } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  transactions,
  consultantRates,
  staff,
  appointments,
  patients,
  departments,
  staffDepartments,
} from "../db/schema.ts";
import { jsonBody } from "./shared.ts";

export const accountsRoutes = new Hono<AuthEnv>()
  // -------------------------------------------------------------------------
  // Incomes / Expenses Transactions (Day Report)
  // -------------------------------------------------------------------------
  .get("/accounts/transactions", async (c) => {
    const date = c.req.query("date");
    if (!date) {
      return c.json({ error: "Date parameter is required" }, 400);
    }
    const rows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.date, date))
      .orderBy(desc(transactions.id))
      .execute();
    return c.json(rows);
  })

  .post("/accounts/transactions", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        date: z.string(),
        description: z.string(),
        category: z.string(),
        type: z.string(),
        amount: z.number(),
        paymentMethod: z.string(),
        notes: z.string().optional().nullable(),
      })
    );
    const [row] = await db
      .insert(transactions)
      .values(input)
      .returning()
      .execute();
    return c.json(row, 201);
  })

  .delete("/accounts/transactions/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ error: "Invalid ID" }, 400);
    }
    const [row] = await db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning()
      .execute();
    if (!row) {
      return c.json({ error: "Transaction not found" }, 404);
    }
    return c.json({ success: true, deleted: row });
  })

  // -------------------------------------------------------------------------
  // Consultant settings & rates
  // -------------------------------------------------------------------------
  .get("/accounts/consultant-rates", async (c) => {
    const doctors = await db
      .select({
        staffId: staff.staffId,
        name: staff.name,
        employeeCode: staff.employeeCode,
        role: staff.role,
        departmentName: departments.name,
        rateId: consultantRates.id,
        baseRate: consultantRates.baseRate,
        doctorSharePercent: consultantRates.doctorSharePercent,
      })
      .from(staff)
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId}
          AND ${staff.version} = ${staffDepartments.staffVersion}
          AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(consultantRates, eq(staff.staffId, consultantRates.doctorId))
      .where(and(eq(staff.active, true), eq(staff.role, "Doctor")))
      .execute();

    const result = doctors.map((doc) => ({
      staffId: doc.staffId,
      name: doc.name,
      employeeCode: doc.employeeCode,
      role: doc.role,
      departmentName: doc.departmentName ?? "General Medicine",
      rateId: doc.rateId ?? null,
      baseRate: doc.baseRate ?? 500,
      doctorSharePercent: doc.doctorSharePercent ?? 70,
    }));

    return c.json(result);
  })

  .post("/accounts/consultant-rates", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        doctorId: z.number(),
        baseRate: z.number(),
        doctorSharePercent: z.number(),
      })
    );

    const [existing] = await db
      .select()
      .from(consultantRates)
      .where(eq(consultantRates.doctorId, input.doctorId))
      .limit(1)
      .execute();

    let row;
    if (existing) {
      [row] = await db
        .update(consultantRates)
        .set({
          baseRate: input.baseRate,
          doctorSharePercent: input.doctorSharePercent,
          updatedAt: new Date(),
        })
        .where(eq(consultantRates.doctorId, input.doctorId))
        .returning()
        .execute();
    } else {
      [row] = await db
        .insert(consultantRates)
        .values({
          doctorId: input.doctorId,
          baseRate: input.baseRate,
          doctorSharePercent: input.doctorSharePercent,
        })
        .returning()
        .execute();
    }

    return c.json(row);
  })

  // -------------------------------------------------------------------------
  // Consultant Charges calculation
  // -------------------------------------------------------------------------
  .get("/accounts/consultant-charges", async (c) => {
    const startDateStr = c.req.query("startDate");
    const endDateStr = c.req.query("endDate");
    if (!startDateStr || !endDateStr) {
      return c.json({ error: "startDate and endDate parameters are required" }, 400);
    }

    const startTimestamp = new Date(`${startDateStr}T00:00:00.000Z`);
    const endTimestamp = new Date(`${endDateStr}T23:59:59.999Z`);

    const appts = await db
      .select({
        appointmentId: appointments.id,
        doctorId: appointments.doctorId,
        scheduledAt: appointments.scheduledAt,
        status: appointments.status,
        patientName: patients.name,
        patientMrn: patients.mrn,
        departmentName: departments.name,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(departments, eq(appointments.departmentId, departments.id))
      .where(
        and(
          eq(appointments.status, "Completed"),
          gte(appointments.scheduledAt, startTimestamp),
          lte(appointments.scheduledAt, endTimestamp)
        )
      )
      .execute();

    const docs = await db
      .select({
        staffId: staff.staffId,
        name: staff.name,
        employeeCode: staff.employeeCode,
        baseRate: consultantRates.baseRate,
        doctorSharePercent: consultantRates.doctorSharePercent,
      })
      .from(staff)
      .leftJoin(consultantRates, eq(staff.staffId, consultantRates.doctorId))
      .where(and(eq(staff.active, true), eq(staff.role, "Doctor")))
      .execute();

    const docVisits = new Map<number, typeof appts>();
    appts.forEach((appt) => {
      const list = docVisits.get(appt.doctorId) ?? [];
      list.push(appt);
      docVisits.set(appt.doctorId, list);
    });

    const report = docs.map((doc) => {
      const visits = docVisits.get(doc.staffId) ?? [];
      const baseRate = doc.baseRate ?? 500;
      const sharePercent = doc.doctorSharePercent ?? 70;

      let totalConsultantEarnings = 0;
      let totalHospitalEarnings = 0;
      const detailedVisits = visits.map((v) => {
        const docShare = (baseRate * sharePercent) / 100;
        const hospShare = baseRate - docShare;
        totalConsultantEarnings += docShare;
        totalHospitalEarnings += hospShare;

        return {
          appointmentId: v.appointmentId,
          patientName: v.patientName,
          patientMrn: v.patientMrn,
          scheduledAt: v.scheduledAt,
          departmentName: v.departmentName,
          baseRate,
          doctorShare: docShare,
          hospitalShare: hospShare,
        };
      });

      return {
        doctorId: doc.staffId,
        doctorName: doc.name,
        doctorCode: doc.employeeCode,
        totalVisits: visits.length,
        baseRate,
        sharePercent,
        totalConsultantEarnings,
        totalHospitalEarnings,
        totalCharges: visits.length * baseRate,
        visits: detailedVisits,
      };
    });

    return c.json(report);
  })

  // Mock visits seeder for quick demonstration/testing
  .post("/accounts/mock-appointments", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        doctorId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
        count: z.number().int().positive().default(5),
      })
    );

    const ptList = await db.select().from(patients).execute();
    if (ptList.length === 0) {
      return c.json({ error: "No patients exist in the database to generate mock appointments. Please seed the database first." }, 400);
    }

    const [docDept] = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staff)
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
      )
      .where(eq(staff.staffId, input.doctorId))
      .limit(1)
      .execute();

    const departmentId = docDept?.departmentId ?? 1;

    const start = new Date(`${input.startDate}T09:00:00Z`);
    const end = new Date(`${input.endDate}T17:00:00Z`);
    const diffMs = end.getTime() - start.getTime();

    const reasons = [
      "Regular health checkup",
      "Follow-up visit",
      "Fever and head congestion",
      "Chronic knee pain evaluation",
      "Reviewing blood work report",
      "Mild allergy consultation",
    ];

    const inserted = [];
    for (let i = 0; i < input.count; i++) {
      const randomPatient = ptList[Math.floor(Math.random() * ptList.length)];
      const randomTime = new Date(start.getTime() + Math.random() * diffMs);
      const token = `T-${Math.floor(100 + Math.random() * 900)}`;

      const [appt] = await db
        .insert(appointments)
        .values({
          patientId: randomPatient.id,
          doctorId: input.doctorId,
          departmentId: departmentId,
          scheduledAt: randomTime,
          reason: reasons[Math.floor(Math.random() * reasons.length)],
          status: "Completed",
          token: token,
        })
        .returning()
        .execute();

      inserted.push(appt);
    }

    return c.json({ success: true, count: inserted.length, appointments: inserted });
  });
