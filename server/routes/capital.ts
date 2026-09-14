import { and, asc, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  capitalFacilities,
  capitalRepayments,
  capitalCashFlowEntries,
} from "../db/schema-capital.ts";
import { bankAccounts } from "../db/schema.ts";
import { hasHrOrAccountsViewAccess } from "./shared.ts";

function toNum(v: unknown): number {
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.-]+/g, ""));
  return isNaN(n) ? 0 : n;
}

const facilityInputSchema = z.object({
  facilityCode: z.string().optional(),
  name: z.string().min(1, "Facility name is required"),
  lenderName: z.string().min(1, "Lender / Counterparty name is required"),
  category: z.string().min(1, "Category is required"), // "Bank Loan", "NBFC", "Chit Fund", "Private Lending", "Daily Collection Financing", "Credit Card", "Other"
  facilityType: z.string().default("Term Loan"),
  sanctionedAmount: z.number().positive("Sanctioned amount must be greater than 0"),
  disbursedAmount: z.number().positive().optional(),
  interestRate: z.number().min(0).default(0), // % p.a.
  interestType: z.enum(["flat", "reducing", "interest_only", "chit_dividend"]).default("reducing"),
  tenorMonths: z.number().min(0).default(0),
  repaymentFrequency: z.enum(["daily", "weekly", "monthly", "quarterly", "bullet", "revolving"]).default("monthly"),
  installmentAmount: z.number().min(0).default(0),
  sanctionDate: z.string().optional().nullable(),
  disbursementDate: z.string().optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  moratoriumMonths: z.number().min(0).default(0),
  moratoriumType: z.enum(["none", "pre_emi_interest", "capitalized"]).default("none"),
  repaymentStartDate: z.string().optional().nullable(),
  bankAccountId: z.number().optional().nullable(),
  collateralSecurity: z.string().optional().nullable(),
  status: z.enum(["active", "closed", "restructured", "defaulted"]).default("active"),
  notes: z.string().optional().nullable(),
  postToCashFlow: z.boolean().default(false), // If true, logs debt disbursement inflow in cash flow
});

const repaymentInputSchema = z.object({
  facilityId: z.number().positive(),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentType: z.enum([
    "emi",
    "principal_part",
    "interest_only",
    "foreclosure",
    "chit_installment",
    "daily_collection",
    "penalty_charges",
  ]).default("emi"),
  principalPaid: z.number().min(0).default(0),
  interestPaid: z.number().min(0).default(0),
  chargesPaid: z.number().min(0).default(0),
  totalAmount: z.number().min(0).optional(),
  paymentMethod: z.enum([
    "daily_collection",
    "auto_debit",
    "bank_transfer",
    "cheque",
    "cash",
    "upi",
  ]).default("daily_collection"),
  bankAccountId: z.number().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(["completed", "pending", "failed", "cancelled"]).default("completed"),
  postToCashFlow: z.boolean().default(true),
});

const bulkDailyRepaymentSchema = z.object({
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["daily_collection", "cash", "bank_transfer", "upi"]).default("daily_collection"),
  referenceNumber: z.string().optional().nullable(),
  bankAccountId: z.number().optional().nullable(),
  items: z.array(
    z.object({
      facilityId: z.number().positive(),
      principalPaid: z.number().min(0),
      interestPaid: z.number().min(0),
      chargesPaid: z.number().min(0).default(0),
      totalAmount: z.number().positive(),
      notes: z.string().optional().nullable(),
    })
  ).min(1, "At least one daily collection item is required"),
});

const cashFlowInputSchema = z.object({
  entryDate: z.string().min(1, "Date is required"),
  transactionType: z.enum([
    "capital_infusion",
    "operating_income",
    "operating_expense",
    "debt_inflow",
    "debt_servicing",
  ]),
  category: z.string().min(1, "Category is required"),
  partyName: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  inflowAmount: z.number().min(0).default(0),
  outflowAmount: z.number().min(0).default(0),
  bankAccountId: z.number().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
});

