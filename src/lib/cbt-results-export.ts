import XLSX from "xlsx-js-style";

export interface CbtExportAttemptRecord {
  id: number;
  attemptNo: string;
  assessmentId?: number | null;
  staffId: number;
  staffName?: string | null;
  employeeCode?: string | null;
  designation?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  status: string;
  totalQuestions: number;
  score: string | number;
  passPercentage: string | number;
  theoreticalRating: string | number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeSpentSeconds: number;
  startedAt: string;
  completedAt: string | null;
  isRetest?: boolean;
  retestAuthorized?: boolean;
  retestAuthorizedAt?: string | null;
  retestAuthorizedBy?: string | null;
  retestReason?: string | null;
  targetDepartmentId?: number | null;
  homeDepartmentId?: number | null;
  homeDepartmentName?: string | null;
  examPurpose?: string | null;
  enrollmentId?: number | null;
}

export interface CbtExportSummary {
  totalAttempts?: number;
  completedCount?: number;
  passedCount?: number;
  failedCount?: number;
  inProgressCount?: number;
  averageScore?: string | number;
  averageRating?: string | number;
  passRate?: string | number;
}

export interface CbtExportFilterContext {
  search?: string;
  departmentName?: string;
  status?: string;
  outcome?: string;
}

interface ExportWorkbookParams {
  records: CbtExportAttemptRecord[];
  summary?: CbtExportSummary;
  filters?: CbtExportFilterContext;
}

// Styling definitions
const BORDER_THIN = {
  top: { style: "thin", color: { rgb: "CBD5E1" } },
  bottom: { style: "thin", color: { rgb: "CBD5E1" } },
  left: { style: "thin", color: { rgb: "CBD5E1" } },
  right: { style: "thin", color: { rgb: "CBD5E1" } },
};

const BORDER_TOTAL = {
  top: { style: "thin", color: { rgb: "0F766E" } },
  bottom: { style: "double", color: { rgb: "0F766E" } },
  left: { style: "thin", color: { rgb: "CBD5E1" } },
  right: { style: "thin", color: { rgb: "CBD5E1" } },
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    const pad = (n: number) => String(n).padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    return `${year}-${month}-${day} ${hours}:${mins}`;
  } catch {
    return "—";
  }
}

/**
 * Builds the Executive Dashboard Worksheet with KPI Cards, Audit Metadata,
 * Department-wise breakdowns, and Retest distribution.
 */
