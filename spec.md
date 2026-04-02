# Fino Bank Doolahat Branch

## Current State
- Dashboard has a "Last 7 Days P&L Overview" bar chart that reads from `useAllDailyPLs()` hook and builds `chartData` locally in the component.
- No Merchants tab exists. Nav has: Dashboard, Daily P&L Entry, P&L Reports, Fixed Deposit, Transactions, Payment Heads.
- Footer Support section shows hardcoded: Helpline: 1800-XXX-XXXX, Email: support@finobank.com, Mon–Fri, 9:00 AM – 6:00 PM.
- `TabId` type in App.tsx defines all available tabs.
- Merchant data has no backend API -- must be stored in localStorage on the frontend.
- Backend has no merchant endpoints.

## Requested Changes (Diff)

### Add
- **Merchants tab** (`merchants` TabId) with full CRUD (add, edit, delete) for merchant records containing: Name, Merchant ID, Mobile No, Address.
- Merchant data persisted in localStorage (no backend API exists for merchants).
- Download merchant list as Excel report (using xlsx library already in project).
- New page file: `src/frontend/src/pages/Merchants.tsx`.
- `downloadMerchants` export function in `src/frontend/src/utils/excelExport.ts`.

### Modify
- **Dashboard Last 7 Days P&L Overview chart**: Currently already reads from `useAllDailyPLs()` and builds chartData -- this is correct. The chart is already auto-populated from P&L Reports data. Verify it uses `getDailyPLByDateRange` or `getAllDailyPLs` filtered by last 7 days -- it already uses `useAllDailyPLs()` and filters. No change needed to data source -- but ensure the chart properly shows "no data" placeholder if no P&L entries exist for the week, and the chart bar colors distinguish positive (green) vs negative (red) values like the PLReports page does.
- **App.tsx**: Add `merchants` to `TabId` union, import `Merchants` page, add case in `renderPage`, add footer quick link.
- **NavTabs.tsx**: Add `{ id: "merchants", label: "Merchants" }` tab.
- **Footer Support section in App.tsx**: Update to:
  - Helpline: 91938-7411-594
  - Email: customercare@finobankpartner.com
  - Mon–Fri, 10:00 AM – 6:00 PM

### Remove
- Nothing removed.

## Implementation Plan
1. Add `downloadMerchants` function to `excelExport.ts`.
2. Create `src/frontend/src/pages/Merchants.tsx` with:
   - Local state for merchant list (persisted to localStorage key `fino_merchants`).
   - Table listing all merchants with Name, Merchant ID, Mobile No, Address columns.
   - Add Merchant dialog with form fields.
   - Edit Merchant dialog (pre-filled).
   - Delete confirmation dialog.
   - Download Excel button using `downloadMerchants`.
3. Update `App.tsx`: add `merchants` to TabId, import Merchants page, add render case, add footer quick link, update Support contact details.
4. Update `NavTabs.tsx`: add Merchants tab.
5. Update Dashboard chart: add per-bar color coding (green for profit, red for loss) using Cell from recharts, matching PLReports style.
