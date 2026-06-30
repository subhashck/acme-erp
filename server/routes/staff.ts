import { aliasedTable, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
import { auth } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  departmentLeaders,
  departments,
  leaveRequests,
  leaveTypes,
  staff,
  staffDepartments,
  staffHrProfiles,
  staffSalaries,
  user,
} from "../db/schema.ts";
import { code, idParam, jsonBody, staffInput } from "./shared.ts";

export const staffRoutes = new Hono<AuthEnv>()
  .get("/hr/staff", async (c) => {
    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const rows = await db
      .select({
        id: staff.id,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
        supervisorLevel1Id: staff.supervisorLevel1Id,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: staff.supervisorLevel2Id,
        supervisorLevel2Name: director.name,
        phone: staff.phone,
        email: staff.email,
        basicSalary: staffSalaries.basicSalary,
        hra: staffSalaries.hra,
        conveyance: staffSalaries.conveyance,
        medical: staffSalaries.medical,
        special: staffSalaries.special,
        epf: staffSalaries.epf,
        esi: staffSalaries.esi,
        professionalTax: staffSalaries.professionalTax,
        otherDeductions: staffSalaries.otherDeductions,
        bankName: staffSalaries.bankName,
        accountNumber: staffSalaries.accountNumber,
        ifscCode: staffSalaries.ifscCode,
        salary: staff.salary,
        status: staff.status,
        aadhar: staff.aadhar,
        pan: staff.pan,
        version: staff.version,
        active: staff.active,
        createdAt: staff.createdAt,
      })
      .from(staff)
      .leftJoin(
        staffDepartments,
        sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(manager, eq(staff.supervisorLevel1Id, manager.id))
      .leftJoin(director, eq(staff.supervisorLevel2Id, director.id))
      .leftJoin(staffSalaries, eq(staff.id, staffSalaries.staffId))
      .where(eq(staff.active, true))
      .orderBy(desc(staff.createdAt))
      .execute();
    return c.json(rows);
  })
  .post("/hr/staff", async (c) => {
    const input = await jsonBody(c, staffInput);
    const session = c.get("session");

    const {
      departmentId,
      basicSalary,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax,
      otherDeductions,
      bankName,
      accountNumber,
      ifscCode,
      hrProfile,
      ...staffData
    } = input;

    const [row] = await db
      .insert(staff)
      .values({ ...staffData, employeeCode: code("EMP"), version: 1, active: true })
      .returning()
      .execute();

    await db
      .insert(staffSalaries)
      .values({
        staffId: row.id,
        basicSalary,
        hra,
        conveyance,
        medical,
        special,
        epf,
        esi,
        professionalTax,
        otherDeductions,
        bankName,
        accountNumber,
        ifscCode,
      })
      .execute();

    await db
      .insert(staffDepartments)
      .values({
        staffId: row.id,
        departmentId: departmentId,
        version: 1,
        status: "Active",
        changedById: session?.user.id,
        changedByName: session?.user.name,
      })
      .execute();

    if (hrProfile) {
      await db
        .insert(staffHrProfiles)
        .values({
          staffId: row.id,
          ...hrProfile,
          educationHistory: hrProfile.educationHistory
            ? JSON.stringify(hrProfile.educationHistory)
            : "[]",
          professionalHistory: hrProfile.professionalHistory
            ? JSON.stringify(hrProfile.professionalHistory)
            : "[]",
        })
        .execute();
    }

    return c.json(row, 201);
  })
  .put("/hr/staff/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, staffInput);
    const session = c.get("session");

    const {
      departmentId,
      basicSalary,
      hra,
      conveyance,
      medical,
      special,
      epf,
      esi,
      professionalTax,
      otherDeductions,
      bankName,
      accountNumber,
      ifscCode,
      hrProfile,
      ...staffData
    } = input;

    // Get the current version of the staff
    const currentStaff = await db
      .select()
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!currentStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const newVersion = (currentStaff.version || 1) + 1;

    // Filter out undefined properties from staffData to avoid overwriting database values with nulls/undefineds
    const cleanStaffData = Object.fromEntries(
      Object.entries(staffData).filter(([_, v]) => v !== undefined)
    ) as typeof staffData;

    // Mark the previous version as inactive
    await db.update(staff).set({ active: false }).where(eq(staff.id, id)).execute();

    // Insert the new active version of the staff
    const [newStaffRow] = await db
      .insert(staff)
      .values({
        supervisorLevel1Id: currentStaff.supervisorLevel1Id,
        supervisorLevel2Id: currentStaff.supervisorLevel2Id,
        ...cleanStaffData,
        employeeCode: currentStaff.employeeCode,
        version: newVersion,
        active: true,
      })
      .returning()
      .execute();

    // Insert a new salary record for the new version
    await db
      .insert(staffSalaries)
      .values({
        staffId: newStaffRow.id,
        basicSalary,
        hra,
        conveyance,
        medical,
        special,
        epf,
        esi,
        professionalTax,
        otherDeductions,
        bankName,
        accountNumber,
        ifscCode,
      })
      .execute();

    // Handle department change / update
    const currentActive = await db
      .select()
      .from(staffDepartments)
      .where(
        sql`${staffDepartments.staffId} = ${id} AND ${staffDepartments.status} = 'Active'`
      )
      .limit(1)
      .then((res: any) => res[0]);

    if (!currentActive || currentActive.departmentId !== departmentId) {
      if (currentActive) {
        await db
          .update(staffDepartments)
          .set({ status: "Inactive" })
          .where(eq(staffDepartments.id, currentActive.id))
          .execute();
      }

      const maxVersionRow = await db
        .select({ maxVersion: sql<number>`max(${staffDepartments.version})` })
        .from(staffDepartments)
        .where(eq(staffDepartments.staffId, id))
        .limit(1)
        .then((res: any) => res[0]);

      const newDeptVersion = (maxVersionRow?.maxVersion || 0) + 1;

      await db
        .insert(staffDepartments)
        .values({
          staffId: newStaffRow.id,
          departmentId: departmentId,
          version: newDeptVersion,
          status: "Active",
          changedById: session?.user.id,
          changedByName: session?.user.name,
        })
        .execute();
    } else {
      // Insert matching department mapping for the new staff version (no department change)
      await db
        .insert(staffDepartments)
        .values({
          staffId: newStaffRow.id,
          departmentId: departmentId,
          version: currentActive.version,
          status: "Active",
          changedById: session?.user.id,
          changedByName: session?.user.name,
        })
        .execute();
    }

    const oldProfile = await db
      .select()
      .from(staffHrProfiles)
      .where(eq(staffHrProfiles.staffId, id))
      .limit(1)
      .then((res: any) => res[0]);

    await db
      .insert(staffHrProfiles)
      .values({
        staffId: newStaffRow.id,
        dateOfBirth: hrProfile?.dateOfBirth ?? oldProfile?.dateOfBirth,
        gender: hrProfile?.gender ?? oldProfile?.gender,
        maritalStatus: hrProfile?.maritalStatus ?? oldProfile?.maritalStatus,
        bloodGroup: hrProfile?.bloodGroup ?? oldProfile?.bloodGroup,
        fatherName: hrProfile?.fatherName ?? oldProfile?.fatherName,
        motherName: hrProfile?.motherName ?? oldProfile?.motherName,
        spouseName: hrProfile?.spouseName ?? oldProfile?.spouseName,
        emergencyContactName:
          hrProfile?.emergencyContactName ?? oldProfile?.emergencyContactName,
        emergencyContactPhone:
          hrProfile?.emergencyContactPhone ?? oldProfile?.emergencyContactPhone,
        currentAddress: hrProfile?.currentAddress ?? oldProfile?.currentAddress,
        permanentAddress: hrProfile?.permanentAddress ?? oldProfile?.permanentAddress,
        uan: oldProfile?.uan,
        epfNumber: hrProfile?.epfNumber ?? oldProfile?.epfNumber,
        esiNumber: hrProfile?.esiNumber ?? oldProfile?.esiNumber,
        educationHistory: hrProfile?.educationHistory
          ? JSON.stringify(hrProfile.educationHistory)
          : (oldProfile?.educationHistory ?? "[]"),
        professionalHistory: hrProfile?.professionalHistory
          ? JSON.stringify(hrProfile.professionalHistory)
          : (oldProfile?.professionalHistory ?? "[]"),
      })
      .execute();

    return c.json(newStaffRow);
  })
  .get("/hr/staff/:id/profile", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const profile = await db
      .select()
      .from(staffHrProfiles)
      .where(eq(staffHrProfiles.staffId, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (profile) {
      return c.json({
        ...profile,
        educationHistory: JSON.parse(profile.educationHistory || "[]"),
        professionalHistory: JSON.parse(profile.professionalHistory || "[]"),
      });
    }

    return c.json({
      fatherName: "",
      motherName: "",
      epfNumber: "",
      esiNumber: "",
      educationHistory: [],
      professionalHistory: [],
    });
  })
  .get("/hr/staff/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const row = await db
      .select({
        id: staff.id,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
        supervisorLevel1Id: staff.supervisorLevel1Id,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: staff.supervisorLevel2Id,
        supervisorLevel2Name: director.name,
        phone: staff.phone,
        email: staff.email,
        basicSalary: staffSalaries.basicSalary,
        hra: staffSalaries.hra,
        conveyance: staffSalaries.conveyance,
        medical: staffSalaries.medical,
        special: staffSalaries.special,
        epf: staffSalaries.epf,
        esi: staffSalaries.esi,
        professionalTax: staffSalaries.professionalTax,
        otherDeductions: staffSalaries.otherDeductions,
        bankName: staffSalaries.bankName,
        accountNumber: staffSalaries.accountNumber,
        ifscCode: staffSalaries.ifscCode,
        salary: staff.salary,
        status: staff.status,
        aadhar: staff.aadhar,
        pan: staff.pan,
        version: staff.version,
        active: staff.active,
        createdAt: staff.createdAt,
      })
      .from(staff)
      .leftJoin(
        staffDepartments,
        sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(manager, eq(staff.supervisorLevel1Id, manager.id))
      .leftJoin(director, eq(staff.supervisorLevel2Id, director.id))
      .leftJoin(staffSalaries, eq(staff.id, staffSalaries.staffId))
      .where(eq(staff.id, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!row) {
      return c.json({ error: "Staff member not found" }, 404);
    }
    return c.json(row);
  })
  .get("/hr/staff/:id/versions", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const targetStaff = await db
      .select({ employeeCode: staff.employeeCode })
      .from(staff)
      .where(eq(staff.id, id))
      .limit(1)
      .then((res: any) => res[0]);
    if (!targetStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const rows = await db
      .select({
        id: staff.id,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
        supervisorLevel1Id: staff.supervisorLevel1Id,
        supervisorLevel1Name: manager.name,
        supervisorLevel2Id: staff.supervisorLevel2Id,
        supervisorLevel2Name: director.name,
        phone: staff.phone,
        email: staff.email,
        basicSalary: staffSalaries.basicSalary,
        hra: staffSalaries.hra,
        conveyance: staffSalaries.conveyance,
        medical: staffSalaries.medical,
        special: staffSalaries.special,
        epf: staffSalaries.epf,
        esi: staffSalaries.esi,
        professionalTax: staffSalaries.professionalTax,
        otherDeductions: staffSalaries.otherDeductions,
        bankName: staffSalaries.bankName,
        accountNumber: staffSalaries.accountNumber,
        ifscCode: staffSalaries.ifscCode,
        salary: staff.salary,
        status: staff.status,
        aadhar: staff.aadhar,
        pan: staff.pan,
        version: staff.version,
        active: staff.active,
        createdAt: staff.createdAt,
      })
      .from(staff)
      .leftJoin(
        staffDepartments,
        sql`${staff.id} = ${staffDepartments.staffId} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(manager, eq(staff.supervisorLevel1Id, manager.id))
      .leftJoin(director, eq(staff.supervisorLevel2Id, director.id))
      .leftJoin(staffSalaries, eq(staff.id, staffSalaries.staffId))
      .where(eq(staff.employeeCode, targetStaff.employeeCode))
      .orderBy(desc(staff.version))
      .execute();
    return c.json(rows);
  })
  .get("/hr/staff/:id/leave-balance", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000;
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`).getTime() / 1000;

    const allLeaveTypes = await db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.active, true))
      .execute();

    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        sql`${leaveRequests.staffId} = ${id} AND ${leaveRequests.status} = 'Approved' AND ${leaveRequests.startDate} >= ${yearStart} AND ${leaveRequests.startDate} <= ${yearEnd}`
      )
      .execute();

    const daysByType: Record<string, number> = {};
    for (const lr of approvedLeaves) {
      const start = lr.startDate;
      const end = lr.endDate;
      const days = Math.max(
        1,
        Math.round((end.getTime() - start.getTime()) / 86400000) + 1
      );
      daysByType[lr.leaveType] = (daysByType[lr.leaveType] ?? 0) + days;
    }

    const leaveBalance = allLeaveTypes.map((lt) => ({
      leaveType: lt.name,
      maxDays: lt.maxDays,
      takenDays: daysByType[lt.name] ?? 0,
      remainingDays: Math.max(0, lt.maxDays - (daysByType[lt.name] ?? 0)),
    }));

    return c.json(leaveBalance);
  });
