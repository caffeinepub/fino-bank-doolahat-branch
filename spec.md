# Fino Bank Doolahat Branch

## Current State

- `InventoryAuthProvider` wraps the entire app; `InventoryAuthContext` provides `role` ("staff" | "manager"), `isManager`, `loginAsManager`, `resetManagerPassword`, `logoutManager`. Role is persisted in localStorage.
- **Transactions.tsx**: Already has full staff/manager approval workflow — staff submit to pending queue (localStorage `fino_tx_pending`) with credential check (User ID + password `156399746`); manager approves via Pending Approvals panel. However, **no role-switcher UI is embedded on the Transactions page itself** — it relies on switching elsewhere.
- **DailyPLEntry.tsx**: No auth/role protection at all. Any user can save/delete P&L entries directly to backend.
- **FixedDeposits.tsx**: No auth/role protection at all. Any user can add/delete FDs directly to backend.
- **Inventory.tsx**: Has a full role-switcher bar at the top, staff/manager approval workflow, and pending approvals panel.

## Requested Changes (Diff)

### Add
- **Role-Switcher bar** on the `Transactions` page (same pattern as Inventory): shows current role (Staff/Manager), "Switch to Manager" button that opens login dialog, and "Switch to Staff" logout button when in Manager mode.
- **Staff credential step in Add Transaction form** (already exists but needs the switcher bar on page so staff/manager switching is self-contained on Transactions page).
- **Staff/Manager approval workflow on DailyPLEntry page**: Staff can fill and submit P&L entries but must enter User ID + password before submission; entries go to a pending queue (localStorage `fino_pl_pending`); a "Pending Approvals" amber panel is shown to managers with Approve/Edit/Delete; manager can also save directly without pending step.
- **Role-Switcher bar** on `DailyPLEntry` page (same pattern as Inventory/Transactions).
- **Manager-only gate on FixedDeposits page**: The entire FD section (Add New FD form + Delete button) is hidden/locked when role is "staff". A role-switcher bar at the top lets staff switch to Manager to unlock access. Staff sees a locked state with a message to login as Manager.
- **Manager-only gate on DailyPLEntry page**: P&L Entry form (Save) is accessible to staff via the pending queue workflow; but the existing/history edit and delete actions require Manager role.

### Modify
- `DailyPLEntry.tsx`: Import and consume `useInventoryAuth`. Add role-switcher bar. Add pending queue logic for staff P&L submissions. Add manager-only Pending Approvals panel. Protect history delete actions behind manager role.
- `FixedDeposits.tsx`: Import and consume `useInventoryAuth`. Add role-switcher bar at top. Gate Add New FD and Delete behind manager-only access.
- `Transactions.tsx`: Add role-switcher bar UI (embedded on the page itself, same style as Inventory).

### Remove
- Nothing removed.

## Implementation Plan

1. **InventoryAuthContext.tsx** — No changes needed; already provides all required auth state.

2. **Transactions.tsx**:
   - Add a role-switcher bar at the top (identical to Inventory pattern): shows "Staff View" or "Manager View", Switch button, logout button.
   - The existing staff credential step and pending approval panel are already correct — just add the switcher bar.

3. **DailyPLEntry.tsx**:
   - Import `useInventoryAuth`.
   - Add role-switcher bar at top of page.
   - **Staff submit flow**: When role is "staff", the Save button triggers a staff credential dialog (User ID + password `156399746`). On valid credentials, create a `PendingPLEntry` object and push to localStorage `fino_pl_pending` instead of calling backend directly.
   - **Manager direct save**: When role is "manager", Save calls backend directly (existing behavior).
   - **Pending Approvals panel** (manager only): amber panel listing pending P&L entries with Approve (calls backend `saveMutation`), Edit (open edit dialog), Delete (remove from queue) buttons.
   - **History delete**: Only available when `isManager` is true.
   - Show a pending banner to staff: "N P&L entries pending manager approval."

4. **FixedDeposits.tsx**:
   - Import `useInventoryAuth`.
   - Add role-switcher bar at top of page.
   - When role is "staff": hide/disable Add New FD button and all Delete buttons; show a locked-state notice: "FD section is restricted to Manager access only. Please switch to Manager to add or delete records."
   - When role is "manager": full access (existing behavior).
   - Staff can still VIEW existing FD records (read-only table).
