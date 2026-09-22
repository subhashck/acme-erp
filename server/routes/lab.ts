import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { type AuthEnv, auth } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  notifications,
  patients,
  staff,
} from "../db/schema.ts";
import {
  labOrderItems,
  labOrders,
  labPanelTests,
  labPanels,
  labResultAudit,
  labResults,
  labSamples,
  labTestCategories,
  labTestReferenceRanges,
  labTests,
} from "../db/schema-lab.ts";
import {
  evaluateResultFlag,
  findMatchingReferenceRange,
  generateAccessionNo,
  generateLabOrderNo,
} from "../services/lab-engine.ts";
import {
  canVerifyLabResults,
  getCurrentStaff,
  idParam,
  requireLabAccess,
} from "./shared.ts";

export const labRoutes = new Hono<AuthEnv>()
  // Guard entire lab router
  .use("/lab/*", requireLabAccess)

  // ---------------------------------------------------------------------------
  // 1. Master Data Endpoints
  // ---------------------------------------------------------------------------

  // Categories
  .get("/lab/categories", async (c) => {
    const rows = await db
      .select()
      .from(labTestCategories)
      .orderBy(labTestCategories.sortOrder, labTestCategories.name);
    return c.json(rows);
  })
  .post("/lab/categories", async (c) => {
    const body = await c.req.json();
    const [inserted] = await db
      .insert(labTestCategories)
      .values({
        name: body.name,
        code: (body.code || "").toUpperCase(),
        sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
        active: body.active !== false,
      })
      .returning();
    return c.json(inserted, 201);
  })

  // Tests
  .get("/lab/tests", async (c) => {
    const rows = await db
      .select({
        id: labTests.id,
        categoryId: labTests.categoryId,
        categoryName: labTestCategories.name,
        categoryCode: labTestCategories.code,
        code: labTests.code,
        name: labTests.name,
        specimenType: labTests.specimenType,
        unit: labTests.unit,
        price: labTests.price,
        turnaroundHours: labTests.turnaroundHours,
        method: labTests.method,
        active: labTests.active,
      })
      .from(labTests)
      .leftJoin(labTestCategories, eq(labTests.categoryId, labTestCategories.id))
      .orderBy(labTestCategories.sortOrder, labTests.name);

    return c.json(rows);
  })
  .post("/lab/tests", async (c) => {
    const body = await c.req.json();
    const [inserted] = await db
      .insert(labTests)
      .values({
        categoryId: Number(body.categoryId),
        code: (body.code || "").toUpperCase(),
        name: body.name,
        specimenType: body.specimenType || "Whole Blood",
        unit: body.unit || null,
        price: String(body.price || "0"),
        turnaroundHours: body.turnaroundHours ? Number(body.turnaroundHours) : 24,
        method: body.method || null,
        active: body.active !== false,
      })
      .returning();
    return c.json(inserted, 201);
  })
  .patch("/lab/tests/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const body = await c.req.json();
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.specimenType !== undefined) updateData.specimenType = body.specimenType;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.price !== undefined) updateData.price = String(body.price);
    if (body.turnaroundHours !== undefined) updateData.turnaroundHours = Number(body.turnaroundHours);
    if (body.method !== undefined) updateData.method = body.method;
    if (body.active !== undefined) updateData.active = Boolean(body.active);
    if (body.categoryId !== undefined) updateData.categoryId = Number(body.categoryId);

    const [updated] = await db
      .update(labTests)
      .set(updateData)
      .where(eq(labTests.id, id))
      .returning();

    return c.json(updated);
  })

  // Reference Ranges per test
  .get("/lab/tests/:id/ranges", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const ranges = await db
      .select()
      .from(labTestReferenceRanges)
      .where(eq(labTestReferenceRanges.testId, id))
      .orderBy(labTestReferenceRanges.gender, labTestReferenceRanges.ageMin);
    return c.json(ranges);
  })
  .post("/lab/tests/:id/ranges", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const body = await c.req.json();
    const [inserted] = await db
      .insert(labTestReferenceRanges)
      .values({
        testId: id,
        gender: body.gender || "Both",
        ageMin: body.ageMin !== undefined ? Number(body.ageMin) : 0,
        ageMax: body.ageMax !== undefined ? Number(body.ageMax) : 120,
        lowValue: body.lowValue !== undefined && body.lowValue !== "" ? String(body.lowValue) : null,
        highValue: body.highValue !== undefined && body.highValue !== "" ? String(body.highValue) : null,
        criticalLow: body.criticalLow !== undefined && body.criticalLow !== "" ? String(body.criticalLow) : null,
        criticalHigh: body.criticalHigh !== undefined && body.criticalHigh !== "" ? String(body.criticalHigh) : null,
        textRange: body.textRange || null,
        remarks: body.remarks || null,
      })
      .returning();
    return c.json(inserted, 201);
  })
  .delete("/lab/ranges/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());
    await db.delete(labTestReferenceRanges).where(eq(labTestReferenceRanges.id, id));
    return c.json({ success: true });
  })

  // Panels
  .get("/lab/panels", async (c) => {
    const panels = await db.select().from(labPanels).orderBy(labPanels.name);

    // Fetch tests for each panel
    const panelTestsRows = await db
      .select({
        panelId: labPanelTests.panelId,
        testId: labTests.id,
        testCode: labTests.code,
        testName: labTests.name,
        specimenType: labTests.specimenType,
        unit: labTests.unit,
        sortOrder: labPanelTests.sortOrder,
      })
      .from(labPanelTests)
      .innerJoin(labTests, eq(labPanelTests.testId, labTests.id))
      .orderBy(labPanelTests.sortOrder);

    const map = new Map<number, any[]>();
    for (const row of panelTestsRows) {
      if (!map.has(row.panelId)) map.set(row.panelId, []);
      map.get(row.panelId)!.push(row);
    }

    const result = panels.map((p) => ({
      ...p,
      tests: map.get(p.id) || [],
    }));

    return c.json(result);
  })
  .post("/lab/panels", async (c) => {
    const body = await c.req.json();
    const testIds: number[] = Array.isArray(body.testIds) ? body.testIds : [];

    const result = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(labPanels)
        .values({
          code: (body.code || "").toUpperCase(),
          name: body.name,
          description: body.description || null,
          price: String(body.price || "0"),
          active: body.active !== false,
        })
        .returning();

      let sort = 1;
      for (const tId of testIds) {
        await tx.insert(labPanelTests).values({
          panelId: inserted.id,
          testId: Number(tId),
          sortOrder: sort++,
        });
      }

      return inserted;
    });

    return c.json(result, 201);
  })

  // ---------------------------------------------------------------------------
  // 2. Orders & Worklist Endpoints
  // ---------------------------------------------------------------------------

  .get("/lab/orders", async (c) => {
    const search = c.req.query("search")?.trim();
    const status = c.req.query("status");
    const priority = c.req.query("priority");
    const patientId = c.req.query("patientId");

    let query = db
      .select({
        id: labOrders.id,
        orderNo: labOrders.orderNo,
        patientId: labOrders.patientId,
        patientName: patients.name,
        patientMrn: patients.mrn,
        patientGender: labOrders.patientGender,
        patientAge: labOrders.patientAge,
        patientPhone: patients.phone,
        status: labOrders.status,
        priority: labOrders.priority,
        orderedAt: labOrders.orderedAt,
        orderedByStaffId: labOrders.orderedByStaffId,
        totalAmount: labOrders.totalAmount,
        clinicalNotes: labOrders.clinicalNotes,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .$dynamic();

    const conditions: any[] = [];
    if (status && status !== "ALL") {
      conditions.push(eq(labOrders.status, status as any));
    }
    if (priority && priority !== "ALL") {
      conditions.push(eq(labOrders.priority, priority as any));
    }
    if (patientId) {
      conditions.push(eq(labOrders.patientId, Number(patientId)));
    }
    if (search) {
      conditions.push(
        sql`${labOrders.orderNo} ILIKE ${`%${search}%`} OR ${patients.name} ILIKE ${`%${search}%`} OR ${patients.mrn} ILIKE ${`%${search}%`}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(desc(labOrders.orderedAt)).limit(100);
    return c.json(rows);
  })

  .post("/lab/orders", async (c) => {
    const body = await c.req.json();
    const patientId = Number(body.patientId);
    if (!patientId) {
      return c.json({ error: "patientId is required" }, 400);
    }

    // 1. Fetch patient
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    if (!patient) {
      return c.json({ error: "Patient not found" }, 404);
    }

    const currentStaff = await getCurrentStaff(c);
    const orderedByStaffId = body.orderedByStaffId ? Number(body.orderedByStaffId) : currentStaff?.staffId || null;

    const items: Array<{ testId?: number; panelId?: number; price?: number | string }> = body.items || [];
    if (items.length === 0) {
      return c.json({ error: "At least one test or panel must be ordered" }, 400);
    }

    const orderResult = await db.transaction(async (tx) => {
      const orderNo = await generateLabOrderNo(tx);

      // Compute total
      let total = 0;
      for (const item of items) {
        total += Number(item.price || 0);
      }

      // 2. Insert order
      const [order] = await tx
        .insert(labOrders)
        .values({
          orderNo,
          patientId: patient.id,
          patientAge: patient.age,
          patientGender: patient.gender,
          orderedByStaffId,
          orderedAt: new Date(),
          status: "Ordered",
          priority: body.priority || "Routine",
          clinicalNotes: body.clinicalNotes || null,
          totalAmount: total.toFixed(2),
        })
        .returning();

      // 3. Insert order items & expand panel tests into results placeholders
      for (const item of items) {
        const [orderItem] = await tx
          .insert(labOrderItems)
          .values({
            orderId: order.id,
            testId: item.testId ? Number(item.testId) : null,
            panelId: item.panelId ? Number(item.panelId) : null,
            price: String(item.price || "0"),
            status: "Pending",
          })
          .returning();

        if (item.testId) {
          // Individual test
          await tx.insert(labResults).values({
            orderItemId: orderItem.id,
            testId: Number(item.testId),
            status: "Draft",
          });
        } else if (item.panelId) {
          // Panel: fetch all tests in this panel
          const pTests = await tx
            .select({ testId: labPanelTests.testId })
            .from(labPanelTests)
            .where(eq(labPanelTests.panelId, Number(item.panelId)))
            .orderBy(labPanelTests.sortOrder);

          for (const pt of pTests) {
            await tx.insert(labResults).values({
              orderItemId: orderItem.id,
              testId: pt.testId,
              status: "Draft",
            });
          }
        }
      }

      return order;
    });

    return c.json(orderResult, 201);
  })

  .get("/lab/orders/:id", async (c) => {
    const { id } = idParam.parse(c.req.param());

    // 1. Order + Patient
    const [order] = await db
      .select({
        id: labOrders.id,
        orderNo: labOrders.orderNo,
        patientId: labOrders.patientId,
        patientName: patients.name,
        patientMrn: patients.mrn,
        patientGender: labOrders.patientGender,
        patientAge: labOrders.patientAge,
        patientPhone: patients.phone,
        patientAddress: patients.address,
        patientBloodGroup: patients.bloodGroup,
        patientAllergies: patients.allergies,
        orderedByStaffId: labOrders.orderedByStaffId,
        orderedAt: labOrders.orderedAt,
        status: labOrders.status,
        priority: labOrders.priority,
        clinicalNotes: labOrders.clinicalNotes,
        totalAmount: labOrders.totalAmount,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .where(eq(labOrders.id, id))
      .limit(1);

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    // Doctor/Staff name if available
    let orderedByName: string | null = null;
    if (order.orderedByStaffId) {
      const [doctorStaff] = await db
        .select({ name: staff.name })
        .from(staff)
        .where(eq(staff.staffId, order.orderedByStaffId))
        .limit(1);
      if (doctorStaff) orderedByName = doctorStaff.name;
    }

    // 2. Samples
    const samples = await db
      .select()
      .from(labSamples)
      .where(eq(labSamples.orderId, id))
      .orderBy(labSamples.createdAt);

    // 3. Order Items
    const items = await db
      .select({
        id: labOrderItems.id,
        testId: labOrderItems.testId,
        panelId: labOrderItems.panelId,
        price: labOrderItems.price,
        status: labOrderItems.status,
        testName: labTests.name,
        testCode: labTests.code,
        panelName: labPanels.name,
        panelCode: labPanels.code,
      })
      .from(labOrderItems)
      .leftJoin(labTests, eq(labOrderItems.testId, labTests.id))
      .leftJoin(labPanels, eq(labOrderItems.panelId, labPanels.id))
      .where(eq(labOrderItems.orderId, id));

    // 4. Results
    const itemIds = items.map((i) => i.id);
    let results: any[] = [];
    if (itemIds.length > 0) {
      results = await db
        .select({
          id: labResults.id,
          orderItemId: labResults.orderItemId,
          testId: labResults.testId,
          testCode: labTests.code,
          testName: labTests.name,
          specimenType: labTests.specimenType,
          unit: labTests.unit,
          method: labTests.method,
          categoryName: labTestCategories.name,
          categoryCode: labTestCategories.code,
          value: labResults.value,
          flag: labResults.flag,
          status: labResults.status,
          enteredByStaffId: labResults.enteredByStaffId,
          enteredAt: labResults.enteredAt,
          verifiedByStaffId: labResults.verifiedByStaffId,
          verifiedAt: labResults.verifiedAt,
          notes: labResults.notes,
        })
        .from(labResults)
        .innerJoin(labTests, eq(labResults.testId, labTests.id))
        .leftJoin(labTestCategories, eq(labTests.categoryId, labTestCategories.id))
        .where(inArray(labResults.orderItemId, itemIds))
        .orderBy(labTestCategories.sortOrder, labTests.name);

      // Attach matching reference range info to each result
      const testIds = [...new Set(results.map((r) => r.testId))];
      const ranges = await db
        .select()
        .from(labTestReferenceRanges)
        .where(inArray(labTestReferenceRanges.testId, testIds));

      const rangeMap = new Map<number, any[]>();
      for (const r of ranges) {
        if (!rangeMap.has(r.testId)) rangeMap.set(r.testId, []);
        rangeMap.get(r.testId)!.push(r);
      }

      results = results.map((r) => {
        const testRanges = rangeMap.get(r.testId) || [];
        const matched = findMatchingReferenceRange(testRanges, order.patientAge, order.patientGender);
        return {
          ...r,
          referenceRange: matched || null,
          allRanges: testRanges,
        };
      });
    }

    return c.json({
      ...order,
      orderedByName,
      items,
      samples,
      results,
    });
  })

  .patch("/lab/orders/:id/cancel", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const [order] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, id))
      .limit(1);

    if (!order) return c.json({ error: "Order not found" }, 404);
    if (order.status === "Completed") {
      return c.json({ error: "Cannot cancel an already completed order" }, 400);
    }

    const [updated] = await db
      .update(labOrders)
      .set({ status: "Cancelled" })
      .where(eq(labOrders.id, id))
      .returning();

    return c.json(updated);
  })

  // ---------------------------------------------------------------------------
  // 3. Sample Collection Endpoints
  // ---------------------------------------------------------------------------

  .post("/lab/orders/:id/samples", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const body = await c.req.json();
    const specimenType = body.specimenType || "Whole Blood EDTA";

    const currentStaff = await getCurrentStaff(c);
    const staffId = currentStaff?.staffId || null;

    const sample = await db.transaction(async (tx) => {
      const accessionNo = await generateAccessionNo(tx);

      const [inserted] = await tx
        .insert(labSamples)
        .values({
          orderId: id,
          accessionNo,
          specimenType,
          collectedAt: new Date(),
          collectedByStaffId: staffId,
          receivedAt: new Date(), // automatically received at sample counter
          receivedByStaffId: staffId,
        })
        .returning();

      // Update order status from 'Ordered' to 'Collected'
      await tx
        .update(labOrders)
        .set({ status: "Collected" })
        .where(and(eq(labOrders.id, id), eq(labOrders.status, "Ordered")));

      return inserted;
    });

    return c.json(sample, 201);
  })

  .post("/lab/samples/:id/receive", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const currentStaff = await getCurrentStaff(c);
    const staffId = currentStaff?.staffId || null;

    const [sample] = await db
      .update(labSamples)
      .set({
        receivedAt: new Date(),
        receivedByStaffId: staffId,
      })
      .where(eq(labSamples.id, id))
      .returning();

    if (!sample) return c.json({ error: "Sample not found" }, 404);

    // Update order status to InProgress
    await db
      .update(labOrders)
      .set({ status: "InProgress" })
      .where(eq(labOrders.id, sample.orderId));

    return c.json(sample);
  })

  .post("/lab/samples/:id/reject", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const body = await c.req.json();

    const [sample] = await db
      .update(labSamples)
      .set({
        rejected: true,
        rejectionReason: body.reason || "Specimen hemolyzed / insufficient volume",
      })
      .where(eq(labSamples.id, id))
      .returning();

    return c.json(sample);
  })

  // ---------------------------------------------------------------------------
  // 4. Results Entry & Auto-Flagging Endpoints
  // ---------------------------------------------------------------------------

  .post("/lab/orders/:id/results", async (c) => {
    const { id } = idParam.parse(c.req.param());
    const body = await c.req.json();
    const resultsInput: Array<{
      resultId?: number;
      testId: number;
      value: string;
      notes?: string;
    }> = body.results || [];

    if (resultsInput.length === 0) {
      return c.json({ error: "No results provided" }, 400);
    }

    // Fetch order demographics
    const [order] = await db
      .select()
      .from(labOrders)
      .where(eq(labOrders.id, id))
      .limit(1);

    if (!order) return c.json({ error: "Order not found" }, 404);

    const currentStaff = await getCurrentStaff(c);
    const staffId = currentStaff?.staffId || null;

    const testIds = [...new Set(resultsInput.map((r) => r.testId))];
    const ranges = await db
      .select()
      .from(labTestReferenceRanges)
      .where(inArray(labTestReferenceRanges.testId, testIds));

    const rangeMap = new Map<number, any[]>();
    for (const r of ranges) {
      if (!rangeMap.has(r.testId)) rangeMap.set(r.testId, []);
      rangeMap.get(r.testId)!.push(r);
    }

    const updatedResults = await db.transaction(async (tx) => {
      const list: any[] = [];
      for (const res of resultsInput) {
        const testRanges = rangeMap.get(res.testId) || [];
        const flag = evaluateResultFlag(
          res.value,
          testRanges,
          order.patientAge,
          order.patientGender
        );

        if (res.resultId) {
          // Check if previous value existed to log audit if changed
          const [existing] = await tx
            .select()
            .from(labResults)
            .where(eq(labResults.id, res.resultId))
            .limit(1);

          if (existing && existing.value && existing.value !== res.value) {
            await tx.insert(labResultAudit).values({
              resultId: existing.id,
              changedByStaffId: staffId,
              oldValue: existing.value,
              newValue: res.value,
              oldFlag: existing.flag,
              newFlag: flag,
              reason: "Result updated during entry",
            });
          }

          const [upd] = await tx
            .update(labResults)
            .set({
              value: res.value,
              flag,
              enteredByStaffId: staffId,
              enteredAt: new Date(),
              notes: res.notes || null,
            })
            .where(eq(labResults.id, res.resultId))
            .returning();
          list.push(upd);
        }
      }

      // Update order status to InProgress
      await tx
        .update(labOrders)
        .set({ status: "InProgress" })
        .where(and(eq(labOrders.id, id), eq(labOrders.status, "Collected")));

      return list;
    });

    return c.json(updatedResults);
  })

  // ---------------------------------------------------------------------------
  // 5. Verification Workflow Endpoints
  // ---------------------------------------------------------------------------

  .post("/lab/results/:id/verify", async (c) => {
    const isVerifier = await canVerifyLabResults(c);
    if (!isVerifier) {
      return c.json({ error: "Forbidden: Only Pathologists and Admins can verify results." }, 403);
    }

    const { id } = idParam.parse(c.req.param());
    const body = await c.req.json().catch(() => ({}));
    const currentStaff = await getCurrentStaff(c);
    const staffId = currentStaff?.staffId || null;

    const [result] = await db
      .select()
      .from(labResults)
      .where(eq(labResults.id, id))
      .limit(1);

    if (!result) return c.json({ error: "Result not found" }, 404);

    // If pathologist modified value/flag upon verification:
    if (body.value && body.value !== result.value) {
      await db.insert(labResultAudit).values({
        resultId: result.id,
        changedByStaffId: staffId,
        oldValue: result.value,
        newValue: body.value,
        oldFlag: result.flag,
        newFlag: body.flag || result.flag,
        reason: body.reason || "Corrected during clinical verification",
      });
    }

    const [verified] = await db
      .update(labResults)
      .set({
        value: body.value || result.value,
        flag: body.flag || result.flag,
        status: "Verified",
        verifiedByStaffId: staffId,
        verifiedAt: new Date(),
      })
      .where(eq(labResults.id, id))
      .returning();

    return c.json(verified);
  })

  .post("/lab/orders/:id/verify-all", async (c) => {
    const isVerifier = await canVerifyLabResults(c);
    if (!isVerifier) {
      return c.json({ error: "Forbidden: Only Pathologists and Admins can verify results." }, 403);
    }

    const { id } = idParam.parse(c.req.param());
    const currentStaff = await getCurrentStaff(c);
    const staffId = currentStaff?.staffId || null;

    // Find all results for this order
    const items = await db
      .select({ id: labOrderItems.id })
      .from(labOrderItems)
      .where(eq(labOrderItems.orderId, id));

    const itemIds = items.map((i) => i.id);
    if (itemIds.length === 0) return c.json({ success: true });

    await db
      .update(labResults)
      .set({
        status: "Verified",
        verifiedByStaffId: staffId,
        verifiedAt: new Date(),
      })
      .where(inArray(labResults.orderItemId, itemIds));

    return c.json({ success: true });
  })

  // ---------------------------------------------------------------------------
  // 6. Release & Doctor Notification Endpoints
  // ---------------------------------------------------------------------------

  .post("/lab/orders/:id/release", async (c) => {
    const { id } = idParam.parse(c.req.param());

    const [order] = await db
      .select({
        id: labOrders.id,
        orderNo: labOrders.orderNo,
        patientId: labOrders.patientId,
        patientName: patients.name,
        patientMrn: patients.mrn,
        orderedByStaffId: labOrders.orderedByStaffId,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .where(eq(labOrders.id, id))
      .limit(1);

    if (!order) return c.json({ error: "Order not found" }, 404);

    await db.transaction(async (tx) => {
      // 1. Mark order completed
      await tx
        .update(labOrders)
        .set({ status: "Completed" })
        .where(eq(labOrders.id, id));

      // 2. Mark results released
      const items = await tx
        .select({ id: labOrderItems.id })
        .from(labOrderItems)
        .where(eq(labOrderItems.orderId, id));

      const itemIds = items.map((i) => i.id);
      if (itemIds.length > 0) {
        await tx
          .update(labResults)
          .set({ status: "Released" })
          .where(inArray(labResults.orderItemId, itemIds));
      }

      // 3. Trigger notification to ordering doctor if known
      if (order.orderedByStaffId) {
        const [doctorStaff] = await tx
          .select({ userId: staff.userId })
          .from(staff)
          .where(eq(staff.staffId, order.orderedByStaffId))
          .limit(1);

        if (doctorStaff?.userId) {
          await tx.insert(notifications).values({
            userId: doctorStaff.userId,
            title: `Lab Report Released: ${order.patientName}`,
            message: `Diagnostic report for Order ${order.orderNo} (${order.patientName}, MRN: ${order.patientMrn}) is ready and verified.`,
            type: "lab_report_released",
            link: `/lab/orders/${order.id}`,
            read: false,
          });
        }
      }
    });

    return c.json({ success: true, message: "Order report released successfully" });
  })

  // ---------------------------------------------------------------------------
  // 7. Report Data Payload (for Print & PDF)
  // ---------------------------------------------------------------------------

  .get("/lab/orders/:id/report", async (c) => {
    const { id } = idParam.parse(c.req.param());

    // 1. Order + Patient details
    const [order] = await db
      .select({
        id: labOrders.id,
        orderNo: labOrders.orderNo,
        patientId: labOrders.patientId,
        patientName: patients.name,
        patientMrn: patients.mrn,
        patientGender: labOrders.patientGender,
        patientAge: labOrders.patientAge,
        patientPhone: patients.phone,
        patientAddress: patients.address,
        patientBloodGroup: patients.bloodGroup,
        orderedByStaffId: labOrders.orderedByStaffId,
        orderedAt: labOrders.orderedAt,
        status: labOrders.status,
        priority: labOrders.priority,
        clinicalNotes: labOrders.clinicalNotes,
      })
      .from(labOrders)
      .innerJoin(patients, eq(labOrders.patientId, patients.id))
      .where(eq(labOrders.id, id))
      .limit(1);

    if (!order) return c.json({ error: "Order not found" }, 404);

    let doctorName = "General / Outpatient";
    if (order.orderedByStaffId) {
      const [doc] = await db
        .select({ name: staff.name })
        .from(staff)
        .where(eq(staff.staffId, order.orderedByStaffId))
        .limit(1);
      if (doc) doctorName = doc.name;
    }

    // Samples
    const samples = await db
      .select()
      .from(labSamples)
      .where(eq(labSamples.orderId, id));

    // Results with categories
    const items = await db
      .select({ id: labOrderItems.id })
      .from(labOrderItems)
      .where(eq(labOrderItems.orderId, id));

    const itemIds = items.map((i) => i.id);
    let results: any[] = [];
    if (itemIds.length > 0) {
      results = await db
        .select({
          id: labResults.id,
          testId: labResults.testId,
          testName: labTests.name,
          testCode: labTests.code,
          unit: labTests.unit,
          method: labTests.method,
          specimenType: labTests.specimenType,
          categoryName: labTestCategories.name,
          categoryCode: labTestCategories.code,
          value: labResults.value,
          flag: labResults.flag,
          status: labResults.status,
          verifiedAt: labResults.verifiedAt,
          verifiedByStaffId: labResults.verifiedByStaffId,
        })
        .from(labResults)
        .innerJoin(labTests, eq(labResults.testId, labTests.id))
        .leftJoin(labTestCategories, eq(labTests.categoryId, labTestCategories.id))
        .where(inArray(labResults.orderItemId, itemIds))
        .orderBy(labTestCategories.sortOrder, labTests.name);

      const testIds = [...new Set(results.map((r) => r.testId))];
      const ranges = await db
        .select()
        .from(labTestReferenceRanges)
        .where(inArray(labTestReferenceRanges.testId, testIds));

      const rangeMap = new Map<number, any[]>();
      for (const r of ranges) {
        if (!rangeMap.has(r.testId)) rangeMap.set(r.testId, []);
        rangeMap.get(r.testId)!.push(r);
      }

      results = results.map((r) => {
        const matched = findMatchingReferenceRange(rangeMap.get(r.testId) || [], order.patientAge, order.patientGender);
        let normalRangeStr = matched?.textRange || "";
        if (!normalRangeStr && matched?.lowValue != null && matched?.highValue != null) {
          normalRangeStr = `${Number(matched.lowValue)} - ${Number(matched.highValue)}`;
        }
        return {
          ...r,
          normalRangeStr,
          remarks: matched?.remarks || "",
        };
      });
    }

    // Verifier Staff Name
    let verifierName: string | null = null;
    const firstVerified = results.find((r) => r.verifiedByStaffId);
    if (firstVerified?.verifiedByStaffId) {
      const [verStaff] = await db
        .select({ name: staff.name })
        .from(staff)
        .where(eq(staff.staffId, firstVerified.verifiedByStaffId))
        .limit(1);
      if (verStaff) verifierName = verStaff.name;
    }

    return c.json({
      order,
      doctorName,
      samples,
      results,
      verifierName,
    });
  })

  // ---------------------------------------------------------------------------
  // 8. Lab Dashboard / Stats
  // ---------------------------------------------------------------------------

  .get("/lab/stats", async (c) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders] = await db
      .select({ count: sql<number>`count(*)` })
      .from(labOrders)
      .where(sql`${labOrders.orderedAt} >= ${today}`);

    const [pendingSamples] = await db
      .select({ count: sql<number>`count(*)` })
      .from(labOrders)
      .where(eq(labOrders.status, "Ordered"));

    const [inProgress] = await db
      .select({ count: sql<number>`count(*)` })
      .from(labOrders)
      .where(inArray(labOrders.status, ["Collected", "InProgress"]));

    const [pendingVerification] = await db
      .select({ count: sql<number>`count(*)` })
      .from(labResults)
      .where(and(eq(labResults.status, "Draft"), sql`${labResults.value} is not null`));

    const [criticalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(labResults)
      .where(eq(labResults.flag, "Critical"));

    return c.json({
      todayOrders: Number(totalOrders?.count || 0),
      pendingSamples: Number(pendingSamples?.count || 0),
      inProgress: Number(inProgress?.count || 0),
      pendingVerification: Number(pendingVerification?.count || 0),
      criticalCount: Number(criticalCount?.count || 0),
    });
  });
