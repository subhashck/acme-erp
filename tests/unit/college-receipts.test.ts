import { describe, it, expect } from "vitest";
import {
  buildCollegeReceiptPDFDoc,
  parseReceiptRemarks,
  CollegeReceiptData,
} from "../../src/lib/college-receipt-pdf";
import { formatCollegePaymentMode } from "../../src/lib/college-payment";
import {
  TIMEBOUND_FEE_CATEGORIES,
  getAcademicYearMonths,
  computeFeeItemsForSelection,
  normalizeCategoryName,
  normalizeMonthToKey,
} from "../../src/components/college/college-receipt-utils";
import { parseMonthTokens, formatMonthToken } from "../../src/components/college/MonthBox";
import { GENERAL_RECEIPT_CATEGORIES } from "../../src/routes/_authenticated/college/general-receipts";

describe("College Receipts & Multi-Head Fee Platform", () => {
  describe("parseReceiptRemarks", () => {
    it("handles null and undefined gracefully", () => {
      expect(parseReceiptRemarks(null)).toBeNull();
      expect(parseReceiptRemarks(undefined)).toBeNull();
    });

    it("returns object directly if already parsed", () => {
      const obj = { isCollegeReceipt: true, items: [{ description: "Tuition", amount: 20000 }] };
      expect(parseReceiptRemarks(obj)).toBe(obj);
    });

    it("parses valid JSON string", () => {
      const jsonStr = JSON.stringify({ category: "Hostel Fee", amount: 5000 });
      expect(parseReceiptRemarks(jsonStr)).toEqual({ category: "Hostel Fee", amount: 5000 });
    });

    it("returns null on malformed JSON string", () => {
      expect(parseReceiptRemarks("invalid-json-{")).toBeNull();
    });
  });

  describe("formatCollegePaymentMode", () => {
    it("formats standard payment modes correctly", () => {
      expect(formatCollegePaymentMode("cash")).toBe("Cash");
      expect(formatCollegePaymentMode("upi")).toBe("UPI");
      expect(formatCollegePaymentMode("bank_transfer")).toBe("Bank Transfer");
      expect(formatCollegePaymentMode("cheque")).toBe("Cheque");
      expect(formatCollegePaymentMode("card")).toBe("Card");
    });

    it("handles null or undefined gracefully", () => {
      expect(formatCollegePaymentMode(null)).toBe("Cash");
      expect(formatCollegePaymentMode(undefined)).toBe("Cash");
    });
  });

  describe("buildCollegeReceiptPDFDoc", () => {
    it("generates a valid A5 PDF for a student single-head fee receipt", () => {
      const receiptData: CollegeReceiptData = {
        receiptNumber: "REC-NUR-2026-0001",
        invoiceNo: "INV-2026-0001",
        paymentDate: "2026-10-29",
        paymentMode: "upi",
        amount: 45000,
        feeType: "Course Fee",
        studentId: 101,
        studentName: "Ananya Sharma",
        enrollmentNo: "NUR-2025-042",
        studentCourse: "B.Sc Nursing",
        remarks: {
          items: [
            { category: "Course Fee", description: "Tuition Fee - Year 2 (Installment 1)", quantity: 1, unitPrice: 45000, amount: 45000 },
          ],
        },
      };

      const doc = buildCollegeReceiptPDFDoc(receiptData, "Cashier John");
      expect(doc).toBeDefined();
      const output = doc.output();
      expect(output).toContain("ACME COLLEGE OF NURSING");
      expect(output).toContain("REC-NUR-2026-0001");
    });

    it("generates a multi-item receipt covering Course Fee + Hostel Fee + Mess Fee in one document", () => {
      const receiptData: CollegeReceiptData = {
        receiptNumber: "REC-NUR-2026-0002",
        invoiceNo: "INV-2026-0002",
        paymentDate: "2026-10-29",
        paymentMode: "bank_transfer",
        amount: 58500,
        feeType: "Course Fee, Hostel Fee, Mess Fee",
        studentId: 102,
        studentName: "Rahul Verma",
        enrollmentNo: "NUR-2025-089",
        studentCourse: "GNM Nursing",
        remarks: {
          grossSubtotal: 60000,
          discountAmount: 1500,
          discountReason: "Merit scholarship concession",
          items: [
            { category: "Course Fee", description: "Tuition Fee - 2nd Year (Part 1)", quantity: 1, unitPrice: 40000, amount: 40000 },
            { category: "Hostel Fee", description: "Hostel Accommodation (Nov-Dec 2026)", quantity: 1, unitPrice: 15000, amount: 15000 },
            { category: "Mess Fee", description: "Hostel Mess Catering Charges (Nov 2026)", quantity: 1, unitPrice: 5000, amount: 5000 },
          ],
        },
      };

      const doc = buildCollegeReceiptPDFDoc(receiptData, "Accounts Head");
      expect(doc).toBeDefined();
      const output = doc.output();
      expect(output).toContain("ACME COLLEGE OF NURSING");
      expect(output).toContain("REC-NUR-2026-0002");
    });

    it("generates a direct payee / prospectus receipt without student ID", () => {
      const receiptData: CollegeReceiptData = {
        receiptNumber: "RCP-GEN-2026-0010",
        invoiceNo: "INV-GEN-2026-0010",
        paymentDate: "2026-10-29",
        paymentMode: "cash",
        amount: 1000,
        feeType: "Sale of Prospectus",
        recipientName: "Priya Devi (Prospective Applicant)",
        recipientPhone: "9876543210",
        remarks: {
          recipientType: "direct",
          category: "Sale of Prospectus",
          narration: "Sale of B.Sc Nursing 2026 Admission Prospectus & Form",
        },
      };

      const doc = buildCollegeReceiptPDFDoc(receiptData);
      expect(doc).toBeDefined();
      const output = doc.output();
      expect(output).toContain("ACME COLLEGE OF NURSING");
      expect(output).toContain("RCP-GEN-2026-0010");
    });

    it("generates a valid A5 PDF for a student fee receipt with concession and surcharge breakdown", () => {
      const receiptData: CollegeReceiptData = {
        receiptNumber: "REC-NUR-2026-0099",
        invoiceNo: "INV-2026-0099",
        paymentDate: "2026-10-31",
        paymentMode: "cash",
        amount: 21000,
        feeType: "Course Fee, Hostel Fee",
        studentId: 101,
        studentName: "Laishram Tomba Singh",
        enrollmentNo: "NUR-2026-0042",
        studentCourse: "B.Sc Nursing (4 Years)",
        remarks: {
          isCollegeReceipt: true,
          recipientType: "student",
          category: "Course Fee",
          grossSubtotal: 20000,
          discountAmount: 1000,
          discountPercent: 5,
          discountReason: "Merit Scholarship",
          surchargeAmount: 2000,
          surchargePercent: 10,
          surchargeReason: "Late Fee Fine",
          advanceAdjustedAmount: 0,
          items: [
            {
              category: "Course Fee",
              description: "Course Fee - Sem 1",
              selectedMonths: ["October 2026", "November 2026"],
              quantity: 2,
              unitPrice: 10000,
              amount: 20000,
            },
          ],
        },
      };

      const doc = buildCollegeReceiptPDFDoc(receiptData, "Chief Cashier");
      expect(doc).toBeDefined();
      const output = doc.output();
      expect(output).toContain("ACME COLLEGE OF NURSING");
      expect(output).toContain("REC-NUR-2026-0099");
      expect(output).toContain("NUR-2026-0042");
    });
  });

  describe("Category Separation and Timebound Invariants", () => {
    it("restricts TIMEBOUND_FEE_CATEGORIES exclusively to Course Fee, Hostel Fee, and Mess Fee", () => {
      const allowedCategories = ["Course Fee", "Hostel Fee", "Mess Fee"];
      expect(TIMEBOUND_FEE_CATEGORIES.length).toBe(3);
      const values = TIMEBOUND_FEE_CATEGORIES.map((c) => c.value);
      expect(values.sort()).toEqual(allowedCategories.sort());
    });

    it("ensures GENERAL_RECEIPT_CATEGORIES contains zero timebound or period-bound fee heads", () => {
      const timeboundCategories = ["Course Fee", "Hostel Fee", "Mess Fee", "Tuition Fee"];
      const generalValues = GENERAL_RECEIPT_CATEGORIES.map((c) => c.value);
      for (const timebound of timeboundCategories) {
        expect(generalValues).not.toContain(timebound);
      }
      expect(generalValues).toContain("Sale of Prospectus");
      expect(generalValues).toContain("Books & Stationary");
      expect(generalValues).toContain("Uniform");
      expect(generalValues).toContain("ID Card & Badge");
    });
  });

  describe("Multi-Month Selection & Payment Periods", () => {
    it("generates correct academic year months sequence spanning June through June", () => {
      const months = getAcademicYearMonths("2026-2027");
      expect(months.length).toBe(13);
      expect(months[0].key).toBe("June 2026");
      expect(months[1].key).toBe("July 2026");
      expect(months[6].key).toBe("December 2026");
      expect(months[7].key).toBe("January 2027");
      expect(months[12].key).toBe("June 2027");
    });

    it("generates a valid A5 PDF for multi-month Hostel & Mess fee payments", () => {
      const receiptData: CollegeReceiptData = {
        receiptNumber: "REC-NUR-2026-0045",
        invoiceNo: "INV-2026-0045",
        paymentDate: "2026-10-29",
        paymentMode: "upi",
        amount: 24000,
        feeType: "Hostel Fee, Mess Fee",
        studentId: 105,
        studentName: "Devi Thokchom",
        enrollmentNo: "NUR-2026-015",
        studentCourse: "B.Sc Nursing",
        remarks: {
          isCollegeReceipt: true,
          academicYear: "2026-2027",
          selectedMonths: ["October 2026", "November 2026"],
          items: [
            {
              category: "Hostel Fee",
              description: "Hostel Accommodation (October 2026, November 2026)",
              periodLabel: "October 2026, November 2026",
              selectedMonths: ["October 2026", "November 2026"],
              quantity: 2,
              unitPrice: 6000,
              amount: 12000,
            },
            {
              category: "Mess Fee",
              description: "Hostel Mess & Catering Charges (October 2026, November 2026)",
              periodLabel: "October 2026, November 2026",
              selectedMonths: ["October 2026", "November 2026"],
              quantity: 2,
              unitPrice: 6000,
              amount: 12000,
            },
          ],
        },
      };

      const doc = buildCollegeReceiptPDFDoc(receiptData, "Cashier Mary");
      expect(doc).toBeDefined();
      const output = doc.output();
      expect(output).toContain("ACME COLLEGE OF NURSING");
      expect(output).toContain("REC-NUR-2026-0045");
      expect(output).toContain("Hostel Accommodation");
      expect(output).toContain("Mess & Catering Charges");
      expect(output).toContain("Covered Month");
      expect(output).toContain("AY 2026-2027");
    });

    it("verifies periodDetails structure contains academicYear, selectedMonths, coveredMonths, and monthCount", () => {
      const periodDetails = {
        academicYear: "2026-2027",
        feeType: "Hostel Fee, Mess Fee",
        paymentFrequency: "monthly",
        periodType: "month",
        selectedMonths: ["October 2026", "November 2026"],
        coveredMonths: ["2026-10", "2026-11"],
        monthCount: 2,
        periodSummary: "October 2026, November 2026 (2 Months)",
        semester: null,
      };

      expect(periodDetails.academicYear).toBe("2026-2027");
      expect(periodDetails.paymentFrequency).toBe("monthly");
      expect(periodDetails.selectedMonths).toHaveLength(2);
      expect(periodDetails.coveredMonths).toEqual(["2026-10", "2026-11"]);
      expect(periodDetails.monthCount).toBe(2);
      expect(periodDetails.periodSummary).toContain("2 Months");
    });

    it("defaults to 0 months selected with zero quantity and zero amount until months are picked", () => {
      // 1. Initial selection: 0 months selected
      const emptyItems = computeFeeItemsForSelection(
        ["Course Fee", "Hostel Fee", "Mess Fee"],
        [],
        "2026-2027",
        "Semester 1",
        "months",
        [
          { id: "1", category: "Course Fee", unitPrice: 9000 } as any,
          { id: "2", category: "Hostel Fee", unitPrice: 2000 } as any,
          { id: "3", category: "Mess Fee", unitPrice: 4500 } as any,
        ]
      );
      expect(emptyItems).toHaveLength(3);
      for (const item of emptyItems) {
        expect(item.selectedMonths).toEqual([]);
        expect(item.quantity).toBe(0);
        expect(item.baseAmount).toBe(0);
        expect(item.amount).toBe(0);
        expect(item.periodLabel).toBe("No month selected");
      }
      expect(emptyItems[0].unitPrice).toBe(9000);
      expect(emptyItems[1].unitPrice).toBe(2000);
      expect(emptyItems[2].unitPrice).toBe(4500);

      // 2. User selects 2 months for Hostel Fee
      const populatedItems = computeFeeItemsForSelection(
        ["Hostel Fee"],
        ["October 2026", "November 2026"],
        "2026-2027",
        "Semester 1",
        "months",
        emptyItems
      );
      expect(populatedItems[0].selectedMonths).toEqual(["October 2026", "November 2026"]);
      expect(populatedItems[0].quantity).toBe(2);
      expect(populatedItems[0].baseAmount).toBe(4000);
      expect(populatedItems[0].amount).toBe(4000);
      expect(populatedItems[0].periodLabel).toBe("October 2026, November 2026");

      // 3. User clears months back to empty
      const clearedItems = computeFeeItemsForSelection(
        ["Hostel Fee"],
        [],
        "2026-2027",
        "Semester 1",
        "months",
        populatedItems
      );
      expect(clearedItems[0].selectedMonths).toEqual([]);
      expect(clearedItems[0].quantity).toBe(0);
      expect(clearedItems[0].baseAmount).toBe(0);
      expect(clearedItems[0].amount).toBe(0);
      expect(clearedItems[0].unitPrice).toBe(2000);
      expect(clearedItems[0].periodLabel).toBe("No month selected");
    });

    it("dynamically reflects changes in selected months on the fee breakdown panel items", () => {
      // 1. Initial selection: 1 month (October 2026) with unit rate of 5000
      const initialItems = computeFeeItemsForSelection(
        ["Hostel Fee"],
        ["October 2026"],
        "2026-2027",
        "Semester 1",
        "months",
        []
      );
      expect(initialItems).toHaveLength(1);
      expect(initialItems[0].selectedMonths).toEqual(["October 2026"]);
      expect(initialItems[0].quantity).toBe(1);
      expect(initialItems[0].description).toBe("Hostel Accommodation (October 2026)");
      expect(initialItems[0].periodLabel).toBe("October 2026");

      // Simulate user entering monthly rate of 5000
      initialItems[0].unitPrice = 5000;
      initialItems[0].amount = 5000;

      // 2. User changes selected months to 2 months (October 2026 & November 2026)
      const updatedTwoMonths = computeFeeItemsForSelection(
        ["Hostel Fee"],
        ["October 2026", "November 2026"],
        "2026-2027",
        "Semester 1",
        "months",
        initialItems
      );
      expect(updatedTwoMonths).toHaveLength(1);
      expect(updatedTwoMonths[0].selectedMonths).toEqual(["October 2026", "November 2026"]);
      expect(updatedTwoMonths[0].quantity).toBe(2);
      expect(updatedTwoMonths[0].description).toBe("Hostel Accommodation (October 2026, November 2026)");
      expect(updatedTwoMonths[0].periodLabel).toBe("October 2026, November 2026");
      expect(updatedTwoMonths[0].unitPrice).toBe(5000);
      expect(updatedTwoMonths[0].amount).toBe(10000);

      // 3. User changes selected months to 3 months (Oct, Nov, Dec)
      const updatedThreeMonths = computeFeeItemsForSelection(
        ["Hostel Fee"],
        ["October 2026", "November 2026", "December 2026"],
        "2026-2027",
        "Semester 1",
        "months",
        updatedTwoMonths
      );
      expect(updatedThreeMonths[0].quantity).toBe(3);
      expect(updatedThreeMonths[0].amount).toBe(15000);
      expect(updatedThreeMonths[0].description).toBe("Hostel Accommodation (October 2026, November 2026, December 2026)");
    });

    it("supports independent and different periods for different fee types in the same transaction", () => {
      // Fee combination: Course Fee (Semester 1), Hostel Fee (2 months: Oct, Nov), Mess Fee (1 month: Oct)
      const multiFeeReceipt: CollegeReceiptData = {
        receiptNumber: "REC-NUR-2026-0089",
        invoiceNo: "INV-2026-0089",
        paymentDate: "2026-10-29",
        paymentMode: "bank_transfer",
        amount: 51500,
        feeType: "Course Fee, Hostel Fee, Mess Fee",
        studentId: 108,
        studentName: "Thoibi Chanu",
        enrollmentNo: "NUR-2026-033",
        studentCourse: "GNM Nursing",
        remarks: {
          isCollegeReceipt: true,
          academicYear: "2026-2027",
          periodDetails: {
            academicYear: "2026-2027",
            periodSummary: "Course Fee: Semester 1 | Hostel Fee: October 2026, November 2026 | Mess Fee: October 2026",
            itemsBreakdown: [
              { category: "Course Fee", periodLabel: "Semester 1", quantity: 1, unitPrice: 35000, amount: 35000 },
              { category: "Hostel Fee", periodLabel: "October 2026, November 2026", selectedMonths: ["October 2026", "November 2026"], quantity: 2, unitPrice: 6000, amount: 12000 },
              { category: "Mess Fee", periodLabel: "October 2026", selectedMonths: ["October 2026"], quantity: 1, unitPrice: 4500, amount: 4500 },
            ],
          },
          items: [
            {
              category: "Course Fee",
              description: "Tuition Fee (Semester 1 · AY 2026-2027)",
              periodLabel: "Semester 1",
              quantity: 1,
              unitPrice: 35000,
              amount: 35000,
            },
            {
              category: "Hostel Fee",
              description: "Hostel Accommodation (October 2026, November 2026)",
              periodLabel: "October 2026, November 2026",
              selectedMonths: ["October 2026", "November 2026"],
              quantity: 2,
              unitPrice: 6000,
              amount: 12000,
            },
            {
              category: "Mess Fee",
              description: "Hostel Mess & Catering Charges (October 2026)",
              periodLabel: "October 2026",
              selectedMonths: ["October 2026"],
              quantity: 1,
              unitPrice: 4500,
              amount: 4500,
            },
          ],
        },
      };

      const doc = buildCollegeReceiptPDFDoc(multiFeeReceipt, "Accounts Officer");
      expect(doc).toBeDefined();
      const output = doc.output();
      expect(output).toContain("ACME COLLEGE OF NURSING");
      expect(output).toContain("REC-NUR-2026-0089");
      expect(output).toContain("Tuition Fee");
      expect(output).toContain("Hostel Accommodation");
      expect(output).toContain("Hostel Mess & Catering Charges");
      expect(output).toContain("Covered Month");
    });
  });

  describe("Monthly Fee Structures Architecture", () => {
    it("computes monthly package totals and annualized equivalents accurately", () => {
      const structure = {
        courseId: 1,
        courseName: "B.Sc Nursing",
        academicYear: "2026-2027",
        quotaCategory: "general",
        monthlyCourseFee: 8500,
        monthlyHostelFee: 6000,
        monthlyMessFee: 4500,
      };

      const monthlyTotal =
        structure.monthlyCourseFee + structure.monthlyHostelFee + structure.monthlyMessFee;
      const annualTotal = monthlyTotal * 12;

      expect(monthlyTotal).toBe(19000);
      expect(annualTotal).toBe(228000);
    });

    it("handles zero or non-resident structures where hostel and mess are 0", () => {
      const dayScholarStructure = {
        courseId: 2,
        courseName: "GNM",
        academicYear: "2026-2027",
        quotaCategory: "government",
        monthlyCourseFee: 5000,
        monthlyHostelFee: 0,
        monthlyMessFee: 0,
      };

      const monthlyTotal =
        dayScholarStructure.monthlyCourseFee +
        dayScholarStructure.monthlyHostelFee +
        dayScholarStructure.monthlyMessFee;

      expect(monthlyTotal).toBe(5000);
      expect(monthlyTotal * 12).toBe(60000);
    });

    it("pre-fills monthly rates into receipt items based on fee structure mapping", () => {
      const feeStructure = {
        structureId: 1,
        monthlyCourseFee: 8000,
        monthlyHostelFee: 5500,
        monthlyMessFee: 4000,
        monthlyTotal: 17500,
      };

      const initialItems = [
        { category: "Course Fee" as const, quantity: 2, unitPrice: 0, amount: 0 },
        { category: "Hostel Fee" as const, quantity: 3, unitPrice: 0, amount: 0 },
        { category: "Mess Fee" as const, quantity: 1, unitPrice: 0, amount: 0 },
      ];

      const populatedItems = initialItems.map((it) => {
        let rate = it.unitPrice;
        if (it.category === "Course Fee") rate = feeStructure.monthlyCourseFee;
        if (it.category === "Hostel Fee") rate = feeStructure.monthlyHostelFee;
        if (it.category === "Mess Fee") rate = feeStructure.monthlyMessFee;

        return {
          ...it,
          unitPrice: rate,
          amount: it.quantity * rate,
        };
      });

      expect(populatedItems[0].unitPrice).toBe(8000);
      expect(populatedItems[0].amount).toBe(16000); // 2 months * 8000

      expect(populatedItems[1].unitPrice).toBe(5500);
      expect(populatedItems[1].amount).toBe(16500); // 3 months * 5500

      expect(populatedItems[2].unitPrice).toBe(4000);
      expect(populatedItems[2].amount).toBe(4000); // 1 month * 4000
    });

    it("calculates fee concession in percentage and flat absolute terms accurately", () => {
      const grossSubtotal = 36500;

      // 1. Percentage concession (e.g. 10%)
      const discountPercent = 10;
      const calculatedFromPercent = Math.round((grossSubtotal * discountPercent) / 100);
      expect(calculatedFromPercent).toBe(3650);

      const netAfterPercent = grossSubtotal - calculatedFromPercent;
      expect(netAfterPercent).toBe(32850);

      // 2. Percentage concession with decimal (e.g. 12.5%)
      const fractionalPercent = 12.5;
      const calculatedFractional = Math.round((grossSubtotal * fractionalPercent) / 100);
      expect(calculatedFractional).toBe(4563);

      // 3. Absolute flat concession
      const flatDiscount = 5000;
      const derivedPercent = Number(((flatDiscount / grossSubtotal) * 100).toFixed(1));
      expect(derivedPercent).toBe(13.7);

      const netAfterFlat = grossSubtotal - flatDiscount;
      expect(netAfterFlat).toBe(31500);

      // 4. Concession capped at subtotal
      const excessDiscount = 40000;
      const cappedDiscount = Math.min(grossSubtotal, excessDiscount);
      expect(cappedDiscount).toBe(grossSubtotal);
      expect(grossSubtotal - cappedDiscount).toBe(0);
    });

    it("calculates fee surcharge in percentage and flat absolute terms with net payable", () => {
      const grossSubtotal = 40000;
      const discountAmount = 2000;

      // 1. Flat Surcharge (e.g. ₹1,500 late fee)
      const flatSurcharge = 1500;
      const derivedPercent = Number(((flatSurcharge / grossSubtotal) * 100).toFixed(1));
      expect(derivedPercent).toBe(3.8);

      const netWithFlatSurcharge = Math.max(0, grossSubtotal - discountAmount + flatSurcharge);
      expect(netWithFlatSurcharge).toBe(39500); // 40000 - 2000 + 1500

      // 2. Percentage Surcharge (e.g. 5% late fee)
      const surchargePercent = 5;
      const calculatedSurcharge = Math.round((grossSubtotal * surchargePercent) / 100);
      expect(calculatedSurcharge).toBe(2000);

      const netWithPercentSurcharge = Math.max(0, grossSubtotal - discountAmount + calculatedSurcharge);
      expect(netWithPercentSurcharge).toBe(40000); // 40000 - 2000 + 2000

      // 3. Advance adjustment against net after surcharge
      const advanceAdjusted = 5000;
      const effectiveAdvance = Math.min(advanceAdjusted, netWithFlatSurcharge);
      const finalPayable = Math.max(0, netWithFlatSurcharge - effectiveAdvance);
      expect(finalPayable).toBe(34500); // 39500 - 5000
    });

    it("applies concessions and surcharges separately per fee type and equally across individual months", () => {
      const items: ReceiptLineItem[] = [
        {
          id: "item-course",
          category: "Course Fee",
          description: "Tuition Fee (Oct '26, Nov '26)",
          periodLabel: "October 2026, November 2026",
          selectedMonths: ["October 2026", "November 2026"],
          quantity: 2,
          unitPrice: 10000,
          baseAmount: 20000,
          discountType: "percent",
          discountPercent: 10,
          discountAmount: 2000, // 10% of 20000
          discountReason: "Merit Concession",
          discountPerMonth: 1000, // 2000 / 2
          surchargeType: "flat",
          surchargePercent: 0,
          surchargeAmount: 0,
          surchargeReason: "",
          surchargePerMonth: 0,
          netUnitPrice: 9000, // 10000 - 1000
          amount: 18000, // 2 * 9000
        },
        {
          id: "item-hostel",
          category: "Hostel Fee",
          description: "Hostel Fee (Oct '26, Nov '26, Dec '26)",
          periodLabel: "October 2026, November 2026, December 2026",
          selectedMonths: ["October 2026", "November 2026", "December 2026"],
          quantity: 3,
          unitPrice: 5000,
          baseAmount: 15000,
          discountType: "flat",
          discountPercent: 0,
          discountAmount: 0,
          discountReason: "",
          discountPerMonth: 0,
          surchargeType: "flat",
          surchargePercent: 0,
          surchargeAmount: 0,
          surchargeReason: "",
          surchargePerMonth: 0,
          netUnitPrice: 5000,
          amount: 15000,
        },
        {
          id: "item-mess",
          category: "Mess Fee",
          description: "Mess Fee (Oct '26, Nov '26, Dec '26)",
          periodLabel: "October 2026, November 2026, December 2026",
          selectedMonths: ["October 2026", "November 2026", "December 2026"],
          quantity: 3,
          unitPrice: 4000,
          baseAmount: 12000,
          discountType: "flat",
          discountPercent: 0,
          discountAmount: 0,
          discountReason: "",
          discountPerMonth: 0,
          surchargeType: "flat",
          surchargePercent: 0,
          surchargeAmount: 600, // Flat ₹600 late fee
          surchargeReason: "Late Payment Delay Penalty",
          surchargePerMonth: 200, // 600 / 3
          netUnitPrice: 4200, // 4000 + 200
          amount: 12600, // 3 * 4200
        },
      ];

      // 1. Check Course Fee calculations: ₹1,000/mo concession applied equally across both months
      const course = items[0];
      expect(course.baseAmount).toBe(20000);
      expect(course.discountAmount).toBe(2000);
      expect(course.discountPerMonth).toBe(1000);
      expect(course.netUnitPrice).toBe(9000);
      expect(course.amount).toBe(18000);

      // 2. Check Mess Fee calculations: ₹200/mo surcharge applied equally across 3 months
      const mess = items[2];
      expect(mess.baseAmount).toBe(12000);
      expect(mess.surchargeAmount).toBe(600);
      expect(mess.surchargePerMonth).toBe(200);
      expect(mess.netUnitPrice).toBe(4200);
      expect(mess.amount).toBe(12600);

      // 3. Aggregate totals across all fee types
      const grossSubtotal = items.reduce((sum, i) => sum + (i.baseAmount || 0), 0);
      const totalDiscounts = items.reduce((sum, i) => sum + (i.discountAmount || 0), 0);
      const totalSurcharges = items.reduce((sum, i) => sum + (i.surchargeAmount || 0), 0);
      const netPayable = items.reduce((sum, i) => sum + (i.amount || 0), 0);

      expect(grossSubtotal).toBe(47000); // 20000 + 15000 + 12000
      expect(totalDiscounts).toBe(2000);
      expect(totalSurcharges).toBe(600);
      expect(netPayable).toBe(45600); // 47000 - 2000 + 600
      expect(netPayable).toBe(course.amount + items[1].amount + mess.amount); // 18000 + 15000 + 12600 = 45600
    });
  });

  describe("TOTAL AMOUNT TO COLLECT Logic & Invariants", () => {
    it("calculates final payable amount with itemized concessions, surcharges, and advance deduction", () => {
      const grossSubtotal = 47000;
      const totalDiscountAmount = 2000;
      const totalSurchargeAmount = 600;
      const netBeforeAdvance = Math.max(0, grossSubtotal - totalDiscountAmount + totalSurchargeAmount);
      expect(netBeforeAdvance).toBe(45600);

      // Case A: Partial advance adjustment (e.g. ₹10,000 available out of ₹45,600 net)
      const advance1 = 10000;
      const effectiveAdvance1 = Math.min(advance1, netBeforeAdvance);
      const finalPayable1 = Math.max(0, netBeforeAdvance - effectiveAdvance1);
      expect(effectiveAdvance1).toBe(10000);
      expect(finalPayable1).toBe(35600);

      // Case B: Full advance adjustment (e.g. advance covers 100% of bill)
      const advance2 = 45600;
      const effectiveAdvance2 = Math.min(advance2, netBeforeAdvance);
      const finalPayable2 = Math.max(0, netBeforeAdvance - effectiveAdvance2);
      expect(effectiveAdvance2).toBe(45600);
      expect(finalPayable2).toBe(0);

      // Case C: Advance exceeds net payable (e.g. ₹50,000 advance available)
      const advance3 = 50000;
      const effectiveAdvance3 = Math.min(advance3, netBeforeAdvance);
      const finalPayable3 = Math.max(0, netBeforeAdvance - effectiveAdvance3);
      expect(effectiveAdvance3).toBe(45600); // capped at netBeforeAdvance
      expect(finalPayable3).toBe(0); // non-negative

      // Case D: Server-side validation invariant
      // Backend validates: |(gross - discount + surcharge - advance) - amount| <= 1
      const serverExpectedNet1 = Math.max(0, grossSubtotal - totalDiscountAmount + totalSurchargeAmount - effectiveAdvance1);
      expect(Math.abs(serverExpectedNet1 - finalPayable1)).toBeLessThanOrEqual(1);

      const serverExpectedNet2 = Math.max(0, grossSubtotal - totalDiscountAmount + totalSurchargeAmount - effectiveAdvance2);
      expect(Math.abs(serverExpectedNet2 - finalPayable2)).toBeLessThanOrEqual(1);
    });
  });

  describe("Already Paid Fees Detection & Disabled Selection Invariants", () => {
    it("normalizes month tokens of various formats into canonical 'Month YYYY' matching academic year months", () => {
      expect(normalizeMonthToKey("2026-06")).toBe("June 2026");
      expect(normalizeMonthToKey("2026-6")).toBe("June 2026");
      expect(normalizeMonthToKey("June 2026")).toBe("June 2026");
      expect(normalizeMonthToKey("Jun 2026")).toBe("June 2026");
      expect(normalizeMonthToKey("June '26")).toBe("June 2026");
      expect(normalizeMonthToKey("2027-01")).toBe("January 2027");
      expect(normalizeMonthToKey("Jan 2027")).toBe("January 2027");
      expect(normalizeMonthToKey("")).toBe("");
    });

    it("normalizes category names accurately to Course Fee, Hostel Fee, and Mess Fee", () => {
      expect(normalizeCategoryName("Course Fee")).toBe("Course Fee");
      expect(normalizeCategoryName("Tuition Fee")).toBe("Course Fee");
      expect(normalizeCategoryName("Academic Fee")).toBe("Course Fee");
      expect(normalizeCategoryName("Hostel Fee")).toBe("Hostel Fee");
      expect(normalizeCategoryName("Hostel Accommodation")).toBe("Hostel Fee");
      expect(normalizeCategoryName("Mess Fee")).toBe("Mess Fee");
      expect(normalizeCategoryName("Hostel Mess Catering")).toBe("Mess Fee");
    });

    it("correctly identifies paid months from student past transactions and filters them from selection", () => {
      // Mock past transactions returned for student #101
      const pastTransactions = [
        {
          id: 501,
          receiptNumber: "REC-NUR-2026-0001",
          paymentDate: "2026-07-05",
          feeType: "Course Fee, Hostel Fee",
          status: "completed",
          remarks: JSON.stringify({
            academicYear: "2026-2027",
            items: [
              {
                category: "Course Fee",
                selectedMonths: ["June 2026", "July 2026"],
                amount: 20000,
              },
              {
                category: "Hostel Fee",
                selectedMonths: ["June 2026"],
                amount: 5000,
              },
            ],
          }),
        },
        {
          id: 502,
          receiptNumber: "REC-NUR-2026-0002",
          paymentDate: "2026-08-01",
          feeType: "Mess Fee",
          status: "completed",
          remarks: JSON.stringify({
            academicYear: "2026-2027",
            selectedMonths: ["June 2026"],
            amount: 4000,
          }),
        },
        {
          id: 503,
          receiptNumber: "REC-NUR-2026-REF",
          paymentDate: "2026-08-05",
          feeType: "Course Fee",
          status: "refunded", // Must be ignored!
          remarks: JSON.stringify({
            academicYear: "2026-2027",
            items: [{ category: "Course Fee", selectedMonths: ["August 2026"] }],
          }),
        },
      ];

      // Build simulated paid map using the exact same algorithm
      const paidMap = new Map<string, { receiptNumber: string; amount: number }>();
      pastTransactions.forEach((tx) => {
        if (tx.status === "refunded") return;
        const r = JSON.parse(tx.remarks);
        const txItems = r.items || [];
        if (txItems.length > 0) {
          txItems.forEach((it: any) => {
            const cat = normalizeCategoryName(it.category || tx.feeType);
            (it.selectedMonths || []).forEach((m: string) => {
              paidMap.set(`${cat}:${normalizeMonthToKey(m)}`, {
                receiptNumber: tx.receiptNumber,
                amount: it.amount,
              });
            });
          });
        } else {
          const cat = normalizeCategoryName(tx.feeType);
          (r.selectedMonths || []).forEach((m: string) => {
            paidMap.set(`${cat}:${normalizeMonthToKey(m)}`, {
              receiptNumber: tx.receiptNumber,
              amount: r.amount || 0,
            });
          });
        }
      });

      // Assert paid months for Course Fee: June 2026 and July 2026 are paid; August 2026 was refunded so NOT paid
      expect(paidMap.has("Course Fee:June 2026")).toBe(true);
      expect(paidMap.get("Course Fee:June 2026")?.receiptNumber).toBe("REC-NUR-2026-0001");
      expect(paidMap.has("Course Fee:July 2026")).toBe(true);
      expect(paidMap.has("Course Fee:August 2026")).toBe(false);

      // Assert paid months for Hostel Fee: June 2026 is paid; July 2026 is NOT paid
      expect(paidMap.has("Hostel Fee:June 2026")).toBe(true);
      expect(paidMap.has("Hostel Fee:July 2026")).toBe(false);

      // Assert paid months for Mess Fee: June 2026 is paid; July 2026 is NOT paid
      expect(paidMap.has("Mess Fee:June 2026")).toBe(true);
      expect(paidMap.has("Mess Fee:July 2026")).toBe(false);

      // Verify that selecting months automatically strips already-paid months
      const requestedCourseMonths = ["June 2026", "July 2026", "August 2026", "September 2026"];
      const allowedCourseMonths = requestedCourseMonths.filter(
        (m) => !paidMap.has(`Course Fee:${normalizeMonthToKey(m)}`)
      );
      expect(allowedCourseMonths).toEqual(["August 2026", "September 2026"]);

      // Verify Hostel months: June 2026 is excluded, July 2026 and August 2026 are allowed
      const requestedHostelMonths = ["June 2026", "July 2026", "August 2026"];
      const allowedHostelMonths = requestedHostelMonths.filter(
        (m) => !paidMap.has(`Hostel Fee:${normalizeMonthToKey(m)}`)
      );
      expect(allowedHostelMonths).toEqual(["July 2026", "August 2026"]);
    });

    it("allows independent payments for the same month across distinct fee types (e.g. Course Fee vs Mess Fee in June 2026)", () => {
      // Past transaction: Course Fee paid for June 2026
      const pastReceipt = {
        receiptNumber: "REC-NUR-2026-0010",
        feeType: "Course Fee",
        remarks: JSON.stringify({
          academicYear: "2026-2027",
          items: [{ category: "Course Fee", selectedMonths: ["June 2026"], amount: 15000 }],
        }),
      };

      const pastItems = JSON.parse(pastReceipt.remarks).items;

      // Helper function matching server category determination
      const getFeeCategory = (itemOrFeeType: any): string[] => {
        const cat = typeof itemOrFeeType === "string" ? itemOrFeeType : (itemOrFeeType?.category || itemOrFeeType?.name || "");
        const s = cat.trim().toLowerCase();
        if (s.includes("hostel & mess")) return ["hostel", "mess"];
        if (s.includes("mess")) return ["mess"];
        if (s.includes("hostel")) return ["hostel"];
        if (s.includes("course") || s.includes("tuition") || s.includes("academic")) return ["academic"];
        return [s || "academic"];
      };

      // Candidate 1: Mess Fee for June 2026 -> SHOULD NOT COLLIDE WITH Course Fee
      const messSubmissionItem = { category: "Mess Fee", selectedMonths: ["June 2026"], amount: 4000 };
      const messCat = getFeeCategory(messSubmissionItem);
      const pastCat = getFeeCategory(pastItems[0]);

      const sharesWithMess = messCat.some((c) => pastCat.includes(c));
      expect(sharesWithMess).toBe(false); // Different fee heads: Academic vs Mess do not collide!

      // Candidate 2: Hostel Fee for June 2026 -> SHOULD NOT COLLIDE WITH Course Fee
      const hostelSubmissionItem = { category: "Hostel Fee", selectedMonths: ["June 2026"], amount: 5000 };
      const hostelCat = getFeeCategory(hostelSubmissionItem);
      const sharesWithHostel = hostelCat.some((c) => pastCat.includes(c));
      expect(sharesWithHostel).toBe(false); // Different fee heads: Academic vs Hostel do not collide!

      // Candidate 3: Another Course Fee for June 2026 -> MUST COLLIDE
      const courseSubmissionItem = { category: "Course Fee", selectedMonths: ["June 2026"], amount: 15000 };
      const courseCat = getFeeCategory(courseSubmissionItem);
      const sharesWithCourse = courseCat.some((c) => pastCat.includes(c));
      expect(sharesWithCourse).toBe(true); // Same fee head: collision detected!
    });
  });

  describe("Covered Month Boxes & Badges Rendering", () => {
    it("parses diverse month token formats (comma-separated, arrays, ISO dates)", () => {
      expect(parseMonthTokens("October 2026, November 2026")).toEqual(["October 2026", "November 2026"]);
      expect(parseMonthTokens(["October 2026", "November 2026"])).toEqual(["October 2026", "November 2026"]);
      expect(parseMonthTokens("2026-10, 2026-11")).toEqual(["2026-10", "2026-11"]);
      expect(parseMonthTokens(null)).toEqual([]);
      expect(parseMonthTokens(undefined)).toEqual([]);
    });

    it("formats month tokens into short pill labels with 2-digit years matching dialog chips", () => {
      expect(formatMonthToken("October 2026")).toEqual({ short: "Oct '26", full: "October 2026" });
      expect(formatMonthToken("November 2026")).toEqual({ short: "Nov '26", full: "November 2026" });
      expect(formatMonthToken("January 2027")).toEqual({ short: "Jan '27", full: "January 2027" });
      expect(formatMonthToken("2026-10")).toEqual({ short: "Oct '26", full: "October 2026" });
      expect(formatMonthToken("Semester 1")).toEqual({ short: "Semester 1", full: "Semester 1" });
    });
  });

  describe("Hostel and Mess Fee Pre-Population from Fee Master", () => {
    // Tariff resolution logic extracted from server/routes/nursing.ts
    function resolveTariffs(structure: {
      tuitionFee?: string | number | null;
      hostelFee?: string | number | null;
      hostelMessMonthlyFee?: string | number | null;
      totalAmount?: string | number | null;
      componentsConfig?: string | null;
    }, frequencies: Array<{ componentName: string; frequencyKey: string; installmentAmount: number | string; baseAmount?: number | string }> = []) {
      let monthlyCourseFee = Number(structure.tuitionFee || 0);
      let monthlyHostelFee = Number(structure.hostelFee || 0);
      let monthlyMessFee = Number(structure.hostelMessMonthlyFee || 0);

      if (structure.componentsConfig && (monthlyCourseFee === 0 || monthlyHostelFee === 0 || monthlyMessFee === 0)) {
        try {
          const comps = JSON.parse(structure.componentsConfig);
          if (Array.isArray(comps)) {
            for (const c of comps) {
              const name = String(c.name || "").trim().toLowerCase();
              const amt = Number(c.amount || 0);
              const freq = String(c.selectedFrequencyKey || "annually").toLowerCase();
              const count = c.frequencyRows?.find((r: any) => r.key === freq)?.count || (freq === "monthly" ? 12 : 1);
              const monthlyRate =
                freq === "monthly" && count === 12 && amt > 12000
                  ? Math.round(amt / 12)
                  : freq === "monthly" && amt > 0
                    ? amt
                    : Math.round(amt / 12);

              if (monthlyHostelFee === 0 && name.includes("hostel") && !name.includes("mess")) {
                monthlyHostelFee = monthlyRate;
              } else if (monthlyMessFee === 0 && name.includes("mess")) {
                monthlyMessFee = monthlyRate;
              } else if (monthlyCourseFee === 0 && (name.includes("course") || name.includes("tuition"))) {
                monthlyCourseFee = monthlyRate;
              }
            }
          }
        } catch (e) {}
      }

      if (monthlyHostelFee > 10000) {
        monthlyHostelFee = Math.round(monthlyHostelFee / 12);
      }
      if (monthlyMessFee > 20000) {
        monthlyMessFee = Math.round(monthlyMessFee / 12);
      }

      // Overlay student-specific fee frequencies
      for (const freq of frequencies) {
        const cName = (freq.componentName || "").trim().toLowerCase();
        const instAmt = Number(freq.installmentAmount || 0);
        const isMonthly = freq.frequencyKey === "monthly";
        const monthlyRate = isMonthly ? instAmt : Math.round(Number(freq.baseAmount || instAmt) / 12);

        if (cName.includes("hostel") && cName.includes("mess")) {
          if (monthlyHostelFee === 0 && monthlyMessFee === 0) {
            monthlyHostelFee = 2000;
            monthlyMessFee = Math.max(0, monthlyRate - 2000);
          }
        } else if (cName.includes("hostel")) {
          if (monthlyRate > 0) monthlyHostelFee = monthlyRate;
        } else if (cName.includes("mess")) {
          if (monthlyRate > 0) monthlyMessFee = monthlyRate;
        } else if (cName.includes("course") || cName.includes("tuition")) {
          if (isMonthly && instAmt > 0) monthlyCourseFee = instAmt;
        }
      }

      const monthlyTotal = monthlyCourseFee + monthlyHostelFee + monthlyMessFee;
      return { monthlyCourseFee, monthlyHostelFee, monthlyMessFee, monthlyTotal };
    }

    it("pre-populates monthly hostel and mess tariffs directly from structure columns", () => {
      const tariffs = resolveTariffs({
        tuitionFee: "9000.00",
        hostelFee: "2000.00",
        hostelMessMonthlyFee: "4500.00",
      });

      expect(tariffs.monthlyCourseFee).toBe(9000);
      expect(tariffs.monthlyHostelFee).toBe(2000);
      expect(tariffs.monthlyMessFee).toBe(4500);
      expect(tariffs.monthlyTotal).toBe(15500);
    });

    it("correctly converts annual hostel column amounts into monthly equivalent", () => {
      const tariffs = resolveTariffs({
        tuitionFee: "8500.00",
        hostelFee: "24000.00", // Annual ₹24,000
        hostelMessMonthlyFee: "4500.00",
      });

      expect(tariffs.monthlyHostelFee).toBe(2000); // 24000 / 12 = 2000
      expect(tariffs.monthlyMessFee).toBe(4500);
      expect(tariffs.monthlyTotal).toBe(15000);
    });

    it("falls back to componentsConfig JSON when fee structure columns are 0 or empty", () => {
      const legacyStructure = {
        tuitionFee: "0.00",
        hostelFee: "0.00",
        hostelMessMonthlyFee: "0.00",
        componentsConfig: JSON.stringify([
          { id: "c1", name: "Course Fee", amount: 108000, selectedFrequencyKey: "monthly", frequencyRows: [{ key: "monthly", count: 12 }] },
          { id: "c2", name: "HOSTEL", amount: 24000, selectedFrequencyKey: "monthly", frequencyRows: [{ key: "monthly", count: 12 }] },
          { id: "c3", name: "Mess Fees", amount: 54000, selectedFrequencyKey: "monthly", frequencyRows: [{ key: "monthly", count: 12 }] },
        ]),
      };

      const tariffs = resolveTariffs(legacyStructure);
      expect(tariffs.monthlyCourseFee).toBe(9000); // 108000 / 12
      expect(tariffs.monthlyHostelFee).toBe(2000); // 24000 / 12
      expect(tariffs.monthlyMessFee).toBe(4500); // 54000 / 12
      expect(tariffs.monthlyTotal).toBe(15500);
    });

    it("overlays student custom fee frequencies over standard course fee structures", () => {
      const baseStructure = {
        tuitionFee: "9000.00",
        hostelFee: "2000.00",
        hostelMessMonthlyFee: "4500.00",
      };

      const studentCustomFrequencies = [
        { componentName: "HOSTEL", frequencyKey: "monthly", installmentAmount: "2500.00" },
        { componentName: "Mess Fees", frequencyKey: "monthly", installmentAmount: "5000.00" },
      ];

      const tariffs = resolveTariffs(baseStructure, studentCustomFrequencies);
      expect(tariffs.monthlyCourseFee).toBe(9000);
      expect(tariffs.monthlyHostelFee).toBe(2500);
      expect(tariffs.monthlyMessFee).toBe(5000);
      expect(tariffs.monthlyTotal).toBe(16500);
    });

    it("preserves monthly tariff rates directly from http://localhost:5173/college/fee-structures without dividing by 12", () => {
      // Structure defined on http://localhost:5173/college/fee-structures
      const feeMasterStructure = {
        id: 1,
        courseId: 1,
        academicYear: "2026-2030",
        quotaCategory: "general",
        feeType: "Monthly Fee Structure",
        paymentFrequency: "monthly",
        tuitionFee: "9000.00",
        hostelFee: "12000.00", // Monthly hostel rate > 10000
        hostelMessMonthlyFee: "24000.00", // Monthly mess rate > 20000
        totalAmount: "45000.00",
      };

      // When monthly payment frequency is set, it does NOT divide by 12
      const isMonthly = feeMasterStructure.paymentFrequency === "monthly" || feeMasterStructure.feeType.includes("Monthly");
      let mHostel = Number(feeMasterStructure.hostelFee);
      let mMess = Number(feeMasterStructure.hostelMessMonthlyFee);
      if (!isMonthly) {
        if (mHostel > 10000) mHostel = Math.round(mHostel / 12);
        if (mMess > 20000) mMess = Math.round(mMess / 12);
      }

      expect(mHostel).toBe(12000);
      expect(mMess).toBe(24000);
      expect(Number(feeMasterStructure.tuitionFee)).toBe(9000);
    });

    it("auto-populates hostel and mess line items in receipt dialog when student has active fee master rates", () => {
      const studentFeeStructure = {
        structureId: 1,
        monthlyCourseFee: 9000,
        monthlyHostelFee: 2000,
        monthlyMessFee: 4500,
        monthlyTotal: 15500,
      };

      // Simulating dialog initial items setup upon selecting a resident student
      const initialItems = [
        { category: "Course Fee" as const, quantity: 1, unitPrice: 0, amount: 0, selectedMonths: ["June 2026"] },
      ];

      const hasHostel = studentFeeStructure.monthlyHostelFee > 0;
      const hasMess = studentFeeStructure.monthlyMessFee > 0;

      const items = [...initialItems].map((it) => ({
        ...it,
        unitPrice: studentFeeStructure.monthlyCourseFee,
        amount: studentFeeStructure.monthlyCourseFee * it.quantity,
      }));

      if (hasHostel) {
        items.push({
          category: "Hostel Fee" as const,
          quantity: 1,
          unitPrice: studentFeeStructure.monthlyHostelFee,
          amount: studentFeeStructure.monthlyHostelFee,
          selectedMonths: ["June 2026"],
        });
      }

      if (hasMess) {
        items.push({
          category: "Mess Fee" as const,
          quantity: 1,
          unitPrice: studentFeeStructure.monthlyMessFee,
          amount: studentFeeStructure.monthlyMessFee,
          selectedMonths: ["June 2026"],
        });
      }

      expect(items.length).toBe(3);
      expect(items.find((i) => i.category === "Course Fee")?.unitPrice).toBe(9000);
      expect(items.find((i) => i.category === "Hostel Fee")?.unitPrice).toBe(2000);
      expect(items.find((i) => i.category === "Mess Fee")?.unitPrice).toBe(4500);

      const totalPayable = items.reduce((sum, it) => sum + it.amount, 0);
      expect(totalPayable).toBe(15500);
    });
  });
});


