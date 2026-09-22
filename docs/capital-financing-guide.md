# ACME ERP — Capital Finances & Multi-Source Debt Management: Comprehensive Guide & Theory

This guide provides an end-to-end theoretical foundation and operational manual for managing borrowing facilities, debt instruments, moratoriums, and treasury cash flow within the **ACME ERP Capital Finances** module.

---

## 1. Module Overview & Architecture

### Purpose & Scope
Hospitals and healthcare institutions typically maintain diverse, non-traditional debt portfolios to finance medical equipment, infrastructure expansion, and working capital. These range from **institutional bank loans** to **daily field collection advances**, **chit funds**, and **open-ended private hand loans**. 

The ACME ERP Capital module centralizes debt servicing, tracking, daily cash counter deductions, and treasury forecasting in one unified interface.

### Technical Architecture
- **PostgreSQL Dedicated Schema**: `capital.*` (`capital.facilities`, `capital.repayments`, `capital.cash_flow_entries`).
- **Backend Service**: `server/routes/capital.ts` (RESTful API mounted at `/api/capital/*`).
- **Frontend SPA**: React 19 + TanStack Router + TailwindCSS (`src/routes/_authenticated/capital/`).
- **Access Policy**: Restricted to `admin`, `accounts` department staff, and designated `managementApprovers`.
- **Integrity Guarantee**: All repayment events atomically decrement loan outstanding balances and optionally post corresponding cash outflow entries into the treasury ledger. Reverting a payment atomically restores the balance.

---

## 2. Debt Instruments: Theory & Real-World Mechanics

The system provides purpose-built mathematical models and repayment tracking for five primary instruments:

```
                              ┌─────────────────────────────────────────┐
                              │       ACME Debt Portfolio Types         │
                              └────────────────────┬────────────────────┘
                                                   │
         ┌───────────────────┬─────────────────────┼─────────────────────┬──────────────────┐
         │                   │                     │                     │                  │
         ▼                   ▼                     ▼                     ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────┐ ┌─────────────────┐ ┌────────────────┐
│ Daily Collection│ │    Bank / NBFC  │ │  Loan Moratoriums   │ │ Private Lending │ │   Chit Funds   │
│   Financing     │ │   Term Loans    │ │   & Grace Windows   │ │ (Interest-Only) │ │  (ROSCA Bids)  │
└─────────────────┘ └─────────────────┘ └─────────────────────┘ └─────────────────┘ └────────────────┘
```

---

### Instrument 1: Daily Collection Financing (Field Micro-Financing / Daily Advance)

#### Financial Theory
- **Context**: Common in Indian commercial markets (e.g., Keishamthong, Golden 20k/15k lines). A financier disburses a lump sum (e.g., ₹20,00,000) for a fixed short-term duration defined in **days** (typically 100 days).
- **Repayment Mechanism**: A field agent visits the hospital's cash counter daily to collect a fixed installment (e.g., ₹20,000/day).
- **Pricing Model (Flat / Simple Interest)**:
  $$\text{Tenor in Months} = \frac{\text{Days}}{30}$$
  $$\text{Total Interest} = \text{Principal} \times \left(\frac{\text{Rate}}{100}\right) \times \left(\frac{\text{Tenor in Months}}{12}\right)$$
  $$\text{Daily Installment} = \frac{\text{Principal} + \text{Total Interest}}{\text{Days}}$$

#### How to Manage in ACME ERP
1. **Registration** (`/capital/facilities` $\rightarrow$ **Add Facility**):
   - **Category**: Select `Daily Collection Financing`.
   - **Tenor (Days)**: Enter duration in days (e.g., `100`). The system automatically converts this to fractional months for schema consistency.
   - **Repayment Frequency**: Select `Daily Collection / Daily EMI`.
   - **Linked Servicing Account**: Select `CASH` (Counter Cash account).
   - **Installment Due**: Click **Auto-Calculate**. The system computes the exact daily due.
2. **Daily Batch Processing** (`/capital/daily-collections`):
   - Navigate to the **Daily Collections Hub**.
   - Review active tranches and today's total daily collection commitment.
   - Verify or tweak the amounts collected.
   - Click **Record All Collections (Batch)**. The system records all repayments in one atomic batch and posts the cash counter outflow.

---

