# Fino Bank Doolahat Branch – Customer Complaint Management

## Current State

The app is a full banking portal for Fino Small Finance Bank – Doolahat Branch. It has:
- Dashboard, Daily P&L Entry, P&L Reports, Fixed Deposits, Transactions, Payment Heads, Merchants, Inventory modules
- Global role-based auth via `InventoryAuthContext` (staff/manager)
- Manager password: `Ratulcc143@`, security answer: `Pulak`
- NavTabs in `NavTabs.tsx`, TabId union type in `App.tsx`
- Backend in `src/backend/main.mo` with multiple data types
- Brand color: purple `#462980` (oklch 0.369 0.139 293.8)

## Requested Changes (Diff)

### Add
- New **Customer Complaints** module accessible via a new nav tab `"complaints"`
- Backend data type `Complaint` with fields:
  - `id: Nat` (Ticket ID, auto-generated)
  - `customerName: Text`
  - `contactNo: Text`
  - `accountNo: Text`
  - `aadharNo: Text`
  - `panNo: Text` (optional, may be empty)
  - `dateOfComplaint: Text` (ISO date string)
  - `complaintBrief: Text`
  - `status: Text` (one of: Resolved, Pending, Cancelled, Unknown)
  - `createdAt: Int`
- Backend functions:
  - `addComplaint(...)` – add a new complaint, returns Nat ID
  - `updateComplaintStatus(id: Nat, status: Text)` – update status only
  - `updateComplaint(...)` – full edit of a complaint record
  - `deleteComplaint(id: Nat)` – delete a complaint
  - `getAllComplaints()` – returns all complaints sorted by id
  - `getComplaintsByStatus(status: Text)` – filter by status
- New page `src/frontend/src/pages/Complaints.tsx`
- Manager-only access: page is gated behind manager login using existing `InventoryAuthContext`
- Manager must log in to view, add, edit, delete complaints
- Full analytics section with:
  - KPI cards: Total Complaints, Resolved, Pending, Cancelled/Unknown counts
  - Pie chart: complaints by status
  - Bar chart: complaints over time (by month or last 7 days)
  - Status distribution progress bars
- Complaint table with search, filter by status, sort by date
- Add/Edit complaint form (dialog/sheet)
- Delete with confirmation
- RoleSwitcherBar at top of page (same as other pages)

### Modify
- `App.tsx`: Add `"complaints"` to `TabId` union; add case in `renderPage()`; add to footer quick links
- `NavTabs.tsx`: Add `{ id: "complaints", label: "Complaints" }` tab
- `src/backend/main.mo`: Add complaint data type and CRUD functions

### Remove
- Nothing removed

## Implementation Plan

1. Add `Complaint` type and CRUD functions to `main.mo` backend
2. Regenerate `backend.d.ts` types for frontend
3. Create `src/frontend/src/pages/Complaints.tsx` with:
   - Manager auth gate using `useInventoryAuth`
   - RoleSwitcherBar at top
   - Analytics: KPI cards, pie chart (recharts), bar chart, progress bars
   - Data table with search/filter/sort
   - Add/Edit dialog form
   - Delete confirmation dialog
4. Update `App.tsx` TabId, renderPage, and footer links
5. Update `NavTabs.tsx` tabs list
