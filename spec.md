# Fino Bank Doolahat Branch — Inventory Role-Based Access Rebuild

## Current State
- Inventory page exists with metric cards, sortable product table, Add/Edit/Delete, Stock Update, Bulk Actions
- Role toggle is a simple dropdown (no authentication)
- "Add Product" has been reported as broken
- No staff submission/approval workflow
- No login/password system
- Staff view is currently view-only (cannot enter data)

## Requested Changes (Diff)

### Add
- **Login/Auth system** for the entire Inventory section:
  - Site always shows Staff View first
  - Staff login: User ID `156399746`, Password `156399746` (required before submitting data)
  - Manager login: Password `Ratulcc143@`
  - Forget Password for Manager: security question "Enter Your Nick Name", answer `Pulak` allows password reset
- **Staff Submission Workflow:**
  - Staff can fill and submit Add Product and other forms (not view-only)
  - After staff submits, entries go to a "Pending Approval" state
  - Each pending entry shows Approve, Edit/Update, and Delete buttons (visible to Manager)
  - Only Manager can Approve entries for final record
- **Staff User ID field** on submission form: required field `156399746`
- **Persistent Staff/Manager session** stored in localStorage

### Modify
- **Add Product form**: Completely rewrite the submit handler to fix broken state — use local state management (not relying solely on backend mutations that may fail silently)
- **Role system**: Replace simple dropdown with actual login modal (password-gated)
- **Staff view**: Allow data entry (add product, stock update) but with pending approval flow instead of direct save
- **Manager view**: Show pending approvals section; Approve button finalizes records
- **Inventory page header**: Show current logged-in role and logout button

### Remove
- Simple role toggle dropdown (replaced by login system)
- Barcode field from Add Product form (already removed in v6, keep removed)

## Implementation Plan
1. Create `src/frontend/src/context/InventoryAuthContext.tsx` — auth state (role, userId, login/logout functions), localStorage persistence, forget password logic
2. Create `src/frontend/src/components/InventoryLoginModal.tsx` — login modal with:
   - Staff login: User ID + Password fields
   - Manager login: Password only
   - Forget Password flow: nick name question → reset password
3. Rewrite `src/frontend/src/pages/Inventory.tsx`:
   - Wrap with auth context
   - On load: show staff view by default (no login needed to VIEW, but login needed to SUBMIT)
   - Staff submission: adds to local `pendingProducts[]` state
   - Manager view: shows Pending Approvals section with Approve/Edit/Delete per entry
   - Approved entries go through actual `addProduct.mutateAsync()`
   - Fix Add Product by using controlled form state reset properly
4. Add `pendingProducts` state with localStorage persistence so pending entries survive page refresh
