import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Receipt,
  Plus,
  Trash2,
  Printer,
  Download,
  MessageSquare,
  CheckCircle,
  GraduationCap,
  Home,
  Utensils,
  Calendar as CalendarIcon,
  Tag,
  Clock,
  Check,
  CalendarCheck,
  UserCheck,
  Layers,
  RotateCcw,
  Sparkles,
  Copy,
  BadgePercent,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Autocomplete, Option } from "@/ui/autocomplete";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { formatCollegePaymentMode } from "@/lib/college-payment";
import { MonthBoxList } from "@/components/college/MonthBox";
import {
  CollegeReceiptData,
  printCollegeReceipt,
  downloadCollegeReceipt,
} from "@/lib/college-receipt-pdf";

import {
  type FeeCategoryType,
  type ReceiptLineItem,
  type FeeCategoryCardOption,
  type PaidFeeInfo,
  type MonthlyFeeStructure,
  TIMEBOUND_FEE_CATEGORIES,
  MONTH_NAMES,
  getAcademicYearMonths,
  normalizeCategoryName,
  normalizeMonthToKey,
  buildItemDescription,
  buildPeriodLabel,
  computeFeeItemsForSelection,
} from "./college-receipt-utils";

export type {
  FeeCategoryType,
  ReceiptLineItem,
  FeeCategoryCardOption,
  PaidFeeInfo,
  MonthlyFeeStructure,
};

const EMPTY_STUDENTS: StudentOption[] = [];
const EMPTY_STRUCTURES: MonthlyFeeStructure[] = [];
const EMPTY_TRANSACTIONS: any[] = [];
const EMPTY_PAID_MAP = new Map<string, PaidFeeInfo>();
const EMPTY_AUTOCOMPLETE_OPTIONS: Option[] = [];

interface StudentOption {
  id: number;
  name: string;
  enrollmentNo: string;
  courseName?: string;
  courseId?: number;
  academicYear?: string;
  batchName?: string;
  batchId?: number;
  quotaCategory?: string;
  phone?: string;
  email?: string;
}

interface CollegeReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStudentId?: number | null;
  initialCategory?: FeeCategoryType;
  onSuccess?: (tx: any) => void;
}