export const capitalRoutes = new Hono<AuthEnv>()
  // -------------------------------------------------------------------------
  // 1. Dashboard & Analytics
  // -------------------------------------------------------------------------
  .get("/capital/dashboard", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden: Management/Accounts access required" }, 403);
    }

    // Fetch all facilities
    const facilities = await db
      .select()
      .from(capitalFacilities)
      .orderBy(asc(capitalFacilities.name))
      .execute();

    // Fetch all cash flow entries
    const cashFlow = await db
      .select()
      .from(capitalCashFlowEntries)
      .orderBy(asc(capitalCashFlowEntries.entryDate), asc(capitalCashFlowEntries.id))
      .execute();

    // Fetch all repayments
    const repayments = await db
      .select({
        repayment: capitalRepayments,
        facilityName: capitalFacilities.name,
        category: capitalFacilities.category,
      })
      .from(capitalRepayments)
      .leftJoin(capitalFacilities, eq(capitalRepayments.facilityId, capitalFacilities.id))
      .orderBy(desc(capitalRepayments.paymentDate), desc(capitalRepayments.id))
      .limit(10)
      .execute();

    // Compute KPIs
    let totalOutstandingDebt = 0;
    let monthlyDebtServicing = 0;
    let activeFacilitiesCount = 0;

    const categoryMap: Record<
      string,
      {
        sanctioned: number;
        outstanding: number;
        monthlyDue: number;
        dailyDue: number;
        principalPaid: number;
        count: number;
      }
    > = {
      "Daily Collection Financing": { sanctioned: 0, outstanding: 0, monthlyDue: 0, dailyDue: 0, principalPaid: 0, count: 0 },
      "Bank Loan": { sanctioned: 0, outstanding: 0, monthlyDue: 0, dailyDue: 0, principalPaid: 0, count: 0 },
      "NBFC": { sanctioned: 0, outstanding: 0, monthlyDue: 0, dailyDue: 0, principalPaid: 0, count: 0 },
      "Chit Fund": { sanctioned: 0, outstanding: 0, monthlyDue: 0, dailyDue: 0, principalPaid: 0, count: 0 },
      "Private Lending": { sanctioned: 0, outstanding: 0, monthlyDue: 0, dailyDue: 0, principalPaid: 0, count: 0 },
      "Credit Card": { sanctioned: 0, outstanding: 0, monthlyDue: 0, dailyDue: 0, principalPaid: 0, count: 0 },
    };

    let dailyFinancingActiveCount = 0;
    let dailyFinancingDailyDue = 0;

    for (const fac of facilities) {
      const isFacilityActive = fac.status === "active";
      const cat = fac.category || "Private Lending";
      if (!categoryMap[cat]) {
        categoryMap[cat] = { sanctioned: 0, outstanding: 0, monthlyDue: 0, dailyDue: 0, principalPaid: 0, count: 0 };
      }

      const sanctioned = toNum(fac.sanctionedAmount);
      const outstanding = toNum(fac.outstandingBalance);
      const installment = toNum(fac.installmentAmount);
      const principalPaid = toNum(fac.totalPrincipalPaid);

      categoryMap[cat].sanctioned += sanctioned;
      categoryMap[cat].principalPaid += principalPaid;

      if (isFacilityActive) {
        activeFacilitiesCount++;
        totalOutstandingDebt += outstanding;
        categoryMap[cat].outstanding += outstanding;
        categoryMap[cat].count++;

        // Check moratorium status
        const todayStr = new Date().toISOString().slice(0, 10);
        const hasMoratorium = fac.moratoriumType && fac.moratoriumType !== "none";
        const isInMoratorium = hasMoratorium && Boolean(fac.repaymentStartDate && fac.repaymentStartDate > todayStr);

        // Monthly debt servicing normalization
        let monthlyEquivalent = 0;
        if (fac.repaymentFrequency === "daily") {
          // If installment is a daily due, track daily due specifically (capped at remaining outstanding)
          const effectiveDaily = installment > 0 ? Math.min(installment, outstanding) : outstanding;
          monthlyEquivalent = effectiveDaily;
          dailyFinancingActiveCount++;
          dailyFinancingDailyDue += effectiveDaily;
          categoryMap[cat].dailyDue += effectiveDaily;
        } else if (isInMoratorium) {
          if (fac.moratoriumType === "pre_emi_interest") {
            // During moratorium: service Pre-EMI interest only
            const annualRate = toNum(fac.interestRate);
            monthlyEquivalent = (outstanding * (annualRate / 100)) / 12;
          } else if (fac.moratoriumType === "capitalized") {
            // Capitalized interest moratorium: zero monthly servicing outflow
            monthlyEquivalent = 0;
          } else {
            monthlyEquivalent = installment;
          }
        } else if (fac.interestType === "interest_only") {
          // Interest-only servicing depends dynamically on current outstanding balance
          const annualRate = toNum(fac.interestRate);
          monthlyEquivalent = (outstanding * (annualRate / 100)) / 12;
        } else if (fac.repaymentFrequency === "weekly") {
          monthlyEquivalent = installment * 4.33;
        } else if (fac.repaymentFrequency === "quarterly") {
          monthlyEquivalent = installment / 3;
        } else {
          monthlyEquivalent = installment;
        }

        monthlyDebtServicing += monthlyEquivalent;
        categoryMap[cat].monthlyDue += monthlyEquivalent;
      }
    }

    // Cash flow totals
    let totalCashInflow = 0;
    let totalCashOutflow = 0;
    let totalCapitalInfusions = 0;

    for (const cf of cashFlow) {
      const inf = toNum(cf.inflowAmount);
      const outf = toNum(cf.outflowAmount);
      totalCashInflow += inf;
      totalCashOutflow += outf;
      if (cf.transactionType === "capital_infusion") {
        totalCapitalInfusions += inf;
      }
    }

    const netCashPosition = totalCashInflow - totalCashOutflow;

    // Total repayments from database
    const [repayStats] = await db
      .select({
        totalPrincipal: sql<string>`COALESCE(SUM(${capitalRepayments.principalPaid}), 0)`,
        totalInterest: sql<string>`COALESCE(SUM(${capitalRepayments.interestPaid}), 0)`,
        totalCharges: sql<string>`COALESCE(SUM(${capitalRepayments.chargesPaid}), 0)`,
      })
      .from(capitalRepayments)
      .where(eq(capitalRepayments.status, "completed"))
      .execute();

    const totalPrincipalPaid = toNum(repayStats?.totalPrincipal);
    const totalInterestPaid = toNum(repayStats?.totalInterest);
    const totalChargesPaid = toNum(repayStats?.totalCharges);

    // Prepare Category Breakdown List
    const portfolioBreakdown = Object.entries(categoryMap).map(([category, stats]) => {
      const pct = totalOutstandingDebt > 0 ? (stats.outstanding / totalOutstandingDebt) * 100 : 0;
      const isDaily = category === "Daily Collection Financing" || stats.dailyDue > 0;
      return {
        category,
        sanctionedAmount: stats.sanctioned,
        currentOutstanding: stats.outstanding,
        monthlyDue: stats.monthlyDue,
        dailyDue: stats.dailyDue,
        dueAmount: isDaily ? (stats.dailyDue || stats.monthlyDue) : stats.monthlyDue,
        isDaily,
        dueLabel: isDaily ? "Daily Due" : "Monthly Due",
        principalPaid: stats.principalPaid,
        percentageOfTotalDebt: Math.round(pct * 10) / 10,
        activeFacilitiesCount: stats.count,
      };
    });

    // Today's daily collection status
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCollectionsRes = await db
      .select({
        totalCollectedToday: sql<string>`COALESCE(SUM(${capitalRepayments.totalAmount}), 0)`,
        countCollectedToday: sql<string>`COUNT(*)`,
      })
      .from(capitalRepayments)
      .where(
        and(
          eq(capitalRepayments.paymentDate, todayStr),
          eq(capitalRepayments.status, "completed")
        )
      )
      .execute();

    return c.json({
      kpis: {
        totalOutstandingDebt,
        monthlyDebtServicing,
        netCashPosition,
        totalCapitalInfusions,
        totalPrincipalPaid,
        totalInterestPaid,
        totalChargesPaid,
        activeFacilitiesCount,
        totalFacilitiesCount: facilities.length,
      },
      portfolioBreakdown,
      dailyFinancingSummary: {
        activeDailyFacilitiesCount: dailyFinancingActiveCount,
        dailyTargetDue: dailyFinancingDailyDue,
        collectedToday: toNum(todayCollectionsRes[0]?.totalCollectedToday),
        todayPaymentsCount: parseInt(todayCollectionsRes[0]?.countCollectedToday || "0", 10),
      },
      recentRepayments: repayments.map((r) => ({
        ...r.repayment,
        facilityName: r.facilityName || "Unknown Facility",
        category: r.category || "General",
      })),
      recentCashFlow: cashFlow.slice(-10).reverse(),
    });
  })

  // -------------------------------------------------------------------------
  // 2. Borrowing Facilities Master Endpoints
  // -------------------------------------------------------------------------
  .get("/capital/facilities", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const category = c.req.query("category");
    const status = c.req.query("status");
    const frequency = c.req.query("frequency");
    const search = c.req.query("search");

    const conditions = [];

    if (category && category !== "all") {
      conditions.push(eq(capitalFacilities.category, category));
    }
    if (status && status !== "all") {
      conditions.push(eq(capitalFacilities.status, status));
    }
    if (frequency && frequency !== "all") {
      conditions.push(eq(capitalFacilities.repaymentFrequency, frequency));
    }
    if (search && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(capitalFacilities.name, q),
          ilike(capitalFacilities.lenderName, q),
          ilike(capitalFacilities.facilityCode, q)
        )
      );
    }

    const rows = await db
      .select({
        facility: capitalFacilities,
        bankAccountName: bankAccounts.accountName,
        bankName: bankAccounts.bankName,
      })
      .from(capitalFacilities)
      .leftJoin(bankAccounts, eq(capitalFacilities.bankAccountId, bankAccounts.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(capitalFacilities.createdAt))
      .execute();

    const todayStr = new Date().toISOString().slice(0, 10);
    return c.json(
      rows.map((r) => {
        const fac = r.facility;
        const hasMoratorium = fac.moratoriumType && fac.moratoriumType !== "none";
        const isInMoratorium = hasMoratorium && Boolean(fac.repaymentStartDate && fac.repaymentStartDate > todayStr);
        return {
          ...fac,
          bankAccountName: r.bankAccountName,
          bankName: r.bankName,
          isInMoratorium: Boolean(isInMoratorium),
        };
      })
    );
  })

  .get("/capital/facilities/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid facility ID" }, 400);

    const [row] = await db
      .select({
        facility: capitalFacilities,
        bankAccountName: bankAccounts.accountName,
        bankName: bankAccounts.bankName,
        accountNumber: bankAccounts.accountNumber,
      })
      .from(capitalFacilities)
      .leftJoin(bankAccounts, eq(capitalFacilities.bankAccountId, bankAccounts.id))
      .where(eq(capitalFacilities.id, id))
      .limit(1)
      .execute();

    if (!row) {
      return c.json({ error: "Facility not found" }, 404);
    }

    // Query parameters for repayments filtering, sorting, and pagination
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const paymentMethod = c.req.query("paymentMethod");
    const paymentType = c.req.query("paymentType");
    const search = c.req.query("search");
    const pageParam = c.req.query("page");
    const pageSizeParam = c.req.query("pageSize");
    const sortBy = c.req.query("sortBy") || "paymentDate";
    const sortOrder = c.req.query("sortOrder") === "asc" ? "asc" : "desc";

    const conditions = [eq(capitalRepayments.facilityId, id)];
    if (startDate) conditions.push(gte(capitalRepayments.paymentDate, startDate));
    if (endDate) conditions.push(lte(capitalRepayments.paymentDate, endDate));
    if (paymentMethod && paymentMethod !== "all") conditions.push(eq(capitalRepayments.paymentMethod, paymentMethod));
    if (paymentType && paymentType !== "all") conditions.push(eq(capitalRepayments.paymentType, paymentType));
    if (search && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(capitalRepayments.referenceNumber, q),
          ilike(capitalRepayments.paymentCode, q)
        )
      );
    }

    // Fetch repayments for this facility
    const repayments = await db
      .select()
      .from(capitalRepayments)
      .where(and(...conditions))
      .execute();

    // Sort repayments
    repayments.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "paymentCode":
          cmp = (a.paymentCode || "").localeCompare(b.paymentCode || "");
          break;
        case "paymentMethod":
          cmp = (a.paymentMethod || "").localeCompare(b.paymentMethod || "");
          break;
        case "paymentType":
          cmp = (a.paymentType || "").localeCompare(b.paymentType || "");
          break;
        case "referenceNumber":
          cmp = (a.referenceNumber || "").localeCompare(b.referenceNumber || "");
          break;
        case "principalPaid":
          cmp = toNum(a.principalPaid) - toNum(b.principalPaid);
          break;
        case "interestPaid":
          cmp = toNum(a.interestPaid) - toNum(b.interestPaid);
          break;
        case "chargesPaid":
          cmp = toNum(a.chargesPaid) - toNum(b.chargesPaid);
          break;
        case "totalAmount":
          cmp = toNum(a.totalAmount) - toNum(b.totalAmount);
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
        case "paymentDate":
        default:
          cmp = (a.paymentDate || "").localeCompare(b.paymentDate || "");
          if (cmp === 0) cmp = (a.id || 0) - (b.id || 0);
          break;
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    const totalRecords = repayments.length;
    let paginatedRepayments = repayments;
    let pagination = {
      page: 1,
      pageSize: totalRecords,
      totalRecords,
      totalPages: 1,
    };

    if (pageParam !== undefined || pageSizeParam !== undefined) {
      const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
      const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam || "20", 10) || 20));
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const validPage = Math.min(page, totalPages);
      const offset = (validPage - 1) * pageSize;
      paginatedRepayments = repayments.slice(offset, offset + pageSize);
      pagination = {
        page: validPage,
        pageSize,
        totalRecords,
        totalPages,
      };
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const hasMoratorium = row.facility.moratoriumType && row.facility.moratoriumType !== "none";
    const isInMoratorium = hasMoratorium && Boolean(row.facility.repaymentStartDate && row.facility.repaymentStartDate > todayStr);

    return c.json({
      ...row.facility,
      bankAccountName: row.bankAccountName,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      repayments: paginatedRepayments,
      allRepayments: repayments,
      repaymentsPagination: pagination,
      isInMoratorium: Boolean(isInMoratorium),
    });
  })

  .post("/capital/facilities", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.json();
    const input = facilityInputSchema.parse(body);

    const disbursed = input.disbursedAmount ?? input.sanctionedAmount;

    // Generate unique facility code if not provided
    let facilityCode = input.facilityCode?.trim();
    if (!facilityCode) {
      const [countRes] = await db
        .select({ count: sql<string>`COUNT(*)` })
        .from(capitalFacilities)
        .execute();
      const nextNum = (parseInt(countRes?.count || "0", 10) + 1).toString().padStart(3, "0");
      facilityCode = `CAP-FAC-${nextNum}`;
    }

    const [newFacility] = await db
      .insert(capitalFacilities)
      .values({
        facilityCode,
        name: input.name,
        lenderName: input.lenderName,
        category: input.category,
        facilityType: input.facilityType || "Term Loan",
        sanctionedAmount: input.sanctionedAmount.toString(),
        disbursedAmount: disbursed.toString(),
        interestRate: input.interestRate.toString(),
        interestType: input.interestType,
        tenorMonths: input.tenorMonths.toString(),
        repaymentFrequency: input.repaymentFrequency,
        installmentAmount: input.installmentAmount.toString(),
        outstandingBalance: disbursed.toString(),
        totalPrincipalPaid: "0",
        totalInterestPaid: "0",
        totalChargesPaid: "0",
        sanctionDate: input.sanctionDate || null,
        disbursementDate: input.disbursementDate || null,
        maturityDate: input.maturityDate || null,
        moratoriumMonths: (input.moratoriumMonths ?? 0).toString(),
        moratoriumType: input.moratoriumType || "none",
        repaymentStartDate: input.repaymentStartDate || null,
        bankAccountId: input.bankAccountId || null,
        collateralSecurity: input.collateralSecurity || null,
        status: input.status,
        notes: input.notes || null,
      })
      .returning()
      .execute();

    // Optionally post disbursement inflow to cash flow ledger
    if (input.postToCashFlow && disbursed > 0) {
      const yearStr = new Date().getFullYear().toString();
      const [cfCount] = await db
        .select({ count: sql<string>`COUNT(*)` })
        .from(capitalCashFlowEntries)
        .execute();
      const cfNum = (parseInt(cfCount?.count || "0", 10) + 1).toString().padStart(4, "0");
      const entryCode = `CF-${yearStr}-${cfNum}`;

      await db
        .insert(capitalCashFlowEntries)
        .values({
          entryCode,
          entryDate: input.disbursementDate || new Date().toISOString().slice(0, 10),
          transactionType: "debt_inflow",
          category: `${input.category} Disbursement`,
          partyName: input.lenderName,
          description: `Disbursement receipt for ${input.name}`,
          inflowAmount: disbursed.toString(),
          outflowAmount: "0",
          netAmount: disbursed.toString(),
          bankAccountId: input.bankAccountId || null,
          referenceNumber: facilityCode,
          facilityId: newFacility.id,
        })
        .execute();
    }

    return c.json(newFacility, 201);
  })

  .put("/capital/facilities/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid facility ID" }, 400);

    const body = await c.req.json();
    const updateData: Record<string, any> = {};

    if (body.facilityCode !== undefined) updateData.facilityCode = body.facilityCode;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.lenderName !== undefined) updateData.lenderName = body.lenderName;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.facilityType !== undefined) updateData.facilityType = body.facilityType;
    if (body.sanctionedAmount !== undefined) updateData.sanctionedAmount = body.sanctionedAmount.toString();
    if (body.disbursedAmount !== undefined) updateData.disbursedAmount = body.disbursedAmount.toString();
    if (body.outstandingBalance !== undefined) updateData.outstandingBalance = body.outstandingBalance.toString();
    if (body.interestRate !== undefined) updateData.interestRate = body.interestRate.toString();
    if (body.interestType !== undefined) updateData.interestType = body.interestType;
    if (body.tenorMonths !== undefined) updateData.tenorMonths = body.tenorMonths.toString();
    if (body.repaymentFrequency !== undefined) updateData.repaymentFrequency = body.repaymentFrequency;
    if (body.installmentAmount !== undefined) updateData.installmentAmount = body.installmentAmount.toString();
    if (body.sanctionDate !== undefined) updateData.sanctionDate = body.sanctionDate || null;
    if (body.disbursementDate !== undefined) updateData.disbursementDate = body.disbursementDate || null;
    if (body.maturityDate !== undefined) updateData.maturityDate = body.maturityDate || null;
    if (body.moratoriumMonths !== undefined) updateData.moratoriumMonths = (body.moratoriumMonths ?? 0).toString();
    if (body.moratoriumType !== undefined) updateData.moratoriumType = body.moratoriumType || "none";
    if (body.repaymentStartDate !== undefined) updateData.repaymentStartDate = body.repaymentStartDate || null;
    if (body.bankAccountId !== undefined) updateData.bankAccountId = body.bankAccountId || null;
    if (body.collateralSecurity !== undefined) updateData.collateralSecurity = body.collateralSecurity || null;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const [updated] = await db
      .update(capitalFacilities)
      .set(updateData)
      .where(eq(capitalFacilities.id, id))
      .returning()
      .execute();

    if (!updated) {
      return c.json({ error: "Facility not found" }, 404);
    }

    return c.json(updated);
  })

  .delete("/capital/facilities/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid facility ID" }, 400);

    const [deleted] = await db
      .delete(capitalFacilities)
      .where(eq(capitalFacilities.id, id))
      .returning()
      .execute();

    if (!deleted) {
      return c.json({ error: "Facility not found" }, 404);
    }

    return c.json({ message: "Facility deleted successfully", id });
  })

  // -------------------------------------------------------------------------
  // 3. Debt Repayment Ledger Endpoints
  // -------------------------------------------------------------------------
  .get("/capital/repayments", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const facilityId = c.req.query("facilityId");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const paymentMethod = c.req.query("paymentMethod");
    const paymentType = c.req.query("paymentType");
    const search = c.req.query("search");
    const pageParam = c.req.query("page");
    const pageSizeParam = c.req.query("pageSize");
    const sortBy = c.req.query("sortBy") || "paymentDate";
    const sortOrder = c.req.query("sortOrder") === "asc" ? "asc" : "desc";

    const conditions = [];

    if (facilityId && facilityId !== "all") {
      const fid = parseInt(facilityId, 10);
      if (!isNaN(fid)) conditions.push(eq(capitalRepayments.facilityId, fid));
    }
    if (startDate) {
      conditions.push(gte(capitalRepayments.paymentDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(capitalRepayments.paymentDate, endDate));
    }
    if (paymentMethod && paymentMethod !== "all") {
      conditions.push(eq(capitalRepayments.paymentMethod, paymentMethod));
    }
    if (paymentType && paymentType !== "all") {
      conditions.push(eq(capitalRepayments.paymentType, paymentType));
    }
    if (search && search.trim().length > 0) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(capitalRepayments.referenceNumber, q),
          ilike(capitalRepayments.paymentCode, q),
          ilike(capitalFacilities.name, q)
        )
      );
    }

    const rows = await db
      .select({
        repayment: capitalRepayments,
        facilityName: capitalFacilities.name,
        facilityCategory: capitalFacilities.category,
        lenderName: capitalFacilities.lenderName,
        bankAccountName: bankAccounts.accountName,
      })
      .from(capitalRepayments)
      .innerJoin(capitalFacilities, eq(capitalRepayments.facilityId, capitalFacilities.id))
      .leftJoin(bankAccounts, eq(capitalRepayments.bankAccountId, bankAccounts.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .execute();

    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalCharges = 0;
    let totalPaid = 0;

    const mapped = rows.map((r) => {
      totalPrincipal += toNum(r.repayment.principalPaid);
      totalInterest += toNum(r.repayment.interestPaid);
      totalCharges += toNum(r.repayment.chargesPaid);
      totalPaid += toNum(r.repayment.totalAmount);

      return {
        ...r.repayment,
        facilityName: r.facilityName,
        facilityCategory: r.facilityCategory,
        lenderName: r.lenderName,
        bankAccountName: r.bankAccountName,
      };
    });

    // Sorting
    mapped.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "paymentCode":
          cmp = (a.paymentCode || "").localeCompare(b.paymentCode || "");
          break;
        case "facilityName":
          cmp = (a.facilityName || "").localeCompare(b.facilityName || "");
          break;
        case "facilityCategory":
          cmp = (a.facilityCategory || "").localeCompare(b.facilityCategory || "");
          break;
        case "paymentMethod":
          cmp = (a.paymentMethod || "").localeCompare(b.paymentMethod || "");
          break;
        case "paymentType":
          cmp = (a.paymentType || "").localeCompare(b.paymentType || "");
          break;
        case "referenceNumber":
          cmp = (a.referenceNumber || "").localeCompare(b.referenceNumber || "");
          break;
        case "principalPaid":
          cmp = toNum(a.principalPaid) - toNum(b.principalPaid);
          break;
        case "interestPaid":
          cmp = toNum(a.interestPaid) - toNum(b.interestPaid);
          break;
        case "chargesPaid":
          cmp = toNum(a.chargesPaid) - toNum(b.chargesPaid);
          break;
        case "totalAmount":
          cmp = toNum(a.totalAmount) - toNum(b.totalAmount);
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "");
          break;
        case "paymentDate":
        default:
          cmp = (a.paymentDate || "").localeCompare(b.paymentDate || "");
          if (cmp === 0) cmp = (a.id || 0) - (b.id || 0);
          break;
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    const totalRecords = mapped.length;

    // Handle pagination
    if (pageParam !== undefined || pageSizeParam !== undefined) {
      const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
      const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam || "20", 10) || 20));
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const validPage = Math.min(page, totalPages);
      const offset = (validPage - 1) * pageSize;
      const paginatedData = mapped.slice(offset, offset + pageSize);

      return c.json({
        data: paginatedData,
        pagination: {
          page: validPage,
          pageSize,
          totalRecords,
          totalPages,
        },
        summary: {
          totalPaid,
          totalPrincipal,
          totalInterest,
          totalCharges,
          count: totalRecords,
        },
      });
    }

    return c.json({
      data: mapped,
      pagination: {
        page: 1,
        pageSize: totalRecords,
        totalRecords,
        totalPages: 1,
      },
      summary: {
        totalPaid,
        totalPrincipal,
        totalInterest,
        totalCharges,
        count: totalRecords,
      },
    });
  })

  .post("/capital/repayments", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const session = c.get("session") as any;
    const userId = session?.user?.id;

    const body = await c.req.json();
    const input = repaymentInputSchema.parse(body);

    const [facility] = await db
      .select()
      .from(capitalFacilities)
      .where(eq(capitalFacilities.id, input.facilityId))
      .limit(1)
      .execute();

    if (!facility) {
      return c.json({ error: "Facility not found" }, 404);
    }

    const disbursalDate = facility.disbursementDate || facility.sanctionDate;
    if (disbursalDate && input.paymentDate < disbursalDate) {
      return c.json(
        {
          error: `Payment date (${input.paymentDate}) cannot be earlier than facility disbursal date (${disbursalDate})`,
        },
        400
      );
    }

    const totalAmount = input.totalAmount ?? (input.principalPaid + input.interestPaid + input.chargesPaid);

    // Generate unique repayment code
    const yearStr = new Date().getFullYear().toString();
    const [countRes] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(capitalRepayments)
      .execute();
    const nextNum = (parseInt(countRes?.count || "0", 10) + 1).toString().padStart(4, "0");
    const paymentCode = `CAP-PAY-${yearStr}-${nextNum}`;

    // Atomic transaction: record repayment and update facility balance
    const result = await db.transaction(async (tx) => {
      const [newRepayment] = await tx
        .insert(capitalRepayments)
        .values({
          paymentCode,
          facilityId: input.facilityId,
          paymentDate: input.paymentDate,
          paymentType: input.paymentType,
          principalPaid: input.principalPaid.toString(),
          interestPaid: input.interestPaid.toString(),
          chargesPaid: input.chargesPaid.toString(),
          totalAmount: totalAmount.toString(),
          paymentMethod: input.paymentMethod,
          bankAccountId: input.bankAccountId || facility.bankAccountId || null,
          referenceNumber: input.referenceNumber || null,
          status: input.status,
          notes: input.notes || null,
          createdBy: userId || null,
        })
        .returning()
        .execute();

      // Update facility balance if payment is completed
      if (input.status === "completed") {
        const currentOutstanding = toNum(facility.outstandingBalance);
        const currentPrincipalPaid = toNum(facility.totalPrincipalPaid);
        const currentInterestPaid = toNum(facility.totalInterestPaid);
        const currentChargesPaid = toNum(facility.totalChargesPaid);

        const newOutstanding = Math.max(0, currentOutstanding - input.principalPaid);
        const newPrincipalPaid = currentPrincipalPaid + input.principalPaid;
        const newInterestPaid = currentInterestPaid + input.interestPaid;
        const newChargesPaid = currentChargesPaid + input.chargesPaid;

        const isFullySettled = newOutstanding === 0 && facility.category !== "Credit Card";

        let newInstallment = toNum(facility.installmentAmount);
        if (isFullySettled) {
          newInstallment = 0;
        } else if (facility.interestType === "interest_only") {
          const rate = toNum(facility.interestRate);
          const freq = facility.repaymentFrequency || "monthly";
          const periodsPerYear = freq === "quarterly" ? 4 : freq === "weekly" ? 52 : freq === "daily" ? 365 : 12;
          newInstallment = Math.round((newOutstanding * (rate / 100)) / periodsPerYear);
        } else if (facility.repaymentFrequency === "daily" || facility.category === "Daily Collection Financing") {
          if (newInstallment > 0 && newOutstanding < newInstallment) {
            newInstallment = newOutstanding;
          }
        }

        await tx
          .update(capitalFacilities)
          .set({
            outstandingBalance: newOutstanding.toString(),
            totalPrincipalPaid: newPrincipalPaid.toString(),
            totalInterestPaid: newInterestPaid.toString(),
            totalChargesPaid: newChargesPaid.toString(),
            installmentAmount: newInstallment.toString(),
            status: isFullySettled ? "closed" : facility.status,
          })
          .where(eq(capitalFacilities.id, input.facilityId))
          .execute();

        // Optionally post to Cash Flow ledger
        if (input.postToCashFlow && totalAmount > 0) {
          const [cfCount] = await tx
            .select({ count: sql<string>`COUNT(*)` })
            .from(capitalCashFlowEntries)
            .execute();
          const cfNum = (parseInt(cfCount?.count || "0", 10) + 1).toString().padStart(4, "0");
          const entryCode = `CF-${yearStr}-${cfNum}`;

          await tx
            .insert(capitalCashFlowEntries)
            .values({
              entryCode,
              entryDate: input.paymentDate,
              transactionType: "debt_servicing",
              category: `${facility.category} Repayment`,
              partyName: facility.lenderName,
              description: `Repayment for ${facility.name} (Ref: ${input.referenceNumber || paymentCode})`,
              inflowAmount: "0",
              outflowAmount: totalAmount.toString(),
              netAmount: (-totalAmount).toString(),
              bankAccountId: input.bankAccountId || facility.bankAccountId || null,
              referenceNumber: input.referenceNumber || paymentCode,
              facilityId: facility.id,
              repaymentId: newRepayment.id,
              createdBy: userId || null,
            })
            .execute();
        }
      }

      return newRepayment;
    });

    return c.json(result, 201);
  })

  .post("/capital/repayments/bulk-daily", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const session = c.get("session") as any;
    const userId = session?.user?.id;

    const body = await c.req.json();
    const input = bulkDailyRepaymentSchema.parse(body);

    const yearStr = new Date().getFullYear().toString();

    const createdRepayments = await db.transaction(async (tx) => {
      const records = [];

      for (let i = 0; i < input.items.length; i++) {
        const item = input.items[i];

        const [facility] = await tx
          .select()
          .from(capitalFacilities)
          .where(eq(capitalFacilities.id, item.facilityId))
          .limit(1)
          .execute();

        if (!facility) continue;

        const disbursalDate = facility.disbursementDate || facility.sanctionDate;
        if (disbursalDate && input.paymentDate < disbursalDate) {
          throw new Error(
            `Payment date (${input.paymentDate}) cannot be earlier than disbursal date (${disbursalDate}) for "${facility.name}"`
          );
        }

        const [countRes] = await tx
          .select({ count: sql<string>`COUNT(*)` })
          .from(capitalRepayments)
          .execute();
        const nextNum = (parseInt(countRes?.count || "0", 10) + 1).toString().padStart(4, "0");
        const paymentCode = `CAP-PAY-${yearStr}-${nextNum}`;

        const [repay] = await tx
          .insert(capitalRepayments)
          .values({
            paymentCode,
            facilityId: item.facilityId,
            paymentDate: input.paymentDate,
            paymentType: "daily_collection",
            principalPaid: item.principalPaid.toString(),
            interestPaid: item.interestPaid.toString(),
            chargesPaid: item.chargesPaid.toString(),
            totalAmount: item.totalAmount.toString(),
            paymentMethod: input.paymentMethod,
            bankAccountId: input.bankAccountId || facility.bankAccountId || null,
            referenceNumber: input.referenceNumber || null,
            status: "completed",
            notes: item.notes || `Daily collection entry for ${input.paymentDate}`,
            createdBy: userId || null,
          })
          .returning()
          .execute();

        // Update Facility Balance
        const currentOutstanding = toNum(facility.outstandingBalance);
        const currentPrincipal = toNum(facility.totalPrincipalPaid);
        const currentInterest = toNum(facility.totalInterestPaid);
        const currentCharges = toNum(facility.totalChargesPaid);

        const newOutstanding = Math.max(0, currentOutstanding - item.principalPaid);
        const isSettled = newOutstanding === 0;

        let newInstallment = toNum(facility.installmentAmount);
        if (isSettled) {
          newInstallment = 0;
        } else if (facility.interestType === "interest_only") {
          const rate = toNum(facility.interestRate);
          const freq = facility.repaymentFrequency || "monthly";
          const periodsPerYear = freq === "quarterly" ? 4 : freq === "weekly" ? 52 : freq === "daily" ? 365 : 12;
          newInstallment = Math.round((newOutstanding * (rate / 100)) / periodsPerYear);
        } else if (newInstallment > 0 && newOutstanding < newInstallment) {
          newInstallment = newOutstanding;
        }

        await tx
          .update(capitalFacilities)
          .set({
            outstandingBalance: newOutstanding.toString(),
            totalPrincipalPaid: (currentPrincipal + item.principalPaid).toString(),
            totalInterestPaid: (currentInterest + item.interestPaid).toString(),
            totalChargesPaid: (currentCharges + item.chargesPaid).toString(),
            installmentAmount: newInstallment.toString(),
            status: isSettled ? "closed" : facility.status,
          })
          .where(eq(capitalFacilities.id, item.facilityId))
          .execute();

        records.push(repay);
      }

      return records;
    });

    return c.json({
      message: `Successfully logged ${createdRepayments.length} daily collection records`,
      data: createdRepayments,
    }, 201);
  })

  .delete("/capital/repayments/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid payment ID" }, 400);

    const [repayment] = await db
      .select()
      .from(capitalRepayments)
      .where(eq(capitalRepayments.id, id))
      .limit(1)
      .execute();

    if (!repayment) {
      return c.json({ error: "Repayment record not found" }, 404);
    }

    // Atomic rollback
    await db.transaction(async (tx) => {
      // Revert facility balances if the payment was completed
      if (repayment.status === "completed") {
        const [facility] = await tx
          .select()
          .from(capitalFacilities)
          .where(eq(capitalFacilities.id, repayment.facilityId))
          .limit(1)
          .execute();

        if (facility) {
          const principalReverted = toNum(repayment.principalPaid);
          const interestReverted = toNum(repayment.interestPaid);
          const chargesReverted = toNum(repayment.chargesPaid);

          const currentOutstanding = toNum(facility.outstandingBalance);
          const currentPrincipal = toNum(facility.totalPrincipalPaid);
          const currentInterest = toNum(facility.totalInterestPaid);
          const currentCharges = toNum(facility.totalChargesPaid);

          const newOutstanding = currentOutstanding + principalReverted;
          let newInstallment = toNum(facility.installmentAmount);
          if (facility.interestType === "interest_only") {
            const rate = toNum(facility.interestRate);
            const freq = facility.repaymentFrequency || "monthly";
            const periodsPerYear = freq === "quarterly" ? 4 : freq === "weekly" ? 52 : freq === "daily" ? 365 : 12;
            newInstallment = Math.round((newOutstanding * (rate / 100)) / periodsPerYear);
          }

          await tx
            .update(capitalFacilities)
            .set({
              outstandingBalance: newOutstanding.toString(),
              totalPrincipalPaid: Math.max(0, currentPrincipal - principalReverted).toString(),
              totalInterestPaid: Math.max(0, currentInterest - interestReverted).toString(),
              totalChargesPaid: Math.max(0, currentCharges - chargesReverted).toString(),
              installmentAmount: newInstallment.toString(),
              status: "active",
            })
            .where(eq(capitalFacilities.id, facility.id))
            .execute();
        }
      }

      // Delete linked cash flow entry
      await tx
        .delete(capitalCashFlowEntries)
        .where(eq(capitalCashFlowEntries.repaymentId, id))
        .execute();

      // Delete the repayment record
      await tx
        .delete(capitalRepayments)
        .where(eq(capitalRepayments.id, id))
        .execute();
    });

    return c.json({ message: "Repayment successfully deleted and balance rolled back", id });
  })

  // -------------------------------------------------------------------------
  // 4. Dedicated Daily Collection Hub
  // -------------------------------------------------------------------------
  .get("/capital/daily-collections", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Fetch daily collection facilities
    const dailyFacilities = await db
      .select()
      .from(capitalFacilities)
      .where(
        or(
          eq(capitalFacilities.repaymentFrequency, "daily"),
          eq(capitalFacilities.category, "Daily Collection Financing")
        )
      )
      .orderBy(asc(capitalFacilities.name))
      .execute();

    const todayStr = new Date().toISOString().slice(0, 10);

    // Fetch payments in last 30 days for these facilities
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const recentDailyPayments = await db
      .select({
        repayment: capitalRepayments,
        facilityName: capitalFacilities.name,
      })
      .from(capitalRepayments)
      .innerJoin(capitalFacilities, eq(capitalRepayments.facilityId, capitalFacilities.id))
      .where(
        and(
          gte(capitalRepayments.paymentDate, thirtyDaysAgo),
          or(
            eq(capitalFacilities.repaymentFrequency, "daily"),
            eq(capitalFacilities.category, "Daily Collection Financing")
          )
        )
      )
      .orderBy(desc(capitalRepayments.paymentDate), desc(capitalRepayments.id))
      .execute();

    // Map today's status per facility
    const facilitiesStatus = dailyFacilities.map((fac) => {
      const todayPayment = recentDailyPayments.find(
        (p) => p.repayment.facilityId === fac.id && p.repayment.paymentDate === todayStr
      );
      return {
        facility: fac,
        isCollectedToday: !!todayPayment,
        todayPayment: todayPayment?.repayment || null,
        expectedDailyAmount: toNum(fac.installmentAmount),
      };
    });

    const totalDailyTarget = facilitiesStatus.reduce(
      (sum, f) => (f.facility.status === "active" ? sum + f.expectedDailyAmount : sum),
      0
    );
    const totalCollectedToday = facilitiesStatus.reduce(
      (sum, f) => (f.todayPayment ? sum + toNum(f.todayPayment.totalAmount) : sum),
      0
    );

    return c.json({
      todayDate: todayStr,
      totalDailyTarget,
      totalCollectedToday,
      completionRate: totalDailyTarget > 0 ? Math.round((totalCollectedToday / totalDailyTarget) * 100) : 0,
      facilities: facilitiesStatus,
      recentHistory: recentDailyPayments.map((p) => ({
        ...p.repayment,
        facilityName: p.facilityName,
      })),
    });
  })

  // -------------------------------------------------------------------------
  // 5. Cash Flow & Capital Infusions Ledger
  // -------------------------------------------------------------------------
  .get("/capital/cash-flow", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const transactionType = c.req.query("transactionType");
    const category = c.req.query("category");
    const search = c.req.query("search");
    const pageParam = c.req.query("page");
    const pageSizeParam = c.req.query("pageSize");
    const sortBy = c.req.query("sortBy") || "entryDate";
    const sortOrder = c.req.query("sortOrder") === "asc" ? "asc" : "desc";

    const allEntries = await db
      .select({
        entry: capitalCashFlowEntries,
        bankAccountName: bankAccounts.accountName,
      })
      .from(capitalCashFlowEntries)
      .leftJoin(bankAccounts, eq(capitalCashFlowEntries.bankAccountId, bankAccounts.id))
      .orderBy(asc(capitalCashFlowEntries.entryDate), asc(capitalCashFlowEntries.id))
      .execute();

    // Compute cumulative running balance across all chronological entries
    let runningBal = 0;
    const computedEntries = allEntries.map((row) => {
      const inf = toNum(row.entry.inflowAmount);
      const outf = toNum(row.entry.outflowAmount);
      runningBal += inf - outf;
      return {
        ...row.entry,
        bankAccountName: row.bankAccountName,
        runningBalance: runningBal,
      };
    });

    // Apply filters
    let filtered = computedEntries;

    if (startDate) {
      filtered = filtered.filter((e) => e.entryDate >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((e) => e.entryDate <= endDate);
    }
    if (transactionType && transactionType !== "all") {
      filtered = filtered.filter((e) => e.transactionType === transactionType);
    }
    if (category && category !== "all") {
      filtered = filtered.filter((e) => e.category === category);
    }
    if (search && search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.entryCode?.toLowerCase().includes(q) ||
          e.partyName?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          e.referenceNumber?.toLowerCase().includes(q)
      );
    }

    // Totals for filtered view
    let totalInflow = 0;
    let totalOutflow = 0;
    for (const e of filtered) {
      totalInflow += toNum(e.inflowAmount);
      totalOutflow += toNum(e.outflowAmount);
    }

    // Sorting
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "entryCode":
          cmp = (a.entryCode || "").localeCompare(b.entryCode || "");
          break;
        case "transactionType":
          cmp = (a.transactionType || "").localeCompare(b.transactionType || "");
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "partyName":
          cmp = (a.partyName || a.description || "").localeCompare(b.partyName || b.description || "");
          break;
        case "inflowAmount":
          cmp = toNum(a.inflowAmount) - toNum(b.inflowAmount);
          break;
        case "outflowAmount":
          cmp = toNum(a.outflowAmount) - toNum(b.outflowAmount);
          break;
        case "netAmount":
          cmp = toNum(a.netAmount) - toNum(b.netAmount);
          break;
        case "runningBalance":
          cmp = (a.runningBalance || 0) - (b.runningBalance || 0);
          break;
        case "referenceNumber":
          cmp = (a.referenceNumber || "").localeCompare(b.referenceNumber || "");
          break;
        case "entryDate":
        default:
          cmp = (a.entryDate || "").localeCompare(b.entryDate || "");
          if (cmp === 0) cmp = (a.id || 0) - (b.id || 0);
          break;
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    const totalRecords = filtered.length;

    // Handle pagination
    if (pageParam !== undefined || pageSizeParam !== undefined) {
      const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
      const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam || "20", 10) || 20));
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const validPage = Math.min(page, totalPages);
      const offset = (validPage - 1) * pageSize;
      const paginatedData = filtered.slice(offset, offset + pageSize);

      return c.json({
        data: paginatedData,
        pagination: {
          page: validPage,
          pageSize,
          totalRecords,
          totalPages,
        },
        summary: {
          totalInflow,
          totalOutflow,
          netCashFlow: totalInflow - totalOutflow,
          latestRunningBalance: runningBal,
          totalRecords,
        },
      });
    }

    // Default backward compatible unpaginated response
    return c.json({
      data: filtered,
      pagination: {
        page: 1,
        pageSize: totalRecords,
        totalRecords,
        totalPages: 1,
      },
      summary: {
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
        latestRunningBalance: runningBal,
        totalRecords,
      },
    });
  })

  .post("/capital/cash-flow", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const session = c.get("session") as any;
    const userId = session?.user?.id;

    const body = await c.req.json();
    const input = cashFlowInputSchema.parse(body);

    const yearStr = new Date().getFullYear().toString();
    const [countRes] = await db
      .select({ count: sql<string>`COUNT(*)` })
      .from(capitalCashFlowEntries)
      .execute();
    const nextNum = (parseInt(countRes?.count || "0", 10) + 1).toString().padStart(4, "0");
    const entryCode = `CF-${yearStr}-${nextNum}`;

    const netAmount = input.inflowAmount - input.outflowAmount;

    const [newEntry] = await db
      .insert(capitalCashFlowEntries)
      .values({
        entryCode,
        entryDate: input.entryDate,
        transactionType: input.transactionType,
        category: input.category,
        partyName: input.partyName || null,
        description: input.description || null,
        inflowAmount: input.inflowAmount.toString(),
        outflowAmount: input.outflowAmount.toString(),
        netAmount: netAmount.toString(),
        bankAccountId: input.bankAccountId || null,
        referenceNumber: input.referenceNumber || null,
        createdBy: userId || null,
      })
      .returning()
      .execute();

    return c.json(newEntry, 201);
  })

  .delete("/capital/cash-flow/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) return c.json({ error: "Invalid cash flow entry ID" }, 400);

    const [deleted] = await db
      .delete(capitalCashFlowEntries)
      .where(eq(capitalCashFlowEntries.id, id))
      .returning()
      .execute();

    if (!deleted) {
      return c.json({ error: "Cash flow entry not found" }, 404);
    }

    return c.json({ message: "Cash flow entry deleted successfully", id });
  });
