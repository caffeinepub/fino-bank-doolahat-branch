# Fino Bank Doolahat Branch – Loan Management System

## Current State
- Portal has 9 modules: Dashboard, Daily P&L Entry, P&L Reports, Fixed Deposits, Transactions, Payment Heads, Merchants, Inventory, Complaints.
- Global role-based auth via `InventoryAuthProvider` (staff/manager). Manager password: `Ratulcc143@`.
- Shared `RoleSwitcherBar` component used on all pages.
- Excel export utility (`excelExport.ts`) loads xlsx from CDN at runtime.
- Backend is a Motoko actor with payment heads, P&L, FDs, transactions, inventory, complaints.
- `backend.d.ts` has typed interfaces for all existing entities. Complaint type has `complaintNo` field in Complaints.tsx but not yet in backend.d.ts/main.mo (added via any cast in Complaints.tsx).

## Requested Changes (Diff)

### Add
- New **Loan Management** tab in NavTabs and App.tsx (`loans` tab ID).
- New `Loans` page (`src/frontend/src/pages/Loans.tsx`) — manager-only (same lock pattern as Complaints).
- Loan data model:
  - customerName, fatherHusbandName, fullAddress, loanStartDate (ISO date), contactNo, nomineeName, dateOfBirth (ISO date), loanAmount (float), totalInterestAmount (auto-calc), interestRate (1–50%, float), loanTenureMonths (12/18/24/30/36/42/48/54/60), repaymentType (fixed: "Monthly").
- Auto-calculated fields:
  - `totalInterestAmount = loanAmount * (interestRate / 100) * (loanTenureMonths / 12)` (flat interest)
  - Per-installment: `principalPerInstallment = loanAmount / loanTenureMonths`, `interestPerInstallment = totalInterestAmount / loanTenureMonths`, `totalInstallment = principal + interest`
  - `remainingAmount[i] = loanAmount - (principalPerInstallment * i)`
  - `repaymentDate[i] = loanStartDate + i months`
- Repayment schedule table with N rows (N = loanTenureMonths): Serial No, Repayment Date, Principal, Interest, Total, Remaining Amount, Collection Officer Sign (blank field).
- "Download Excel" button that exports: all loan info fields at top, then the full repayment schedule table with correct column structure (merged header for "Repayable Amount" with 3 sub-columns: Principal, Interest, Total).
- Loan list view: list all saved loans, click to view details + repayment schedule.
- Backend: `addLoan`, `getAllLoans`, `deleteLoan` functions in main.mo.
- `complaintNo` field added to `addComplaint` backend function (to fix existing Complaints page `any` cast).

### Modify
- `NavTabs.tsx`: add `loans` tab.
- `App.tsx`: add `loans` TabId, import `Loans`, render in switch.
- Footer quick links: add Loans.
- `main.mo`: add Loan type and CRUD functions; add `complaintNo` param to `addComplaint`.
- `backend.d.ts`: add `LoanRecord` interface and loan methods; update `addComplaint` signature.
- `excelExport.ts`: add `downloadLoanSheet(loan)` function.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `main.mo`: add Loan type with all fields, `addLoan`, `getAllLoans`, `getLoanById`, `deleteLoan`. Also add `complaintNo` to Complaint type and `addComplaint` signature.
2. Update `backend.d.ts`: add `LoanRecord` interface, loan methods, update Complaint/addComplaint.
3. Create `src/frontend/src/pages/Loans.tsx`: manager-only page with RoleSwitcherBar, loan form (all fields with auto-calculation), loans list, detail view with repayment schedule table, download Excel button.
4. Add `downloadLoanSheet` to `excelExport.ts`: bank header, all loan fields, repayment schedule with merged header row for "Repayable Amount".
5. Update `NavTabs.tsx` and `App.tsx` to wire in the new tab.
6. Update footer quick links in `App.tsx`.
