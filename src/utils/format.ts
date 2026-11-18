export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  if (typeof value === "string") {
    const trimmed = value.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [year, month, day] = trimmed.split("-").map(Number);
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(year, month - 1, day));
    }
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

/**
 * Format a date into DD-MON-YYYY format (e.g. "11-MAR-2006", "16-NOV-2026")
 */
export function formatDateDdMonYyyy(val: string | Date | null | undefined): string {
  if (!val) return "";

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  if (typeof val === "string") {
    const str = val.trim();
    if (!str) return "";

    // Already in DD-MON-YYYY (e.g. "11-MAR-2006" or "11-Mar-2006")
    const ddMonMatch = str.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (ddMonMatch) {
      const d = String(parseInt(ddMonMatch[1], 10)).padStart(2, "0");
      const mon = ddMonMatch[2].toUpperCase();
      const y = ddMonMatch[3];
      return `${d}-${mon}-${y}`;
    }

    // DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const d = String(parseInt(dmyMatch[1], 10)).padStart(2, "0");
      const m = parseInt(dmyMatch[2], 10);
      const y = dmyMatch[3];
      if (m >= 1 && m <= 12) {
        return `${d}-${MONTHS[m - 1]}-${y}`;
      }
    }

    // YYYY-MM-DD or YYYY/MM/DD (ISO date)
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const y = ymdMatch[1];
      const m = parseInt(ymdMatch[2], 10);
      const d = String(parseInt(ymdMatch[3], 10)).padStart(2, "0");
      if (m >= 1 && m <= 12) {
        return `${d}-${MONTHS[m - 1]}-${y}`;
      }
    }
  }

  // Fallback to standard JavaScript Date
  const parsed = new Date(val);
  if (isNaN(parsed.getTime())) {
    return typeof val === "string" ? val : "";
  }
  const day = String(parsed.getDate()).padStart(2, "0");
  const mon = MONTHS[parsed.getMonth()];
  const year = parsed.getFullYear();
  return `${day}-${mon}-${year}`;
}


