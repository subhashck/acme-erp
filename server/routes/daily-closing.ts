import { and, desc, asc, eq, sql, gte, lte, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { auth } from "../auth.ts";
import { db } from "../db/client.ts";
import { signToken } from "./public.ts";
import {
  dailyClosingReports,
  serviceCategories,
  serviceCatalog,
  dailyServiceLines,
  dailyPharmacyIncome,
  dailyExpenditures,
  dailyStaffAdvances,
  dailyIpdAdmissions,
  dailyIpdDischarges,
  dailyAdditionalIncome,
  dailyDiscountsReturns,
  dailyPaymentChannels,
  user,
  expenseCategories,
  expenseCatalog,
} from "../db/schema.ts";
import { jsonBody } from "./shared.ts";

export const dailyClosingRoutes = new Hono<AuthEnv>()
  // -------------------------------------------------------------------------
  // Service Categories Master
  // -------------------------------------------------------------------------
  .get("/daily-closing/categories", async (c) => {
    const rows = await db
      .select()
      .from(serviceCategories)
      .orderBy(serviceCategories.sortOrder, serviceCategories.code)
      .execute();
    return c.json(rows);
  })

  .post("/daily-closing/categories", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        code: z.string().min(1).toUpperCase(),
        label: z.string().min(1),
        sortOrder: z.number().int().default(0),
        isVariableAmount: z.boolean().default(false),
      })
    );
    const [row] = await db
      .insert(serviceCategories)
      .values(input)
      .returning()
      .execute();
    return c.json(row, 201);
  })

  .put("/daily-closing/categories/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    const input = await jsonBody(
      c,
      z.object({
        code: z.string().min(1).optional(),
        label: z.string().min(1).optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
        isVariableAmount: z.boolean().optional(),
      })
    );
    const [row] = await db
      .update(serviceCategories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(serviceCategories.id, id))
      .returning()
      .execute();
    if (!row) return c.json({ error: "Category not found" }, 404);
    return c.json(row);
  })

  .delete("/daily-closing/categories/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    const [row] = await db
      .update(serviceCategories)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(serviceCategories.id, id))
      .returning()
      .execute();
    if (!row) return c.json({ error: "Category not found" }, 404);
    return c.json({ success: true, deactivated: row });
  })

  // -------------------------------------------------------------------------
  // Service Catalog Master
  // -------------------------------------------------------------------------
  .get("/daily-closing/catalog", async (c) => {
    const list = await db
      .select()
      .from(serviceCatalog)
      .orderBy(serviceCatalog.sortOrder, serviceCatalog.serviceName)
      .execute();
    return c.json(list);
  })

  .post("/daily-closing/catalog", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        department: z.string().min(1),
        serviceName: z.string().min(1),
        defaultRate: z.number().nonnegative(),
        sortOrder: z.number().int().default(0),
        defaultShow: z.boolean().default(true),
      })
    );
    const [row] = await db
      .insert(serviceCatalog)
      .values({
        ...input,
        defaultRate: input.defaultRate.toString(),
      })
      .returning()
      .execute();
    return c.json(row, 201);
  })

  .put("/daily-closing/catalog/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ error: "Invalid ID" }, 400);
    }
    const input = await jsonBody(
      c,
      z.object({
        department: z.string().min(1).optional(),
        serviceName: z.string().min(1).optional(),
        defaultRate: z.number().nonnegative().optional(),
        sortOrder: z.number().int().optional(),
        defaultShow: z.boolean().optional(),
      })
    );
    const { defaultRate, ...rest } = input;
    const [row] = await db
      .update(serviceCatalog)
      .set({
        ...rest,
        ...(defaultRate !== undefined ? { defaultRate: defaultRate.toString() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(serviceCatalog.id, id))
      .returning()
      .execute();
    if (!row) {
      return c.json({ error: "Service not found" }, 404);
    }
    return c.json(row);
  })

  .delete("/daily-closing/catalog/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ error: "Invalid ID" }, 400);
    }
    const [row] = await db
      .delete(serviceCatalog)
      .where(eq(serviceCatalog.id, id))
      .returning()
      .execute();
    if (!row) {
      return c.json({ error: "Service not found" }, 404);
    }
    return c.json({ success: true, deleted: row });
  })

  // -------------------------------------------------------------------------
  // Expense Categories Master
  // -------------------------------------------------------------------------
  .get("/daily-closing/expense-categories", async (c) => {
    let rows = await db
      .select()
      .from(expenseCategories)
      .orderBy(expenseCategories.sortOrder, expenseCategories.code)
      .execute();
    if (rows.length === 0) {
      const defaults = [
        { code: "SALARY", label: "Salary", sortOrder: 10 },
        { code: "VENDOR", label: "Vendor", sortOrder: 20 },
        { code: "MISC", label: "Misc", sortOrder: 30 },
      ];
      await db.insert(expenseCategories).values(defaults).execute();
      rows = await db
        .select()
        .from(expenseCategories)
        .orderBy(expenseCategories.sortOrder, expenseCategories.code)
        .execute();
    }
    return c.json(rows);
  })

  .post("/daily-closing/expense-categories", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        code: z.string().min(1).toUpperCase(),
        label: z.string().min(1),
        sortOrder: z.number().int().default(0),
      })
    );
    const [row] = await db
      .insert(expenseCategories)
      .values(input)
      .returning()
      .execute();
    return c.json(row, 201);
  })

  .put("/daily-closing/expense-categories/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    const input = await jsonBody(
      c,
      z.object({
        code: z.string().min(1).optional(),
        label: z.string().min(1).optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      })
    );
    const [row] = await db
      .update(expenseCategories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(expenseCategories.id, id))
      .returning()
      .execute();
    if (!row) return c.json({ error: "Category not found" }, 404);
    return c.json(row);
  })

  .delete("/daily-closing/expense-categories/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    const [row] = await db
      .update(expenseCategories)
      .set({ active: false, updatedAt: new Date() })
      .where(eq(expenseCategories.id, id))
      .returning()
      .execute();
    if (!row) return c.json({ error: "Category not found" }, 404);
    return c.json({ success: true, deactivated: row });
  })

  // -------------------------------------------------------------------------
  // Expense Catalog Master
  // -------------------------------------------------------------------------
  .get("/daily-closing/expense-catalog", async (c) => {
    const list = await db
      .select()
      .from(expenseCatalog)
      .orderBy(expenseCatalog.sortOrder, expenseCatalog.itemName)
      .execute();
    return c.json(list);
  })

  .post("/daily-closing/expense-catalog", async (c) => {
    const input = await jsonBody(
      c,
      z.object({
        category: z.string().min(1),
        itemName: z.string().min(1),
        defaultAmount: z.number().nonnegative(),
        sortOrder: z.number().int().default(0),
      })
    );
    const [row] = await db
      .insert(expenseCatalog)
      .values({
        ...input,
        defaultAmount: input.defaultAmount.toString(),
      })
      .returning()
      .execute();
    return c.json(row, 201);
  })

  .put("/daily-closing/expense-catalog/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    const input = await jsonBody(
      c,
      z.object({
        category: z.string().min(1).optional(),
        itemName: z.string().min(1).optional(),
        defaultAmount: z.number().nonnegative().optional(),
        sortOrder: z.number().int().optional(),
        active: z.boolean().optional(),
      })
    );
    const { defaultAmount, ...rest } = input;
    const [row] = await db
      .update(expenseCatalog)
      .set({
        ...rest,
        ...(defaultAmount !== undefined ? { defaultAmount: defaultAmount.toString() } : {}),
        updatedAt: new Date(),
      })
      .where(eq(expenseCatalog.id, id))
      .returning()
      .execute();
    if (!row) return c.json({ error: "Expense item not found" }, 404);
    return c.json(row);
  })

  .delete("/daily-closing/expense-catalog/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);
    const [row] = await db
      .delete(expenseCatalog)
      .where(eq(expenseCatalog.id, id))
      .returning()
      .execute();
    if (!row) return c.json({ error: "Expense item not found" }, 404);
    return c.json({ success: true, deleted: row });
  })

  // -------------------------------------------------------------------------
  // Seeding default catalog services
  // -------------------------------------------------------------------------
  .post("/daily-closing/seed-catalog", async (c) => {
    const existing = await db.select().from(serviceCatalog).limit(1).execute();
    if (existing.length > 0) {
      return c.json({ success: true, message: "Catalog already contains items. Seed skipped." });
    }

    const defaultServices = [
      // OPD Gynae Services
      { department: "OPD_GYNAE", serviceName: "NEW CASE CONSULTATION", defaultRate: 500, sortOrder: 1 },
      { department: "OPD_GYNAE", serviceName: "OLD CASE CONSULTATION", defaultRate: 300, sortOrder: 2 },
      { department: "OPD_GYNAE", serviceName: "TVS GYNAE ULTRASOUND", defaultRate: 1200, sortOrder: 3 },
      { department: "OPD_GYNAE", serviceName: "USG PELVIS", defaultRate: 1000, sortOrder: 4 },
      { department: "OPD_GYNAE", serviceName: "IUI PROCEDURE", defaultRate: 6000, sortOrder: 5 },
      { department: "OPD_GYNAE", serviceName: "D/C (Dilation & Curettage)", defaultRate: 4000, sortOrder: 6 },
      { department: "OPD_GYNAE", serviceName: "D/E (Dilation & Evacuation)", defaultRate: 5000, sortOrder: 7 },
      { department: "OPD_GYNAE", serviceName: "EMBRYO FREEZING PACKAGE", defaultRate: 25000, sortOrder: 8 },
      { department: "OPD_GYNAE", serviceName: "Semen Analysis", defaultRate: 600, sortOrder: 9 },
      { department: "OPD_GYNAE", serviceName: "IVF Package Stage 1", defaultRate: 120000, sortOrder: 10 },
      { department: "OPD_GYNAE", serviceName: "Follicular Monitoring", defaultRate: 500, sortOrder: 11 },
      { department: "OPD_GYNAE", serviceName: "HSG Test", defaultRate: 2500, sortOrder: 12 },
      { department: "OPD_GYNAE", serviceName: "Blood Draw / Phlebotomy Charges", defaultRate: 100, sortOrder: 13 },
      { department: "OPD_GYNAE", serviceName: "Liquid Based Pap Smear", defaultRate: 800, sortOrder: 14 },
      { department: "OPD_GYNAE", serviceName: "Hysteroscopy Diagnostic", defaultRate: 15000, sortOrder: 15 },
      
      // Dental Services
      { department: "DENTAL", serviceName: "Dental Consultation - New Case", defaultRate: 300, sortOrder: 101 },
      { department: "DENTAL", serviceName: "Dental Consultation - Old Case", defaultRate: 200, sortOrder: 102 },
      { department: "DENTAL", serviceName: "Root Canal Treatment (RCT)", defaultRate: 3500, sortOrder: 103 },
      { department: "DENTAL", serviceName: "Scaling & Polishing", defaultRate: 1200, sortOrder: 104 },
      { department: "DENTAL", serviceName: "Composite Tooth Filling", defaultRate: 1500, sortOrder: 105 },
      { department: "DENTAL", serviceName: "Tooth Extraction Simple", defaultRate: 1000, sortOrder: 106 },
      { department: "DENTAL", serviceName: "Dental X-Ray Intraoral", defaultRate: 300, sortOrder: 107 },
    ];

    const inserted = await db
      .insert(serviceCatalog)
      .values(defaultServices as any)
      .returning()
      .execute();

    return c.json({ success: true, count: inserted.length, items: inserted });
  })

  // -------------------------------------------------------------------------
  // Closing Reports List & History
  // -------------------------------------------------------------------------
  .get("/daily-closing/reports", async (c) => {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const search = c.req.query("search");
    const sortOrder = c.req.query("sortOrder") || "desc";

    let matchedIds: number[] | null = null;
    if (search && search.trim().length > 0) {
      const s = `%${search.trim()}%`;
      const [advancesMatch, admissionsMatch, dischargesMatch, expMatch, dateMatch] = await Promise.all([
        db.select({ reportId: dailyStaffAdvances.reportId }).from(dailyStaffAdvances).where(sql`${dailyStaffAdvances.staffName} ILIKE ${s}`),
        db.select({ reportId: dailyIpdAdmissions.reportId }).from(dailyIpdAdmissions).where(sql`${dailyIpdAdmissions.patientName} ILIKE ${s}`),
        db.select({ reportId: dailyIpdDischarges.reportId }).from(dailyIpdDischarges).where(sql`${dailyIpdDischarges.patientName} ILIKE ${s}`),
        db.select({ reportId: dailyExpenditures.reportId }).from(dailyExpenditures).where(sql`${dailyExpenditures.details} ILIKE ${s} OR ${dailyExpenditures.category} ILIKE ${s}`),
        db.select({ id: dailyClosingReports.id }).from(dailyClosingReports).where(sql`${dailyClosingReports.reportDate} ILIKE ${s}`),
      ]);
      const ids = new Set<number>();
      advancesMatch.forEach((r) => ids.add(r.reportId));
      admissionsMatch.forEach((r) => ids.add(r.reportId));
      dischargesMatch.forEach((r) => ids.add(r.reportId));
      expMatch.forEach((r) => ids.add(r.reportId));
      dateMatch.forEach((r) => ids.add(r.id));
      matchedIds = Array.from(ids);
    }

    if (matchedIds !== null && matchedIds.length === 0) {
      return c.json([]);
    }

    let conditions = [];
    if (startDate) {
      conditions.push(gte(dailyClosingReports.reportDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(dailyClosingReports.reportDate, endDate));
    }
    if (matchedIds !== null) {
      conditions.push(inArray(dailyClosingReports.id, matchedIds));
    }

    let query = db.select().from(dailyClosingReports);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const list = await query
      .orderBy(
        sortOrder === "asc"
          ? asc(dailyClosingReports.reportDate)
          : desc(dailyClosingReports.reportDate)
      )
      .execute();

    // Fetch user details for creator names
    const creators = await db.select({ id: user.id, name: user.name }).from(user).execute();
    const creatorMap = new Map(creators.map((u) => [u.id, u.name]));

    const mappedList = list.map((report) => ({
      ...report,
      creatorName: creatorMap.get(report.createdBy) ?? "Unknown",
    }));

    return c.json(mappedList);
  })

  // -------------------------------------------------------------------------
  // Closing Report Details (Get Single)
  // -------------------------------------------------------------------------
  .get("/daily-closing/reports/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const [report] = await db
      .select()
      .from(dailyClosingReports)
      .where(eq(dailyClosingReports.id, id))
      .limit(1)
      .execute();

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    // Fetch all nested details
    const serviceLines = await db
      .select({
        id: dailyServiceLines.id,
        serviceId: dailyServiceLines.serviceId,
        rate: dailyServiceLines.rate,
        quantity: dailyServiceLines.quantity,
        amount: dailyServiceLines.amount,
        isNightEntry: dailyServiceLines.isNightEntry,
        narration: dailyServiceLines.narration,
        serviceName: serviceCatalog.serviceName,
        department: serviceCatalog.department,
        sortOrder: serviceCatalog.sortOrder,
      })
      .from(dailyServiceLines)
      .leftJoin(serviceCatalog, eq(dailyServiceLines.serviceId, serviceCatalog.id))
      .where(eq(dailyServiceLines.reportId, id))
      .orderBy(asc(serviceCatalog.sortOrder), asc(serviceCatalog.serviceName))
      .execute();

    const [pharmacyIncome] = await db
      .select()
      .from(dailyPharmacyIncome)
      .where(eq(dailyPharmacyIncome.reportId, id))
      .limit(1)
      .execute();

    const expenditures = await db
      .select()
      .from(dailyExpenditures)
      .where(eq(dailyExpenditures.reportId, id))
      .execute();

    const staffAdvances = await db
      .select()
      .from(dailyStaffAdvances)
      .where(eq(dailyStaffAdvances.reportId, id))
      .execute();

    const ipdAdmissions = await db
      .select()
      .from(dailyIpdAdmissions)
      .where(eq(dailyIpdAdmissions.reportId, id))
      .execute();

    const ipdDischarges = await db
      .select()
      .from(dailyIpdDischarges)
      .where(eq(dailyIpdDischarges.reportId, id))
      .execute();

    const additionalIncome = await db
      .select()
      .from(dailyAdditionalIncome)
      .where(eq(dailyAdditionalIncome.reportId, id))
      .execute();

    const discountsReturns = await db
      .select()
      .from(dailyDiscountsReturns)
      .where(eq(dailyDiscountsReturns.reportId, id))
      .execute();

    const paymentChannels = await db
      .select()
      .from(dailyPaymentChannels)
      .where(eq(dailyPaymentChannels.reportId, id))
      .execute();

    const [creator] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, report.createdBy))
      .limit(1)
      .execute();

    return c.json({
      ...report,
      creatorName: creator?.name ?? "Unknown",
      serviceLines,
      pharmacyIncome: pharmacyIncome ?? null,
      expenditures,
      staffAdvances,
      ipdAdmissions,
      ipdDischarges,
      additionalIncome,
      discountsReturns,
      paymentChannels,
    });
  })

  // -------------------------------------------------------------------------
  // Create Closing Report
  // -------------------------------------------------------------------------
  .post("/daily-closing/reports", async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const payload = await jsonBody(
      c,
      z.object({
        reportDate: z.string(),
        openingBalance: z.number().default(0),
        bankDeposit: z.number().default(0),
        fundHandoverSir: z.number().default(0),
        fundHandoverMadam: z.number().default(0),
        cashReceiptSir: z.number().default(0),
        cashReceiptMam: z.number().default(0),
        cashReceiptAcon: z.number().default(0),
        bankReceiptSir: z.number().default(0),
        bankReceiptSirBank: z.string().nullable().optional(),
        cashReceipts: z.number().default(0),
        bankDeposits: z.string().nullable().optional(),
        status: z.enum(["draft", "submitted", "locked"]).default("draft"),
        // Nested arrays
        serviceLines: z.array(
          z.object({
            serviceId: z.number().nullable().optional(),
            rate: z.number(),
            quantity: z.number(),
            amount: z.number(),
            isNightEntry: z.boolean().default(false).optional(),
            narration: z.string().nullable().optional(),
          })
        ),
        pharmacyIncome: z.object({
          otWardTotal: z.number().default(0),
          acmeNewTotal: z.number().default(0),
          parking: z.number().default(0),
          coffeeShop: z.number().default(0),
          canteenIncome: z.number().default(0),
          creditCardChargesNight: z.number().default(0),
          trainingFee: z.number().default(0),
          humankindSales: z.number().default(0),
          miscIncome: z.string().default("[]"),
        }).optional(),
        expenditures: z.array(
          z.object({
            category: z.string(),
            details: z.string(),
            amount: z.number(),
            narration: z.string().nullable().optional(),
          })
        ),
        staffAdvances: z.array(
          z.object({
            staffId: z.number().nullable().optional(),
            staffName: z.string(),
            amount: z.number(),
          })
        ),
        ipdAdmissions: z.array(
          z.object({
            patientName: z.string(),
            type: z.enum(["ADMISSION", "ADVANCE", "OBSERVATION"]),
            amount: z.number(),
          })
        ).default([]),
        ipdDischarges: z.array(
          z.object({
            patientName: z.string(),
            amount: z.number(),
          })
        ).default([]),
        additionalIncome: z.array(
          z.object({
            label: z.string(),
            amount: z.number(),
          })
        ).default([]),
        discountsReturns: z.array(
          z.object({
            label: z.string(),
            amount: z.number(),
          })
        ).default([]),
        paymentChannels: z.array(
          z.object({
            bank: z.string(),
            channel: z.string(),
            sourceLabel: z.string(),
            amount: z.number(),
          })
        ),
        cashDenominations: z.union([z.record(z.string(), z.number()), z.string(), z.null()]).optional(),
        reconciliationTolerance: z.number().default(0).optional(),
        soiledNotes: z.string().nullable().optional(),
      })
    );

    // Verify report date is unique
    const [existingReport] = await db
      .select()
      .from(dailyClosingReports)
      .where(eq(dailyClosingReports.reportDate, payload.reportDate))
      .limit(1)
      .execute();

    if (existingReport) {
      return c.json({ error: `A closing report already exists for date ${payload.reportDate}` }, 409);
    }

    // Calculations
    const opdTotal = payload.serviceLines.reduce((sum, line) => sum + line.amount, 0);
    
    // Pharmacy calculation (legacy field — now optional, service lines capture pharmacy/general)
    const pharmacyIncome = payload.pharmacyIncome;
    const miscIncomeParsed = pharmacyIncome ? JSON.parse(pharmacyIncome.miscIncome) : [];
    const miscTotal = Array.isArray(miscIncomeParsed)
      ? miscIncomeParsed.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0)
      : 0;

    const pharmacyTotal = pharmacyIncome
      ? pharmacyIncome.otWardTotal + pharmacyIncome.acmeNewTotal + pharmacyIncome.parking +
        pharmacyIncome.coffeeShop + pharmacyIncome.canteenIncome + pharmacyIncome.creditCardChargesNight +
        pharmacyIncome.trainingFee + pharmacyIncome.humankindSales + miscTotal
      : 0;

    const ipdAdmissionsTotal = payload.ipdAdmissions.reduce((sum, item) => sum + item.amount, 0);
    const ipdDischargesTotal = payload.ipdDischarges.reduce((sum, item) => sum + item.amount, 0);
    const additionalTotal = payload.additionalIncome.reduce((sum, item) => sum + item.amount, 0);
    const discountsTotal = payload.discountsReturns.reduce((sum, item) => sum + item.amount, 0);
    const totalIncome = 
      opdTotal + 
      pharmacyTotal + 
      ipdAdmissionsTotal + 
      ipdDischargesTotal + 
      additionalTotal -
      discountsTotal;

    const expendituresTotal = payload.expenditures.reduce((sum, item) => sum + item.amount, 0);
    const advancesTotal = payload.staffAdvances.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenditure = expendituresTotal + advancesTotal;

    const balance = totalIncome - totalExpenditure;
    const otherCashChannelsTotal = payload.paymentChannels
      .filter((c) => c.bank === "CASH" && c.channel === "CASH")
      .reduce((sum, item) => sum + item.amount, 0);
    const cashReceiptsTotal = payload.cashReceiptSir + payload.cashReceiptMam + payload.cashReceiptAcon + otherCashChannelsTotal;
    const bankReceiptsTotal = payload.paymentChannels
      .filter((c) => c.bank !== "CASH")
      .reduce((sum, item) => sum + item.amount, 0);

    const closingBalance = payload.openingBalance + cashReceiptsTotal - totalExpenditure - payload.bankDeposit - payload.fundHandoverSir - payload.fundHandoverMadam;

    // Begin Drizzle Transaction
    const reportRow = await db.transaction(async (tx) => {
      const [report] = await tx
        .insert(dailyClosingReports)
        .values({
          reportDate: payload.reportDate,
          createdBy: session.user.id,
          openingBalance: payload.openingBalance.toFixed(2),
          bankDeposit: payload.bankDeposit.toFixed(2),
          fundHandoverSir: payload.fundHandoverSir.toFixed(2),
          fundHandoverMadam: payload.fundHandoverMadam.toFixed(2),
          cashReceiptSir: payload.cashReceiptSir.toFixed(2),
          cashReceiptMam: payload.cashReceiptMam.toFixed(2),
          cashReceiptAcon: payload.cashReceiptAcon.toFixed(2),
          bankReceiptSir: payload.bankReceiptSir.toFixed(2),
          bankReceiptSirBank: payload.bankReceiptSirBank || null,
          cashReceiptsTotal: cashReceiptsTotal.toFixed(2),
          cashReceipts: otherCashChannelsTotal.toFixed(2),
          bankReceiptsTotal: bankReceiptsTotal.toFixed(2),
          totalIncome: totalIncome.toFixed(2),
          totalExpenditure: totalExpenditure.toFixed(2),
          closingBalance: closingBalance.toFixed(2),
          bankDeposits: payload.bankDeposits || null,
          cashDenominations: (() => {
            if (!payload.cashDenominations) return null;
            if (typeof payload.cashDenominations === "string") {
              try { return JSON.parse(payload.cashDenominations); } catch { return null; }
            }
            return payload.cashDenominations;
          })(),
          reconciliationTolerance: (payload.reconciliationTolerance ?? 0).toFixed(2),
          soiledNotes: payload.soiledNotes ?? null,
          status: payload.status,
        })
        .returning()
        .execute();

      // Insert Nested Arrays
      if (payload.serviceLines.length > 0) {
        await tx
          .insert(dailyServiceLines)
          .values(
            payload.serviceLines.map((line) => ({
              reportId: report.id,
              serviceId: line.serviceId ?? null,
              rate: line.rate.toString(),
              quantity: line.quantity,
              amount: line.amount.toString(),
              isNightEntry: line.isNightEntry ?? false,
              narration: line.narration ?? null,
            }))
          )
          .execute();
      }

      // Insert pharmacy income only if legacy data provided
      if (pharmacyIncome) {
        await tx
          .insert(dailyPharmacyIncome)
          .values({
            reportId: report.id,
            otWardTotal: pharmacyIncome.otWardTotal.toString(),
            acmeNewTotal: pharmacyIncome.acmeNewTotal.toString(),
            parking: pharmacyIncome.parking.toString(),
            coffeeShop: pharmacyIncome.coffeeShop.toString(),
            canteenIncome: pharmacyIncome.canteenIncome.toString(),
            creditCardChargesNight: pharmacyIncome.creditCardChargesNight.toString(),
            trainingFee: pharmacyIncome.trainingFee.toString(),
            humankindSales: pharmacyIncome.humankindSales.toString(),
            miscIncome: pharmacyIncome.miscIncome,
          })
          .execute();
      }

      if (payload.expenditures.length > 0) {
        await tx
          .insert(dailyExpenditures)
          .values(
            payload.expenditures.map((item) => ({
              reportId: report.id,
              category: item.category,
              details: item.details,
              amount: item.amount.toString(),
              narration: item.narration ?? null,
            }))
          )
          .execute();
      }

      if (payload.staffAdvances.length > 0) {
        await tx
          .insert(dailyStaffAdvances)
          .values(
            payload.staffAdvances.map((item) => ({
              reportId: report.id,
              staffId: item.staffId ?? null,
              staffName: item.staffName,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.ipdAdmissions.length > 0) {
        await tx
          .insert(dailyIpdAdmissions)
          .values(
            payload.ipdAdmissions.map((item) => ({
              reportId: report.id,
              patientName: item.patientName,
              type: item.type,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.ipdDischarges.length > 0) {
        await tx
          .insert(dailyIpdDischarges)
          .values(
            payload.ipdDischarges.map((item) => ({
              reportId: report.id,
              patientName: item.patientName,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.additionalIncome.length > 0) {
        await tx
          .insert(dailyAdditionalIncome)
          .values(
            payload.additionalIncome.map((item) => ({
              reportId: report.id,
              label: item.label,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.discountsReturns.length > 0) {
        await tx
          .insert(dailyDiscountsReturns)
          .values(
            payload.discountsReturns.map((item) => ({
              reportId: report.id,
              label: item.label,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.paymentChannels.length > 0) {
        await tx
          .insert(dailyPaymentChannels)
          .values(
            payload.paymentChannels.map((item) => ({
              reportId: report.id,
              bank: item.bank,
              channel: item.channel,
              sourceLabel: item.sourceLabel,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      return report;
    });

    return c.json(reportRow, 201);
  })

  // -------------------------------------------------------------------------
  // Update Closing Report
  // -------------------------------------------------------------------------
  .put("/daily-closing/reports/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const [existingReport] = await db
      .select()
      .from(dailyClosingReports)
      .where(eq(dailyClosingReports.id, id))
      .limit(1)
      .execute();

    if (!existingReport) {
      return c.json({ error: "Report not found" }, 404);
    }

    if (existingReport.status !== "draft") {
      return c.json({ error: "Only draft reports can be modified." }, 403);
    }

    const payload = await jsonBody(
      c,
      z.object({
        openingBalance: z.number().default(0),
        bankDeposit: z.number().default(0),
        fundHandoverSir: z.number().default(0),
        fundHandoverMadam: z.number().default(0),
        cashReceiptSir: z.number().default(0),
        cashReceiptMam: z.number().default(0),
        cashReceiptAcon: z.number().default(0),
        bankReceiptSir: z.number().default(0),
        bankReceiptSirBank: z.string().nullable().optional(),
        cashReceipts: z.number().default(0),
        bankDeposits: z.string().nullable().optional(),
        status: z.enum(["draft", "submitted", "locked"]).default("draft"),
        serviceLines: z.array(
          z.object({
            serviceId: z.number().nullable().optional(),
            rate: z.number(),
            quantity: z.number(),
            amount: z.number(),
            isNightEntry: z.boolean().default(false).optional(),
            narration: z.string().nullable().optional(),
          })
        ),
        pharmacyIncome: z.object({
          otWardTotal: z.number().default(0),
          acmeNewTotal: z.number().default(0),
          parking: z.number().default(0),
          coffeeShop: z.number().default(0),
          canteenIncome: z.number().default(0),
          creditCardChargesNight: z.number().default(0),
          trainingFee: z.number().default(0),
          humankindSales: z.number().default(0),
          miscIncome: z.string().default("[]"),
        }).optional(),
        expenditures: z.array(
          z.object({
            category: z.string(),
            details: z.string(),
            amount: z.number(),
            narration: z.string().nullable().optional(),
          })
        ),
        staffAdvances: z.array(
          z.object({
            staffId: z.number().nullable().optional(),
            staffName: z.string(),
            amount: z.number(),
          })
        ),
        ipdAdmissions: z.array(
          z.object({
            patientName: z.string(),
            type: z.enum(["ADMISSION", "ADVANCE", "OBSERVATION"]),
            amount: z.number(),
          })
        ).default([]),
        ipdDischarges: z.array(
          z.object({
            patientName: z.string(),
            amount: z.number(),
          })
        ).default([]),
        additionalIncome: z.array(
          z.object({
            label: z.string(),
            amount: z.number(),
          })
        ).default([]),
        discountsReturns: z.array(
          z.object({
            label: z.string(),
            amount: z.number(),
          })
        ).default([]),
        paymentChannels: z.array(
          z.object({
            bank: z.string(),
            channel: z.string(),
            sourceLabel: z.string(),
            amount: z.number(),
          })
        ),
        cashDenominations: z.union([z.record(z.string(), z.number()), z.string(), z.null()]).optional(),
        reconciliationTolerance: z.number().default(0).optional(),
        soiledNotes: z.string().nullable().optional(),
      })
    );

    // Calculations
    const opdTotal = payload.serviceLines.reduce((sum, line) => sum + line.amount, 0);
    
    // Pharmacy calculation (legacy field — now optional)
    const pharmacyIncomePut = payload.pharmacyIncome;
    const miscIncomeParsedPut = pharmacyIncomePut ? JSON.parse(pharmacyIncomePut.miscIncome) : [];
    const miscTotalPut = Array.isArray(miscIncomeParsedPut)
      ? miscIncomeParsedPut.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0)
      : 0;

    const pharmacyTotalPut = pharmacyIncomePut
      ? pharmacyIncomePut.otWardTotal + pharmacyIncomePut.acmeNewTotal + pharmacyIncomePut.parking +
        pharmacyIncomePut.coffeeShop + pharmacyIncomePut.canteenIncome + pharmacyIncomePut.creditCardChargesNight +
        pharmacyIncomePut.trainingFee + pharmacyIncomePut.humankindSales + miscTotalPut
      : 0;

    const ipdAdmissionsTotal = payload.ipdAdmissions.reduce((sum, item) => sum + item.amount, 0);
    const ipdDischargesTotal = payload.ipdDischarges.reduce((sum, item) => sum + item.amount, 0);
    const additionalTotal = payload.additionalIncome.reduce((sum, item) => sum + item.amount, 0);
    const discountsTotalPut = payload.discountsReturns.reduce((sum, item) => sum + item.amount, 0);
    const totalIncome =
      opdTotal +
      pharmacyTotalPut +
      ipdAdmissionsTotal +
      ipdDischargesTotal +
      additionalTotal -
      discountsTotalPut;

    const expendituresTotal = payload.expenditures.reduce((sum, item) => sum + item.amount, 0);
    const advancesTotal = payload.staffAdvances.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenditure = expendituresTotal + advancesTotal;

    const balance = totalIncome - totalExpenditure;
    const otherCashChannelsTotal = payload.paymentChannels
      .filter((c) => c.bank === "CASH" && c.channel === "CASH")
      .reduce((sum, item) => sum + item.amount, 0);
    const cashReceiptsTotal = payload.cashReceiptSir + payload.cashReceiptMam + payload.cashReceiptAcon + otherCashChannelsTotal;
    const bankReceiptsTotal = payload.paymentChannels
      .filter((c) => c.bank !== "CASH")
      .reduce((sum, item) => sum + item.amount, 0);

    const closingBalance = payload.openingBalance + cashReceiptsTotal - totalExpenditure - payload.bankDeposit - payload.fundHandoverSir - payload.fundHandoverMadam;

    // Run Updates inside Drizzle Transaction
    const updatedRow = await db.transaction(async (tx) => {
      const [report] = await tx
        .update(dailyClosingReports)
        .set({
          openingBalance: payload.openingBalance.toFixed(2),
          bankDeposit: payload.bankDeposit.toFixed(2),
          fundHandoverSir: payload.fundHandoverSir.toFixed(2),
          fundHandoverMadam: payload.fundHandoverMadam.toFixed(2),
          cashReceiptSir: payload.cashReceiptSir.toFixed(2),
          cashReceiptMam: payload.cashReceiptMam.toFixed(2),
          cashReceiptAcon: payload.cashReceiptAcon.toFixed(2),
          bankReceiptSir: payload.bankReceiptSir.toFixed(2),
          bankReceiptSirBank: payload.bankReceiptSirBank || null,
          cashReceiptsTotal: cashReceiptsTotal.toFixed(2),
          cashReceipts: otherCashChannelsTotal.toFixed(2),
          bankReceiptsTotal: bankReceiptsTotal.toFixed(2),
          totalIncome: totalIncome.toFixed(2),
          totalExpenditure: totalExpenditure.toFixed(2),
          closingBalance: closingBalance.toFixed(2),
          bankDeposits: payload.bankDeposits || null,
          cashDenominations: (() => {
            if (!payload.cashDenominations) return null;
            if (typeof payload.cashDenominations === "string") {
              try { return JSON.parse(payload.cashDenominations); } catch { return null; }
            }
            return payload.cashDenominations;
          })(),
          reconciliationTolerance: (payload.reconciliationTolerance ?? 0).toFixed(2),
          soiledNotes: payload.soiledNotes ?? null,
          status: payload.status,
          updatedAt: new Date(),
        })
        .where(eq(dailyClosingReports.id, id))
        .returning()
        .execute();

      // Clear nested child rows (since cascading deletes don't fire on update, we clear manually)
      await tx.delete(dailyServiceLines).where(eq(dailyServiceLines.reportId, id)).execute();
      await tx.delete(dailyPharmacyIncome).where(eq(dailyPharmacyIncome.reportId, id)).execute();
      await tx.delete(dailyExpenditures).where(eq(dailyExpenditures.reportId, id)).execute();
      await tx.delete(dailyStaffAdvances).where(eq(dailyStaffAdvances.reportId, id)).execute();
      await tx.delete(dailyIpdAdmissions).where(eq(dailyIpdAdmissions.reportId, id)).execute();
      await tx.delete(dailyIpdDischarges).where(eq(dailyIpdDischarges.reportId, id)).execute();
      await tx.delete(dailyAdditionalIncome).where(eq(dailyAdditionalIncome.reportId, id)).execute();
      await tx.delete(dailyDiscountsReturns).where(eq(dailyDiscountsReturns.reportId, id)).execute();
      await tx.delete(dailyPaymentChannels).where(eq(dailyPaymentChannels.reportId, id)).execute();

      // Re-insert new nested children
      if (payload.serviceLines.length > 0) {
        await tx
          .insert(dailyServiceLines)
          .values(
            payload.serviceLines.map((line) => ({
              reportId: id,
              serviceId: line.serviceId ?? null,
              rate: line.rate.toString(),
              quantity: line.quantity,
              amount: line.amount.toString(),
              isNightEntry: line.isNightEntry ?? false,
              narration: line.narration ?? null,
            }))
          )
          .execute();
      }

      // Re-insert pharmacy income only if legacy data provided
      if (pharmacyIncomePut) {
        await tx
          .insert(dailyPharmacyIncome)
          .values({
            reportId: id,
            otWardTotal: pharmacyIncomePut.otWardTotal.toString(),
            acmeNewTotal: pharmacyIncomePut.acmeNewTotal.toString(),
            parking: pharmacyIncomePut.parking.toString(),
            coffeeShop: pharmacyIncomePut.coffeeShop.toString(),
            canteenIncome: pharmacyIncomePut.canteenIncome.toString(),
            creditCardChargesNight: pharmacyIncomePut.creditCardChargesNight.toString(),
            trainingFee: pharmacyIncomePut.trainingFee.toString(),
            humankindSales: pharmacyIncomePut.humankindSales.toString(),
            miscIncome: pharmacyIncomePut.miscIncome,
          })
          .execute();
      }

      if (payload.expenditures.length > 0) {
        await tx
          .insert(dailyExpenditures)
          .values(
            payload.expenditures.map((item) => ({
              reportId: id,
              category: item.category,
              details: item.details,
              amount: item.amount.toString(),
              narration: item.narration ?? null,
            }))
          )
          .execute();
      }

      if (payload.staffAdvances.length > 0) {
        await tx
          .insert(dailyStaffAdvances)
          .values(
            payload.staffAdvances.map((item) => ({
              reportId: id,
              staffId: item.staffId ?? null,
              staffName: item.staffName,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.ipdAdmissions.length > 0) {
        await tx
          .insert(dailyIpdAdmissions)
          .values(
            payload.ipdAdmissions.map((item) => ({
              reportId: id,
              patientName: item.patientName,
              type: item.type,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.ipdDischarges.length > 0) {
        await tx
          .insert(dailyIpdDischarges)
          .values(
            payload.ipdDischarges.map((item) => ({
              reportId: id,
              patientName: item.patientName,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.additionalIncome.length > 0) {
        await tx
          .insert(dailyAdditionalIncome)
          .values(
            payload.additionalIncome.map((item) => ({
              reportId: id,
              label: item.label,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.discountsReturns.length > 0) {
        await tx
          .insert(dailyDiscountsReturns)
          .values(
            payload.discountsReturns.map((item) => ({
              reportId: id,
              label: item.label,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      if (payload.paymentChannels.length > 0) {
        await tx
          .insert(dailyPaymentChannels)
          .values(
            payload.paymentChannels.map((item) => ({
              reportId: id,
              bank: item.bank,
              channel: item.channel,
              sourceLabel: item.sourceLabel,
              amount: item.amount.toString(),
            }))
          )
          .execute();
      }

      return report;
    });

    return c.json(updatedRow);
  })

  // -------------------------------------------------------------------------
  // Delete Closing Report
  // -------------------------------------------------------------------------
  .delete("/daily-closing/reports/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const [existingReport] = await db
      .select()
      .from(dailyClosingReports)
      .where(eq(dailyClosingReports.id, id))
      .limit(1)
      .execute();

    if (!existingReport) {
      return c.json({ error: "Report not found" }, 404);
    }

    if (existingReport.status !== "draft") {
      return c.json({ error: "Only draft reports can be deleted." }, 403);
    }

    // Cascading deletes on schema tables will handle child records automatically!
    const [row] = await db
      .delete(dailyClosingReports)
      .where(eq(dailyClosingReports.id, id))
      .returning()
      .execute();

    return c.json({ success: true, deleted: row });
  })

  // -------------------------------------------------------------------------
  // Publish Report — Generate a signed shareable URL (valid 2 days)
  // -------------------------------------------------------------------------
  .post("/daily-closing/reports/:id/publish", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid ID" }, 400);

    const [report] = await db
      .select({ id: dailyClosingReports.id })
      .from(dailyClosingReports)
      .where(eq(dailyClosingReports.id, id))
      .limit(1)
      .execute();

    if (!report) {
      return c.json({ error: "Report not found" }, 404);
    }

    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
    const expiresAt = Date.now() + TWO_DAYS_MS;

    const token = await signToken({ reportId: id, expiresAt });

    // Build absolute URL from the request so it works in any environment
    const reqUrl = new URL(c.req.url);
    const origin = `${reqUrl.protocol}//${reqUrl.host}`;
    const signedUrl = `${origin}/shared/report/${token}`;

    return c.json({ signedUrl, expiresAt });
  });
