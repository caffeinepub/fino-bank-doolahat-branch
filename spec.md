# Fino Bank Doolahat Branch

## Current State
- Loans page exists with full form, table, repayment schedule view, and Excel export
- The `addLoan` mutation passes `BigInt(tenureNum)` for `loanTenureMonths`, but the backend expects `Nat` (a plain number), causing the save to silently fail
- The Loans page already has a manager-only lock screen but the `LoanListView` (with Add button) is rendered for managers without reconstruction issues
- Dashboard currently has 4 KPI cards (FDs, Today Transactions, Net Profit, Total P&L Entries) and a 7-day bar chart -- no loan data shown

## Requested Changes (Diff)

### Add
- Loan KPI card on Dashboard: Total Active Loans count + Total Loan Amount disbursed
- Loan analytics section on Dashboard: pie chart for loan tenure distribution, bar chart for monthly disbursements (by loan start date)
- Quick Action button for Loans on Dashboard

### Modify
- Fix `addLoan` mutation: change `BigInt(loan.loanTenureMonths)` → `Number(tenureNum)` to match backend `Nat` type
- Reconstruct LoanFormDialog: use a stepped/cleaner layout, add clear section groupings (Customer Info, Loan Details, Auto-Calculated), improve field ordering and UX
- Ensure the Add New Loan button and form are only accessible when `isManager === true` (already gated but needs to be enforced cleanly in the reconstructed form)
- Add `useLoans` hook export to `useQueries.ts` so Dashboard can reuse it

### Remove
- Nothing to remove

## Implementation Plan
1. Fix `useAddLoan` mutation in `Loans.tsx`: remove `BigInt()` wrapping on `loanTenureMonths`, pass plain number
2. Reconstruct `LoanFormDialog` with cleaner grouped layout and explicit manager-only guard
3. Add `useLoans` export in `useQueries.ts`
4. Update `Dashboard.tsx`: add loan KPI cards, loan analytics (pie + bar charts), and Quick Action for Loans
