import { eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  attendance,
  biometricMappings,
  leaveRequests,
  rosters,
  shifts,
  staff,
  staffDepartments,
} from "../db/schema.ts";
import { idParam } from "./shared.ts";

export const attendanceRoutes = new Hono<AuthEnv>()
  .get("/hr/attendance", async (c) => {
    const date = c.req.query("date") || new Date().toISOString().split("T")[0];
    const departmentId = c.req.query("departmentId");
    const staffIdFilter = c.req.query("staffId");
    const statusFilter = c.req.query("status");

    let staffQuery = db
      .select({
        id: staff.staffId,
        name: staff.name,
        employeeCode: staff.employeeCode,
        status: staff.status,
      })
      .from(staff)
      .where(sql`${staff.status} = 'Active' AND ${staff.active} = true`)
      .$dynamic();

    if (staffIdFilter) {
      staffQuery = staffQuery.where(eq(staff.staffId, parseInt(staffIdFilter)));
    }

    let employees = await staffQuery.execute();

    if (departmentId) {
      const deptStaff = await db
        .select({ staffId: staffDepartments.staffId })
        .from(staffDepartments)
        .where(
          sql`${staffDepartments.departmentId} = ${parseInt(departmentId)} AND ${staffDepartments.status} = 'Active'`
        )
        .execute();
      const staffIds = new Set(deptStaff.map((d) => d.staffId));
      employees = employees.filter((e) => staffIds.has(e.id));
    }

    const attendanceRecords = await db
      .select()
      .from(attendance)
      .where(eq(attendance.date, date))
      .execute();
    const attendanceMap = new Map(attendanceRecords.map((r) => [r.staffId, r]));

    const activeRosters = await db
      .select({
        id: rosters.id,
        staffId: rosters.staffId,
        shiftName: shifts.name,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        isOffDay: shifts.isOffDay,
      })
      .from(rosters)
      .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
      .where(
        sql`${rosters.date} = ${date}`
      )
      .execute();
    const rosterMap = new Map(activeRosters.map((r) => [r.staffId, r]));

    const dateTimestamp = new Date(`${date}T12:00:00Z`);
    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${dateTimestamp} AND ${leaveRequests.endDate} >= ${dateTimestamp}`
      )
      .execute();
    const leaveMap = new Map(approvedLeaves.map((l) => [l.staffId, l]));

    const result = employees.map((emp) => {
      const att = attendanceMap.get(emp.id);
      const rost = rosterMap.get(emp.id);
      const leaveReq = leaveMap.get(emp.id);

      let computedStatus = "Off Duty";
      if (att) {
        computedStatus = att.status;
      } else if (rost) {
        if (leaveReq) {
          computedStatus = "Approved Leave";
        } else if (rost.isOffDay) {
          computedStatus = "Off Duty";
        } else {
          computedStatus = "Absent";
        }
      }

      return {
        staffId: emp.id,
        name: emp.name,
        employeeCode: emp.employeeCode,
        date,
        attendanceId: att?.id || null,
        checkIn: att?.checkIn || null,
        checkOut: att?.checkOut || null,
        status: computedStatus,
        notes: att?.notes || null,
        rosteredShift: rost
          ? { name: rost.shiftName, startTime: rost.startTime, endTime: rost.endTime }
          : null,
      };
    });

    if (statusFilter && statusFilter !== "All") {
      return c.json(result.filter((r) => r.status === statusFilter));
    }

    return c.json(result);
  })
  .post("/hr/attendance", async (c) => {
    const input = z
      .object({
        staffId: z.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
        checkIn: z.string().nullable().optional(),
        checkOut: z.string().nullable().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(await c.req.json());

    const existing = await db
      .select()
      .from(attendance)
      .where(
        sql`${attendance.staffId} = ${input.staffId} AND ${attendance.date} = ${input.date}`
      )
      .limit(1)
      .then((res: any) => res[0]);

    if (existing) {
      return c.json(
        { error: "Attendance record already exists for this date." },
        400
      );
    }

    let finalStatus = input.status || "Present";
    if (!input.status && input.checkIn) {
      const rost = await db
        .select({ startTime: shifts.startTime })
        .from(rosters)
        .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
        .where(
          sql`${rosters.staffId} = ${input.staffId} AND ${rosters.date} = ${input.date}`
        )
        .limit(1)
        .then((res: any) => res[0]);
      if (rost) {
        const [shHour, shMin] = rost.startTime.split(":").map(Number);
        const [chHour, chMin] = input.checkIn.split(":").map(Number);
        const shiftMinutes = shHour * 60 + shMin;
        const checkMinutes = chHour * 60 + chMin;
        if (checkMinutes > shiftMinutes + 15) {
          finalStatus = "Late";
        }
      }
    }

    const [row] = await db
      .insert(attendance)
      .values({
        staffId: input.staffId,
        date: input.date,
        checkIn: input.checkIn || null,
        checkOut: input.checkOut || null,
        status: finalStatus,
        notes: input.notes || null,
      })
      .returning()
      .execute();

    return c.json(row, 201);
  })
  .get("/hr/attendance/my-punch-status", async (c) => {
    const userId = c.var.session?.user?.id;
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Find staffId mapped to this user
    const [staffRecord] = await db
      .select({ staffId: staff.staffId })
      .from(staff)
      .where(sql`${staff.userId} = ${userId} AND ${staff.active} = true`)
      .limit(1);

    if (!staffRecord) {
      return c.json({ error: "No staff record associated with this user" }, 404);
    }

    const today = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD" local time
    
    const [att] = await db
      .select()
      .from(attendance)
      .where(
        sql`${attendance.staffId} = ${staffRecord.staffId} AND ${attendance.date} = ${today}`
      )
      .limit(1);
      
    if (!att) {
      return c.json({ status: "not_punched" });
    }
    if (att.checkIn && !att.checkOut) {
      return c.json({ status: "punched_in", checkInTime: att.checkIn });
    }
    return c.json({ status: "punched_out", checkInTime: att.checkIn, checkOutTime: att.checkOut });
  })
  .post("/hr/attendance/punch", async (c) => {
    const userId = c.var.session?.user?.id;
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    // Find staffId mapped to this user
    const [staffRecord] = await db
      .select({ staffId: staff.staffId })
      .from(staff)
      .where(sql`${staff.userId} = ${userId} AND ${staff.active} = true`)
      .limit(1);

    if (!staffRecord) {
      return c.json({ error: "No staff record associated with this user" }, 404);
    }

    const now = new Date();
    // Use local time formatted strings (e.g., India timezone given +05:30)
    // For simplicity, falling back to basic locale formatting which is often browser/server specific.
    // Assuming the server timezone is correct, or just extracting parts.
    const today = now.toLocaleDateString("en-CA"); // YYYY-MM-DD
    const currentTime = now.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit' }); // HH:mm

    const [existingAtt] = await db
      .select()
      .from(attendance)
      .where(
        sql`${attendance.staffId} = ${staffRecord.staffId} AND ${attendance.date} = ${today}`
      )
      .limit(1);

    if (!existingAtt) {
      // Punch In logic (Create new attendance record)
      let finalStatus = "Present";
      
      const rost = await db
        .select({ startTime: shifts.startTime })
        .from(rosters)
        .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
        .where(
          sql`${rosters.staffId} = ${staffRecord.staffId} AND ${rosters.date} = ${today}`
        )
        .limit(1)
        .then((res: any) => res[0]);
        
      if (rost) {
        const [shHour, shMin] = rost.startTime.split(":").map(Number);
        const [chHour, chMin] = currentTime.split(":").map(Number);
        const shiftMinutes = shHour * 60 + shMin;
        const checkMinutes = chHour * 60 + chMin;
        if (checkMinutes > shiftMinutes + 15) {
          finalStatus = "Late";
        }
      }

      const [newAtt] = await db
        .insert(attendance)
        .values({
          staffId: staffRecord.staffId,
          date: today,
          checkIn: currentTime,
          checkOut: null,
          status: finalStatus,
          notes: "Punched in via dashboard",
        })
        .returning()
        .execute();
      
      return c.json({ message: "Punched in successfully", record: newAtt, status: "punched_in" });
    } else {
      // Punch Out logic (Update existing attendance record)
      if (existingAtt.checkOut) {
         return c.json({ error: "Already punched out for today." }, 400);
      }
      
      const [updatedAtt] = await db
        .update(attendance)
        .set({ 
          checkOut: currentTime, 
          notes: existingAtt.notes ? existingAtt.notes + " | Punched out via dashboard" : "Punched out via dashboard" 
        })
        .where(eq(attendance.id, existingAtt.id))
        .returning()
        .execute();
        
      return c.json({ message: "Punched out successfully", record: updatedAtt, status: "punched_out" });
    }
  })
  .put("/hr/attendance/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = z
      .object({
        checkIn: z.string().nullable().optional(),
        checkOut: z.string().nullable().optional(),
        status: z.string().optional(),
        notes: z.string().nullable().optional(),
      })
      .parse(await c.req.json());

    const existing = await db
      .select()
      .from(attendance)
      .where(eq(attendance.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!existing) {
      return c.json({ error: "Attendance log not found" }, 404);
    }

    const updateValues: any = {};
    if (input.checkIn !== undefined) updateValues.checkIn = input.checkIn;
    if (input.checkOut !== undefined) updateValues.checkOut = input.checkOut;
    if (input.notes !== undefined) updateValues.notes = input.notes;

    if (input.status) {
      updateValues.status = input.status;
    } else if (input.checkOut && !input.status) {
      const checkInTime = input.checkIn || existing.checkIn;
      if (checkInTime && input.checkOut) {
        const [chInHour, chInMin] = checkInTime.split(":").map(Number);
        const [chOutHour, chOutMin] = input.checkOut.split(":").map(Number);
        const workedMinutes =
          chOutHour * 60 + chOutMin - (chInHour * 60 + chInMin);
        if (workedMinutes > 0 && workedMinutes < 240) {
          updateValues.status = "Half-day";
        } else {
          updateValues.status =
            existing.status === "Late" ? "Late" : "Present";
        }
      }
    }

    const [row] = await db
      .update(attendance)
      .set(updateValues)
      .where(eq(attendance.id, id))
      .returning()
      .execute();
    return c.json(row);
  })
  .get("/hr/biometric-mappings", async (c) => {
    const rows = await db
      .select({
        id: biometricMappings.id,
        staffId: biometricMappings.staffId,
        biometricCode: biometricMappings.biometricCode,
        staffName: staff.name,
        employeeCode: staff.employeeCode,
        createdAt: biometricMappings.createdAt,
      })
      .from(biometricMappings)
      .innerJoin(staff, eq(biometricMappings.staffId, staff.staffId))
      .orderBy(staff.name)
      .execute();
    return c.json(rows);
  })
  .post("/hr/biometric-mappings", async (c) => {
    const input = z
      .object({
        id: z.number().int().optional(),
        staffId: z.number().int().positive(),
        biometricCode: z.string().min(1),
      })
      .parse(await c.req.json());

    if (input.id) {
      const dupCode = await db
        .select()
        .from(biometricMappings)
        .where(
          sql`${biometricMappings.biometricCode} = ${input.biometricCode} AND ${biometricMappings.id} != ${input.id}`
        )
        .limit(1)
        .then((res: any) => res[0]);
      if (dupCode) {
        return c.json(
          {
            error: `Biometric code '${input.biometricCode}' is already mapped to another employee.`,
          },
          400
        );
      }

      const dupStaff = await db
        .select()
        .from(biometricMappings)
        .where(
          sql`${biometricMappings.staffId} = ${input.staffId} AND ${biometricMappings.id} != ${input.id}`
        )
        .limit(1)
        .then((res: any) => res[0]);
      if (dupStaff) {
        return c.json(
          { error: `Selected employee is already mapped to another biometric code.` },
          400
        );
      }

      const [row] = await db
        .update(biometricMappings)
        .set({
          staffId: input.staffId,
          biometricCode: input.biometricCode,
          updatedAt: new Date(),
        })
        .where(eq(biometricMappings.id, input.id))
        .returning()
        .execute();
      return c.json(row);
    }

    const existingByCode = await db
      .select()
      .from(biometricMappings)
      .where(eq(biometricMappings.biometricCode, input.biometricCode))
      .limit(1)
      .then((res: any) => res[0]);
    if (existingByCode && existingByCode.staffId !== input.staffId) {
      return c.json(
        {
          error: `Biometric code '${input.biometricCode}' is already mapped to another employee.`,
        },
        400
      );
    }

    const existingByStaff = await db
      .select()
      .from(biometricMappings)
      .where(eq(biometricMappings.staffId, input.staffId))
      .limit(1)
      .then((res: any) => res[0]);
    if (existingByStaff) {
      const [row] = await db
        .update(biometricMappings)
        .set({ biometricCode: input.biometricCode, updatedAt: new Date() })
        .where(eq(biometricMappings.id, existingByStaff.id))
        .returning()
        .execute();
      return c.json(row);
    }

    const [row] = await db
      .insert(biometricMappings)
      .values({ staffId: input.staffId, biometricCode: input.biometricCode })
      .returning()
      .execute();
    return c.json(row, 201);
  })
  .delete("/hr/biometric-mappings/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    await db
      .delete(biometricMappings)
      .where(eq(biometricMappings.id, id))
      .execute();
    return c.json({ ok: true });
  })
  .post("/hr/attendance/bulk", async (c) => {
    const input = z
      .array(
        z.object({
          staffId: z.number().int().positive(),
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          checkIn: z.string().nullable().optional(),
          checkOut: z.string().nullable().optional(),
          status: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .parse(await c.req.json());

    await db.transaction(async () => {
      for (const item of input) {
        const existing = await db
          .select()
          .from(attendance)
          .where(
            sql`${attendance.staffId} = ${item.staffId} AND ${attendance.date} = ${item.date}`
          )
          .limit(1)
          .then((res: any) => res[0]);

        let finalStatus = item.status || "Present";
        if (!item.status && item.checkIn) {
          const rost = await db
            .select({ startTime: shifts.startTime })
            .from(rosters)
            .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
            .where(
              sql`${rosters.staffId} = ${item.staffId} AND ${rosters.date} = ${item.date}`
            )
            .limit(1)
            .then((res: any) => res[0]);
          if (rost) {
            const [shHour, shMin] = rost.startTime.split(":").map(Number);
            const [chHour, chMin] = item.checkIn.split(":").map(Number);
            const shiftMinutes = shHour * 60 + shMin;
            const checkMinutes = chHour * 60 + chMin;
            if (checkMinutes > shiftMinutes + 15) {
              finalStatus = "Late";
            }
          }
        }

        if (item.checkOut && !item.status) {
          const checkInTime = item.checkIn || (existing ? existing.checkIn : null);
          if (checkInTime && item.checkOut) {
            const [chInHour, chInMin] = checkInTime.split(":").map(Number);
            const [chOutHour, chOutMin] = item.checkOut.split(":").map(Number);
            const workedMinutes =
              chOutHour * 60 + chOutMin - (chInHour * 60 + chInMin);
            if (workedMinutes > 0 && workedMinutes < 240) {
              finalStatus = "Half-day";
            } else {
              finalStatus = finalStatus === "Late" ? "Late" : "Present";
            }
          }
        }

        const updateValues = {
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          status: finalStatus,
          notes: item.notes || "Biometric Upload",
          updatedAt: new Date(),
        };

        if (existing) {
          await db
            .update(attendance)
            .set(updateValues)
            .where(eq(attendance.id, existing.id))
            .execute();
        } else {
          await db
            .insert(attendance)
            .values({
              staffId: item.staffId,
              date: item.date,
              checkIn: item.checkIn,
              checkOut: item.checkOut,
              status: finalStatus,
              notes: item.notes || "Biometric Upload",
            })
            .execute();
        }
      }
    });

    return c.json({ ok: true, count: input.length });
  })
  .post("/hr/attendance/simulate", async (c) => {
    const input = z
      .object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
      })
      .parse(await c.req.json());

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    let simulatedCount = 0;

    await db
      .delete(attendance)
      .where(
        sql`${attendance.date} >= ${input.startDate} AND ${attendance.date} <= ${input.endDate}`
      )
      .execute();

    const allStaff = await db
      .select()
      .from(staff)
      .where(sql`${staff.status} = 'Active' AND ${staff.active} = true`)
      .execute();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];

      const activeRosters = await db
        .select({
          staffId: rosters.staffId,
          shiftName: shifts.name,
          startTime: shifts.startTime,
          endTime: shifts.endTime,
          isOffDay: shifts.isOffDay,
        })
        .from(rosters)
        .innerJoin(shifts, eq(rosters.shiftId, shifts.id))
        .where(
          sql`${rosters.date} = ${dateStr}`
        )
        .execute();
      const rosterMap = new Map(activeRosters.map((r) => [r.staffId, r]));

      const approvedLeaves = await db
        .select({ staffId: leaveRequests.staffId })
        .from(leaveRequests)
        .where(
          sql`${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} <= ${d} AND ${leaveRequests.endDate} >= ${d}`
        )
        .execute();
      const leaveSet = new Set(approvedLeaves.map((l) => l.staffId));

      for (const emp of allStaff) {
        const rost = rosterMap.get(emp.staffId);
        const onLeave = leaveSet.has(emp.staffId);

        if (onLeave) continue;
        if (rost?.isOffDay) continue;

        if (rost) {
          const rand = Math.random();
          let checkIn: string | null = null;
          let checkOut: string | null = null;
          let attStatus = "Present";
          let notes: string | null = null;

          const [shHour, shMin] = rost.startTime.split(":").map(Number);
          const [ehHour, ehMin] = rost.endTime.split(":").map(Number);

          if (rand < 0.85) {
            const addMin = Math.floor(Math.random() * 5);
            const checkInMin = shHour * 60 + shMin + addMin;
            checkIn = `${String(Math.floor(checkInMin / 60)).padStart(2, "0")}:${String(checkInMin % 60).padStart(2, "0")}`;

            const addOutMin = Math.floor(Math.random() * 10);
            const checkOutMin = ehHour * 60 + ehMin + addOutMin;
            checkOut = `${String(Math.floor(checkOutMin / 60)).padStart(2, "0")}:${String(checkOutMin % 60).padStart(2, "0")}`;
            attStatus = "Present";
          } else if (rand < 0.93) {
            const addMin = 20 + Math.floor(Math.random() * 25);
            const checkInMin = shHour * 60 + shMin + addMin;
            checkIn = `${String(Math.floor(checkInMin / 60)).padStart(2, "0")}:${String(checkInMin % 60).padStart(2, "0")}`;
            checkOut = rost.endTime;
            attStatus = "Late";
            notes = "Checked in late";
          } else if (rand < 0.96) {
            checkIn = rost.startTime;
            const checkOutMin = shHour * 60 + shMin + 240;
            checkOut = `${String(Math.floor(checkOutMin / 60)).padStart(2, "0")}:${String(checkOutMin % 60).padStart(2, "0")}`;
            attStatus = "Half-day";
            notes = "Worked half-day shift";
          } else {
            attStatus = "Absent";
            notes = "Unexcused absence";
          }

          await db
            .insert(attendance)
            .values({
              staffId: emp.staffId,
              date: dateStr,
              checkIn,
              checkOut,
              status: attStatus,
              notes,
            })
            .execute();
          simulatedCount++;
        }
      }
    }

    return c.json({ ok: true, simulatedCount });
  });
