export const deductionFields = [
  ["epf", "PF (EPF)"], ["esi", "ESI"], ["professionalTax", "Professional Tax"],
  ["securityDepositTotal", "Security Deposit Target"], ["securityDeposit", "Monthly Security Deposit"],
  ["securityDepositOpeningBalance", "Opening Balance Already Collected"],
] as const;
export type DeductionAmountKey = typeof deductionFields[number][0];
export type DeductionTab = "epf" | "esi" | "professionalTax" | "securityDeposit";
export const deductionTabs: Array<{ id: DeductionTab; label: string; fields: DeductionAmountKey[] }> = [
  { id: "epf", label: "PF", fields: ["epf"] },
  { id: "esi", label: "ESI", fields: ["esi"] },
  { id: "professionalTax", label: "Professional Tax", fields: ["professionalTax"] },
  { id: "securityDeposit", label: "Security Deposit", fields: ["securityDeposit", "securityDepositTotal", "securityDepositOpeningBalance"] },
];
export type DeductionExportRow = { employeeCode: string; name: string; departmentName: string | null; securityDepositStartMonth: string | null } & Record<DeductionAmountKey, string | null>;

