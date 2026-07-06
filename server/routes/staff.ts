import { and, desc, eq, sql, max } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
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
  staffSupervisors,
  user,
} from "../db/schema.ts";
import { code, idParam, jsonBody, staffInput } from "./shared.ts";

export const staffRoutes = new Hono<AuthEnv>()
  /**
   * GET /hr/staff
   * Returns all active staff records (latest version for each employee).
   */
  .get("/hr/staff", async (c) => {
    const rows = await db
      .select({
        staffId: staff.staffId,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
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
        isExecutive: staff.isExecutive,
        userId: staff.userId,
        createdAt: staff.createdAt,
      })
      .from(staff)
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId}
          AND ${staff.version} = ${staffDepartments.staffVersion}
          AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(
        staffSalaries,
        sql`${staff.staffId} = ${staffSalaries.staffId}
          AND ${staff.version} = ${staffSalaries.staffVersion}`
      )
      .where(eq(staff.active, true))
      .orderBy(desc(staff.createdAt))
      .execute();
    return c.json(rows);
  })

  /**
   * POST /hr/staff
   * Creates a new staff record (version=1, active=true, new staffId).
   */
  .post("/hr/staff", async (c) => {
    const session = c.get("session");
    if (!session || (session.user.role !== "admin" && session.user.role !== "hr")) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const input = await jsonBody(c, staffInput);

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

    const [maxStaff] = await db
      .select({ maxId: sql<number>`MAX(${staff.staffId})` })
      .from(staff)
      .execute();
    const nextStaffId = (maxStaff?.maxId || 0) + 1;

    const [row] = await db
      .insert(staff)
      .values({ ...staffData, staffId: nextStaffId, employeeCode: code("EMP"), version: 1, active: true })
      .returning()
      .execute();

    await db
      .insert(staffSalaries)
      .values({
        staffId: row.staffId,
        staffVersion: row.version,
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
        staffId: row.staffId,
        staffVersion: row.version,
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
          staffId: row.staffId,
          staffVersion: row.version,
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

  /**
   * PUT /hr/staff/:id
   * Updates staff details by creating a new version row.
   * :id refers to the stable staffId.
   * The old active row is marked inactive, and a new row is inserted with version+1.
   */
  .put("/hr/staff/:id", async (c) => {
    const session = c.get("session");
    if (!session || (session.user.role !== "admin" && session.user.role !== "hr")) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const { id } = idParam.parse(c.req.param());
    const input = await jsonBody(c, staffInput);

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

    // Fetch the current active version by stable staffId
    const currentStaff = await db
      .select()
      .from(staff)
      .where(and(eq(staff.staffId, id), eq(staff.active, true)))
      .limit(1)
      .then((res: any) => res[0]);

    if (!currentStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const newVersion = currentStaff.version + 1;

    const cleanStaffData = Object.fromEntries(
      Object.entries(staffData).filter(([_, v]) => v !== undefined)
    ) as typeof staffData;

    // Mark all existing rows for this staffId as inactive
    await db
      .update(staff)
      .set({ active: false })
      .where(eq(staff.staffId, id))
      .execute();

    // Insert the new active version with the same stable staffId
    const [newStaffRow] = await db
      .insert(staff)
      .values({
        ...cleanStaffData,
        staffId: id,
        employeeCode: currentStaff.employeeCode,
        userId: currentStaff.userId,
        version: newVersion,
        active: true,
      })
      .returning()
      .execute();

    // Insert salary record for the new version
    await db
      .insert(staffSalaries)
      .values({
        staffId: newStaffRow.staffId,
        staffVersion: newStaffRow.version,
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

    // Handle department assignment for new version
    const currentActiveDept = await db
      .select()
      .from(staffDepartments)
      .where(
        sql`${staffDepartments.staffId} = ${id}
          AND ${staffDepartments.staffVersion} = ${currentStaff.version}
          AND ${staffDepartments.status} = 'Active'`
      )
      .limit(1)
      .then((res: any) => res[0]);

    if (!currentActiveDept || currentActiveDept.departmentId !== departmentId) {
      // Department changed — mark previous entry inactive and create new
      if (currentActiveDept) {
        await db
          .update(staffDepartments)
          .set({ status: "Inactive" })
          .where(eq(staffDepartments.id, currentActiveDept.id))
          .execute();
      }

      const maxDeptVersionRow = await db
        .select({ maxVersion: sql<number>`max(${staffDepartments.version})` })
        .from(staffDepartments)
        .where(eq(staffDepartments.staffId, id))
        .limit(1)
        .then((res: any) => res[0]);

      const newDeptVersion = (maxDeptVersionRow?.maxVersion || 0) + 1;

      await db
        .insert(staffDepartments)
        .values({
          staffId: newStaffRow.staffId,
          staffVersion: newStaffRow.version,
          departmentId: departmentId,
          version: newDeptVersion,
          status: "Active",
          changedById: session?.user.id,
          changedByName: session?.user.name,
        })
        .execute();
    } else {
      // Department unchanged — carry forward the department assignment for the new version
      await db
        .insert(staffDepartments)
        .values({
          staffId: newStaffRow.staffId,
          staffVersion: newStaffRow.version,
          departmentId: departmentId,
          version: currentActiveDept.version,
          status: "Active",
          changedById: session?.user.id,
          changedByName: session?.user.name,
        })
        .execute();
    }

    // Copy HR profile to new version (merging any updates from input)
    const oldProfile = await db
      .select()
      .from(staffHrProfiles)
      .where(
        and(
          eq(staffHrProfiles.staffId, id),
          eq(staffHrProfiles.staffVersion, currentStaff.version)
        )
      )
      .limit(1)
      .then((res: any) => res[0]);

    await db
      .insert(staffHrProfiles)
      .values({
        staffId: newStaffRow.staffId,
        staffVersion: newStaffRow.version,
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

    // Copy supervisor assignments to new version
    const oldSupervisors = await db
      .select()
      .from(staffSupervisors)
      .where(
        and(
          eq(staffSupervisors.staffId, id),
          eq(staffSupervisors.staffVersion, currentStaff.version)
        )
      )
      .limit(1)
      .then((res: any) => res[0]);

    if (oldSupervisors) {
      await db
        .insert(staffSupervisors)
        .values({
          staffId: newStaffRow.staffId,
          staffVersion: newStaffRow.version,
          supervisor1Id: oldSupervisors.supervisor1Id,
          supervisor2Id: oldSupervisors.supervisor2Id,
        })
        .execute();
    }

    return c.json(newStaffRow);
  })

  /**
   * GET /hr/staff/:id/profile
   * Returns the HR profile for the active version of a staff member.
   * :id is the stable staffId.
   */
  .get("/hr/staff/:id/profile", async (c) => {
    const { id } = idParam.parse(c.req.param());

    // Get the active version number first
    const activeStaff = await db
      .select({ version: staff.version })
      .from(staff)
      .where(and(eq(staff.staffId, id), eq(staff.active, true)))
      .limit(1)
      .then((res: any) => res[0]);

    const profile = activeStaff
      ? await db
          .select()
          .from(staffHrProfiles)
          .where(
            and(
              eq(staffHrProfiles.staffId, id),
              eq(staffHrProfiles.staffVersion, activeStaff.version)
            )
          )
          .limit(1)
          .then((res: any) => res[0])
      : null;

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

  /**
   * GET /hr/staff/:id
   * Returns the active version of a staff member by stable staffId.
   * :id is the stable staffId.
   */
  .get("/hr/staff/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const row = await db
      .select({
        staffId: staff.staffId,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
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
        sql`${staff.staffId} = ${staffDepartments.staffId}
          AND ${staff.version} = ${staffDepartments.staffVersion}
          AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(
        staffSalaries,
        sql`${staff.staffId} = ${staffSalaries.staffId}
          AND ${staff.version} = ${staffSalaries.staffVersion}`
      )
      .where(and(eq(staff.staffId, id), eq(staff.active, true)))
      .limit(1)
      .then((res: any) => res[0]);

    if (!row) {
      return c.json({ error: "Staff member not found" }, 404);
    }
    return c.json(row);
  })

  /**
   * GET /hr/staff/:id/version/:ver
   * Returns a specific version of a staff member.
   * :id is the stable staffId, :ver is the version number.
   */
  .get("/hr/staff/:id/version/:ver", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const ver = parseInt(c.req.param("ver"), 10);

    const row = await db
      .select({
        staffId: staff.staffId,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
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
        sql`${staff.staffId} = ${staffDepartments.staffId}
          AND ${staff.version} = ${staffDepartments.staffVersion}
          AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(
        staffSalaries,
        sql`${staff.staffId} = ${staffSalaries.staffId}
          AND ${staff.version} = ${staffSalaries.staffVersion}`
      )
      .where(and(eq(staff.staffId, id), eq(staff.version, ver)))
      .limit(1)
      .then((res: any) => res[0]);

    if (!row) {
      return c.json({ error: "Staff version not found" }, 404);
    }
    return c.json(row);
  })

  /**
   * GET /hr/staff/:id/versions
   * Returns all versions of a staff member ordered by version desc.
   * :id is the stable staffId.
   */
  .get("/hr/staff/:id/versions", async (c) => {
    const { id } = idParam.parse(c.req.param());

    // Verify the staff member exists
    const exists = await db
      .select({ staffId: staff.staffId })
      .from(staff)
      .where(eq(staff.staffId, id))
      .limit(1)
      .then((res: any) => res[0]);

    if (!exists) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const rows = await db
      .select({
        staffId: staff.staffId,
        employeeCode: staff.employeeCode,
        name: staff.name,
        role: staff.role,
        departmentId: staffDepartments.departmentId,
        departmentName: departments.name,
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
        sql`${staff.staffId} = ${staffDepartments.staffId}
          AND ${staff.version} = ${staffDepartments.staffVersion}
          AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(
        staffSalaries,
        sql`${staff.staffId} = ${staffSalaries.staffId}
          AND ${staff.version} = ${staffSalaries.staffVersion}`
      )
      .where(eq(staff.staffId, id))
      .orderBy(desc(staff.version))
      .execute();

    return c.json(rows);
  })

  /**
   * GET /hr/staff/:id/leave-balance
   * Returns leave balance for the current year. :id is stable staffId.
   */
  .get("/hr/staff/:id/leave-balance", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01T00:00:00Z`);
    const yearEnd = new Date(`${year}-12-31T23:59:59Z`);

    const allLeaveTypes = await db
      .select()
      .from(leaveTypes)
      .where(eq(leaveTypes.active, true))
      .execute();

    const approvedLeaves = await db
      .select()
      .from(leaveRequests)
      .where(
        sql`${leaveRequests.staffId} = ${id}
          AND ${leaveRequests.status} = 'Approved'
          AND ${leaveRequests.startDate} >= ${yearStart.toISOString()}
          AND ${leaveRequests.startDate} <= ${yearEnd.toISOString()}`
      )
      .execute();

    const daysByType: Record<string, number> = {};
    for (const lr of approvedLeaves) {
      const start = lr.startDate;
      const end = lr.endDate;
      const days = lr.isHalfDay 
        ? 0.5 
        : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
      daysByType[lr.leaveType] = (daysByType[lr.leaveType] ?? 0) + days;
    }

    const leaveBalance = allLeaveTypes.map((lt) => ({
      leaveType: lt.name,
      maxDays: lt.maxDays,
      takenDays: daysByType[lt.name] ?? 0,
      remainingDays: Math.max(0, lt.maxDays - (daysByType[lt.name] ?? 0)),
    }));

    return c.json(leaveBalance);
  })

  /**
   * PATCH /hr/staff/:id/link-user
   * Links a user account to the active staff record. :id is stable staffId.
   */
  .patch("/hr/staff/:id/link-user", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const { userId } = z
      .object({ userId: z.string().nullable() })
      .parse(await c.req.json());

    const existing = await db
      .select({ staffId: staff.staffId })
      .from(staff)
      .where(and(eq(staff.staffId, id), eq(staff.active, true)))
      .limit(1)
      .then((res: any) => res[0]);

    if (!existing) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    if (userId) {
      const conflict = await db
        .select({ staffId: staff.staffId })
        .from(staff)
        .where(
          sql`${staff.userId} = ${userId}
            AND ${staff.active} = true
            AND ${staff.staffId} != ${id}`
        )
        .limit(1)
        .then((res: any) => res[0]);

      if (conflict) {
        return c.json(
          { error: "This user account is already linked to another staff record" },
          409
        );
      }
    }

    // Update the active version row for this staffId
    const [updated] = await db
      .update(staff)
      .set({ userId: userId ?? null })
      .where(and(eq(staff.staffId, id), eq(staff.active, true)))
      .returning()
      .execute();

    return c.json(updated);
  })

  /**
   * GET /hr/staff/:id/supervisors
   * Returns supervisor info for a specific version or the active version of a staff member.
   * :id is the stable staffId.
   */
  .get("/hr/staff/:id/supervisors", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const versionQuery = c.req.query("version");

    let activeStaffRow;
    
    if (versionQuery) {
      activeStaffRow = await db
        .select({ version: staff.version, role: staff.role, isExecutive: staff.isExecutive })
        .from(staff)
        .where(and(eq(staff.staffId, id), eq(staff.version, parseInt(versionQuery, 10))))
        .limit(1)
        .then((res: any) => res[0]);
    } else {
      activeStaffRow = await db
        .select({ version: staff.version, role: staff.role, isExecutive: staff.isExecutive })
        .from(staff)
        .where(and(eq(staff.staffId, id), eq(staff.active, true)))
        .limit(1)
        .then((res: any) => res[0]);
    }

    if (!activeStaffRow) {
      return c.json({ error: "Staff member version not found" }, 404);
    }

    // Fetch explicit supervisor entry for the version
    const explicitSup = await db
      .select()
      .from(staffSupervisors)
      .where(
        and(
          eq(staffSupervisors.staffId, id),
          eq(staffSupervisors.staffVersion, activeStaffRow.version)
        )
      )
      .limit(1)
      .then((res: any) => res[0]);

    // Determine default supervisors from departmentLeaders
    const depts = await db
      .select({
        departmentId: staffDepartments.departmentId,
        headStaffId: departmentLeaders.headStaffId,
        subheadStaffId: departmentLeaders.subheadStaffId,
      })
      .from(staffDepartments)
      .leftJoin(
        departmentLeaders,
        eq(staffDepartments.departmentId, departmentLeaders.departmentId)
      )
      .where(
        sql`${staffDepartments.staffId} = ${id}
          AND ${staffDepartments.staffVersion} = ${activeStaffRow.version}
          AND ${staffDepartments.status} = 'Active'`
      )
      .execute();

    const isDeptLeader = await db
      .select({ id: departmentLeaders.id })
      .from(departmentLeaders)
      .where(
        sql`${departmentLeaders.headStaffId} = ${id}
          OR ${departmentLeaders.subheadStaffId} = ${id}`
      )
      .limit(1)
      .then((res: any) => !!res[0]);

    const isExecutive = activeStaffRow?.isExecutive || isDeptLeader;

    let defaultSupervisor1Id = null;
    let defaultSupervisor2Id = null;
    if (depts.length > 0 && !isDeptLeader) {
      defaultSupervisor1Id = depts[0].headStaffId;
      defaultSupervisor2Id = depts[0].subheadStaffId;
      if (defaultSupervisor1Id === id) defaultSupervisor1Id = null;
      if (defaultSupervisor2Id === id) defaultSupervisor2Id = null;
    }

    const getSupDetails = async (supStaffId: number | null) => {
      if (!supStaffId) return null;
      const s = await db
        .select({
          staffId: staff.staffId,
          name: staff.name,
          employeeCode: staff.employeeCode,
        })
        .from(staff)
        .where(and(eq(staff.staffId, supStaffId), eq(staff.active, true)))
        .limit(1)
        .then((res: any) => res[0]);
      return s || null;
    };

    const explicitSup1 = await getSupDetails(explicitSup?.supervisor1Id);
    const explicitSup2 = await getSupDetails(explicitSup?.supervisor2Id);
    const defaultSup1 = await getSupDetails(defaultSupervisor1Id);
    const defaultSup2 = await getSupDetails(defaultSupervisor2Id);

    return c.json({
      isDeptHeadOrExec: isExecutive,
      hasExplicitEntry: !!explicitSup,
      explicitSupervisors: {
        supervisor1: explicitSup1,
        supervisor2: explicitSup2,
      },
      defaultSupervisors: {
        supervisor1: defaultSup1,
        supervisor2: defaultSup2,
      },
    });
  })

  /**
   * PUT /hr/staff/:id/supervisors
   * Upserts supervisor assignments for a specific version of a staff member.
   * :id is the stable staffId.
   */
  .put("/hr/staff/:id/supervisors", async (c) => {
    const session = c.get("session");
    if (!session || (session.user.role !== "admin" && session.user.role !== "hr")) {
      return c.json({ error: "Unauthorized" }, 403);
    }
    const { id } = idParam.parse(c.req.param());
    const versionQuery = c.req.query("version");

    const body = z
      .object({
        supervisor1Id: z.number().nullable(),
        supervisor2Id: z.number().nullable(),
      })
      .parse(await c.req.json());

    let activeStaff;
    if (versionQuery) {
      activeStaff = await db
        .select({ version: staff.version })
        .from(staff)
        .where(and(eq(staff.staffId, id), eq(staff.version, parseInt(versionQuery, 10))))
        .limit(1)
        .then((res: any) => res[0]);
    } else {
      activeStaff = await db
        .select({ version: staff.version })
        .from(staff)
        .where(and(eq(staff.staffId, id), eq(staff.active, true)))
        .limit(1)
        .then((res: any) => res[0]);
    }

    if (!activeStaff) {
      return c.json({ error: "Staff member not found" }, 404);
    }

    const existing = await db
      .select()
      .from(staffSupervisors)
      .where(
        and(
          eq(staffSupervisors.staffId, id),
          eq(staffSupervisors.staffVersion, activeStaff.version)
        )
      )
      .limit(1)
      .then((res: any) => res[0]);

    if (existing) {
      await db
        .update(staffSupervisors)
        .set({
          supervisor1Id: body.supervisor1Id,
          supervisor2Id: body.supervisor2Id,
        })
        .where(eq(staffSupervisors.id, existing.id))
        .execute();
    } else {
      await db
        .insert(staffSupervisors)
        .values({
          staffId: id,
          staffVersion: activeStaff.version,
          supervisor1Id: body.supervisor1Id,
          supervisor2Id: body.supervisor2Id,
        })
        .execute();
    }

    return c.json({ success: true });
  });
