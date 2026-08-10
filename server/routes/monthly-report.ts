import { and, asc, eq, gte, lte, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { auth, type AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  dailyClosingReports,
  serviceCategories,
  serviceCatalog,
  dailyServiceLines,
  dailyPharmacyIncome,
  dailyExpenditures,
  expenseCategories,
  dailyStaffAdvances,
  dailyIpdAdmissions,
  dailyIpdDischarges,
  dailyAdditionalIncome,
  dailyDiscountsReturns,
  reportCategoryExclusions,
  monthlyBankExpenses,
  vendors,
} from "../db/schema.ts";
import { hasHrOrAccountsViewAccess } from "./shared.ts";

export const monthlyReportRoutes = new Hono<AuthEnv>()
  .get("/daily-closing/monthly-report", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden: HR/Accounts or Management Approver view access required" }, 403);
    }
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");

    if (!startDate || !endDate) {
      return c.json({ error: "startDate and endDate are required (YYYY-MM-DD)" }, 400);
    }

    // Auth session check for user preference defaults
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const userId = session?.user?.id;

    // Fetch user's saved DB exclusions if present
    let savedExclusions: string[] = [];
    if (userId) {
      const saved = await db
        .select()
        .from(reportCategoryExclusions)
        .where(
          and(
            eq(reportCategoryExclusions.userId, userId),
            eq(reportCategoryExclusions.reportType, "monthly-report")
          )
        )
        .limit(1)
        .execute();
      if (saved.length > 0 && Array.isArray(saved[0].excludedCategories)) {
        savedExclusions = saved[0].excludedCategories as string[];
      }
    }

    // Determine active excluded categories
    const reqExclude = c.req.query("excludedCategories");
    let activeExclusions: string[] = [];
    if (reqExclude !== undefined) {
      activeExclusions = reqExclude ? reqExclude.split(",").map((s) => s.trim()).filter(Boolean) : [];
    } else {
      activeExclusions = [...savedExclusions];
    }
    const activeExcludedSet = new Set(activeExclusions);

    // Fetch all active expense categories for UI selection options
    const allExpCategories = await db
      .select()
      .from(expenseCategories)
      .orderBy(expenseCategories.sortOrder)
      .execute();

    const expCategoryLabelMap = new Map(allExpCategories.map((cat) => [cat.code, cat.label]));

    const availableCategories = [
      ...allExpCategories.map((cat) => ({ code: cat.code, label: cat.label })),
      { code: "STAFF_ADVANCES", label: "Staff Advances" },
    ];

    // Fetch all reports in the date range
    const reports = await db
      .select()
      .from(dailyClosingReports)
      .where(
        and(
          gte(dailyClosingReports.reportDate, startDate),
          lte(dailyClosingReports.reportDate, endDate)
        )
      )
      .orderBy(asc(dailyClosingReports.reportDate))
      .execute();

    if (reports.length === 0) {
      return c.json({
        period: { startDate, endDate },
        reportCount: 0,
        summary: { totalIncome: 0, totalCashExpenditure: 0, totalBankExpenditure: 0, totalExpenditure: 0, netBalance: 0, avgDailyIncome: 0, avgDailyExpenditure: 0 },
        incomeByHead: [],
        pharmacyIncome: { otWardTotal: 0, acmeNewTotal: 0, parking: 0, coffeeShop: 0, canteenIncome: 0, creditCardChargesNight: 0, trainingFee: 0, humankindSales: 0, miscTotal: 0 },
        expenditureByHead: [],
        staffAdvancesTotal: 0,
        staffAdvancesEntries: [],
        staffAdvancesExcluded: activeExcludedSet.has("STAFF_ADVANCES"),
        ipdAdmissionsTotal: 0,
        ipdAdmissionsEntries: [],
        ipdDischargesTotal: 0,
        ipdDischargesEntries: [],
        additionalIncomeTotal: 0,
        additionalIncomeEntries: [],
        discountsReturnsTotal: 0,
        bankExpenditures: { total: 0, byCategory: [] },
        dailyTrends: [],
        availableCategories,
        savedExclusions,
        activeExclusions,
      });
    }

    const reportIds = reports.map((r) => r.id);

    // Fetch service lines
    const allServiceLines = await db
      .select({
        id: dailyServiceLines.id,
        reportId: dailyServiceLines.reportId,
        reportDate: dailyClosingReports.reportDate,
        amount: dailyServiceLines.amount,
        quantity: dailyServiceLines.quantity,
        rate: dailyServiceLines.rate,
        narration: dailyServiceLines.narration,
        isNightEntry: dailyServiceLines.isNightEntry,
        serviceName: serviceCatalog.serviceName,
        department: serviceCatalog.department,
      })
      .from(dailyServiceLines)
      .innerJoin(dailyClosingReports, eq(dailyServiceLines.reportId, dailyClosingReports.id))
      .leftJoin(serviceCatalog, eq(dailyServiceLines.serviceId, serviceCatalog.id))
      .where(inArray(dailyServiceLines.reportId, reportIds))
      .execute();

    const allCategories = await db
      .select()
      .from(serviceCategories)
      .orderBy(serviceCategories.sortOrder)
      .execute();

    const categoryLabelMap = new Map(allCategories.map((c) => [c.code, c.label]));

    const incomeEntriesMap = new Map<string, any[]>();
    const incomeByHeadMap = new Map<string, number>();

    for (const line of allServiceLines) {
      const dept = line.department || "UNKNOWN";
      const amt = parseFloat(line.amount || "0");
      incomeByHeadMap.set(dept, (incomeByHeadMap.get(dept) || 0) + amt);

      if (!incomeEntriesMap.has(dept)) incomeEntriesMap.set(dept, []);
      incomeEntriesMap.get(dept)!.push({
        id: line.id,
        reportDate: line.reportDate,
        description: line.serviceName || "Service Line",
        quantity: line.quantity ?? 1,
        rate: line.rate ? parseFloat(line.rate) : amt,
        amount: amt,
        narration: line.narration || null,
        isNightEntry: Boolean(line.isNightEntry),
      });
    }

    const incomeByHead = Array.from(incomeByHeadMap.entries())
      .map(([code, total]) => ({
        code,
        label: categoryLabelMap.get(code) || code,
        total: Math.round(total * 100) / 100,
        entries: (incomeEntriesMap.get(code) || []).sort((a, b) => (a.reportDate > b.reportDate ? -1 : 1)),
      }))
      .sort((a, b) => b.total - a.total);

    // Fetch pharmacy income
    const allPharmacy = await db
      .select()
      .from(dailyPharmacyIncome)
      .where(inArray(dailyPharmacyIncome.reportId, reportIds))
      .execute();

    const pharmacyIncome = {
      otWardTotal: 0,
      acmeNewTotal: 0,
      parking: 0,
      coffeeShop: 0,
      canteenIncome: 0,
      creditCardChargesNight: 0,
      trainingFee: 0,
      humankindSales: 0,
      miscTotal: 0,
    };
    for (const p of allPharmacy) {
      pharmacyIncome.otWardTotal += parseFloat(p.otWardTotal || "0");
      pharmacyIncome.acmeNewTotal += parseFloat(p.acmeNewTotal || "0");
      pharmacyIncome.parking += parseFloat(p.parking || "0");
      pharmacyIncome.coffeeShop += parseFloat(p.coffeeShop || "0");
      pharmacyIncome.canteenIncome += parseFloat(p.canteenIncome || "0");
      pharmacyIncome.creditCardChargesNight += parseFloat(p.creditCardChargesNight || "0");
      pharmacyIncome.trainingFee += parseFloat(p.trainingFee || "0");
      pharmacyIncome.humankindSales += parseFloat(p.humankindSales || "0");
      try {
        const misc = typeof p.miscIncome === "string" ? JSON.parse(p.miscIncome) : [];
        if (Array.isArray(misc)) {
          pharmacyIncome.miscTotal += misc.reduce((s: number, item: any) => s + (parseFloat(item.amount) || 0), 0);
        }
      } catch {}
    }

    // Fetch expenditures joined with report date
    const allExpenditures = await db
      .select({
        id: dailyExpenditures.id,
        reportId: dailyExpenditures.reportId,
        reportDate: dailyClosingReports.reportDate,
        category: dailyExpenditures.category,
        details: dailyExpenditures.details,
        amount: dailyExpenditures.amount,
        narration: dailyExpenditures.narration,
      })
      .from(dailyExpenditures)
      .innerJoin(dailyClosingReports, eq(dailyExpenditures.reportId, dailyClosingReports.id))
      .where(inArray(dailyExpenditures.reportId, reportIds))
      .execute();

    const expenditureEntriesMap = new Map<string, any[]>();
    const expenditureByHeadMap = new Map<string, number>();
    const dailyExpenditureMap = new Map<string, number>(); // reportDate -> sum of non-excluded expenditure

    for (const exp of allExpenditures) {
      const cat = exp.category || "MISC";
      const amt = parseFloat(exp.amount || "0");
      const isExcluded = activeExcludedSet.has(cat);

      expenditureByHeadMap.set(cat, (expenditureByHeadMap.get(cat) || 0) + amt);

      if (!isExcluded) {
        dailyExpenditureMap.set(exp.reportDate, (dailyExpenditureMap.get(exp.reportDate) || 0) + amt);
      }

      if (!expenditureEntriesMap.has(cat)) expenditureEntriesMap.set(cat, []);
      expenditureEntriesMap.get(cat)!.push({
        id: exp.id,
        reportDate: exp.reportDate,
        description: exp.details || "Expenditure Item",
        amount: amt,
        narration: exp.narration || null,
        isExcluded,
      });
    }

    const expenditureByHead = Array.from(expenditureByHeadMap.entries())
      .map(([code, total]) => ({
        code,
        label: expCategoryLabelMap.get(code) || code,
        total: Math.round(total * 100) / 100,
        isExcluded: activeExcludedSet.has(code),
        entries: (expenditureEntriesMap.get(code) || []).sort((a, b) => (a.reportDate > b.reportDate ? -1 : 1)),
      }))
      .sort((a, b) => b.total - a.total);

    // Fetch staff advances
    const allAdvances = await db
      .select({
        id: dailyStaffAdvances.id,
        reportId: dailyStaffAdvances.reportId,
        reportDate: dailyClosingReports.reportDate,
        staffName: dailyStaffAdvances.staffName,
        amount: dailyStaffAdvances.amount,
      })
      .from(dailyStaffAdvances)
      .innerJoin(dailyClosingReports, eq(dailyStaffAdvances.reportId, dailyClosingReports.id))
      .where(inArray(dailyStaffAdvances.reportId, reportIds))
      .execute();

    const isStaffAdvancesExcluded = activeExcludedSet.has("STAFF_ADVANCES");
    const dailyStaffAdvancesMap = new Map<string, number>();

    let staffAdvancesTotal = 0;
    for (const a of allAdvances) {
      const amt = parseFloat(a.amount || "0");
      staffAdvancesTotal += amt;
      if (!isStaffAdvancesExcluded) {
        dailyStaffAdvancesMap.set(a.reportDate, (dailyStaffAdvancesMap.get(a.reportDate) || 0) + amt);
      }
    }

    const staffAdvancesEntries = allAdvances
      .map((a) => ({
        id: a.id,
        reportDate: a.reportDate,
        description: a.staffName ? `Staff Advance: ${a.staffName}` : "Staff Advance",
        amount: parseFloat(a.amount || "0"),
        isExcluded: isStaffAdvancesExcluded,
      }))
      .sort((a, b) => (a.reportDate > b.reportDate ? -1 : 1));

    // Fetch IPD admissions
    const allAdmissions = await db
      .select({
        id: dailyIpdAdmissions.id,
        reportId: dailyIpdAdmissions.reportId,
        reportDate: dailyClosingReports.reportDate,
        patientName: dailyIpdAdmissions.patientName,
        type: dailyIpdAdmissions.type,
        amount: dailyIpdAdmissions.amount,
      })
      .from(dailyIpdAdmissions)
      .innerJoin(dailyClosingReports, eq(dailyIpdAdmissions.reportId, dailyClosingReports.id))
      .where(inArray(dailyIpdAdmissions.reportId, reportIds))
      .execute();

    const ipdAdmissionsTotal = allAdmissions.reduce((s, a) => s + parseFloat(a.amount || "0"), 0);
    const ipdAdmissionsEntries = allAdmissions
      .map((a) => ({
        id: a.id,
        reportDate: a.reportDate,
        description: `${a.patientName || "Patient"}${a.type ? ` (${a.type})` : ""}`,
        amount: parseFloat(a.amount || "0"),
      }))
      .sort((a, b) => (a.reportDate > b.reportDate ? -1 : 1));

    // Fetch IPD discharges
    const allDischarges = await db
      .select({
        id: dailyIpdDischarges.id,
        reportId: dailyIpdDischarges.reportId,
        reportDate: dailyClosingReports.reportDate,
        patientName: dailyIpdDischarges.patientName,
        amount: dailyIpdDischarges.amount,
      })
      .from(dailyIpdDischarges)
      .innerJoin(dailyClosingReports, eq(dailyIpdDischarges.reportId, dailyClosingReports.id))
      .where(inArray(dailyIpdDischarges.reportId, reportIds))
      .execute();

    const ipdDischargesTotal = allDischarges.reduce((s, a) => s + parseFloat(a.amount || "0"), 0);
    const ipdDischargesEntries = allDischarges
      .map((d) => ({
        id: d.id,
        reportDate: d.reportDate,
        description: d.patientName ? `Discharge: ${d.patientName}` : "IPD Discharge",
        amount: parseFloat(d.amount || "0"),
      }))
      .sort((a, b) => (a.reportDate > b.reportDate ? -1 : 1));

    // Fetch additional income
    const allAdditional = await db
      .select({
        id: dailyAdditionalIncome.id,
        reportId: dailyAdditionalIncome.reportId,
        reportDate: dailyClosingReports.reportDate,
        label: dailyAdditionalIncome.label,
        amount: dailyAdditionalIncome.amount,
      })
      .from(dailyAdditionalIncome)
      .innerJoin(dailyClosingReports, eq(dailyAdditionalIncome.reportId, dailyClosingReports.id))
      .where(inArray(dailyAdditionalIncome.reportId, reportIds))
      .execute();

    const additionalIncomeTotal = allAdditional.reduce((s, a) => s + parseFloat(a.amount || "0"), 0);
    const additionalIncomeEntries = allAdditional
      .map((a) => ({
        id: a.id,
        reportDate: a.reportDate,
        description: a.label || "Additional Income",
        amount: parseFloat(a.amount || "0"),
      }))
      .sort((a, b) => (a.reportDate > b.reportDate ? -1 : 1));

    // Fetch discounts/returns
    const allDiscounts = await db
      .select()
      .from(dailyDiscountsReturns)
      .where(inArray(dailyDiscountsReturns.reportId, reportIds))
      .execute();
    const discountsReturnsTotal = allDiscounts.reduce((s, a) => s + parseFloat(a.amount || "0"), 0);

    // =========================================================================
    // Bank Expenses — fetch for months overlapping the date range
    // =========================================================================
    const startMonth = startDate.slice(0, 7); // "YYYY-MM"
    const endMonth = endDate.slice(0, 7);
    const monthsInRange: string[] = [];
    {
      const [sy, sm] = startMonth.split("-").map(Number);
      const [ey, em] = endMonth.split("-").map(Number);
      let cy = sy, cm = sm;
      while (cy < ey || (cy === ey && cm <= em)) {
        monthsInRange.push(`${cy}-${String(cm).padStart(2, "0")}`);
        cm++;
        if (cm > 12) { cm = 1; cy++; }
      }
    }

    const allBankExpenses = monthsInRange.length > 0
      ? await db
          .select({
            id: monthlyBankExpenses.id,
            month: monthlyBankExpenses.month,
            category: monthlyBankExpenses.category,
            label: monthlyBankExpenses.label,
            vendorId: monthlyBankExpenses.vendorId,
            vendorName: vendors.name,
            amount: monthlyBankExpenses.amount,
            paymentMode: monthlyBankExpenses.paymentMode,
            paymentDate: monthlyBankExpenses.paymentDate,
            chequeIssueDate: monthlyBankExpenses.chequeIssueDate,
            referenceNo: monthlyBankExpenses.referenceNo,
            bankName: monthlyBankExpenses.bankName,
            narration: monthlyBankExpenses.narration,
            isRecurring: monthlyBankExpenses.isRecurring,
            isSalaryAuto: monthlyBankExpenses.isSalaryAuto,
          })
          .from(monthlyBankExpenses)
          .leftJoin(vendors, eq(monthlyBankExpenses.vendorId, vendors.id))
          .where(inArray(monthlyBankExpenses.month, monthsInRange))
          .orderBy(asc(monthlyBankExpenses.category), asc(monthlyBankExpenses.label))
          .execute()
      : [];

    // Group bank expenses by category
    const bankByCategoryMap = new Map<string, { code: string; label: string; total: number; isExcluded: boolean; entries: any[] }>();
    for (const exp of allBankExpenses) {
      const cat = exp.category;
      const exclusionCode = `BANK_${cat}`;
      const isExcluded = activeExcludedSet.has(exclusionCode);
      const amt = parseFloat(exp.amount || "0");

      if (!bankByCategoryMap.has(cat)) {
        bankByCategoryMap.set(cat, {
          code: cat,
          label: expCategoryLabelMap.get(cat) || cat.replace(/_/g, " "),
          total: 0,
          isExcluded,
          entries: [],
        });
      }
      const entry = bankByCategoryMap.get(cat)!;
      entry.total += amt;
      entry.entries.push({
        id: exp.id,
        month: exp.month,
        label: exp.label,
        vendorName: exp.vendorName || null,
        amount: amt,
        paymentMode: exp.paymentMode,
        paymentDate: exp.paymentDate,
        chequeIssueDate: exp.chequeIssueDate,
        referenceNo: exp.referenceNo,
        bankName: exp.bankName,
        narration: exp.narration,
        isRecurring: exp.isRecurring,
        isSalaryAuto: exp.isSalaryAuto,
      });
    }

    const bankByCategory = Array.from(bankByCategoryMap.values())
      .map((c) => ({ ...c, total: Math.round(c.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    const nonExcludedBankTotal = bankByCategory
      .filter((c) => !c.isExcluded)
      .reduce((s, c) => s + c.total, 0);

    const bankHeads = bankByCategory.map((c) => ({
      code: `BANK_${c.code}`,
      label: `🏦 ${c.label}`,
      total: c.total,
      isExcluded: c.isExcluded,
      entries: c.entries,
    }));

    const combinedExpenditureByHead = [...expenditureByHead, ...bankHeads].sort((a, b) => b.total - a.total);

    // =========================================================================
    // Compute Filtered Totals (Cash + Bank)
    // =========================================================================
    const totalIncome = reports.reduce((s, r) => s + parseFloat(r.totalIncome || "0"), 0);

    // Filtered total cash expenditure: sum of non-excluded expenditure heads + non-excluded staff advances
    const nonExcludedExpTotal = expenditureByHead
      .filter((h) => !h.isExcluded)
      .reduce((s, h) => s + h.total, 0);

    const totalCashExpenditure = nonExcludedExpTotal + (isStaffAdvancesExcluded ? 0 : staffAdvancesTotal);
    const totalBankExpenditure = nonExcludedBankTotal;
    const totalExpenditure = totalCashExpenditure + totalBankExpenditure;
    const netBalance = totalIncome - totalExpenditure;
    const reportCount = reports.length;

    // Daily trends filtered dynamically per report date
    const dailyTrends = reports.map((r) => {
      const inc = parseFloat(r.totalIncome || "0");
      const exp = (dailyExpenditureMap.get(r.reportDate) || 0) + (dailyStaffAdvancesMap.get(r.reportDate) || 0);
      return {
        date: r.reportDate,
        income: Math.round(inc * 100) / 100,
        expenditure: Math.round(exp * 100) / 100,
        balance: Math.round((inc - exp) * 100) / 100,
      };
    });

    return c.json({
      period: { startDate, endDate },
      reportCount,
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalCashExpenditure: Math.round(totalCashExpenditure * 100) / 100,
        totalBankExpenditure: Math.round(totalBankExpenditure * 100) / 100,
        totalExpenditure: Math.round(totalExpenditure * 100) / 100,
        netBalance: Math.round(netBalance * 100) / 100,
        avgDailyIncome: Math.round((totalIncome / reportCount) * 100) / 100,
        avgDailyExpenditure: Math.round((totalExpenditure / reportCount) * 100) / 100,
      },
      incomeByHead,
      pharmacyIncome,
      expenditureByHead: combinedExpenditureByHead,
      staffAdvancesTotal: Math.round(staffAdvancesTotal * 100) / 100,
      staffAdvancesEntries,
      staffAdvancesExcluded: isStaffAdvancesExcluded,
      ipdAdmissionsTotal: Math.round(ipdAdmissionsTotal * 100) / 100,
      ipdAdmissionsEntries,
      ipdDischargesTotal: Math.round(ipdDischargesTotal * 100) / 100,
      ipdDischargesEntries,
      additionalIncomeTotal: Math.round(additionalIncomeTotal * 100) / 100,
      additionalIncomeEntries,
      discountsReturnsTotal: Math.round(discountsReturnsTotal * 100) / 100,
      bankExpenditures: {
        total: Math.round(nonExcludedBankTotal * 100) / 100,
        byCategory: bankByCategory,
      },
      dailyTrends,
      availableCategories,
      savedExclusions,
      activeExclusions,
    });
  })
  .post("/daily-closing/monthly-report/exclusions", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden: HR/Accounts or Management Approver view access required" }, 403);
    }
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user?.id) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const body = await c.req.json();
    const excludedCategories = Array.isArray(body.excludedCategories)
      ? body.excludedCategories.map((s: any) => String(s).trim()).filter(Boolean)
      : [];

    await db
      .insert(reportCategoryExclusions)
      .values({
        userId: session.user.id,
        reportType: "monthly-report",
        excludedCategories,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [reportCategoryExclusions.userId, reportCategoryExclusions.reportType],
        set: {
          excludedCategories,
          updatedAt: new Date(),
        },
      })
      .execute();

    return c.json({ success: true, excludedCategories });
  });

