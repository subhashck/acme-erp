import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  immunizationRecords,
  immunizationSchedules,
  patients,
  staff,
} from "../db/schema.ts";
import {
  addDaysToDate,
  idParam,
  immunizationRecordInput,
  inferDateOfBirth,
  jsonBody,
  todayIsoDate,
} from "./shared.ts";

export const immunizationRoutes = new Hono<AuthEnv>()
  .get("/immunization/schedule", async (c) => {
    const rows = await db
      .select()
      .from(immunizationSchedules)
      .where(eq(immunizationSchedules.active, true))
      .orderBy(immunizationSchedules.sortOrder, immunizationSchedules.id)
      .execute();
    return c.json(rows);
  })
  .get("/immunization/patients", async (c) => {
    const search = c.req.query("search")?.trim();
    let query = db
      .select({
        id: patients.id,
        mrn: patients.mrn,
        name: patients.name,
        age: patients.age,
        gender: patients.gender,
        phone: patients.phone,
      })
      .from(patients)
      .$dynamic();

    if (search) {
      query = query.where(
        sql`${patients.name} LIKE ${`%${search}%`} OR ${patients.mrn} LIKE ${`%${search}%`} OR ${patients.phone} LIKE ${`%${search}%`}`
      );
    }

    return c.json(
      await query.orderBy(desc(patients.createdAt)).limit(50).execute()
    );
  })
  .get("/immunization/patients/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const patient = await db
      .select()
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!patient) return c.json({ error: "Patient not found" }, 404);

    const schedule = await db
      .select()
      .from(immunizationSchedules)
      .where(eq(immunizationSchedules.active, true))
      .orderBy(immunizationSchedules.sortOrder)
      .execute();

    const records = await db
      .select({
        id: immunizationRecords.id,
        patientId: immunizationRecords.patientId,
        scheduleId: immunizationRecords.scheduleId,
        vaccineCode: immunizationRecords.vaccineCode,
        vaccineName: immunizationRecords.vaccineName,
        doseLabel: immunizationRecords.doseLabel,
        administeredAt: immunizationRecords.administeredAt,
        administeredByStaffId: immunizationRecords.administeredByStaffId,
        batchNo: immunizationRecords.batchNo,
        manufacturer: immunizationRecords.manufacturer,
        site: immunizationRecords.site,
        route: immunizationRecords.route,
        adverseEvent: immunizationRecords.adverseEvent,
        notes: immunizationRecords.notes,
        status: immunizationRecords.status,
        staffName: staff.name,
      })
      .from(immunizationRecords)
      .leftJoin(staff, eq(immunizationRecords.administeredByStaffId, staff.staffId))
      .where(eq(immunizationRecords.patientId, id))
      .orderBy(
        desc(immunizationRecords.administeredAt),
        desc(immunizationRecords.createdAt)
      )
      .execute();

    const completed = new Set(
      records.map((record) => record.scheduleId).filter(Boolean)
    );
    const dob = inferDateOfBirth(patient);
    const today = todayIsoDate();
    const due = schedule
      .filter(
        (item) =>
          item.beneficiaryType === "Child" &&
          item.dueAgeDays !== null &&
          !completed.has(item.id)
      )
      .map((item) => {
        const dueDate = addDaysToDate(dob, item.dueAgeDays ?? 0);
        const overdue = dueDate < today;
        return { ...item, dueDate, status: overdue ? "Overdue" : "Due" };
      })
      .filter((item) => item.dueDate <= today || item.status === "Due")
      .slice(0, 12);

    return c.json({ patient, records, due });
  })
  .post("/immunization/records", async (c) => {
    const input = await jsonBody(c, immunizationRecordInput);
    const schedule = input.scheduleId
      ? await db
          .select()
          .from(immunizationSchedules)
          .where(eq(immunizationSchedules.id, input.scheduleId))
          .limit(1)
          .then((res: any) => res[0])
      : null;

    const [row] = await db
      .insert(immunizationRecords)
      .values({
        ...input,
        scheduleId: input.scheduleId ?? null,
        administeredByStaffId: input.administeredByStaffId ?? null,
        batchNo: input.batchNo ?? null,
        manufacturer: input.manufacturer ?? null,
        site: input.site || schedule?.site || null,
        route: input.route || schedule?.route || null,
        adverseEvent: input.adverseEvent ?? null,
        notes: input.notes ?? null,
      })
      .returning()
      .execute();
    return c.json(row, 201);
  });