### Instrument 2: Bank & NBFC Term Loans (Amortizing Reducing Balance)

#### Financial Theory
- **Context**: Formal long-term institutional debt from commercial banks (SBI, HDFC, ICICI) or Non-Banking Financial Companies (Tata Capital, Bajaj Finance) to fund medical equipment, hospital buildings, or technology.
- **Amortization Mechanism (Reducing Balance)**:
  Each monthly Equated Monthly Installment (EMI) consists of both principal and interest components. In the early stages, interest comprises the bulk of the EMI; over time, the principal share increases.
  $$EMI = \frac{P \cdot r \cdot (1+r)^n}{(1+r)^n - 1}$$
  *Where $P$ is principal, $r = \frac{\text{Annual Rate}}{12 \times 100}$, and $n$ is tenor in months.*

#### How to Manage in ACME ERP
1. **Registration**:
   - **Category**: Select `Bank Loan` or `NBFC`.
   - **Interest Calculation Type**: Select `Reducing / Diminishing Balance`.
   - **Tenor (Months)**: Enter duration in months (e.g., `36`, `60`, `84`).
   - **Repayment Frequency**: Select `Monthly EMI / Due`.
   - **Servicing Bank Account**: Select the hospital operational bank account mapped for NACH / Auto-Debit.
   - **Installment Due**: Click **Auto-Calculate** to compute the exact reducing EMI.
2. **Monthly Servicing**:
   - Monthly bank auto-debits are recorded via **Record Repayment** with **Payment Type** `Regular EMI`.
   - The principal portion reduces the outstanding loan balance; the interest portion is logged under finance cost.

---

### Instrument 3: Loan Moratoriums & Grace Windows

#### Financial Theory
- **Context**: When building a new hospital wing or procuring major diagnostic machinery (e.g., MRI/CT scanners), commercial lenders often provide a **moratorium window** (grace period of 3 to 18 months) before full amortizing principal EMIs commence.
- The module supports two primary moratorium treatments:

#### A. Pre-EMI Simple Interest (`pre_emi_interest`)
- **How it works**: During the moratorium window ($m$ months), the borrower does **not** repay principal. Instead, the borrower only pays simple monthly interest on the disbursed principal:
  $$\text{Pre-EMI Monthly Interest} = \frac{P \times \text{Annual Rate}}{12 \times 100}$$
- **Post-Moratorium Amortization**: When the moratorium ends at `repaymentStartDate`, the principal $P$ is amortized across the *remaining* tenor $(n - m)$ months:
  $$\text{Full EMI} = \frac{P \cdot r \cdot (1+r)^{n - m}}{(1+r)^{n - m} - 1}$$

#### B. Capitalized Interest / Full Repayment Holiday (`capitalized`)
- **How it works**: During the moratorium window, the borrower makes **₹0 payments**. Accrued interest is added (*capitalized*) directly into the borrowed principal:
  $$\text{Accrued Interest} = P \times \left(\frac{\text{Rate}}{100}\right) \times \left(\frac{m}{12}\right)$$
  $$\text{Augmented Principal } (P_{\text{aug}}) = P + \text{Accrued Interest}$$
- **Post-Moratorium Amortization**: After the holiday, regular amortizing EMIs commence on the augmented principal balance over $(n - m)$ months.

#### How to Manage in ACME ERP
1. In the **Add / Edit Facility** sidebar, navigate to **Section 3: Moratorium & Grace Period**:
   - **Moratorium (Months)**: Enter grace duration (e.g. `6`).
   - **Moratorium Type**: Select `Pre-EMI Simple Interest` or `Interest Capitalized`.
   - **Repayment Start Date**: Click **Auto-Calculate** to set the first full amortizing EMI date (`Disbursement Date + Moratorium Months`).
   - Click **Auto-Calculate Installment**: The calculator displays the Pre-EMI due and post-moratorium full EMI.
2. **Dynamic Live UI**:
   - While the current date is before `repaymentStartDate`, the facility automatically displays an **In Moratorium** status badge.
   - The Facility 360° Profile shows a highlighted alert banner summarizing the grace window terms and cash expectations.
   - The Executive Dashboard accounts for the reduced Pre-EMI outflow rather than full amortizing EMIs in its monthly debt servicing KPI.

---