function buildDashboardWorksheet(
  records: CbtExportAttemptRecord[],
  summary?: CbtExportSummary,
  filters?: CbtExportFilterContext
): Record<string, unknown> {
  const ws: Record<string, any> = {};

  // Compute stats dynamically if summary is partial
  const total = records.length;
  const completed = records.filter((r) => ["completed", "timed_out"].includes(r.status)).length;
  const inProgress = records.filter((r) => r.status === "in_progress").length;
  const passed = records.filter(
    (r) =>
      ["completed", "timed_out"].includes(r.status) &&
      Number(r.score ?? 0) >= Number(r.passPercentage ?? 80)
  ).length;
  const failed = completed - passed;
  const passRate = completed > 0 ? (passed / completed) * 100 : 0;

  const validScores = records
    .filter((r) => ["completed", "timed_out"].includes(r.status) && r.score != null)
    .map((r) => Number(r.score));
  const avgScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;

  const validRatings = records
    .filter((r) => ["completed", "timed_out"].includes(r.status) && r.theoreticalRating != null)
    .map((r) => Number(r.theoreticalRating));
  const avgRating = validRatings.length > 0 ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length : 0;

  const retestAttempts = records.filter((r) => r.isRetest).length;
  const retestsAuthorized = records.filter((r) => r.retestAuthorized).length;

  const effectiveSummary = {
    total: summary?.totalAttempts ?? total,
    completed: summary?.completedCount ?? completed,
    inProgress: summary?.inProgressCount ?? inProgress,
    passed: summary?.passedCount ?? passed,
    failed: summary?.failedCount ?? failed,
    passRate: summary?.passRate ? Number(summary.passRate) : passRate,
    avgScore: summary?.averageScore ? Number(summary.averageScore) : avgScore,
    avgRating: summary?.averageRating ? Number(summary.averageRating) : avgRating,
  };

  const setCell = (
    r: number,
    c: number,
    value: any,
    style?: any,
    type?: "s" | "n" | "b",
    numFmt?: string
  ) => {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cellType = type || (typeof value === "number" ? "n" : "s");
    ws[addr] = {
      v: value,
      t: cellType,
      s: style || {},
      ...(numFmt ? { z: numFmt } : {}),
    };
  };

  // --- 1. Brand Banner Header ---
  setCell(
    0,
    0,
    "ACME HOSPITAL • ONLINE CBT EXAMINATION EXECUTIVE DASHBOARD",
    {
      font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F766E" } }, // Teal-700
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
    }
  );

  setCell(
    1,
    0,
    "NABH Quality Standards • Computer-Based Theoretical Competency Audit & Verification",
    {
      font: { name: "Segoe UI", sz: 10, italic: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "115E59" } }, // Teal-800
      alignment: { horizontal: "left", vertical: "center", indent: 1 },
    }
  );

  // --- 2. Filter & Metadata Scope ---
  const metaStyleLabel = {
    font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "475569" } },
    alignment: { horizontal: "left", vertical: "center" },
  };
  const metaStyleVal = {
    font: { name: "Segoe UI", sz: 9, color: { rgb: "0F172A" } },
    alignment: { horizontal: "left", vertical: "center" },
  };

  setCell(3, 0, "Export Date & Time:", metaStyleLabel);
  setCell(3, 1, new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }), metaStyleVal);
  setCell(3, 3, "Filtered Department:", metaStyleLabel);
  setCell(3, 4, filters?.departmentName || "All Departments", metaStyleVal);

  setCell(4, 0, "Examination Status:", metaStyleLabel);
  setCell(4, 1, filters?.status ? filters.status.toUpperCase() : "ALL", metaStyleVal);
  setCell(4, 3, "Filtered Outcome:", metaStyleLabel);
  setCell(4, 4, filters?.outcome ? filters.outcome.toUpperCase() : "ALL", metaStyleVal);

  if (filters?.search) {
    setCell(5, 0, "Keyword Query:", metaStyleLabel);
    setCell(5, 1, filters.search, metaStyleVal);
  }

  // --- 3. Executive KPI Cards ---
  const cardHeadStyle = (bg: string) => ({
    font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: bg } },
    alignment: { horizontal: "center", vertical: "center" },
  });
  const cardValStyle = {
    font: { name: "Segoe UI", sz: 18, bold: true, color: { rgb: "0F172A" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER_THIN,
  };
  const cardSubStyle = {
    font: { name: "Segoe UI", sz: 8, color: { rgb: "64748B" } },
    fill: { fgColor: { rgb: "F8FAFC" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: BORDER_THIN,
  };

  // Card 1: Total Attempts
  setCell(7, 0, "TOTAL CBT ATTEMPTS", cardHeadStyle("1E293B"));
  setCell(8, 0, effectiveSummary.total, cardValStyle, "n", "#,##0");
  setCell(9, 0, `${effectiveSummary.completed} Completed • ${effectiveSummary.inProgress} In-Progress`, cardSubStyle);

  // Card 2: Pass Rate
  const activeBenchmark = records.find((r) => r.passPercentage != null)?.passPercentage
    ? Number(records.find((r) => r.passPercentage != null)?.passPercentage)
    : 80;
  setCell(7, 2, "BENCHMARK PASS RATE", cardHeadStyle("15803D"));
  setCell(8, 2, effectiveSummary.passRate / 100, cardValStyle, "n", "0.0%");
  setCell(9, 2, `${effectiveSummary.passed} Passed Benchmarks (≥${activeBenchmark}%)`, cardSubStyle);

  // Card 3: Improvement Needed
  setCell(7, 4, "IMPROVEMENT NEEDED", cardHeadStyle("B91C1C"));
  setCell(8, 4, effectiveSummary.failed, cardValStyle, "n", "#,##0");
  setCell(9, 4, `Remediation / Retest Cooling Applicable`, cardSubStyle);

  // Card 4: Average Rating & Score
  setCell(7, 6, "SCALED RATING / 5.0", cardHeadStyle("0F766E"));
  setCell(8, 6, effectiveSummary.avgRating, cardValStyle, "n", "0.00");
  setCell(9, 6, `Avg Theoretical Score: ${effectiveSummary.avgScore.toFixed(1)}%`, cardSubStyle);

  // --- 4. Department-Wise Performance Breakdown Table ---
  setCell(11, 0, "DEPARTMENT-WISE COMPETENCY BREAKDOWN", {
    font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "0F766E" } },
  });

  const deptHeaders = [
    "Department",
    "Total Attempts",
    "Completed",
    "Passed",
    "Failed",
    "Pass Rate",
    "Avg Score (%)",
    "Avg Rating (/5)",
  ];

  deptHeaders.forEach((dh, ci) => {
    setCell(12, ci, dh, {
      font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1E293B" } },
      alignment: { horizontal: ci === 0 ? "left" : "center", vertical: "center" },
      border: BORDER_THIN,
    });
  });

  // Group records by Department
  const deptMap = new Map<string, { attempts: number; completed: number; passed: number; failed: number; scores: number[]; ratings: number[] }>();

  records.forEach((r) => {
    const dept = r.departmentName?.trim() || "General / Unassigned";
    const cur = deptMap.get(dept) || { attempts: 0, completed: 0, passed: 0, failed: 0, scores: [], ratings: [] };
    cur.attempts++;
    if (["completed", "timed_out"].includes(r.status)) {
      cur.completed++;
      const score = Number(r.score ?? 0);
      const benchmark = Number(r.passPercentage ?? 80);
      if (score >= benchmark) cur.passed++;
      else cur.failed++;
      cur.scores.push(score);
      if (r.theoreticalRating != null) cur.ratings.push(Number(r.theoreticalRating));
    }
    deptMap.set(dept, cur);
  });

  const sortedDepts = Array.from(deptMap.entries()).sort((a, b) => b[1].attempts - a[1].attempts);

  let curRow = 13;
  sortedDepts.forEach(([dept, stat]) => {
    const dPassRate = stat.completed > 0 ? stat.passed / stat.completed : 0;
    const dAvgScore = stat.scores.length > 0 ? stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length : 0;
    const dAvgRating = stat.ratings.length > 0 ? stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length : 0;

    const rowStyle = {
      font: { name: "Segoe UI", sz: 9, color: { rgb: "0F172A" } },
      border: BORDER_THIN,
      alignment: { vertical: "center" },
    };

    setCell(curRow, 0, dept, { ...rowStyle, alignment: { horizontal: "left" } });
    setCell(curRow, 1, stat.attempts, { ...rowStyle, alignment: { horizontal: "center" } }, "n", "#,##0");
    setCell(curRow, 2, stat.completed, { ...rowStyle, alignment: { horizontal: "center" } }, "n", "#,##0");
    setCell(curRow, 3, stat.passed, {
      ...rowStyle,
      alignment: { horizontal: "center" },
      font: { ...rowStyle.font, color: { rgb: "15803D" }, bold: stat.passed > 0 },
    }, "n", "#,##0");
    setCell(curRow, 4, stat.failed, {
      ...rowStyle,
      alignment: { horizontal: "center" },
      font: { ...rowStyle.font, color: { rgb: "B91C1C" }, bold: stat.failed > 0 },
    }, "n", "#,##0");
    setCell(curRow, 5, dPassRate, { ...rowStyle, alignment: { horizontal: "center" } }, "n", "0.0%");
    setCell(curRow, 6, dAvgScore, { ...rowStyle, alignment: { horizontal: "center" } }, "n", "0.0");
    setCell(curRow, 7, dAvgRating, { ...rowStyle, alignment: { horizontal: "center" } }, "n", "0.00");
    curRow++;
  });

  // Table Total Row
  setCell(curRow, 0, "HOSPITAL TOTAL / AVERAGE", {
    font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "0F766E" } },
    fill: { fgColor: { rgb: "F0FDFA" } },
    border: BORDER_TOTAL,
  });
  setCell(curRow, 1, effectiveSummary.total, {
    font: { name: "Segoe UI", sz: 9, bold: true },
    fill: { fgColor: { rgb: "F0FDFA" } },
    border: BORDER_TOTAL,
    alignment: { horizontal: "center" },
  }, "n", "#,##0");
  setCell(curRow, 2, effectiveSummary.completed, {
    font: { name: "Segoe UI", sz: 9, bold: true },
    fill: { fgColor: { rgb: "F0FDFA" } },
    border: BORDER_TOTAL,
    alignment: { horizontal: "center" },
  }, "n", "#,##0");
  setCell(curRow, 3, effectiveSummary.passed, {
    font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "15803D" } },
    fill: { fgColor: { rgb: "F0FDFA" } },
    border: BORDER_TOTAL,
    alignment: { horizontal: "center" },
  }, "n", "#,##0");
  setCell(curRow, 4, effectiveSummary.failed, {
    font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "B91C1C" } },
    fill: { fgColor: { rgb: "F0FDFA" } },
    border: BORDER_TOTAL,
    alignment: { horizontal: "center" },
  }, "n", "#,##0");
  setCell(curRow, 5, effectiveSummary.passRate / 100, {
    font: { name: "Segoe UI", sz: 9, bold: true },
    fill: { fgColor: { rgb: "F0FDFA" } },
    border: BORDER_TOTAL,
    alignment: { horizontal: "center" },
  }, "n", "0.0%");
  setCell(curRow, 6, effectiveSummary.avgScore, {
    font: { name: "Segoe UI", sz: 9, bold: true },
    fill: { fgColor: { rgb: "F0FDFA" } },
    border: BORDER_TOTAL,
    alignment: { horizontal: "center" },
  }, "n", "0.0");
  setCell(curRow, 7, effectiveSummary.avgRating, {
    font: { name: "Segoe UI", sz: 9, bold: true },
    fill: { fgColor: { rgb: "F0FDFA" } },
    border: BORDER_TOTAL,
    alignment: { horizontal: "center" },
  }, "n", "0.00");
  curRow += 2;

  // --- 5. Retest Governance & In-Service Summary ---
  setCell(curRow, 0, "RETEST GOVERNANCE & REMEDIATION SUMMARY", {
    font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "0F766E" } },
  });
  curRow++;

  const retestItems = [
    ["Initial Attempts (Attempt 1):", records.filter((r) => !r.isRetest).length],
    ["Retest Attempts (Attempt 2):", retestAttempts],
    ["Pending Retest Approvals / Authorized:", retestsAuthorized],
    ["Remediation Cooling Policy:", "10-day mandatory cooling period or explicit HR/Admin authorization"],
    ["Pass Threshold:", `≥ ${activeBenchmark.toFixed(1)}% Scaled Theoretical Score`],
  ];

  retestItems.forEach(([k, v]) => {
    setCell(curRow, 0, k, { font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "334155" } } });
    setCell(curRow, 1, v, { font: { name: "Segoe UI", sz: 9, color: { rgb: "0F172A" } } });
    curRow++;
  });

  // Range and Merges
  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: curRow + 1, c: 7 },
  });

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Banner Row 1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Banner Row 2
    // KPI Merges
    { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } },
    { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } },
    { s: { r: 7, c: 2 }, e: { r: 7, c: 3 } },
    { s: { r: 8, c: 2 }, e: { r: 8, c: 3 } },
    { s: { r: 9, c: 2 }, e: { r: 9, c: 3 } },
    { s: { r: 7, c: 4 }, e: { r: 7, c: 5 } },
    { s: { r: 8, c: 4 }, e: { r: 8, c: 5 } },
    { s: { r: 9, c: 4 }, e: { r: 9, c: 5 } },
  ];

  ws["!cols"] = [
    { wch: 32 }, // Dept / Label
    { wch: 18 }, // Total
    { wch: 16 }, // Completed
    { wch: 16 }, // Passed
    { wch: 16 }, // Failed
    { wch: 16 }, // Pass Rate
    { wch: 16 }, // Avg Score
    { wch: 18 }, // Avg Rating
  ];

  ws["!rows"] = [
    { hpt: 28 }, // Row 0
    { hpt: 20 }, // Row 1
    { hpt: 12 }, // Row 2
    { hpt: 18 }, // Row 3
    { hpt: 18 }, // Row 4
    { hpt: 18 }, // Row 5
    { hpt: 12 }, // Row 6
    { hpt: 20 }, // Card Title
    { hpt: 30 }, // Card Value
    { hpt: 18 }, // Card Sub
  ];

  return ws;
}

