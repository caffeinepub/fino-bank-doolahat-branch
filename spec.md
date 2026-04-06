# Fino Bank Doolahat Branch Portal

## Current State
The app has a full backend (Motoko) and React frontend with modules: Dashboard, Daily P&L Entry, P&L Reports, Fixed Deposits, Transactions, Payment Heads, Merchants, Inventory, Complaints, and Loans.

All data-entry forms currently call backend mutations via `actor.mutateAsync()`. However, the ICP backend requires the `#admin` role for all write operations, while the frontend actor is always **anonymous** (no Internet Identity login). This means every form submission silently fails with an authorization error — the backend rejects the call and the mutation throws. The `InventoryAuthContext` only manages local UI role state (staff vs manager), but does NOT grant ICP admin access to the actor.

The existing role/auth system:
- `InventoryAuthContext` — local staff/manager state (localStorage), password-gated
- `useActor` — creates an anonymous ICP actor (no identity)
- All backend write functions check `AccessControl.hasPermission(caller, #admin)` — anonymous caller never has this

## Requested Changes (Diff)

### Add
- `useLocalStore` utility hook — a generic localStorage-based CRUD store that replaces direct backend mutations for all write operations. Data is stored locally and displayed immediately.
- Each module gets its own localStorage key and typed data store.
- All list/read views source data from localStorage instead of (or in addition to) backend queries.

### Modify
- **All data entry forms** must be fully rebuilt to use localStorage-based persistence instead of calling backend mutations directly. This applies to every form across every page:
  1. **Loans** — Add New Loan form: all 12 fields + auto-calculated summary. Save to localStorage key `fino_loans`.
  2. **Inventory** — Add Product form (staff submits to pending queue, manager approves). Already has localStorage logic — reinforce and fix submit handler.
  3. **Transactions** — Add Transaction form: staff submits to pending queue, manager approves. Save to `fino_transactions_pending` and `fino_transactions_approved`.
  4. **Daily P&L Entry** — Manager-only form: saves head balances. Save to `fino_daily_pls`.
  5. **Fixed Deposits** — Manager-only Add FD form. Save to `fino_fixed_deposits`.
  6. **Complaints** — Manager-only Add/Edit Complaint form. Save to `fino_complaints`.
  7. **Payment Heads** — Add/Edit Payment Head form. Save to `fino_payment_heads` with 4 seeded defaults.
  8. **Merchants** — Manager-only Add/Edit Merchant form. Save to `fino_merchants`.

- All pages must **read from localStorage** to display saved data (replacing `useQuery` hooks that call backend).
- Delete operations must remove from localStorage.
- The `useAddLoan`, `useAddFixedDeposit`, `useAddTransaction`, `useSaveDailyPL`, `useAddProduct`, `useAddComplaint`, etc. hooks in `useQueries.ts` must be updated to write to localStorage instead of calling actor.
- Backend queries (read-only `getAllX` calls) may remain for future compatibility but localStorage takes priority.

### Remove
- Remove all `actor.mutateAsync()` calls from form submit handlers — replace with localStorage writes.
- Remove reliance on ICP actor for any mutation path.

## Implementation Plan
1. Create `src/frontend/src/utils/localStore.ts` — generic typed localStorage CRUD helpers: `loadItems<T>`, `saveItems<T>`, `addItem<T>`, `updateItem<T>`, `removeItem<T>`.
2. Update `useQueries.ts` — replace all mutation `mutationFn` implementations to write to localStorage. Keep query `queryFn` reading from localStorage.
3. Rebuild `Loans.tsx` form — full reconstruction, save to `fino_loans`, list reads from localStorage.
4. Rebuild `Transactions.tsx` form — staff pending queue → manager approval, all localStorage.
5. Rebuild `DailyPLEntry.tsx` form — manager-only, saves to `fino_daily_pls`.
6. Rebuild `FixedDeposits.tsx` form — manager-only, saves to `fino_fixed_deposits`.
7. Rebuild `Complaints.tsx` form — manager-only Add + Edit, saves to `fino_complaints`.
8. Rebuild `PaymentHeads.tsx` form — saves to `fino_payment_heads` with seeded defaults.
9. Rebuild `Merchants.tsx` form — manager-only, saves to `fino_merchants`.
10. Rebuild `Inventory.tsx` form — reinforce existing pending/approved localStorage flow.
11. Update Dashboard to read loan/transaction analytics from localStorage.
12. Validate (lint + typecheck + build).