### Instrument 4: Private Hand Lending (Interest-Only with Open-Ended Principal)

#### Financial Theory
- **Context**: Short-to-medium-term bridge capital borrowed from private individuals, trustees, or financiers.
- **Key Characteristics**:
  - **No Fixed Tenor / Open-Ended**: There is no mandatory maturity date or amortization calendar.
  - **Periodic Interest-Only Servicing**: The borrower pays only the interest each month (e.g., 1.5% to 2% per month = 18% to 24% p.a.).
  - **Ad-Hoc Principal Repayment**: The principal is paid down in lump sums whenever the business has surplus cash flow.
  - **Immediate Interest Relief**: Every rupee of principal repaid immediately lowers the base for all subsequent monthly interest charges:
    $$\text{New Monthly Interest} = \frac{(\text{Current Principal} - \text{Lump Sum Paid}) \times \text{Rate}}{12 \times 100}$$

#### How to Manage in ACME ERP
1. **Facility Registration**:
   - **Category**: Select `Private Lending`.
   - **Facility Sub-Type**: Enter `Unsecured Hand Loan` or `Promissory Note`.
   - **Tenor (Months)**: **Leave blank or enter `0`**. The system treats it as **Open-Ended / Revolving**.
   - **Interest Calculation Type**: Select `Interest Only (Bullet Principal)`.
   - **Repayment Frequency**: Select `Monthly EMI / Due` (or `Revolving Line`).
   - **Maturity Date**: Leave blank.
   - **Installment Due**: Click **Auto-Calculate** (the system calculates $(P \times \text{Rate})/12$).
2. **Monthly Interest Recording**:
   - Click **Record Repayment**.
   - **Payment Type**: Select `Interest Only`.
   - **Principal Paid**: `₹0`.
   - **Interest Paid**: Enter the monthly interest amount (e.g., `₹20,000`).
   - *Result*: Loan balance remains intact at ₹10,00,000; interest is logged as servicing expense.
