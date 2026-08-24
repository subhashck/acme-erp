export interface LineItemTaxInput {
  quantity: number;
  unitRate: number;
  discountPercent?: number;
  gstPercent?: number;
  isInterState?: boolean;
}

export interface LineItemTaxResult {
  grossAmount: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface InvoiceTaxSummary {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  netAmount: number;
}

/**
 * Calculates per-line GST amounts (CGST, SGST, IGST, Taxable Amount, Total)
 */
export function calculateLineTax(item: LineItemTaxInput): LineItemTaxResult {
  const qty = Number(item.quantity) || 0;
  const rate = Number(item.unitRate) || 0;
  const discPct = Number(item.discountPercent) || 0;
  const gstPct = Number(item.gstPercent) || 0;

  const grossAmount = Number((qty * rate).toFixed(2));
  const discountAmount = Number(((grossAmount * discPct) / 100).toFixed(2));
  const taxableAmount = Number((grossAmount - discountAmount).toFixed(2));

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (item.isInterState) {
    igstAmount = Number(((taxableAmount * gstPct) / 100).toFixed(2));
  } else {
    const halfRate = gstPct / 2;
    cgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
    sgstAmount = Number(((taxableAmount * halfRate) / 100).toFixed(2));
  }

  const totalAmount = Number((taxableAmount + cgstAmount + sgstAmount + igstAmount).toFixed(2));

  return {
    grossAmount,
    discountPercent: discPct,
    discountAmount,
    taxableAmount,
    gstPercent: gstPct,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
  };
}

/**
 * Calculates overall invoice tax summary and nearest-rupee rounding
 */
export function calculateInvoiceSummary(lines: LineItemTaxResult[]): InvoiceTaxSummary {
  let subtotal = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  for (const line of lines) {
    subtotal += line.grossAmount;
    discountAmount += line.discountAmount;
    taxableAmount += line.taxableAmount;
    cgstAmount += line.cgstAmount;
    sgstAmount += line.sgstAmount;
    igstAmount += line.igstAmount;
  }

  subtotal = Number(subtotal.toFixed(2));
  discountAmount = Number(discountAmount.toFixed(2));
  taxableAmount = Number(taxableAmount.toFixed(2));
  cgstAmount = Number(cgstAmount.toFixed(2));
  sgstAmount = Number(sgstAmount.toFixed(2));
  igstAmount = Number(igstAmount.toFixed(2));

  const rawTotal = taxableAmount + cgstAmount + sgstAmount + igstAmount;
  const netAmount = Math.round(rawTotal);
  const roundOff = Number((netAmount - rawTotal).toFixed(2));

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff,
    netAmount,
  };
}