export function CollegeReceiptDialog({
  open,
  onOpenChange,
  initialStudentId,
  initialCategory = "Course Fee",
  onSuccess,
}: CollegeReceiptDialogProps) {
  const queryClient = useQueryClient();

  // Step 1: Selected Student State
  const [selectedStudentId, setSelectedStudentId] = React.useState<number | null>(initialStudentId || null);

  // Common Academic Year
  const [academicYear, setAcademicYear] = React.useState<string>(() => {
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const startYear = curMonth >= 6 ? curYear : curYear - 1;
    return `${startYear}-${startYear + 1}`;
  });

  const curMonthKey = `${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`;

  // Line items state - each item manages its OWN category, description, months, rate, concession, and surcharge (no month pre-selected by default)
  const [items, setItems] = React.useState<ReceiptLineItem[]>([
    {
      id: "item-initial",
      category: initialCategory,
      description: buildItemDescription(initialCategory, academicYear, []),
      periodLabel: "No month selected",
      selectedMonths: [],
      quantity: 0,
      unitPrice: 0,
      baseAmount: 0,
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
      netUnitPrice: 0,
      amount: 0,
    },
  ]);

  // Payment Metadata
  const [paymentMode, setPaymentMode] = React.useState<string>("cash");
  const [paymentDate, setPaymentDate] = React.useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [referenceNo, setReferenceNo] = React.useState("");
  const [narration, setNarration] = React.useState("");
  const [notes, setNotes] = React.useState("");

  // Booking Advance Adjustment
  const [adjustAdvance, setAdjustAdvance] = React.useState<boolean>(false);
  const [advanceAdjustedAmount, setAdvanceAdjustedAmount] = React.useState<number>(0);

  // Success Modal State
  const [successReceipt, setSuccessReceipt] = React.useState<CollegeReceiptData | null>(null);
  const [successModalOpen, setSuccessModalOpen] = React.useState(false);
  const [whatsappPhone, setWhatsappPhone] = React.useState("");
  const [whatsappModalOpen, setWhatsappModalOpen] = React.useState(false);

  // Available academic year months sequence
  const ayMonths = React.useMemo(() => getAcademicYearMonths(academicYear), [academicYear]);

  // Active fee categories from current items
  const activeCategories = React.useMemo(() => {
    return Array.from(new Set(items.map((i) => i.category)));
  }, [items]);

  // Fetch Students list
  const { data: rawStudents } = useQuery<StudentOption[]>({
    queryKey: ["nursing", "students", "options"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/students");
      if (!res.ok) return [];
      const json = await res.json();
      const list = Array.isArray(json) ? json : json.data || [];
      return list.map((s: any) => ({
        id: s.id,
        name: s.name,
        enrollmentNo: s.enrollmentNo || "N/A",
        courseName: s.courseName || s.batch?.course?.name || "Nursing",
        courseId: s.courseId || s.batch?.courseId,
        academicYear: s.academicYear || s.batch?.academicYear,
        batchName: s.batchName || s.batch?.name || "",
        batchId: s.batchId,
        quotaCategory: s.quotaCategory || "General",
        phone: s.phone,
        email: s.email,
      }));
    },
    enabled: open,
  });
  const students = rawStudents ?? EMPTY_STUDENTS;

  // Fetch all monthly fee structures from the fee master (http://localhost:5173/college/fee-structures)
  const { data: rawFeeMasterStructures } = useQuery<MonthlyFeeStructure[]>({
    queryKey: ["nursing", "fees", "structures"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/fees/structures");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });
  const feeMasterStructures = rawFeeMasterStructures ?? EMPTY_STRUCTURES;

  // Keep selectedStudentId synced when initialStudentId changes
  React.useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    }
  }, [initialStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // Autocomplete options for student search
  const studentAutocompleteOptions = React.useMemo<Option[]>(() => {
    if (students.length === 0) return EMPTY_AUTOCOMPLETE_OPTIONS;
    return students.map((s) => [
      String(s.id),
      `${s.name} (${s.enrollmentNo})`,
      `${s.courseName}${s.batchName ? ` · ${s.batchName}` : ""}${s.quotaCategory ? ` [${s.quotaCategory.toUpperCase()}]` : ""}`,
    ]);
  }, [students]);

  // Fetch student advance balance if student selected
  const { data: advanceBalance } = useQuery({
    queryKey: ["nursing", "student-advance-balance", selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      const res = await fetch(`/api/nursing/students/${selectedStudentId}/advance-balance`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedStudentId && open,
  });

  // Fetch monthly fee structure for the selected student from backend (accepts academicYear for dynamic sync)
  const { data: studentFeeStructure } = useQuery<{
    structureId: number | null;
    courseId: number | null;
    courseName?: string;
    academicYear: string | null;
    quotaCategory: string;
    monthlyCourseFee: number;
    monthlyHostelFee: number;
    monthlyMessFee: number;
    monthlyTotal: number;
  }>({
    queryKey: ["nursing", "fees", "structure-for-student", selectedStudentId, academicYear],
    queryFn: async () => {
      if (!selectedStudentId) return null;
      const res = await fetch(`/api/nursing/fees/structure-for-student/${selectedStudentId}?academicYear=${encodeURIComponent(academicYear)}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedStudentId && open,
  });

  // Resolve the active Fee Master Structure directly from http://localhost:5173/college/fee-structures
  const activeFeeMasterStructure = React.useMemo<MonthlyFeeStructure | null>(() => {
    // 1. If backend resolved a fee structure from fee master:
    if (studentFeeStructure?.structureId) {
      const exact = feeMasterStructures.find((fs) => fs.id === studentFeeStructure.structureId);
      if (exact) return exact;
    }

    // 2. Match from feeMasterStructures using selected student details
    if (selectedStudent) {
      const sCourseId = selectedStudent.courseId;
      const sCourseName = (selectedStudent.courseName || "").toLowerCase();
      const sQuota = (selectedStudent.quotaCategory || "general").toLowerCase();

      const matchingCourseStructures = feeMasterStructures.filter((fs) => {
        if (sCourseId && fs.courseId === sCourseId) return true;
        if (fs.courseName && sCourseName && (fs.courseName.toLowerCase().includes(sCourseName) || sCourseName.includes(fs.courseName.toLowerCase()))) return true;
        return false;
      });

      if (matchingCourseStructures.length > 0) {
        // Priority 1: exact academic year and quota
        const p1 = matchingCourseStructures.find(
          (fs) => fs.academicYear === academicYear && (fs.quotaCategory || "").toLowerCase() === sQuota
        );
        if (p1) return p1;

        // Priority 2: exact academic year and general quota
        const p2 = matchingCourseStructures.find(
          (fs) => fs.academicYear === academicYear && (fs.quotaCategory || "").toLowerCase() === "general"
        );
        if (p2) return p2;

        // Priority 3: exact academic year with any quota
        const p3 = matchingCourseStructures.find((fs) => fs.academicYear === academicYear);
        if (p3) return p3;

        // Priority 4: student quota across any academic year
        const p4 = matchingCourseStructures.find((fs) => (fs.quotaCategory || "").toLowerCase() === sQuota);
        if (p4) return p4;

        // Priority 5: general quota across any academic year
        const p5 = matchingCourseStructures.find((fs) => (fs.quotaCategory || "").toLowerCase() === "general");
        if (p5) return p5;

        return matchingCourseStructures[0];
      }
    }

    // 3. Fallback to studentFeeStructure if it has positive rates
    if (studentFeeStructure && (studentFeeStructure.monthlyCourseFee > 0 || studentFeeStructure.monthlyHostelFee > 0 || studentFeeStructure.monthlyMessFee > 0)) {
      return {
        id: studentFeeStructure.structureId || 0,
        courseId: studentFeeStructure.courseId || 0,
        courseName: studentFeeStructure.courseName || "",
        quotaCategory: studentFeeStructure.quotaCategory || "general",
        academicYear: studentFeeStructure.academicYear || academicYear,
        monthlyCourseFee: studentFeeStructure.monthlyCourseFee,
        monthlyHostelFee: studentFeeStructure.monthlyHostelFee,
        monthlyMessFee: studentFeeStructure.monthlyMessFee,
        monthlyTotal: studentFeeStructure.monthlyTotal,
      };
    }

    // 4. Default to first structure in fee master
    return feeMasterStructures[0] || null;
  }, [
    feeMasterStructures,
    studentFeeStructure?.structureId,
    studentFeeStructure?.courseId,
    studentFeeStructure?.courseName,
    studentFeeStructure?.quotaCategory,
    studentFeeStructure?.academicYear,
    studentFeeStructure?.monthlyCourseFee,
    studentFeeStructure?.monthlyHostelFee,
    studentFeeStructure?.monthlyMessFee,
    studentFeeStructure?.monthlyTotal,
    selectedStudent?.courseId,
    selectedStudent?.courseName,
    selectedStudent?.quotaCategory,
    academicYear,
  ]);

  const availableAdvance = Number(advanceBalance?.unadjustedBalance || 0);

  // Sync advance adjustment
  React.useEffect(() => {
    if (!adjustAdvance) {
      setAdvanceAdjustedAmount(0);
    } else {
      setAdvanceAdjustedAmount(availableAdvance);
    }
  }, [adjustAdvance, availableAdvance]);

  // Fetch past fee transactions for the selected student to detect already paid fees
  const { data: rawStudentTransactions } = useQuery<any[]>({
    queryKey: ["nursing", "student-transactions", selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return [];
      const res = await fetch(`/api/nursing/fees/transactions?studentId=${selectedStudentId}&pageSize=100`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.transactions || [];
    },
    enabled: !!selectedStudentId && open,
  });
  const studentTransactions = rawStudentTransactions ?? EMPTY_TRANSACTIONS;

  // Map of already paid fees for the selected student: key `${normalizedCategory}:${normalizedMonthKey}` -> PaidFeeInfo
  const paidFeesMap = React.useMemo(() => {
    if (!selectedStudentId || !studentTransactions || studentTransactions.length === 0) {
      return EMPTY_PAID_MAP;
    }
    const map = new Map<string, PaidFeeInfo>();
    if (!selectedStudentId || !studentTransactions || studentTransactions.length === 0) {
      return map;
    }

    studentTransactions.forEach((tx: any) => {
      if (tx.status === "refunded") return;

      let r: any = null;
      if (typeof tx.remarks === "object" && tx.remarks !== null) {
        r = tx.remarks;
      } else if (typeof tx.remarks === "string") {
        try {
          r = JSON.parse(tx.remarks);
        } catch {
          r = null;
        }
      }

      const txItems = Array.isArray(r?.items)
        ? r.items
        : (Array.isArray(r?.breakdown) ? r.breakdown : []);

      if (txItems.length > 0) {
        txItems.forEach((it: any) => {
          const cat = normalizeCategoryName(it.category || it.name || tx.feeType || "Course Fee");
          const months: string[] = Array.isArray(it.selectedMonths) && it.selectedMonths.length > 0
            ? it.selectedMonths
            : (Array.isArray(it.coveredMonths) ? it.coveredMonths : []);

          months.forEach((mToken) => {
            const normMonth = normalizeMonthToKey(mToken);
            if (normMonth) {
              const key = `${cat}:${normMonth}`;
              if (!map.has(key)) {
                map.set(key, {
                  receiptNumber: tx.receiptNumber,
                  paymentDate: tx.paymentDate,
                  amount: Number(it.amount || tx.amount || 0),
                  periodLabel: it.periodLabel || normMonth,
                });
              }
            }
          });
        });
      } else {
        // Single-component / legacy transaction without itemized breakdown
        const rawFeeType = tx.feeType || r?.category || "Course Fee";
        const categories: FeeCategoryType[] = [];
        const lowerFee = rawFeeType.toLowerCase();
        if (lowerFee.includes("hostel & mess") || (lowerFee.includes("hostel") && lowerFee.includes("mess"))) {
          categories.push("Hostel Fee", "Mess Fee");
        } else if (lowerFee.includes("hostel")) {
          categories.push("Hostel Fee");
        } else if (lowerFee.includes("mess")) {
          categories.push("Mess Fee");
        } else {
          categories.push(normalizeCategoryName(rawFeeType));
        }

        const months: string[] = Array.isArray(r?.selectedMonths) && r.selectedMonths.length > 0
          ? r.selectedMonths
          : (Array.isArray(r?.coveredMonths) && r.coveredMonths.length > 0
            ? r.coveredMonths
            : (Array.isArray(r?.selectedPeriods) ? r.selectedPeriods : []));

        categories.forEach((cat) => {
          months.forEach((mToken) => {
            const normMonth = normalizeMonthToKey(mToken);
            if (normMonth) {
              const key = `${cat}:${normMonth}`;
              if (!map.has(key)) {
                map.set(key, {
                  receiptNumber: tx.receiptNumber,
                  paymentDate: tx.paymentDate,
                  amount: Number(tx.amount || 0),
                  periodLabel: normMonth,
                });
              }
            }
          });
        });
      }
    });

    return map;
  }, [selectedStudentId, studentTransactions]);

  const isMonthPaid = React.useCallback(
    (category: FeeCategoryType, monthKey: string): PaidFeeInfo | undefined => {
      if (paidFeesMap.size === 0) return undefined;
      const normCat = normalizeCategoryName(category);
      const normMonth = normalizeMonthToKey(monthKey);
      return paidFeesMap.get(`${normCat}:${normMonth}`);
    },
    [paidFeesMap]
  );

  // Auto-fill monthly rates whenever the fee master structure loads or updates
  React.useEffect(() => {
    if (!activeFeeMasterStructure) return;

    const hasHostel = (activeFeeMasterStructure.monthlyHostelFee || 0) > 0;
    const hasMess = (activeFeeMasterStructure.monthlyMessFee || 0) > 0;

    setItems((prev) => {
      let hasChanges = false;
      // 1. Update existing items
      const updatedExisting = prev.map((it) => {
        let defaultRate = it.unitPrice;
        if (it.category === "Course Fee") {
          defaultRate = activeFeeMasterStructure.monthlyCourseFee || 0;
        } else if (it.category === "Hostel Fee") {
          defaultRate = activeFeeMasterStructure.monthlyHostelFee || 0;
        } else if (it.category === "Mess Fee") {
          defaultRate = activeFeeMasterStructure.monthlyMessFee || 0;
        }

        const rate = (it.unitPrice === 0 || !it.unitPrice) && defaultRate > 0 ? defaultRate : (it.unitPrice || defaultRate);
        if (rate !== it.unitPrice) {
          hasChanges = true;
          const qty = it.quantity || 0;
          const baseAmt = Math.round(qty * rate);

          const discType = it.discountType || "flat";
          let discAmt = it.discountAmount || 0;
          if (discType === "percent" && (it.discountPercent || 0) > 0) {
            discAmt = Math.round((baseAmt * (it.discountPercent || 0)) / 100);
          } else if (discAmt > baseAmt) {
            discAmt = baseAmt;
          }
          const discPerMonth = qty > 0 ? Math.round(discAmt / qty) : 0;

          const surType = it.surchargeType || "flat";
          let surAmt = it.surchargeAmount || 0;
          if (surType === "percent" && (it.surchargePercent || 0) > 0) {
            surAmt = Math.round((baseAmt * (it.surchargePercent || 0)) / 100);
          }
          const surPerMonth = qty > 0 ? Math.round(surAmt / qty) : 0;

          const netUnitRate = Math.max(0, rate - discPerMonth + surPerMonth);
          const netTotal = Math.max(0, baseAmt - discAmt + surAmt);

          return {
            ...it,
            unitPrice: rate,
            baseAmount: baseAmt,
            discountAmount: discAmt,
            discountPerMonth: discPerMonth,
            surchargeAmount: surAmt,
            surchargePerMonth: surPerMonth,
            netUnitPrice: netUnitRate,
            amount: netTotal,
          };
        }
        return it;
      });

      // 2. Auto-include Hostel and Mess if they exist in fee master and this is the initial items setup (without pre-selecting months)
      const isInitialOnly = prev.length === 1 && prev[0].category === "Course Fee" && (prev[0].selectedMonths?.length || 0) === 0;
      if (isInitialOnly) {
        let added = false;
        const result = [...updatedExisting];

        if (hasHostel && !result.some((it) => it.category === "Hostel Fee")) {
          const hostelRate = activeFeeMasterStructure.monthlyHostelFee;
          result.push({
            id: `item-hostel-${Date.now()}`,
            category: "Hostel Fee",
            description: buildItemDescription("Hostel Fee", academicYear, []),
            periodLabel: "No month selected",
            selectedMonths: [],
            quantity: 0,
            unitPrice: hostelRate,
            baseAmount: 0,
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
            netUnitPrice: hostelRate,
            amount: 0,
          });
          added = true;
        }

        if (hasMess && !result.some((it) => it.category === "Mess Fee")) {
          const messRate = activeFeeMasterStructure.monthlyMessFee;
          result.push({
            id: `item-mess-${Date.now() + 1}`,
            category: "Mess Fee",
            description: buildItemDescription("Mess Fee", academicYear, []),
            periodLabel: "No month selected",
            selectedMonths: [],
            quantity: 0,
            unitPrice: messRate,
            baseAmount: 0,
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
            netUnitPrice: messRate,
            amount: 0,
          });
          added = true;
        }

        if (added || hasChanges) return result;
        return prev;
      }

      if (!hasChanges) return prev;
      return updatedExisting;
    });
  }, [
    activeFeeMasterStructure?.id,
    activeFeeMasterStructure?.monthlyCourseFee,
    activeFeeMasterStructure?.monthlyHostelFee,
    activeFeeMasterStructure?.monthlyMessFee,
    academicYear,
  ]);

  // Helper to get default Academic Year
  const getDefaultAcademicYear = React.useCallback(() => {
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const startYear = curMonth >= 6 ? curYear : curYear - 1;
    return `${startYear}-${startYear + 1}`;
  }, []);

  // Helper to generate a pristine initial line item (no months pre-selected)
  const createInitialItem = React.useCallback(
    (ay: string, cat: FeeCategoryType = initialCategory): ReceiptLineItem => {
      let defaultRate = 0;
      if (activeFeeMasterStructure) {
        if (cat === "Course Fee") defaultRate = activeFeeMasterStructure.monthlyCourseFee || 0;
        else if (cat === "Hostel Fee") defaultRate = activeFeeMasterStructure.monthlyHostelFee || 0;
        else if (cat === "Mess Fee") defaultRate = activeFeeMasterStructure.monthlyMessFee || 0;
      }
      return {
        id: `item-initial-${Date.now()}`,
        category: cat,
        description: buildItemDescription(cat, ay, []),
        periodLabel: "No month selected",
        selectedMonths: [],
        quantity: 0,
        unitPrice: defaultRate,
        baseAmount: 0,
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
        netUnitPrice: defaultRate,
        amount: 0,
      };
    },
    [initialCategory, activeFeeMasterStructure]
  );

  // Complete reset of all dialog inputs, selections, concessions, surcharges, and advance
  const resetDialog = React.useCallback(() => {
    const defaultAy = getDefaultAcademicYear();
    setSelectedStudentId(initialStudentId || null);
    setAcademicYear(defaultAy);
    setItems([createInitialItem(defaultAy, initialCategory)]);
    setPaymentMode("cash");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setReferenceNo("");
    setNarration("");
    setNotes("");
    setAdjustAdvance(false);
    setAdvanceAdjustedAmount(0);
  }, [initialStudentId, initialCategory, getDefaultAcademicYear, createInitialItem]);

  const resetDialogRef = React.useRef(resetDialog);
  resetDialogRef.current = resetDialog;

  // Reset dialog state whenever open prop transitions from false to true
  const prevOpenRef = React.useRef(open);
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      resetDialogRef.current();
    }
    prevOpenRef.current = open;
  }, [open]);

  const createInitialItemRef = React.useRef(createInitialItem);
  createInitialItemRef.current = createInitialItem;

  // Reset items when student selection changes to allow fresh tariff pre-population
  const prevStudentIdRef = React.useRef(selectedStudentId);
  React.useEffect(() => {
    if (prevStudentIdRef.current !== selectedStudentId) {
      prevStudentIdRef.current = selectedStudentId;
      if (selectedStudentId) {
        setItems([createInitialItemRef.current(academicYear, initialCategory)]);
      }
    }
  }, [selectedStudentId, academicYear, initialCategory]);

  // Auto-sanitize selected months when paid fees map loads
  React.useEffect(() => {
    if (paidFeesMap.size === 0) return;

    setItems((prev) => {
      let hasChanges = false;
      const updated = prev.map((it) => {
        const currentMonths = it.selectedMonths || [];
        const hasPaid = currentMonths.some((m) => !!isMonthPaid(it.category, m));
        if (!hasPaid) return it;

        hasChanges = true;
        const unpaidMonths = currentMonths.filter((m) => !isMonthPaid(it.category, m));
        const finalMonths = unpaidMonths;

        const qty = finalMonths.length;
        const rate = it.unitPrice || 0;
        const baseAmt = Math.round(qty * rate);

        const discType = it.discountType || "flat";
        let discAmt = it.discountAmount || 0;
        if (qty === 0) {
          discAmt = 0;
        } else if (discType === "percent" && (it.discountPercent || 0) > 0) {
          discAmt = Math.round((baseAmt * (it.discountPercent || 0)) / 100);
        } else if (discAmt > baseAmt) {
          discAmt = baseAmt;
        }
        const discPerMonth = qty > 0 ? Math.round(discAmt / qty) : 0;

        const surType = it.surchargeType || "flat";
        let surAmt = it.surchargeAmount || 0;
        if (qty === 0) {
          surAmt = 0;
        } else if (surType === "percent" && (it.surchargePercent || 0) > 0) {
          surAmt = Math.round((baseAmt * (it.surchargePercent || 0)) / 100);
        }
        const surPerMonth = qty > 0 ? Math.round(surAmt / qty) : 0;

        const netUnitRate = Math.max(0, rate - discPerMonth + surPerMonth);
        const netTotal = Math.max(0, baseAmt - discAmt + surAmt);

        return {
          ...it,
          selectedMonths: finalMonths,
          quantity: qty,
          baseAmount: baseAmt,
          discountAmount: discAmt,
          discountPerMonth: discPerMonth,
          surchargeAmount: surAmt,
          surchargePerMonth: surPerMonth,
          netUnitPrice: netUnitRate,
          amount: netTotal,
          description: buildItemDescription(it.category, academicYear, finalMonths),
          periodLabel: buildPeriodLabel(it.category, academicYear, finalMonths),
        };
      });

      if (!hasChanges) return prev;
      return updated;
    });
  }, [paidFeesMap, isMonthPaid, academicYear]);

  // Handle open state change with automatic cleanup
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetDialog();
    }
    onOpenChange(nextOpen);
  };

  // Handle toggling an entire fee category card in Step 2
  const handleToggleCategoryCard = (cat: FeeCategoryType) => {
    setItems((prev) => {
      const exists = prev.some((it) => it.category === cat);
      if (exists) {
        if (prev.length <= 1) {
          toast.error("Please keep at least one fee head selected");
          return prev;
        }
        return prev.filter((it) => it.category !== cat);
      } else {
        // Add new fee head with NO months pre-selected and pre-filled standard monthly rate
        let defaultRate = 0;
        if (cat === "Course Fee") {
          defaultRate = activeFeeMasterStructure?.monthlyCourseFee || 0;
        } else if (cat === "Hostel Fee") {
          defaultRate = activeFeeMasterStructure?.monthlyHostelFee || 0;
        } else if (cat === "Mess Fee") {
          defaultRate = activeFeeMasterStructure?.monthlyMessFee || 0;
        }

        const newItem: ReceiptLineItem = {
          id: `item-${cat.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
          category: cat,
          description: buildItemDescription(cat, academicYear, []),
          periodLabel: "No month selected",
          selectedMonths: [],
          quantity: 0,
          unitPrice: defaultRate,
          baseAmount: 0,
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
          netUnitPrice: defaultRate,
          amount: 0,
        };
        return [...prev, newItem];
      }
    });
  };

  // Update specific item's covered months independently (excluding any already paid months)
  const updateItemMonths = (itemId: string, newMonths: string[]) => {
    const targetItem = items.find((it) => it.id === itemId);
    const cat = targetItem?.category || "Course Fee";
    const unPaidOnly = newMonths.filter((m) => !isMonthPaid(cat, m));

    const sorted = [...unPaidOnly].sort((a, b) => {
      const idxA = ayMonths.findIndex((m) => m.key === a);
      const idxB = ayMonths.findIndex((m) => m.key === b);
      return idxA - idxB;
    });

    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const qty = sorted.length;
        const rate = it.unitPrice || (it.baseAmount && it.quantity ? Math.round(it.baseAmount / it.quantity) : 0);
        const baseAmt = Math.round(qty * rate);

        const discType = it.discountType || "flat";
        let discAmt = it.discountAmount || 0;
        if (qty === 0) {
          discAmt = 0;
        } else if (discType === "percent" && (it.discountPercent || 0) > 0) {
          discAmt = Math.round((baseAmt * (it.discountPercent || 0)) / 100);
        } else if (discAmt > baseAmt) {
          discAmt = baseAmt;
        }
        const discPerMonth = qty > 0 ? Math.round(discAmt / qty) : 0;

        const surType = it.surchargeType || "flat";
        let surAmt = it.surchargeAmount || 0;
        if (qty === 0) {
          surAmt = 0;
        } else if (surType === "percent" && (it.surchargePercent || 0) > 0) {
          surAmt = Math.round((baseAmt * (it.surchargePercent || 0)) / 100);
        }
        const surPerMonth = qty > 0 ? Math.round(surAmt / qty) : 0;

        const netUnitRate = Math.max(0, rate - discPerMonth + surPerMonth);
        const netTotal = Math.max(0, baseAmt - discAmt + surAmt);

        return {
          ...it,
          selectedMonths: sorted,
          quantity: qty,
          description: buildItemDescription(it.category, academicYear, sorted),
          periodLabel: buildPeriodLabel(it.category, academicYear, sorted),
          unitPrice: rate,
          baseAmount: baseAmt,
          discountAmount: discAmt,
          discountPerMonth: discPerMonth,
          surchargeAmount: surAmt,
          surchargePerMonth: surPerMonth,
          netUnitPrice: netUnitRate,
          amount: netTotal,
        };
      })
    );
  };

  // Toggle single month for a specific item
  const toggleItemMonth = (itemId: string, monthKey: string) => {
    const targetItem = items.find((it) => it.id === itemId);
    if (!targetItem) return;
    if (isMonthPaid(targetItem.category, monthKey)) {
      toast.error(`${monthKey} has already been paid for ${targetItem.category}`);
      return;
    }
    const currentMonths = targetItem.selectedMonths || [];
    const isSelected = currentMonths.includes(monthKey);
    const updatedMonths = isSelected
      ? currentMonths.filter((m) => m !== monthKey)
      : [...currentMonths, monthKey];

    updateItemMonths(itemId, updatedMonths);
  };

  // Copy months from another item (e.g. Mess copies Hostel)
  const copyMonthsFromItem = (targetItemId: string, sourceCategory: FeeCategoryType) => {
    const sourceItem = items.find((it) => it.category === sourceCategory);
    const targetItem = items.find((it) => it.id === targetItemId);
    if (!sourceItem || !sourceItem.selectedMonths || sourceItem.selectedMonths.length === 0) {
      toast.error(`No months selected in ${sourceCategory} to copy`);
      return;
    }
    const targetCat = targetItem?.category || "Mess Fee";
    const unPaidOnly = sourceItem.selectedMonths.filter((m) => !isMonthPaid(targetCat, m));
    if (unPaidOnly.length === 0) {
      toast.info(`All selected months from ${sourceCategory} are already paid for ${targetCat}`);
      return;
    }
    updateItemMonths(targetItemId, unPaidOnly);
    toast.success(`Copied ${unPaidOnly.length} unpaid month(s) from ${sourceCategory}`);
  };

  // Update Academic Year globally
  const handleAcademicYearChange = (newAy: string) => {
    setAcademicYear(newAy);
    setItems((prev) =>
      prev.map((it) => {
        const months = it.selectedMonths || [];
        return {
          ...it,
          description: buildItemDescription(it.category, newAy, months),
          periodLabel: buildPeriodLabel(it.category, newAy, months),
        };
      })
    );
  };

  // Line item field update (quantity, unitPrice, amount, description, discounts, surcharges)
  const updateItem = (id: string, updates: Partial<ReceiptLineItem>) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, ...updates };
        const qty = Number(updated.quantity || 1);

        if (updates.quantity !== undefined || updates.unitPrice !== undefined) {
          const rate = Number(updated.unitPrice || 0);
          updated.baseAmount = Math.round(qty * rate);
        } else if (updates.baseAmount !== undefined) {
          updated.unitPrice = qty > 0 ? Math.round(Number(updated.baseAmount) / qty) : Number(updated.baseAmount);
        } else if (updated.baseAmount === undefined) {
          updated.baseAmount = Math.round(qty * Number(updated.unitPrice || 0));
        }

        const base = Number(updated.baseAmount || 0);

        const discType = updated.discountType || "flat";
        let discAmt = Number(updated.discountAmount || 0);
        if (discType === "percent") {
          discAmt = Math.round((base * Number(updated.discountPercent || 0)) / 100);
        } else if (discAmt > base) {
          discAmt = base;
        }
        updated.discountAmount = discAmt;
        updated.discountPerMonth = qty > 0 ? Math.round(discAmt / qty) : 0;

        const surType = updated.surchargeType || "flat";
        let surAmt = Number(updated.surchargeAmount || 0);
        if (surType === "percent") {
          surAmt = Math.round((base * Number(updated.surchargePercent || 0)) / 100);
        }
        updated.surchargeAmount = surAmt;
        updated.surchargePerMonth = qty > 0 ? Math.round(surAmt / qty) : 0;

        updated.netUnitPrice = Math.max(0, Number(updated.unitPrice || 0) - updated.discountPerMonth + updated.surchargePerMonth);
        updated.amount = Math.max(0, base - discAmt + surAmt);

        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      toast.error("Receipt must have at least one fee head");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const addCustomItem = (cat: FeeCategoryType) => {
    const isCourse = cat === "Course Fee";
    const mode = isCourse ? "semester" : "months";
    const sem = "Semester 1";
    const initialMonths: string[] = [];
    const qty = 0;

    let defaultRate = 0;
    if (activeFeeMasterStructure) {
      if (cat === "Course Fee") defaultRate = activeFeeMasterStructure.monthlyCourseFee || 0;
      else if (cat === "Hostel Fee") defaultRate = activeFeeMasterStructure.monthlyHostelFee || 0;
      else if (cat === "Mess Fee") defaultRate = activeFeeMasterStructure.monthlyMessFee || 0;
    }
    const baseAmt = 0;

    const newItem: ReceiptLineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: cat,
      description: buildItemDescription(cat, academicYear, sem, initialMonths, mode),
      periodLabel: buildPeriodLabel(cat, academicYear, sem, initialMonths, mode),
      selectedMonths: initialMonths,
      courseFeeMode: mode,
      semester: sem,
      quantity: qty,
      unitPrice: defaultRate,
      baseAmount: baseAmt,
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
      netUnitPrice: defaultRate,
      amount: baseAmt,
    };
    setItems((prev) => [...prev, newItem]);
  };

  // Aggregate Calculations across all items
  const grossSubtotal = items.reduce(
    (sum, it) => sum + Number(it.baseAmount ?? (Number(it.quantity || 1) * Number(it.unitPrice || 0))),
    0
  );
  const totalDiscountAmount = items.reduce(
    (sum, it) => sum + (Number(it.discountAmount) || 0),
    0
  );
  const totalSurchargeAmount = items.reduce(
    (sum, it) => sum + (Number(it.surchargeAmount) || 0),
    0
  );

  const netBeforeAdvance = Math.max(0, grossSubtotal - totalDiscountAmount + totalSurchargeAmount);
  const effectiveAdvanceAdjusted = Math.min(advanceAdjustedAmount, netBeforeAdvance);
  const finalPayable = Math.max(0, netBeforeAdvance - effectiveAdvanceAdjusted);

  // Submit Mutation
  const createReceiptMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudentId) {
        throw new Error("Please select an enrolled student");
      }
      if (items.length === 0) {
        throw new Error("Please select at least one fee head");
      }
      if (grossSubtotal <= 0) {
        throw new Error("Receipt payment amount must be greater than zero");
      }
      for (const it of items) {
        if (!it.selectedMonths || it.selectedMonths.length === 0) {
          throw new Error(`Please select at least one covered month for ${it.category}`);
        }
        if ((Number(it.discountAmount) || 0) > 0 && !it.discountReason?.trim()) {
          throw new Error(`Please provide a reason for the fee concession on ${it.category}`);
        }
        if ((Number(it.surchargeAmount) || 0) > 0 && !it.surchargeReason?.trim()) {
          throw new Error(`Please provide a reason for the fee surcharge on ${it.category}`);
        }
      }

      const primaryCategory = items[0]?.category || "Course Fee";
      const allItemMonths = Array.from(
        new Set(items.flatMap((it) => it.selectedMonths || []))
      );

      // Explicit structured period details for the backend
      const periodDetails = {
        academicYear,
        feeType: items.map((it) => it.category).join(", "),
        paymentFrequency: allItemMonths.length > 0 ? "monthly" : "yearly",
        periodType: allItemMonths.length > 0 ? "month" : "academic_year",
        selectedMonths: allItemMonths,
        monthCount: allItemMonths.length,
        itemsBreakdown: items.map((it) => ({
          category: it.category,
          periodLabel: it.periodLabel,
          selectedMonths: it.selectedMonths || [],
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          amount: it.amount,
        })),
        periodSummary: items
          .map((it) => `${it.category}: ${it.periodLabel || "N/A"}`)
          .join(" | "),
      };

      const itemsPayload = items.map((it) => {
        const qty = Number(it.quantity || 1);
        const base = Number(it.baseAmount || (qty * Number(it.unitPrice || 0)));
        const disc = Number(it.discountAmount || 0);
        const sur = Number(it.surchargeAmount || 0);
        const discPerMo = qty > 0 ? Math.round(disc / qty) : 0;
        const surPerMo = qty > 0 ? Math.round(sur / qty) : 0;
        return {
          category: it.category,
          name: it.category,
          description: it.description,
          periodLabel: it.periodLabel,
          selectedMonths: it.selectedMonths || [],
          quantity: qty,
          unitPrice: Number(it.unitPrice || 0),
          baseAmount: base,
          discountType: it.discountType || "flat",
          discountPercent: it.discountType === "percent" ? it.discountPercent : null,
          discountAmount: disc,
          discountReason: it.discountReason?.trim() || null,
          discountPerMonth: discPerMo,
          surchargeType: it.surchargeType || "flat",
          surchargePercent: it.surchargeType === "percent" ? it.surchargePercent : null,
          surchargeAmount: sur,
          surchargeReason: it.surchargeReason?.trim() || null,
          surchargePerMonth: surPerMo,
          netUnitPrice: Math.max(0, Number(it.unitPrice || 0) - discPerMo + surPerMo),
          amount: Number(it.amount),
        };
      });

      const allDiscounts = items.filter((i) => Number(i.discountAmount || 0) > 0);
      const allSurcharges = items.filter((i) => Number(i.surchargeAmount || 0) > 0);

      const remarksPayload = {
        isCollegeReceipt: true,
        recipientType: "student",
        studentId: selectedStudentId,
        studentName: selectedStudent?.name,
        studentEnrollmentNo: selectedStudent?.enrollmentNo,
        studentCourse: selectedStudent?.courseName,
        category: primaryCategory,
        grossSubtotal,
        discountAmount: totalDiscountAmount,
        discountReason: allDiscounts.map((i) => `${i.category}: ${i.discountReason || "Concession"}`).join("; ") || null,
        surchargeAmount: totalSurchargeAmount,
        surchargeReason: allSurcharges.map((i) => `${i.category}: ${i.surchargeReason || "Surcharge"}`).join("; ") || null,
        advanceAdjustedAmount: effectiveAdvanceAdjusted,
        narration: narration.trim() || null,
        notes: notes.trim() || null,
        academicYear,
        selectedMonths: allItemMonths,
        selectedPeriods: allItemMonths.length > 0 ? allItemMonths : [primaryCategory === "Course Fee" ? "Semester 1" : ""].filter(Boolean),
        coveredMonths: allItemMonths,
        billingPeriodType: allItemMonths.length > 0 ? "month" : "semester",
        billingPeriodValue: periodDetails.periodSummary,
        periodDetails,
        items: itemsPayload,
        referenceNo: referenceNo.trim() || null,
      };

      const res = await fetch("/api/nursing/fees/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          feeType: items.map((i) => i.category).filter(Boolean).slice(0, 3).join(", ") || primaryCategory,
          amount: finalPayable,
          paymentMode,
          paymentDate,
          paymentFrequency: allItemMonths.length > 0 ? "monthly" : "yearly",
          remarks: JSON.stringify(remarksPayload),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record fee receipt");
      }
      const tx = await res.json();
      return { tx, itemsPayload };
    },
    onSuccess: (data: { tx: any; itemsPayload: any[] }) => {
      const { tx, itemsPayload } = data;
      toast.success(`Fee Receipt Issued! Receipt #: ${tx.receiptNumber}`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "fee-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "student-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees", "due-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "student-advance-balance"] });

      if (onSuccess) onSuccess(tx);

      const periodSummary = items
        .map((it) => `${it.category}: ${it.periodLabel || "N/A"}`)
        .join(" | ");

      const receiptData: CollegeReceiptData = {
        receiptNumber: tx.receiptNumber,
        invoiceNo: tx.invoiceNo || tx.receiptNumber,
        paymentDate: tx.paymentDate || paymentDate,
        paymentMode: tx.paymentMode || paymentMode,
        amount: Number(tx.amount || finalPayable),
        feeType: tx.feeType || "Course Fee",
        studentId: selectedStudentId || undefined,
        studentName: selectedStudent?.name,
        enrollmentNo: selectedStudent?.enrollmentNo,
        studentCourse: selectedStudent?.courseName,
        remarks: {
          isCollegeReceipt: true,
          grossSubtotal,
          discountAmount: totalDiscountAmount,
          surchargeAmount: totalSurchargeAmount,
          advanceAdjustedAmount: effectiveAdvanceAdjusted,
          academicYear,
          periodDetails: {
            academicYear,
            periodSummary,
          },
          items: itemsPayload,
        },
      };

      setSuccessReceipt(receiptData);
      setSuccessModalOpen(true);
      if (selectedStudent?.phone) {
        setWhatsappPhone(selectedStudent.phone);
      }

      // Close create dialog and reset details for subsequent openings
      handleOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to issue fee receipt");
    },
  });

  return (
    <>
      {/* Primary Collection Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-4xl h-[90vh] min-h-[680px] max-h-[94vh] p-3 sm:p-5 flex flex-col overflow-hidden rounded-xl">
          <DialogHeader className="p-0 pb-2 border-b">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                  Collect Student Fees (Independent Periods per Fee Head)
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground truncate sm:whitespace-normal">
                  Configure distinct months and billing periods independently for Tuition, Hostel, and Mess fees.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm">
            {/* STEP 1: Student Selection via Autocomplete */}
            <div className="space-y-2.5 bg-muted/20 p-3 sm:p-3.5 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-teal-600" />
                  <span>Step 1: Select Enrolled Student *</span>
                </label>
                {selectedStudent && (
                  <button
                    type="button"
                    onClick={() => setSelectedStudentId(null)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" /> Change Student
                  </button>
                )}
              </div>

              <Autocomplete
                placeholder="Type student name or enrollment / roll number to search..."
                options={studentAutocompleteOptions}
                value={selectedStudentId ? String(selectedStudentId) : ""}
                onChange={(val) => {
                  setSelectedStudentId(val ? Number(val) : null);
                }}
                inputClassName="h-9 sm:h-8 text-xs bg-background"
              />

              {/* Selected Student Information Banner */}
              {selectedStudent ? (
                <div className="bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-md p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-bold text-teal-900 dark:text-teal-100 flex items-center gap-1.5 flex-wrap">
                      <GraduationCap className="h-4 w-4 text-teal-600 shrink-0" />
                      <span>{selectedStudent.name}</span>
                      <span className="text-muted-foreground font-normal text-[11px]">
                        • Roll No: {selectedStudent.enrollmentNo}
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[11px] mt-0.5 truncate">
                      Course: <span className="font-medium text-foreground">{selectedStudent.courseName}</span>
                      {selectedStudent.batchName && ` (${selectedStudent.batchName})`} • Quota: {selectedStudent.quotaCategory}
                    </div>

                    {activeFeeMasterStructure ? (
                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5 text-[11px]">
                        <span className="text-teal-800 dark:text-teal-200 font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <Layers className="h-3 w-3 text-teal-600" />
                          Fee Master Tariff ({activeFeeMasterStructure.academicYear}):
                        </span>
                        <span className="bg-teal-100/90 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 px-1.5 py-0.5 rounded text-[10px] font-medium border border-teal-200 dark:border-teal-800">
                          Course: ₹{Number(activeFeeMasterStructure.monthlyCourseFee || 0).toLocaleString()}/mo
                        </span>
                        {Number(activeFeeMasterStructure.monthlyHostelFee || 0) > 0 && (
                          <span className="bg-indigo-100/90 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-medium border border-indigo-200 dark:border-indigo-800">
                            Hostel: ₹{Number(activeFeeMasterStructure.monthlyHostelFee).toLocaleString()}/mo
                          </span>
                        )}
                        {Number(activeFeeMasterStructure.monthlyMessFee || 0) > 0 && (
                          <span className="bg-amber-100/90 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-200 dark:border-amber-800">
                            Mess: ₹{Number(activeFeeMasterStructure.monthlyMessFee).toLocaleString()}/mo
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-teal-900 dark:text-teal-100">
                          (₹{Number(activeFeeMasterStructure.monthlyTotal || 0).toLocaleString()}/mo)
                        </span>
                        <a
                          href="/college/fee-structures"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 ml-1"
                          title="Open Fee Master in new tab"
                        >
                          Fee Master ↗
                        </a>
                      </div>
                    ) : (
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                        <span>No monthly fee structure configured in Fee Master.</span>
                        <a
                          href="/college/fee-structures"
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-600 dark:text-teal-400 font-medium underline"
                        >
                          Configure in Fee Master ↗
                        </a>
                      </div>
                    )}
                  </div>

                  {availableAdvance > 0 && (
                    <div className="flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 px-2 py-1 rounded-md text-[11px] font-medium shrink-0 self-start sm:self-auto">
                      <span>Booking Advance: ₹{availableAdvance.toLocaleString()}</span>
                      <label className="flex items-center gap-1 cursor-pointer font-bold ml-1">
                        <input
                          type="checkbox"
                          checked={adjustAdvance}
                          onChange={(e) => setAdjustAdvance(e.target.checked)}
                          className="rounded text-teal-600"
                        />
                        Adjust
                      </label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded border border-dashed text-center">
                  Search and select a student above to proceed with fee type and covered month selection.
                </div>
              )}
            </div>

            {/* STEP 2: Present Fee Types (Active only after student is selected) */}
            {selectedStudent && (
              <div className="space-y-2.5 bg-muted/20 p-3 sm:p-3.5 rounded-lg border border-border">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-teal-600" />
                    <span>Step 2: Select Fee Type(s) to Collect</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Click cards to activate or deactivate fee heads
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {TIMEBOUND_FEE_CATEGORIES.map((cat) => {
                    const isSelected = activeCategories.includes(cat.value);
                    const IconComponent = cat.icon;

                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => handleToggleCategoryCard(cat.value)}
                        className={cn(
                          "p-3 rounded-lg border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                          isSelected
                            ? `${cat.accentColor} shadow-xs ring-1 ring-teal-500/50`
                            : "bg-background border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
                              isSelected ? "bg-white/80 dark:bg-black/40 text-foreground" : "bg-muted text-muted-foreground"
                            )}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="font-semibold text-xs text-foreground leading-tight">
                              {cat.title}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="h-5 w-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                          {cat.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: Configure Billing Period & Months FOR EACH SELECTED FEE HEAD INDEPENDENTLY */}
            {selectedStudent && items.length > 0 && (
              <div className="space-y-3 bg-muted/20 p-3 sm:p-3.5 rounded-lg border border-border">
                <div className="flex flex-wrap items-center justify-between border-b pb-1.5 gap-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <CalendarCheck className="h-3.5 w-3.5 text-teal-600" />
                    <span>Step 3: Select Covered Periods & Months (Independent per Fee Head)</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">Academic Year:</span>
                    <Select value={academicYear} onValueChange={handleAcademicYearChange}>
                      <SelectTrigger className="h-7 w-44 sm:w-48 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025">AY 2024-2025</SelectItem>
                        <SelectItem value="2025-2026">AY 2025-2026</SelectItem>
                        <SelectItem value="2026-2027">AY 2026-2027</SelectItem>
                        <SelectItem value="2027-2028">AY 2027-2028</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Render distinct period selector card for each active fee item */}
                <div className="space-y-3">
                  {items.map((item, itemIdx) => {
                    const isCourse = item.category === "Course Fee";
                    const isHostel = item.category === "Hostel Fee";
                    const isMess = item.category === "Mess Fee";
                    const itemMonths = item.selectedMonths || [];

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-lg border bg-card space-y-2.5 transition-all",
                          isCourse && "border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10",
                          isHostel && "border-purple-200 dark:border-purple-900/60 bg-purple-50/20 dark:bg-purple-950/10",
                          isMess && "border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10"
                        )}
                      >
                        {/* Fee Head Card Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="h-6 w-6 rounded-md flex items-center justify-center shrink-0 text-white text-xs font-bold bg-teal-600">
                              #{itemIdx + 1}
                            </span>
                            <span className="font-bold text-xs text-foreground">
                              {item.category === "Course Fee" && "Tuition / Course Fee"}
                              {item.category === "Hostel Fee" && "Hostel Accommodation Fee"}
                              {item.category === "Mess Fee" && "Hostel Mess & Catering Fee"}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border">
                              {item.periodLabel || "Period not set"}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Copy Months Action for Mess */}
                            {isMess && items.some((i) => i.category === "Hostel Fee") && (
                              <button
                                type="button"
                                onClick={() => copyMonthsFromItem(item.id, "Hostel Fee")}
                                className="text-[11px] text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                title="Copy covered months from Hostel Fee"
                              >
                                <Copy className="h-3 w-3" /> Match Hostel Months
                              </button>
                            )}

                            {/* Copy Months Action for Hostel */}
                            {isHostel && items.some((i) => i.category === "Mess Fee") && (
                              <button
                                type="button"
                                onClick={() => copyMonthsFromItem(item.id, "Mess Fee")}
                                className="text-[11px] text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                title="Copy covered months from Mess Fee"
                              >
                                <Copy className="h-3 w-3" /> Match Mess Months
                              </button>
                            )}

                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
                                title="Remove this fee head"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive Month Selector (Strictly Month-Based for all Fee Heads) */}
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                            <span className="text-muted-foreground font-medium">
                              Pick Months for {item.category}:{" "}
                              <strong className="text-foreground font-semibold">
                                {itemMonths.length > 0 ? `${itemMonths.length} Selected` : "None"}
                              </strong>
                            </span>

                            <div className="flex items-center gap-1">
                              {(() => {
                                const isCurMonthPaid = !!isMonthPaid(item.category, curMonthKey);
                                return (
                                  <button
                                    type="button"
                                    disabled={isCurMonthPaid}
                                    onClick={() => {
                                      if (isCurMonthPaid) {
                                        toast.info(`${curMonthKey} is already paid for ${item.category}`);
                                        return;
                                      }
                                      updateItemMonths(item.id, [curMonthKey]);
                                    }}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded border text-muted-foreground transition-colors",
                                      isCurMonthPaid
                                        ? "opacity-40 cursor-not-allowed bg-muted/40"
                                        : "hover:bg-muted hover:text-foreground cursor-pointer"
                                    )}
                                    title={isCurMonthPaid ? `${curMonthKey} is already paid` : `Select ${curMonthKey}`}
                                  >
                                    Current Month
                                  </button>
                                );
                              })()}
                              <button
                                type="button"
                                onClick={() => {
                                  const curIdx = ayMonths.findIndex((m) => m.key === curMonthKey);
                                  const startIdx = curIdx >= 0 ? curIdx : 0;
                                  const remaining = ayMonths.slice(startIdx).filter((m) => !isMonthPaid(item.category, m.key));
                                  const nextThree = remaining.slice(0, 3).map((m) => m.key);
                                  if (nextThree.length === 0) {
                                    const anyRemaining = ayMonths.filter((m) => !isMonthPaid(item.category, m.key)).slice(0, 3).map((m) => m.key);
                                    if (anyRemaining.length === 0) {
                                      toast.info(`All months in this academic year are already paid for ${item.category}`);
                                      return;
                                    }
                                    updateItemMonths(item.id, anyRemaining);
                                  } else {
                                    updateItemMonths(item.id, nextThree);
                                  }
                                }}
                                className="px-1.5 py-0.5 rounded border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                Next 3 Mo
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const allUnpaid = ayMonths.filter((m) => !isMonthPaid(item.category, m.key)).map((m) => m.key);
                                  if (allUnpaid.length === 0) {
                                    toast.info(`All months are already paid for ${item.category}`);
                                    return;
                                  }
                                  updateItemMonths(item.id, allUnpaid);
                                }}
                                className="px-1.5 py-0.5 rounded border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                All Unpaid
                              </button>
                              {itemMonths.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => updateItemMonths(item.id, [])}
                                  className="px-1.5 py-0.5 rounded border border-rose-200 text-rose-600 dark:border-rose-900 hover:bg-rose-50 cursor-pointer"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Paid Months Status Banner if any months have been settled */}
                          {(() => {
                            const paidMonthsForHead = ayMonths.filter((m) => !!isMonthPaid(item.category, m.key));
                            if (paidMonthsForHead.length === 0) return null;
                            return (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-2 py-1 rounded">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                <span>
                                  <strong className="font-semibold">{paidMonthsForHead.length} month{paidMonthsForHead.length > 1 ? "s" : ""}</strong> already paid for {item.category} in AY {academicYear}
                                  <span className="opacity-80 text-[10px] ml-1">
                                    ({paidMonthsForHead.map((m) => m.shortName).join(", ")})
                                  </span>
                                </span>
                              </div>
                            );
                          })()}

                          {/* Month Chip Grid for this specific item */}
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-1">
                            {ayMonths.map((m) => {
                              const isSel = itemMonths.includes(m.key);
                              const paidInfo = isMonthPaid(item.category, m.key);
                              const isPaid = !!paidInfo;
                              return (
                                <button
                                  key={m.key}
                                  type="button"
                                  disabled={isPaid}
                                  onClick={() => {
                                    if (!isPaid) toggleItemMonth(item.id, m.key);
                                  }}
                                  className={cn(
                                    "h-7 px-1.5 py-0.5 rounded text-[11px] font-medium transition-all flex items-center justify-between border select-none",
                                    isPaid
                                      ? "bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 cursor-not-allowed opacity-85 shadow-none"
                                      : isSel
                                      ? "bg-teal-600 text-white border-teal-600 shadow-2xs font-semibold cursor-pointer"
                                      : "bg-background text-muted-foreground border-border hover:border-teal-400 hover:text-foreground hover:bg-muted/40 cursor-pointer"
                                  )}
                                  title={
                                    isPaid
                                      ? `Already Paid in Receipt #${paidInfo.receiptNumber} (${paidInfo.paymentDate || "Paid"})${paidInfo.amount ? ` - ₹${paidInfo.amount.toLocaleString()}` : ""}`
                                      : m.name
                                  }
                                >
                                  <span className="truncate">
                                    {m.shortName} <span className="opacity-70 text-[9px]">'{String(m.year).slice(-2)}</span>
                                  </span>
                                  {isPaid ? (
                                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 ml-0.5 shrink-0 bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-700">
                                      Paid
                                    </span>
                                  ) : isSel ? (
                                    <Check className="h-2.5 w-2.5 shrink-0 ml-0.5" />
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Rate and Quantity Preview directly on card */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-border/40 text-xs">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">
                              Covered Months (Qty)
                            </label>
                            <Input
                              type="number"
                              readOnly
                              value={item.quantity}
                              tabIndex={-1}
                              title="Quantity is calculated automatically from the selected covered months"
                              className="h-7 text-xs bg-muted/60 text-foreground font-mono font-semibold cursor-not-allowed select-none focus-visible:ring-0 border-dashed"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">
                              Rate per Month (₹)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={item.unitPrice === 0 ? "" : item.unitPrice}
                              onChange={(e) => updateItem(item.id, { unitPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="h-7 text-xs bg-background font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-0.5">
                              Base Amount (₹)
                            </label>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={(!item.baseAmount && !item.amount) ? "" : (Number(item.baseAmount) || Number(item.amount))}
                              onChange={(e) => updateItem(item.id, { baseAmount: Math.max(0, parseInt(e.target.value) || 0) })}
                              className="h-7 text-xs text-right bg-background font-mono font-medium text-foreground"
                            />
                          </div>
                        </div>

                        {/* Per-Fee-Head Adjustments: Concession & Surcharge applied equally across months */}
                        <div className="rounded-md border border-border/70 bg-muted/20 p-2 sm:p-2.5 space-y-2 mt-1">
                          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold text-foreground border-b border-border/50 pb-1">
                            <span className="flex items-center gap-1.5">
                              <BadgePercent className="h-3.5 w-3.5 text-teal-600" />
                              <span>{item.category} Adjustments (Equally Divided Across {item.quantity} Mo)</span>
                            </span>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              Base: ₹{(Number(item.baseAmount) || (item.quantity * item.unitPrice)).toLocaleString()}
                              {item.quantity > 1 && ` (₹${Number(item.unitPrice || 0).toLocaleString()}/mo)`}
                            </div>
                          </div>

                          {/* Concession Row */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] text-muted-foreground font-medium">Concession:</span>
                                <div className="flex items-center border rounded p-0.5 bg-background text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const base = Number(item.baseAmount) || (item.quantity * item.unitPrice);
                                      const discAmt = Number(item.discountAmount || 0);
                                      updateItem(item.id, {
                                        discountType: "flat",
                                        discountPercent: base > 0 && discAmt > 0 ? Number(((discAmt / base) * 100).toFixed(1)) : 0,
                                      });
                                    }}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer",
                                      (item.discountType || "flat") === "flat"
                                        ? "bg-teal-600 text-white font-semibold"
                                        : "text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    ₹ Flat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const base = Number(item.baseAmount) || (item.quantity * item.unitPrice);
                                      const discAmt = Number(item.discountAmount || 0);
                                      const pct = base > 0 && discAmt > 0 ? Number(((discAmt / base) * 100).toFixed(1)) : 0;
                                      updateItem(item.id, {
                                        discountType: "percent",
                                        discountPercent: pct,
                                        discountAmount: Math.round((base * pct) / 100),
                                      });
                                    }}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer",
                                      item.discountType === "percent"
                                        ? "bg-teal-600 text-white font-semibold"
                                        : "text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    % Percent
                                  </button>
                                </div>
                              </div>

                              <div className="w-28 sm:w-32">
                                {(item.discountType || "flat") === "flat" ? (
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1.5 text-[11px] text-muted-foreground font-mono">₹</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={Number(item.baseAmount) || (item.quantity * item.unitPrice)}
                                      placeholder="0"
                                      value={!item.discountAmount ? "" : item.discountAmount}
                                      onChange={(e) => {
                                        const base = Number(item.baseAmount) || (item.quantity * item.unitPrice);
                                        const val = Math.min(base, Math.max(0, parseInt(e.target.value) || 0));
                                        updateItem(item.id, {
                                          discountAmount: val,
                                          discountPercent: base > 0 ? Number(((val / base) * 100).toFixed(1)) : 0,
                                        });
                                      }}
                                      className="h-7 text-xs text-right font-mono bg-background pl-5"
                                    />
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      placeholder="0"
                                      value={!item.discountPercent ? "" : item.discountPercent}
                                      onChange={(e) => {
                                        const base = Number(item.baseAmount) || (item.quantity * item.unitPrice);
                                        const pct = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                        updateItem(item.id, {
                                          discountPercent: pct,
                                          discountAmount: Math.round((base * pct) / 100),
                                        });
                                      }}
                                      className="h-7 text-xs text-right font-mono bg-background pr-5"
                                    />
                                    <span className="absolute right-2.5 top-1.5 text-[11px] text-muted-foreground font-mono">%</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Live Concession distribution per month */}
                            {Number(item.discountAmount || 0) > 0 && (
                              <div className="flex flex-wrap items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30 px-2 py-1 rounded border border-amber-200/60 dark:border-amber-800/40">
                                <span>
                                  Concession: -₹{Number(item.discountAmount).toLocaleString()}
                                  {item.discountType === "percent" ? ` (${item.discountPercent}%)` : ""}
                                </span>
                                <span className="font-semibold font-mono">
                                  -₹{Number(item.discountPerMonth || Math.round(Number(item.discountAmount) / Math.max(1, item.quantity))).toLocaleString()}/mo ({item.quantity} mo)
                                </span>
                              </div>
                            )}

                            {Number(item.discountAmount || 0) > 0 && (
                              <Input
                                placeholder={`Reason for ${item.category} concession *`}
                                value={item.discountReason || ""}
                                onChange={(e) => updateItem(item.id, { discountReason: e.target.value })}
                                className="h-7 text-xs bg-amber-50/40 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700"
                              />
                            )}
                          </div>

                          {/* Surcharge Row */}
                          <div className="space-y-1 pt-1 border-t border-border/40">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] text-muted-foreground font-medium">Surcharge / Late Fee:</span>
                                <div className="flex items-center border rounded p-0.5 bg-background text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const base = Number(item.baseAmount) || (item.quantity * item.unitPrice);
                                      const surAmt = Number(item.surchargeAmount || 0);
                                      updateItem(item.id, {
                                        surchargeType: "flat",
                                        surchargePercent: base > 0 && surAmt > 0 ? Number(((surAmt / base) * 100).toFixed(1)) : 0,
                                      });
                                    }}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer",
                                      (item.surchargeType || "flat") === "flat"
                                        ? "bg-rose-600 text-white font-semibold"
                                        : "text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    ₹ Flat
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const base = Number(item.baseAmount) || (item.quantity * item.unitPrice);
                                      const surAmt = Number(item.surchargeAmount || 0);
                                      const pct = base > 0 && surAmt > 0 ? Number(((surAmt / base) * 100).toFixed(1)) : 0;
                                      updateItem(item.id, {
                                        surchargeType: "percent",
                                        surchargePercent: pct,
                                        surchargeAmount: Math.round((base * pct) / 100),
                                      });
                                    }}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-medium transition-colors cursor-pointer",
                                      item.surchargeType === "percent"
                                        ? "bg-rose-600 text-white font-semibold"
                                        : "text-muted-foreground hover:bg-muted"
                                    )}
                                  >
                                    % Percent
                                  </button>
                                </div>
                              </div>

                              <div className="w-28 sm:w-32">
                                {(item.surchargeType || "flat") === "flat" ? (
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1.5 text-[11px] text-muted-foreground font-mono">₹</span>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={!item.surchargeAmount ? "" : item.surchargeAmount}
                                      onChange={(e) => {
                                        const base = Number(item.baseAmount) || (item.quantity * item.unitPrice);
                                        const val = Math.max(0, parseInt(e.target.value) || 0);
                                        updateItem(item.id, {
                                          surchargeAmount: val,
                                          surchargePercent: base > 0 ? Number(((val / base) * 100).toFixed(1)) : 0,
                                        });
                                      }}
                                      className="h-7 text-xs text-right font-mono bg-background pl-5"
                                    />
                                  </div>
                                ) : (
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.5"
                                      placeholder="0"
                                      value={!item.surchargePercent ? "" : item.surchargePercent}
                                      onChange={(e) => {
                                        const base = Number(item.baseAmount) || (item.quantity * item.unitPrice);
                                        const pct = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                        updateItem(item.id, {
                                          surchargePercent: pct,
                                          surchargeAmount: Math.round((base * pct) / 100),
                                        });
                                      }}
                                      className="h-7 text-xs text-right font-mono bg-background pr-5"
                                    />
                                    <span className="absolute right-2.5 top-1.5 text-[11px] text-muted-foreground font-mono">%</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Live Surcharge distribution per month */}
                            {Number(item.surchargeAmount || 0) > 0 && (
                              <div className="flex flex-wrap items-center justify-between text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30 px-2 py-1 rounded border border-rose-200/60 dark:border-rose-800/40">
                                <span>
                                  Surcharge: +₹{Number(item.surchargeAmount).toLocaleString()}
                                  {item.surchargeType === "percent" ? ` (${item.surchargePercent}%)` : ""}
                                </span>
                                <span className="font-semibold font-mono">
                                  +₹{Number(item.surchargePerMonth || Math.round(Number(item.surchargeAmount) / Math.max(1, item.quantity))).toLocaleString()}/mo ({item.quantity} mo)
                                </span>
                              </div>
                            )}

                            {Number(item.surchargeAmount || 0) > 0 && (
                              <Input
                                placeholder={`Reason for ${item.category} surcharge / late fee *`}
                                value={item.surchargeReason || ""}
                                onChange={(e) => updateItem(item.id, { surchargeReason: e.target.value })}
                                className="h-7 text-xs bg-rose-50/40 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700"
                              />
                            )}
                          </div>

                          {/* Net Summary Bar for this fee type */}
                          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/50 font-medium">
                            <div className="text-muted-foreground">
                              <span>Net Rate: </span>
                              <strong className="text-foreground font-mono">
                                ₹{Number(item.netUnitPrice || Math.max(0, item.unitPrice - (item.discountPerMonth || 0) + (item.surchargePerMonth || 0))).toLocaleString()}/mo
                              </strong>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground">Net {item.category}: </span>
                              <strong className="font-mono text-teal-700 dark:text-teal-300 text-sm">
                                ₹{Number(item.amount).toLocaleString()}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: Fee Items Breakdown & Calculation Summary */}
            {selectedStudent && items.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="bg-muted/40 p-2 sm:p-2.5 border-b flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-teal-600" />
                    Receipt Line Items ({items.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Subtotal: <strong className="text-foreground font-mono">₹{grossSubtotal.toLocaleString()}</strong>
                  </span>
                </div>

                {/* Table View */}
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div key={item.id} className="p-2 sm:p-2.5 grid grid-cols-12 gap-2 items-center hover:bg-muted/10 transition-colors text-xs">
                      <div className="col-span-12 sm:col-span-4">
                        <div className="font-semibold text-foreground">{item.category}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
                      </div>

                      <div className="col-span-4 sm:col-span-3 text-center sm:text-left">
                        <span className="text-[11px] text-muted-foreground">Period: </span>
                        <span className="font-medium text-teal-700 dark:text-teal-300">{item.periodLabel}</span>
                      </div>

                      <div className="col-span-4 sm:col-span-2 text-center">
                        <span className="font-mono text-muted-foreground">{item.quantity} mo</span>
                        <span className="text-[10px] text-muted-foreground block">
                          ₹{Number(item.netUnitPrice || item.unitPrice).toLocaleString()}/mo
                        </span>
                        {(Number(item.discountAmount) > 0 || Number(item.surchargeAmount) > 0) && (
                          <div className="text-[10px] font-mono leading-tight">
                            {Number(item.discountAmount) > 0 && (
                              <span className="text-amber-600 block">-₹{item.discountPerMonth}/mo</span>
                            )}
                            {Number(item.surchargeAmount) > 0 && (
                              <span className="text-rose-600 block">+₹{item.surchargePerMonth}/mo</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="col-span-4 sm:col-span-2 text-right font-mono font-bold text-foreground">
                        ₹{Number(item.amount).toLocaleString()}
                        {(Number(item.discountAmount) > 0 || Number(item.surchargeAmount) > 0) && (
                          <div className="text-[10px] text-muted-foreground font-normal line-through">
                            ₹{(Number(item.baseAmount) || (item.quantity * item.unitPrice)).toLocaleString()}
                          </div>
                        )}
                      </div>

                      <div className="col-span-12 sm:col-span-1 text-right">
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            title="Remove row"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Quick Row Addition */}
                <div className="p-2 bg-muted/40 border-t flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground font-medium">Add Another Fee Head:</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addCustomItem("Course Fee")}
                      className="h-6 px-1.5 text-[11px] text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                    >
                      + Tuition
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addCustomItem("Hostel Fee")}
                      className="h-6 px-1.5 text-[11px] text-purple-700 dark:text-purple-300 hover:bg-purple-50"
                    >
                      + Hostel
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addCustomItem("Mess Fee")}
                      className="h-6 px-1.5 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-50"
                    >
                      + Mess
                    </Button>
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    Total Items: {items.length}
                  </span>
                </div>
              </div>
            )}

            {/* STEP 5: Payment Metadata & Net Summary */}
            {selectedStudent && items.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 pt-1">
                {/* Payment Details */}
                <div className="space-y-2.5 sm:space-y-3 bg-muted/20 p-2.5 sm:p-3 rounded-lg border border-border">
                  <div className="text-xs font-semibold text-foreground border-b pb-1.5 flex items-center justify-between">
                    <span>Payment Mode & Reference</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Transaction Details</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Payment Mode *
                      </label>
                      <Select value={paymentMode} onValueChange={setPaymentMode}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI (GPay / PhonePe / Paytm)</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</SelectItem>
                          <SelectItem value="upi_bank_transfer_dr_je">UPI/Bank Transfer - Dr JE</SelectItem>
                          <SelectItem value="card">Debit / Credit Card</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                        Payment Date *
                      </label>
                      <Input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Reference / UTR / Cheque #
                    </label>
                    <Input
                      placeholder="Transaction reference number"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                      className="h-8 text-xs font-mono bg-background"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Narration / Remarks (Printed on Receipt)
                    </label>
                    <Input
                      placeholder="e.g. Received towards Tuition & Oct-Nov Mess"
                      value={narration}
                      onChange={(e) => setNarration(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Totals & Net Payable */}
                <div className="space-y-2.5 sm:space-y-3 bg-muted/20 p-2.5 sm:p-3 rounded-lg border border-border flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-foreground border-b pb-1.5 mb-2.5">
                      Summary & Net Payable
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span>Gross Subtotal:</span>
                        <span className="font-mono font-medium text-foreground">
                          ₹{grossSubtotal.toLocaleString()}
                        </span>
                      </div>

                      {/* Summary of Fee Concessions */}
                      {totalDiscountAmount > 0 && (
                        <div className="space-y-1 bg-amber-50/50 dark:bg-amber-950/30 p-2 rounded border border-amber-200/60 dark:border-amber-800/40">
                          <div className="flex justify-between items-center text-amber-800 dark:text-amber-300 font-semibold">
                            <span>Less Total Fee Concessions:</span>
                            <span className="font-mono">-₹{totalDiscountAmount.toLocaleString()}</span>
                          </div>
                          <div className="space-y-0.5 pt-0.5">
                            {items
                              .filter((it) => (it.discountAmount || 0) > 0)
                              .map((it) => (
                                <div key={it.id} className="flex justify-between text-[11px] text-amber-700 dark:text-amber-400">
                                  <span>• {it.category} ({it.discountReason || "Concession"}):</span>
                                  <span className="font-mono">
                                    -₹{Number(it.discountAmount).toLocaleString()} (-₹{it.discountPerMonth}/mo across {it.quantity} mo)
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Summary of Fee Surcharges */}
                      {totalSurchargeAmount > 0 && (
                        <div className="space-y-1 bg-rose-50/50 dark:bg-rose-950/30 p-2 rounded border border-rose-200/60 dark:border-rose-800/40">
                          <div className="flex justify-between items-center text-rose-800 dark:text-rose-300 font-semibold">
                            <span>Plus Total Fee Surcharges:</span>
                            <span className="font-mono">+₹{totalSurchargeAmount.toLocaleString()}</span>
                          </div>
                          <div className="space-y-0.5 pt-0.5">
                            {items
                              .filter((it) => (it.surchargeAmount || 0) > 0)
                              .map((it) => (
                                <div key={it.id} className="flex justify-between text-[11px] text-rose-700 dark:text-rose-400">
                                  <span>• {it.category} ({it.surchargeReason || "Late Fee"}):</span>
                                  <span className="font-mono">
                                    +₹{Number(it.surchargeAmount).toLocaleString()} (+₹{it.surchargePerMonth}/mo across {it.quantity} mo)
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Advance adjustment row */}
                      {effectiveAdvanceAdjusted > 0 && (
                        <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400">
                          <span>Advance Fee Adjusted:</span>
                          <span className="font-mono font-medium">
                            - ₹{effectiveAdvanceAdjusted.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Final Net Amount Card */}
                  <div className="bg-teal-50/80 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-lg p-2.5 sm:p-3 mt-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] sm:text-xs font-bold text-teal-900 dark:text-teal-200 block truncate">
                        TOTAL AMOUNT TO COLLECT
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-teal-700 dark:text-teal-400">
                        Mode: {formatCollegePaymentMode(paymentMode)}
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold font-mono text-teal-700 dark:text-teal-300 shrink-0">
                      ₹{finalPayable.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-0 border-t pt-2.5 sm:pt-3 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={createReceiptMutation.isPending}
              className="w-full sm:w-auto h-9 sm:h-8 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => createReceiptMutation.mutate()}
              disabled={createReceiptMutation.isPending || grossSubtotal <= 0 || !selectedStudentId}
              className="w-full sm:w-auto h-9 sm:h-8 text-xs bg-teal-600 hover:bg-teal-700 text-white min-w-36 font-semibold cursor-pointer"
            >
              {createReceiptMutation.isPending ? "Generating..." : "Generate Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal with Immediate Print / WhatsApp / Download Actions */}
      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md p-4 sm:p-6 rounded-xl">
          <DialogHeader>
            <div className="mx-auto h-11 w-11 sm:h-12 sm:w-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 mb-1.5">
              <CheckCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-base sm:text-lg font-bold text-foreground">
              Fee Payment Recorded!
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              Official A5 receipt issued successfully with independent period breakdown.
            </DialogDescription>
          </DialogHeader>

          {successReceipt && (
            <div className="space-y-3 text-xs bg-muted/40 p-3 rounded-lg border border-border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt Number:</span>
                <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                  {successReceipt.receiptNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-semibold text-foreground">
                  {successReceipt.studentName} ({successReceipt.enrollmentNo})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  ₹{Number(successReceipt.amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Mode:</span>
                <span className="capitalize">{formatCollegePaymentMode(successReceipt.paymentMode)}</span>
              </div>
              {Number(successReceipt.remarks?.discountAmount || 0) > 0 && (
                <div className="space-y-0.5 text-amber-600 dark:text-amber-400">
                  <div className="flex justify-between">
                    <span>Fee Concessions:</span>
                    <span className="font-mono font-medium">-₹{Number(successReceipt.remarks.discountAmount).toLocaleString()}</span>
                  </div>
                  {Array.isArray(successReceipt.remarks?.items) &&
                    successReceipt.remarks.items
                      .filter((i: any) => Number(i.discountAmount || 0) > 0)
                      .map((i: any, k: number) => (
                        <div key={k} className="flex justify-between text-[10px] pl-2 text-amber-700 dark:text-amber-400/90">
                          <span>• {i.category || i.description}:</span>
                          <span>-₹{Number(i.discountAmount).toLocaleString()} (-₹{Number(i.discountPerMonth || Math.round(i.discountAmount / Math.max(1, i.quantity || 1))).toLocaleString()}/mo)</span>
                        </div>
                      ))}
                </div>
              )}
              {Number(successReceipt.remarks?.surchargeAmount || 0) > 0 && (
                <div className="space-y-0.5 text-rose-600 dark:text-rose-400">
                  <div className="flex justify-between">
                    <span>Fee Surcharges:</span>
                    <span className="font-mono font-medium">+₹{Number(successReceipt.remarks.surchargeAmount).toLocaleString()}</span>
                  </div>
                  {Array.isArray(successReceipt.remarks?.items) &&
                    successReceipt.remarks.items
                      .filter((i: any) => Number(i.surchargeAmount || 0) > 0)
                      .map((i: any, k: number) => (
                        <div key={k} className="flex justify-between text-[10px] pl-2 text-rose-700 dark:text-rose-400/90">
                          <span>• {i.category || i.description}:</span>
                          <span>+₹{Number(i.surchargeAmount).toLocaleString()} (+₹{Number(i.surchargePerMonth || Math.round(i.surchargeAmount / Math.max(1, i.quantity || 1))).toLocaleString()}/mo)</span>
                        </div>
                      ))}
                </div>
              )}
              {Number(successReceipt.remarks?.advanceAdjustedAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Advance Adjusted:</span>
                  <span className="font-mono font-medium">-₹{Number(successReceipt.remarks.advanceAdjustedAmount).toLocaleString()}</span>
                </div>
              )}
              {Array.isArray(successReceipt.remarks?.items) && successReceipt.remarks.items.length > 0 ? (
                <div className="border-t pt-2 mt-2 space-y-1.5">
                  <span className="text-muted-foreground block text-[11px] font-medium">Covered Months by Fee Head:</span>
                  <div className="space-y-1">
                    {successReceipt.remarks.items.map((it: any, idx: number) => {
                      const months = (Array.isArray(it.selectedMonths) && it.selectedMonths.length > 0)
                        ? it.selectedMonths
                        : (it.periodLabel || "-");
                      return (
                        <div key={idx} className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] bg-background/80 p-1.5 rounded border border-border/60">
                          <span className="font-semibold text-foreground">{it.category || it.description}:</span>
                          <MonthBoxList months={months} size="xs" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : successReceipt.remarks?.periodDetails?.periodSummary ? (
                <div className="border-t pt-2 mt-2 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                  <span className="text-muted-foreground">Covered Period:</span>
                  <MonthBoxList months={successReceipt.remarks.periodDetails.periodSummary} size="xs" />
                </div>
              ) : null}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (successReceipt) printCollegeReceipt(successReceipt);
              }}
              className="h-9 text-xs flex items-center justify-center gap-1.5"
            >
              <Printer className="h-4 w-4 text-teal-600" />
              <span>Print A5</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (successReceipt) downloadCollegeReceipt(successReceipt);
              }}
              className="h-9 text-xs flex items-center justify-center gap-1.5"
            >
              <Download className="h-4 w-4 text-blue-600" />
              <span>Download PDF</span>
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setWhatsappModalOpen(true)}
            className="w-full h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 font-medium"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Send WhatsApp Receipt</span>
          </Button>

          <DialogFooter className="p-0 pt-2 border-t flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setSuccessModalOpen(false);
                setSuccessReceipt(null);
              }}
              className="h-8 text-xs w-full sm:w-auto"
            >
              Done / Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Share Modal */}
      <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-md p-4 sm:p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <MessageSquare className="h-5 w-5" />
              Send Fee Receipt via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Send payment confirmation and receipt details directly to the student or guardian's mobile.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                WhatsApp Mobile Number *
              </label>
              <Input
                placeholder="e.g. 9876543210"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>

            {successReceipt && (
              <div className="p-2.5 rounded bg-muted/50 border text-[11px] space-y-1 text-muted-foreground font-mono">
                <p className="font-semibold text-foreground">Message Preview:</p>
                <p>Dear {successReceipt.studentName},</p>
                <p>We acknowledge receipt of ₹{Number(successReceipt.amount).toLocaleString()} towards {successReceipt.feeType}.</p>
                <p>Receipt No: {successReceipt.receiptNumber}</p>
                <p>Date: {successReceipt.paymentDate}</p>
                {Array.isArray(successReceipt.remarks?.items) && successReceipt.remarks.items.length > 0 ? (
                  <div className="pt-0.5 space-y-0.5">
                    <p className="font-semibold text-foreground">Covered Months & Breakdown:</p>
                    {successReceipt.remarks.items.map((it: any, i: number) => {
                      const disc = Number(it.discountAmount || 0);
                      const sur = Number(it.surchargeAmount || 0);
                      let adj = "";
                      if (disc > 0 && sur > 0) {
                        adj = ` [Base: ₹${Number(it.unitPrice).toLocaleString()}/mo, -₹${it.discountPerMonth}/mo conc, +₹${it.surchargePerMonth}/mo surc]`;
                      } else if (disc > 0) {
                        adj = ` [Base: ₹${Number(it.unitPrice).toLocaleString()}/mo, -₹${it.discountPerMonth}/mo conc]`;
                      } else if (sur > 0) {
                        adj = ` [Base: ₹${Number(it.unitPrice).toLocaleString()}/mo, +₹${it.surchargePerMonth}/mo surc]`;
                      }
                      return (
                        <p key={i}>
                          • {it.category || it.description}: {it.periodLabel || (Array.isArray(it.selectedMonths) ? it.selectedMonths.join(", ") : "-")} = ₹{Number(it.amount).toLocaleString()}{adj}
                        </p>
                      );
                    })}
                  </div>
                ) : successReceipt.remarks?.periodDetails?.periodSummary ? (
                  <p>Period: {successReceipt.remarks.periodDetails.periodSummary}</p>
                ) : null}
                <p>- ACME College of Nursing Accounts</p>
              </div>
            )}
          </div>

          <DialogFooter className="p-0 pt-2 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWhatsappModalOpen(false)}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (!whatsappPhone.trim()) {
                  toast.error("Please enter a WhatsApp phone number");
                  return;
                }
                const cleanPhone = whatsappPhone.replace(/\D/g, "");
                const discountAmt = Number(successReceipt?.remarks?.discountAmount || 0);
                const surchargeAmt = Number(successReceipt?.remarks?.surchargeAmount || 0);
                const advanceAmt = Number(successReceipt?.remarks?.advanceAdjustedAmount || 0);

                let adjustmentsText = "";
                if (discountAmt > 0) adjustmentsText += `\nFee Concession: -₹${discountAmt.toLocaleString()}`;
                if (surchargeAmt > 0) adjustmentsText += `\nFee Surcharge (${successReceipt?.remarks?.surchargeReason || "Late Fee"}): +₹${surchargeAmt.toLocaleString()}`;
                if (advanceAmt > 0) adjustmentsText += `\nAdvance Adjusted: -₹${advanceAmt.toLocaleString()}`;

                const itemsText = Array.isArray(successReceipt?.remarks?.items) && successReceipt.remarks.items.length > 0
                  ? `\n*Covered Periods / Months:*\n` + successReceipt.remarks.items.map((i: any) => {
                      const disc = Number(i.discountAmount || 0);
                      const sur = Number(i.surchargeAmount || 0);
                      let adj = "";
                      if (disc > 0 && sur > 0) {
                        adj = ` [Base: ₹${Number(i.unitPrice).toLocaleString()}/mo, -₹${i.discountPerMonth}/mo conc, +₹${i.surchargePerMonth}/mo surc]`;
                      } else if (disc > 0) {
                        adj = ` [Base: ₹${Number(i.unitPrice).toLocaleString()}/mo, -₹${i.discountPerMonth}/mo conc]`;
                      } else if (sur > 0) {
                        adj = ` [Base: ₹${Number(i.unitPrice).toLocaleString()}/mo, +₹${i.surchargePerMonth}/mo surc]`;
                      }
                      return `• ${i.category || i.description}: ${i.periodLabel || (Array.isArray(i.selectedMonths) ? i.selectedMonths.join(", ") : "-")} = ₹${Number(i.amount).toLocaleString()}${adj}`;
                    }).join("\n")
                  : (successReceipt?.remarks?.periodDetails?.periodSummary ? `\n*Period:* ${successReceipt.remarks.periodDetails.periodSummary}` : "");

                const msg = encodeURIComponent(
                  `*ACME COLLEGE OF NURSING - FEE PAYMENT RECEIPT*\n\n` +
                  `Receipt #: ${successReceipt?.receiptNumber}\n` +
                  `Student: ${successReceipt?.studentName} (${successReceipt?.enrollmentNo})\n` +
                  `Amount Paid: ₹${Number(successReceipt?.amount).toLocaleString()}\n` +
                  `Payment Mode: ${formatCollegePaymentMode(successReceipt?.paymentMode)}\n` +
                  `Date: ${successReceipt?.paymentDate}` +
                  itemsText +
                  adjustmentsText +
                  `\n\nThank you.\nAccounts Section, ACME College of Nursing`
                );
                window.open(`https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${msg}`, "_blank");
                setWhatsappModalOpen(false);
              }}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              Open WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
