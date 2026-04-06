# Fino Bank Doolahat Branch

## Current State

The Loan Management module exists (`src/frontend/src/pages/Loans.tsx`) with a full UI including add form, list view, repayment schedule, and Excel export. The backend (`main.mo`) has a complete `addLoan` function accepting all required parameters including `loanTenureMonths: Nat` (which maps to `bigint` in TypeScript via `backend.d.ts`).

The Dashboard has Loan Analytics (KPI cards, tenure pie chart, monthly disbursement bar chart).

**Root cause of loan data not saving:** In `Loans.tsx`, the `useAddLoan` mutation calls `actor.addLoan(...)` and passes `Number(loan.loanTenureMonths)` — a plain JavaScript `number` — but the Candid-generated interface (`backend.d.ts`) declares `loanTenureMonths: bigint`. This type mismatch causes the Candid serialization to silently fail, and the record is never saved to the canister.

## Requested Changes (Diff)

### Add
- A `useAddLoan` hook in `useQueries.ts` that correctly passes `BigInt(loanTenureMonths)` when calling the backend
- An `updateLoan` backend call and edit functionality (not requested — skip)

### Modify
- `Loans.tsx`: Reconstruct the `useAddLoan` mutation to use `BigInt(tenure)` instead of `Number(tenure)` when passing `loanTenureMonths` to the actor. Also move the hook to `useQueries.ts` for consistency.
- `Loans.tsx`: Also fix `deleteLoan` to ensure it uses `BigInt(id)` (already correct since `id` comes from the loan record which is already `bigint`)
- Ensure all `Number(loan.loanTenureMonths)` display calls stay as-is (for UI rendering only, not for writing to backend)

### Remove
- The inline `useAddLoan` and `useDeleteLoan` hooks defined inside `Loans.tsx` (replace with imports from `useQueries.ts`)

## Implementation Plan

1. Add `useAddLoan` and `useDeleteLoan` hooks to `useQueries.ts` with correct `BigInt` conversion for `loanTenureMonths`
2. Update `Loans.tsx` to import these hooks from `useQueries.ts` instead of defining them inline
3. Fix the `mutationFn` to pass `BigInt(loan.loanTenureMonths)` to the actor call
4. Ensure the entire form UX, validation, auto-calculation, manager-only access, repayment schedule view, and Excel download are preserved intact
5. Validate build (typecheck + lint)
