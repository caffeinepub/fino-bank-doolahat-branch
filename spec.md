# Fino Bank Doolahat Branch - Inventory Page

## Current State
The portal has 7 tabs: Dashboard, Daily P&L Entry, P&L Reports, Fixed Deposits, Transactions, Payment Heads, Merchants. The backend manages payment heads, daily P&L, fixed deposits, transactions, and merchants. No inventory management exists. The app uses a purple (#462980) color scheme.

## Requested Changes (Diff)

### Add
- New **Inventory** tab (TabId: `"inventory"`) added to NavTabs and App routing
- Backend data types: `InventoryProduct` (id, name, description, sku, barcode, category, quantity, unitCost, salePrice, reorderPoint, createdAt)
- Backend data type: `StockTransaction` (id, productId, type: "purchase"|"sale"|"adjustment", quantity, note, date, createdAt)
- Backend CRUD functions:
  - `addProduct(...)` -> Nat
  - `editProduct(id, ...)` -> void
  - `deleteProduct(id)` -> void
  - `getAllProducts()` -> [InventoryProduct]
  - `addStockTransaction(productId, type, quantity, note, date)` -> Nat (updates product quantity atomically)
  - `getStockTransactions(productId?)` -> [StockTransaction] (optionally filtered by productId)
  - `getTodayStockTransactions()` -> [StockTransaction] (filtered to today's date)
  - `bulkUpdateProducts(updates: [{id, unitCost?, salePrice?, reorderPoint?}])` -> void
- Authorization integration: role-based access (Manager vs Staff). Managers can add/edit/delete/update stock. Staff can only view.
- New frontend page: `src/frontend/src/pages/Inventory.tsx`

### Modify
- `App.tsx`: Add `"inventory"` to TabId union; add Inventory import and case in renderPage; add Inventory to footer quick links
- `NavTabs.tsx`: Add Inventory tab entry
- `src/backend/main.mo`: Add inventory types and CRUD functions
- `src/frontend/src/hooks/useQueries.ts`: Add inventory-related hooks
- `src/frontend/src/backend.d.ts`: Updated after backend regeneration

### Remove
- Nothing removed

## Implementation Plan
1. Select `authorization` component for role-based access control
2. Generate Motoko code with inventory + stock transaction types and all CRUD functions, including role-based authorization checks
3. Frontend Inventory page with:
   - **Metric cards (top):** Total Inventory Value (qty×unitCost sum), Low Stock Count (qty < reorderPoint), Out of Stock Count (qty=0), Total Monthly Orders (stock transactions this month)
   - **Core table:** Sortable/filterable columns: Product Name & Description, SKU/Barcode, Category, Qty, Unit Cost, Sale Price, Reorder Point, Status badge (green=In Stock, yellow=Low, red=Out of Stock)
   - **Controls:** Quick search (name/SKU), Category filter dropdown, Add Product button (dialog form), Stock Update button per row (adjust qty with reason), Bulk select checkboxes + bulk action toolbar (update price/reorder level)
   - **Today's Transactions panel:** Always shows only today's stock transactions at bottom of page (not all history)
   - **Role-based UI:** Managers see all edit controls; Staff see read-only view (no Add/Edit/Delete/Update buttons)
4. Wire authorization hook to distinguish Manager vs Staff roles
5. Update App.tsx, NavTabs.tsx to include Inventory tab
6. Validate and build frontend
