const COLLEGE_PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  upi_bank_transfer_dr_je: "UPI/Bank Transfer - Dr JE",
  card: "Card",
  cheque: "Cheque",
};

export function formatCollegePaymentMode(value?: string | null): string {
  if (!value) return "Cash";
  return COLLEGE_PAYMENT_MODE_LABELS[value.toLowerCase()] ?? value.replaceAll("_", " ");
}
