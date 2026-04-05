# Fino Bank Doolahat Branch – Inventory Rebuild

## Current State
- Inventory page (`src/frontend/src/pages/Inventory.tsx`) is ~2600 lines with metric cards, sortable product table, Add/Edit/Delete, Stock Update modal, Bulk Actions, Today's Transactions panel.
- Role management is in `InventoryAuthContext.tsx` with Staff default and Manager password login.
- The Approve button and pending workflow have had reliability issues across multiple versions.
- The existing Inventory page will be completely replaced.

## Requested Changes (Diff)

### Add
- New Inventory page, fully rebuilt from scratch.
- **User Switching Panel** always visible at the top of the Inventory page: shows current role (Staff / Manager) with a toggle/switch button.
  - **Staff View**: default. Shows a badge "Staff View" with a "Switch to Manager" button.
  - **Manager View**: shows badge "Manager View" with a "Switch to Staff" logout button.
- **Manager Login Dialog**: triggered when switching to Manager; requires password `Ratulcc143@`. Includes Forgot Password via security question ("Enter Your Nick Name", answer: "Pulak").
- **Staff Password Authentication on Submission**: when staff submits Add Product, they must enter Staff User ID (`156399746`) and Staff Password (`156399746`) inline in the form before submitting. Submission goes to a local pending queue.
- **Pending Approvals panel** (visible only to Manager): lists all staff-submitted pending products. Each row has Approve, Edit, Delete buttons. Approving a pending product immediately adds it to the inventory table (local-first, optimistic update).
- All existing inventory features preserved: metric cards (Total Value, Low Stock, Out of Stock, Monthly Orders), product table with search/sort/filter, Add/Edit/Delete (manager direct), Stock Update modal, Bulk Actions.

### Modify
- `InventoryAuthContext.tsx`: no structural changes needed; keep as-is.
- Keep App.tsx, NavTabs.tsx, and all other pages unchanged.

### Remove
- Replace the entire existing `Inventory.tsx` with the new rebuild. The old file is discarded.

## Implementation Plan
1. Rewrite `src/frontend/src/pages/Inventory.tsx` completely.
2. Architecture:
   - `RoleSwitcher` component at top of page -- shows current role badge + switch button.
   - `ManagerLoginModal` -- clean standalone dialog for manager login + forgot password.
   - `AddProductModal` -- with inline staff auth section (shown only in Staff mode).
   - `PendingApprovalsPanel` -- amber card visible only to manager, lists pending items.
   - `InventoryTable` -- product table with search/filter/sort, edit/delete (manager), stock update.
   - `StockUpdateModal`, `EditProductModal`, `BulkUpdateModal`, `PendingEditModal` -- unchanged logic.
3. Pending state: stored in `localStorage` under key `fino_inventory_pending`.
4. Approved state: optimistic local list stored in `localStorage` under `fino_inventory_approved`, merged with backend products.
5. Approve action: remove from pending list + add to local approved list immediately (no async wait).
6. All approve/edit/delete buttons for pending products have independent state (no shared loading flag).