/**
 * Builds the Master Detailed Directory Worksheet with complete exam audit trails,
 * conditional coloring for outcomes/retests, and column formatting.
 */
function buildDirectoryWorksheet(records: CbtExportAttemptRecord[]): Record<string, unknown> {
  const ws: Record<string, any> = {};

  const columns = [
    { key: "slNo", label: "Sl. No.", wch: 8, align: "center" },
    { key: "attemptNo", label: "Attempt No", wch: 18, align: "center" },
    { key: "attemptType", label: "Attempt Type", wch: 18, align: "center" },
    { key: "employeeCode", label: "Employee Code", wch: 16, align: "center" },
    { key: "candidateName", label: "Candidate Name", wch: 26, align: "left" },
    { key: "designation", label: "Designation", wch: 22, align: "left" },
    { key: "department", label: "Tested Department", wch: 22, align: "left" },
    { key: "homeDepartment", label: "Home Department", wch: 22, align: "left" },
    { key: "examTrack", label: "Exam Track / Purpose", wch: 20, align: "center" },
    { key: "startedAt", label: "Started At", wch: 18, align: "center" },
    { key: "completedAt", label: "Completed At", wch: 18, align: "center" },
    { key: "duration", label: "Duration", wch: 12, align: "center" },
    { key: "totalQuestions", label: "Questions", wch: 12, align: "center" },
    { key: "correct", label: "Correct", wch: 10, align: "center" },
    { key: "incorrect", label: "Incorrect", wch: 11, align: "center" },
    { key: "unanswered", label: "Unanswered", wch: 13, align: "center" },
    { key: "score", label: "Score (%)", wch: 13, align: "right" },
    { key: "benchmark", label: "Benchmark (%)", wch: 15, align: "right" },
    { key: "rating", label: "Rating (/5.0)", wch: 14, align: "right" },
    { key: "status", label: "Status", wch: 14, align: "center" },
    { key: "outcome", label: "Final Outcome", wch: 16, align: "center" },
    { key: "retestAuthorized", label: "Retest Authorized", wch: 18, align: "center" },
    { key: "authorizedBy", label: "Authorized By", wch: 20, align: "left" },
    { key: "retestReason", label: "Retest Authorization Reason / Notes", wch: 36, align: "left" },
  ];

  const headerStyle = {
    font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "1E293B" } }, // Slate-800
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border: BORDER_THIN,
  };

  columns.forEach((col, ci) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
    ws[addr] = {
      v: col.label,
      t: "s",
      s: {
        ...headerStyle,
        alignment: { ...headerStyle.alignment, horizontal: col.align },
      },
    };
  });

  records.forEach((r, ri) => {
    const rowNum = ri + 1;
    const scoreNum = Number(r.score ?? 0);
    const benchmarkNum = Number(r.passPercentage ?? 80);
    const isCompleted = ["completed", "timed_out"].includes(r.status);
    const isPassed = isCompleted && scoreNum >= benchmarkNum;

    const outcomeText = isCompleted ? (isPassed ? "PASSED" : "FAILED") : r.status.toUpperCase();
    const attemptType = r.isRetest ? "Attempt 2 (Retest)" : "Initial Attempt";

    const baseStyle = {
      font: { name: "Segoe UI", sz: 9, color: { rgb: "0F172A" } },
      border: BORDER_THIN,
      alignment: { vertical: "center" },
    };

    const setRowCell = (colIdx: number, val: any, type: "s" | "n", numFmt?: string, customStyle?: any) => {
      const addr = XLSX.utils.encode_cell({ r: rowNum, c: colIdx });
      ws[addr] = {
        v: val,
        t: type,
        s: {
          ...baseStyle,
          alignment: { ...baseStyle.alignment, horizontal: columns[colIdx].align },
          ...customStyle,
        },
        ...(numFmt ? { z: numFmt } : {}),
      };
    };

    // Sl No
    setRowCell(0, ri + 1, "n", "#,##0");
    // Attempt No
    setRowCell(1, r.attemptNo || `EXAM-#${r.id}`, "s");
    // Attempt Type (Highlighted if Retest)
    setRowCell(
      2,
      attemptType,
      "s",
      undefined,
      r.isRetest
        ? {
            font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "92400E" } },
            fill: { fgColor: { rgb: "FEF3C7" } }, // Amber-100
          }
        : undefined
    );
    // Employee Code
    setRowCell(3, r.employeeCode || "—", "s");
    // Candidate Name
    setRowCell(4, r.staffName || `Staff #${r.staffId}`, "s", undefined, {
      font: { name: "Segoe UI", sz: 9, bold: true },
    });
    // Designation
    setRowCell(5, r.designation || "—", "s");
    // Tested Department
    setRowCell(6, r.departmentName || "General Nursing", "s");
    // Home Department
    setRowCell(7, r.homeDepartmentName || r.departmentName || "General Nursing", "s");
    // Exam Track / Purpose
    const trackLabel =
      r.examPurpose === "rotation"
        ? "Clinical Rotation"
        : r.examPurpose === "transfer_vetting"
        ? "Transfer Vetting"
        : r.examPurpose === "hospital_wide_certification"
        ? "Certification"
        : r.examPurpose === "voluntary"
        ? "Upskilling"
        : "Core Monthly";
    setRowCell(
      8,
      trackLabel,
      "s",
      undefined,
      r.examPurpose && r.examPurpose !== "core_monthly"
        ? {
            font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "0369A1" } },
            fill: { fgColor: { rgb: "E0F2FE" } },
          }
        : undefined
    );
    // Started At
    setRowCell(9, formatDateTime(r.startedAt), "s");
    // Completed At
    setRowCell(10, formatDateTime(r.completedAt), "s");
    // Duration
    setRowCell(11, formatDuration(r.timeSpentSeconds), "s");
    // Total Questions
    setRowCell(12, r.totalQuestions, "n", "#,##0");
    // Correct
    setRowCell(13, r.correctCount ?? 0, "n", "#,##0");
    // Incorrect
    setRowCell(14, r.incorrectCount ?? 0, "n", "#,##0");
    // Unanswered
    setRowCell(15, r.unansweredCount ?? 0, "n", "#,##0");
    // Score (%)
    setRowCell(16, scoreNum, "n", "0.0");
    // Benchmark (%)
    setRowCell(17, benchmarkNum, "n", "0.0");
    // Rating (/5.0)
    setRowCell(18, Number(r.theoreticalRating ?? 0), "n", "0.00");
    // Status
    setRowCell(19, r.status, "s");
    // Outcome (Green / Red conditional fill)
    setRowCell(
      20,
      outcomeText,
      "s",
      undefined,
      outcomeText === "PASSED"
        ? {
            font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "166534" } },
            fill: { fgColor: { rgb: "DCFCE7" } }, // Emerald-100
          }
        : outcomeText === "FAILED"
        ? {
            font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "991B1B" } },
            fill: { fgColor: { rgb: "FEE2E2" } }, // Red-100
          }
        : undefined
    );
    // Retest Authorized
    setRowCell(
      21,
      r.retestAuthorized ? "YES" : "NO",
      "s",
      undefined,
      r.retestAuthorized
        ? {
            font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "0F766E" } },
            fill: { fgColor: { rgb: "CCFBF1" } }, // Teal-100
          }
        : undefined
    );
    // Authorized By
    setRowCell(22, r.retestAuthorizedBy || "—", "s");
    // Retest Reason
    setRowCell(23, r.retestReason || "—", "s");
  });

  const lastRow = records.length + 1;
  // Summary Row at bottom
  if (records.length > 0) {
    const totalQuestionsSum = records.reduce((s, r) => s + (r.totalQuestions || 0), 0);
    const totalCorrectSum = records.reduce((s, r) => s + (r.correctCount || 0), 0);
    const validScores = records.filter((r) => r.score != null).map((r) => Number(r.score));
    const avgScore = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
    const validRatings = records.filter((r) => r.theoreticalRating != null).map((r) => Number(r.theoreticalRating));
    const avgRating = validRatings.length > 0 ? validRatings.reduce((a, b) => a + b, 0) / validRatings.length : 0;

    const summaryCellStyle = {
      font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "0F766E" } },
      fill: { fgColor: { rgb: "F0FDFA" } },
      border: BORDER_TOTAL,
      alignment: { vertical: "center" },
    };

    columns.forEach((col, ci) => {
      const addr = XLSX.utils.encode_cell({ r: lastRow, c: ci });
      let val: any = "";
      let type: "s" | "n" = "s";
      let numFmt: string | undefined;

      if (ci === 0) val = "";
      else if (ci === 4) val = "OVERALL SUMMARY / TOTALS";
      else if (ci === 12) { val = totalQuestionsSum; type = "n"; numFmt = "#,##0"; }
      else if (ci === 13) { val = totalCorrectSum; type = "n"; numFmt = "#,##0"; }
      else if (ci === 16) { val = avgScore; type = "n"; numFmt = "0.0"; }
      else if (ci === 18) { val = avgRating; type = "n"; numFmt = "0.00"; }

      ws[addr] = {
        v: val,
        t: type,
        s: {
          ...summaryCellStyle,
          alignment: { ...summaryCellStyle.alignment, horizontal: col.align },
        },
        ...(numFmt ? { z: numFmt } : {}),
      };
    });
  }

  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: lastRow, c: columns.length - 1 },
  });

  ws["!cols"] = columns.map((col) => ({ wch: col.wch }));
  ws["!rows"] = [{ hpt: 26 }]; // Header row height

  // Freeze top header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Auto-filter
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: records.length, c: columns.length - 1 }),
  };

  return ws;
}

/**
 * Builds the complete Excel workbook with Dashboard and Directory sheets.
 */
export function buildCbtResultsWorkbook({
  records,
  summary,
  filters,
}: ExportWorkbookParams) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Dashboard & Performance Summary
  const dashboardSheet = buildDashboardWorksheet(records, summary, filters);
  XLSX.utils.book_append_sheet(wb, dashboardSheet, "Executive Dashboard");

  // Sheet 2: CBT Examination Results Directory
  const directorySheet = buildDirectoryWorksheet(records);
  XLSX.utils.book_append_sheet(wb, directorySheet, "CBT Results Directory");

  return wb;
}

/**
 * Generates and downloads the professionally styled Excel export.
 */
export function exportCbtResultsToExcel({
  records,
  summary,
  filters,
}: ExportWorkbookParams): void {
  const wb = buildCbtResultsWorkbook({ records, summary, filters });
  const dateStr = new Date().toISOString().slice(0, 10);
  const deptPart = filters?.departmentName
    ? `-${filters.departmentName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
    : "";
  const fileName = `cbt-examination-results${deptPart}-${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