3. **Ad-Hoc Principal Lump-Sum Reductions**:
   - Whenever you have excess liquidity (e.g., ₹2,50,000):
   - Click **Record Repayment**.
   - **Payment Type**: Select `Principal Part-Payment`.
   - **Principal Paid**: Enter `₹2,50,000`.
   - **Interest Paid**: Enter `₹0` (or combine with that month's interest).
   - *Result*: Outstanding principal balance atomically drops to ₹7,50,000. Future monthly interest automatically drops from ₹20,000 to ₹15,000/month.
4. **Full Payoff / Closure**:
   - When clearing the final balance, select **Payment Type** `Full Settlement / Foreclosure`. The balance becomes ₹0 and status switches to `Closed`.

---

### Instrument 5: Chit Funds (ROSCA / Community Auction Financing)

#### Financial Theory
- **Context**: Traditional Indian Rotating Savings and Credit Association (e.g., Shriram Chits, Margadarsi Chits).
- **Mechanism**:
  - A group of $N$ subscribers contributes a monthly installment toward a total chit pool (e.g., ₹25,00,000 over 25 months at ₹1,00,000/month).
  - Every month, an auction is held. Subscribers who need capital bid a discount (e.g., 20% to 30%).
  - The winning bidder takes the prize money upfront (borrowing against future installments).
  - The auction discount (after company commission) is distributed as a **dividend** among all subscribers, reducing the net monthly cash payable.

#### How to Manage in ACME ERP
1. **Registration**:
   - **Category**: Select `Chit Fund`.
   - **Interest Calculation Type**: Select `Chit Dividend / Auction Adjusted`.
   - **Sanctioned Amount**: Total gross chit value (e.g. ₹25,00,000).
   - **Disbursed Amount**: Net prize money received after auction bid discount and foreman charges.
2. **Servicing Installments**:
   - Record monthly installments with **Payment Type** `Chit Installment`.
   - Enter net installment paid after dividend offset.

---

## 3. Comparative Summary Matrix

| Instrument | Tenor Specification | Interest Model | Regular Servicing | Principal Repayment Schedule |
| :--- | :--- | :--- | :--- | :--- |
| **Daily Collection Financing** | Days (e.g., 100 days) | Flat / Simple | Daily fixed cash deduction | Amortized daily in every collection |
| **Bank / NBFC Term Loan** | Months (e.g., 36, 60 mos) | Reducing Balance | Monthly amortizing EMI | Amortized gradually every month |
| **Loan with Moratorium** | Months + Moratorium Window | Pre-EMI or Capitalized | Simple Pre-EMI or ₹0 during grace | Amortized over remaining post-grace tenor |
| **Private Hand Loan** | Open-Ended (0 or blank) | Interest-Only | Monthly simple interest | Ad-hoc lump sums with no fixed schedule |
| **Chit Fund** | Months (e.g., 25, 50 mos) | Dividend / Auction | Monthly net installment | Completed upon chit cycle maturity |

---

## 4. End-to-End Operational Workflows

### 4.1 Executive Treasury Dashboard (`/capital`)
Provides immediate situational awareness for Chief Financial Officers, Managing Directors, and Accounts Leaders:
- **KPI Metrics**: Total Outstanding Debt, Monthly Debt Servicing Obligation, Net Cash Position (Operational Bank + Cash Balances minus Active Debt), Capital Infusions, Principal Amortized to Date, Total Interest Serviced.
- **Portfolio Breakdown**: Dynamic distribution across categories showing total sanctioned, outstanding, and daily/monthly dues.
- **Daily Collection Monitor**: Real-time tracker for today's daily field commitment and counter collection status.

---

### 4.2 Facilities Directory (`/capital/facilities`)
- **Card & Table Views**: Seamlessly switch between visual portfolio cards and condensed data tables.
- **Search & Multi-Filters**: Filter by Debt Category (`Bank Loan`, `Daily Collection Financing`, `Private Lending`, `Chit Fund`, `NBFC`), Status (`Active`, `Closed`, `Restructured`), or search by facility name and lender.
- **Slide-Over Sidebar**: Uniform Add and Edit facility sheet with dynamic financial calculators, date pickers, currency masks, and moratorium controls.

---

### 4.3 Facility 360° Profile (`/capital/facility/:id`)
- **Header Badges**: Category, Status (`active`, `closed`), and dynamic Moratorium indicator.
- **Key Financial Statistics**: Current Outstanding Balance with visual amortization progress meter, Principal Repaid, Interest & Charges Paid, Regular Due Amount.
- **Facility Terms Specification**: Complete breakdown of rate, calculation basis, tenor, payment frequency, servicing bank account, and collateral pledges.
- **Repayment History Ledger**: Chronological transaction audit trail with payment codes, methods, reference UTR numbers, notes, and individual payment reversal capabilities.

---

### 4.4 Debt Repayments & Servicing Ledger (`/capital/repayments`)
- Centralized audit trail for every debt payment across all facilities.
- Filter by date range, facility, counterparty, payment type (`EMI`, `Interest Only`, `Principal Part-Payment`, `Daily Collection`, `Foreclosure`), and payment method (`Bank Transfer`, `Auto-Debit`, `Cash`, `UPI`, `Cheque`).
- Direct action button to log payments against any active facility.

---

### 4.5 Treasury Cash Flow Ledger (`/capital/cash-flow`)
- Bridges the gap between borrowing facilities and hospital cash balances.
- Automatically captures:
  - **Inflows**: Loan disbursements, promoter/director capital infusions, equity.
  - **Outflows**: Principal repayments, interest servicing, finance charges.
- Maintains a strict cumulative running cash balance for treasury forecasting.

---

## 5. Ledger Integrity & Reconciliation Rules

1. **Atomic Balances**: The `outstandingBalance` of any facility is strictly derived and updated atomically inside database transactions whenever a repayment is posted or reverted.
2. **Reversals Without Breakage**: If an accounts clerk enters an erroneous payment, clicking the **Revert Payment** trash icon will:
   - Delete the repayment ledger row.
   - Atomically restore the paid principal back to the facility's `outstandingBalance`.
   - Deduct the paid amounts from `totalPrincipalPaid` and `totalInterestPaid`.
   - Remove the corresponding outflow entry from the Treasury Cash Flow ledger.
3. **Cash Counter Handover Alignment**: For Daily Collection financing, daily payouts must be verified against the evening Cashier Handover in the **Daily Financial Closing Report** (`/accounts/reports`) to ensure the counter physical cash reconciles with the recorded debt servicing.
