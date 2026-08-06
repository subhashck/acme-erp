import { and, asc, eq, gte, lte, inArray } from "drizzle-orm";
import { Hono } from "hono";
import type { AuthEnv } from "../auth.ts";
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

    // Fetch all reports in the date range
    const reports = await db
      .select()
      .from(dailyClosingReports)
      .where(and(
        gte(dailyClosingReports.reportDate, startDate),
        lte(dailyClosingReports.reportDate, endDate)
      ))
      .orderBy(asc(dailyClosingReports.reportDate))
      .execute();

    if (reports.length === 0) {
      return c.json({
        period: { startDate, endDate },
        reportCount: 0,
        summary: { totalIncome: 0, totalExpenditure: 0, netBalance: 0, avgDailyIncome: 0, avgDailyExpenditure: 0 },
        incomeByHead: [],
        pharmacyIncome: { otWardTotal: 0, acmeNewTotal: 0, parking: 0, coffeeShop: 0, canteenIncome: 0, creditCardChargesNight: 0, trainingFee: 0, humankindSales: 0, miscTotal: 0 },
        expenditureByHead: [],
        staffAdvancesTotal: 0,
        staffAdvancesEntries: [],
        ipdAdmissionsTotal: 0,
        ipdAdmissionsEntries: [],
        ipdDischargesTotal: 0,
        ipdDischargesEntries: [],
        additionalIncomeTotal: 0,
        additionalIncomeEntries: [],
        discountsReturnsTotal: 0,
        dailyTrends: [],
      });
    }

    const reportIds = reports.map((r) => r.id);

    // Fetch all service lines for these reports, joined with report & catalog
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

    // Fetch all categories for labelling
    const allCategories = await db
      .select()
      .from(serviceCategories)
      .orderBy(serviceCategories.sortOrder)
      .execute();

    const categoryLabelMap = new Map(allCategories.map((c) => [c.code, c.label]));

    // Group service lines by department
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

    // Fetch all expenditures joined with daily closing reports
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

    // Fetch expense categories for labelling
    const allExpCategories = await db
      .select()
      .from(expenseCategories)
      .orderBy(expenseCategories.sortOrder)
      .execute();

    const expCategoryLabelMap = new Map(allExpCategories.map((c) => [c.code, c.label]));

    const expenditureEntriesMap = new Map<string, any[]>();
    const expenditureByHeadMap = new Map<string, number>();

    for (const exp of allExpenditures) {
      const cat = exp.category || "MISC";
      const amt = parseFloat(exp.amount || "0");
      expenditureByHeadMap.set(cat, (expenditureByHeadMap.get(cat) || 0) + amt);

      if (!expenditureEntriesMap.has(cat)) expenditureEntriesMap.set(cat, []);
      expenditureEntriesMap.get(cat)!.push({
        id: exp.id,
        reportDate: exp.reportDate,
        description: exp.details || "Expenditure Item",
        amount: amt,
        narration: exp.narration || null,
      });
    }

    const expenditureByHead = Array.from(expenditureByHeadMap.entries())
      .map(([code, total]) => ({
        code,
        label: expCategoryLabelMap.get(code) || code,
        total: Math.round(total * 100) / 100,
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

    const staffAdvancesTotal = allAdvances.reduce((s, a) => s + parseFloat(a.amount || "0"), 0);
    const staffAdvancesEntries = allAdvances
      .map((a) => ({
        id: a.id,
        reportDate: a.reportDate,
        description: a.staffName ? `Staff Advance: ${a.staffName}` : "Staff Advance",
        amount: parseFloat(a.amount || "0"),
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

    // Compute totals
    const totalIncome = reports.reduce((s, r) => s + parseFloat(r.totalIncome || "0"), 0);
    const totalExpenditure = reports.reduce((s, r) => s + parseFloat(r.totalExpenditure || "0"), 0);
    const netBalance = totalIncome - totalExpenditure;
    const reportCount = reports.length;

    // Daily trends for charting
    const dailyTrends = reports.map((r) => ({
      date: r.reportDate,
      income: parseFloat(r.totalIncome || "0"),
      expenditure: parseFloat(r.totalExpenditure || "0"),
      balance: parseFloat(r.closingBalance || "0"),
    }));

    return c.json({
      period: { startDate, endDate },
      reportCount,
      summary: {
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenditure: Math.round(totalExpenditure * 100) / 100,
        netBalance: Math.round(netBalance * 100) / 100,
        avgDailyIncome: Math.round((totalIncome / reportCount) * 100) / 100,
        avgDailyExpenditure: Math.round((totalExpenditure / reportCount) * 100) / 100,
      },
      incomeByHead,
      pharmacyIncome,
      expenditureByHead,
      staffAdvancesTotal: Math.round(staffAdvancesTotal * 100) / 100,
      staffAdvancesEntries,
      ipdAdmissionsTotal: Math.round(ipdAdmissionsTotal * 100) / 100,
      ipdAdmissionsEntries,
      ipdDischargesTotal: Math.round(ipdDischargesTotal * 100) / 100,
      ipdDischargesEntries,
      additionalIncomeTotal: Math.round(additionalIncomeTotal * 100) / 100,
      additionalIncomeEntries,
      discountsReturnsTotal: Math.round(discountsReturnsTotal * 100) / 100,
      dailyTrends,
    });
  });
