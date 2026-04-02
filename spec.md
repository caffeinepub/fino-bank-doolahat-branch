# Fino Small Finance Bank - Doolahat Branch Management Portal

## Current State
New project. No existing application files.

## Requested Changes (Diff)

### Add
- Full banking management portal for Fino Small Finance Bank - Doolahat Branch (IFSC: FINO0001599)
- Dashboard with bank branding, red star logo, and navigation tabs
- Payment Heads Management module (CRUD for opening/closing balance heads)
- Daily P&L Entry module with per-head opening/closing balance entry and auto-calculation
- Profit & Loss Reports with Recharts (Pie, Bar charts) and Excel export via SheetJS
- Fixed Deposit (FD) History module with customer details, auto-calculated interest/maturity/closure dates, individual receipt Excel download, and bulk FD export
- Transaction History module with full transaction fields, Credit/Debit head filters, and Excel export
- All data persisted in Motoko backend stable storage

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan

### Backend (Motoko)
- Stable storage for: paymentHeads, dailyPnlEntries, fixedDeposits, transactions
- Payment Heads: getPaymentHeads, addPaymentHead, updatePaymentHead, deletePaymentHead
- Default heads seeded on first call: Cash Balance, Fino(R) Balance, Fino(S) Balance, DPL Balance
- Daily P&L Entry: saveDailyEntry, getDailyEntries, getEntriesByDateRange
- Fixed Deposits: addFD, getFDs, updateFD, deleteFD
- Transactions: addTransaction, getTransactions, deleteTransaction
- All IDs auto-incremented as Nat
- All monetary values as Float
- Dates stored as Text (ISO format internally, displayed as dd/MM/yyyy)

### Frontend (React + TypeScript + Tailwind)
- App shell with red/white bank branding, header with bank name/IFSC/logo
- Tab navigation: Dashboard, Daily P&L Entry, P&L Reports, Fixed Deposit, Transactions, Payment Heads
- Payment Heads page: table with add/edit/delete, modal form
- Daily P&L Entry page: date picker, per-head opening/closing inputs, auto-calculated P/L per head and total, save button, summary modal
- P&L Reports page: Daily/Weekly/Monthly filter, Recharts Pie + Bar charts, Excel download (SheetJS)
- Fixed Deposit page: add FD form with auto-calculations, FD table with search, individual Excel receipt download, bulk download
- Transaction History page: add transaction form, table with Credit/Debit tabs, filters, Excel download
- All Excel exports: well-formatted with bank letterhead headers using SheetJS xlsx library
- All monetary values in INR with ₹ symbol
- All dates displayed in dd/MM/yyyy format
- Responsive desktop-first layout
- Color theme: Red (#DC2626 primary) and White
