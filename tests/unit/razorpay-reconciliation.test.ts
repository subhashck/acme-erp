import { describe, expect, it } from "vitest";
import { reconcileRazorpayRows } from "../../src/lib/razorpay-reconciliation";

const patients = [
  { id: 1, docterz_id: 101, uid: "ACME-001", name: "Jane Doe", mobile: "9876543210" },
  { id: 2, docterz_id: 102, uid: "ACME-002", name: "John Singh", mobile: "9123456780" },
];

describe("Razorpay reconciliation", () => {
  it("matches an exact patient mobile", () => {
    const [row] = reconcileRazorpayRows([{ id: "pay_1", amount: "1,250", status: "captured", contact: "+91 98765 43210" }], patients);
    expect(row.patient?.id).toBe(1);
    expect(row.amount).toBe(1250);
    expect(row.reconciliationStatus).toBe("matched");
  });

  it("matches a UID embedded in notes", () => {
    const [row] = reconcileRazorpayRows([{ payment_id: "pay_2", amount: "500", status: "captured", notes: "Payment for ACME-002" }], patients);
    expect(row.patient?.id).toBe(2);
    expect(row.confidence).toBe("high");
  });

  it("flags duplicate and failed rows", () => {
    const rows = reconcileRazorpayRows([
      { id: "pay_3", amount: "100", status: "captured", contact: "9876543210" },
      { id: "pay_3", amount: "100", status: "captured", contact: "9876543210" },
      { id: "pay_4", amount: "200", status: "failed", contact: "9123456780" },
    ], patients);
    expect(rows[1].reconciliationStatus).toBe("review");
    expect(rows[1].duplicate).toBe(true);
    expect(rows[2].reconciliationStatus).toBe("ignored");
  });

  it("reads patient metadata and reversals from a Transfers export", () => {
    const [row] = reconcileRazorpayRows([{
      id: "trf_1",
      amount: "500",
      currency: "INR",
      settlement_status: "processed",
      amount_reversed: "100",
      payments_notes: JSON.stringify({ appointment_id: 12345678, patient_name: "Jane Doe", doctor_name: "Dr Example", appointment_date: "17-Sep-2026", payment_date: "17-Sep-2026 10:00 AM" }),
      transfers_notes: "{}",
    }], patients);
    expect(row.patient?.id).toBe(1);
    expect(row.appointmentId).toBe("12345678");
    expect(row.grossAmount).toBe(500);
    expect(row.reversedAmount).toBe(100);
    expect(row.amount).toBe(400);
    expect(row.reconciliationStatus).toBe("review");
  });
});
