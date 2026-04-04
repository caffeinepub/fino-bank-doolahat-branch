# Fino Bank Doolahat Branch

## Current State
- Inventory module has Staff/Manager role-based views with a pending approval queue.
- The Approve button in Manager view calls `useAddProduct()` mutation which hits the backend actor. This is failing silently — the button appears to do nothing.
- Transactions page allows direct "Add Transaction" for all users without any approval workflow.

## Requested Changes (Diff)

### Add
- Staff approval workflow to Transactions page: staff submits transaction to a local pending queue (localStorage), requires Staff User ID + Password before submission.
- Manager view on Transactions page shows a Pending Approvals panel where manager can Approve, Edit, or Delete each pending transaction.
- Approved transactions get added to the real transaction list via the backend mutation.

### Modify
- **Inventory Approve button fix**: Change the approval mechanism to be local-first. Instead of relying solely on the backend actor call (which fails silently), use optimistic local state update — immediately move the pending product to the approved list in React state, persist via localStorage, and attempt a background backend sync. This makes the UI responsive regardless of backend timing.
- Alternatively (simpler and more correct): the real issue is likely that `approveProductMut` may be the same mutation instance used by the Add Product form. Fix by creating a completely independent mutation call using a fresh `useAddProduct()` hook invocation, and add proper error boundary + retry logic.
- Transactions: TxForm component gets Staff auth fields (User ID + Password) when in staff mode; Manager can add directly.

### Remove
- Nothing removed.

## Implementation Plan
1. **Inventory Approve fix**: The `approveProductMut = useAddProduct()` is correct but may share state with the form. The real bug: `approveProductMut.mutateAsync` is an async call but the pending products include `quantity` as a `number` (from JSON parse) — `BigInt(pending.quantity)` should work. More likely the actor is null at that moment. Fix: add actor readiness check, and use a local-first update pattern — update `pendingProducts` state AND a local `approvedProducts` array before the async call, so the UI responds immediately.
2. **Transactions staff workflow**: Add localStorage key `fino_tx_pending` for pending transactions. Add Staff auth section to TxForm (when not manager). Detect manager mode from `InventoryAuthContext` (since it's already global). Add a Pending Approvals section above the filters in Transactions page for manager view. Approve button calls `useAddTransaction()` mutation and removes from pending.
3. Keep all existing Transactions features (filters, Excel export, delete) unchanged.
