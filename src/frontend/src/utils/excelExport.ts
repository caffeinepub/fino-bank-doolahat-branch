/**
 * Excel export utilities.
 * xlsx is loaded at runtime via CDN to avoid bundle-time resolution failures.
 */
import type { DailyPL, FixedDeposit, Loan, Transaction } from "../backend";
import { formatDate, formatINR } from "./helpers";

const BANK_NAME = "Fino Small Finance Bank - Doolahat Branch";
const IFSC = "FINO0001599";
const BRANCH_LINE = "Branch: Doolahat | IFSC: FINO0001599";

/** Load xlsx from CDN (runtime only, not bundled) */
async function getXLSX(): Promise<any> {
  // Check if already loaded from CDN
  if (typeof window !== "undefined" && (window as any).XLSX) {
    return (window as any).XLSX;
  }
  // Try to load from CDN
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error("Failed to load xlsx from CDN"));
    document.head.appendChild(script);
  });
}

export async function downloadPLReport(pls: DailyPL[], dateRangeLabel: string) {
  const XLSX = await getXLSX();
  const rows: (string | number)[][] = [
    [BANK_NAME],
    [`IFSC: ${IFSC}`],
    ["Profit & Loss Report"],
    [`Date Range: ${dateRangeLabel}`],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    [
      "Date",
      "Head Name",
      "Opening Balance (\u20b9)",
      "Closing Balance (\u20b9)",
      "Profit/Loss (\u20b9)",
      "Total P&L (\u20b9)",
    ],
  ];

  for (const pl of pls) {
    for (let idx = 0; idx < pl.headBalances.length; idx++) {
      const hb = pl.headBalances[idx];
      rows.push([
        idx === 0 ? formatDate(pl.date) : "",
        hb.headName,
        hb.openingBalance,
        hb.closingBalance,
        hb.profitLoss,
        idx === 0 ? pl.totalProfitLoss : "",
      ]);
    }
    rows.push(["", "", "", "", "", ""]);
  }

  rows.push([]);
  rows.push(["Summary"]);
  const totalPL = pls.reduce((s, p) => s + p.totalProfitLoss, 0);
  const totalOpening = pls.reduce(
    (s, p) => s + p.headBalances.reduce((hs, hb) => hs + hb.openingBalance, 0),
    0,
  );
  const totalClosing = pls.reduce(
    (s, p) => s + p.headBalances.reduce((hs, hb) => hs + hb.closingBalance, 0),
    0,
  );
  rows.push(["Total Opening Balance", formatINR(totalOpening)]);
  rows.push(["Total Closing Balance", formatINR(totalClosing)]);
  rows.push(["Net Profit / Loss", formatINR(totalPL)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [18, 24, 22, 22, 20, 18].map((w: number) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "P&L Report");
  XLSX.writeFile(wb, `PL_Report_${dateRangeLabel.replace(/\s/g, "_")}.xlsx`);
}

export async function downloadFDReceipt(fd: FixedDeposit) {
  const XLSX = await getXLSX();
  const rows: (string | number)[][] = [
    [BANK_NAME, "", "", ""],
    [`IFSC: ${IFSC}`, "", "", ""],
    ["FIXED DEPOSIT RECEIPT", "", "", ""],
    [],
    ["Receipt Details", "", "", ""],
    [],
    ["Customer Name", fd.customerName, "", ""],
    ["Account Number", fd.accountNumber, "", ""],
    ["CIF Number", fd.cifNumber, "", ""],
    ["Contact Number", fd.contactNumber, "", ""],
    [],
    ["FD Details", "", "", ""],
    [],
    ["Date of Opening", formatDate(fd.openingDate), "", ""],
    ["FD Amount", formatINR(fd.fdAmount), "", ""],
    ["Tenure", `${String(fd.tenure)} Year(s)`, "", ""],
    ["Interest Rate", `${fd.interestRate}% per annum (flat)`, "", ""],
    ["Interest Amount", formatINR(fd.interestAmount), "", ""],
    ["Maturity Amount", formatINR(fd.maturityAmount), "", ""],
    ["Date of Closure", formatDate(fd.closureDate), "", ""],
    ["Maturity Deposit Date", formatDate(fd.maturityDepositDate), "", ""],
    [],
    [],
    ["This is a computer generated receipt.", "", "", ""],
    [],
    [
      "Authorized Signatory: ___________________",
      "",
      "Official Stamp: ___________________",
      "",
    ],
    [],
    [BANK_NAME, "", "", ""],
    [BRANCH_LINE, "", "", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [28, 30, 28, 20].map((w: number) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "FD Receipt");
  XLSX.writeFile(
    wb,
    `FD_Receipt_${fd.customerName.replace(/\s+/g, "_")}_${fd.accountNumber}.xlsx`,
  );
}

export async function downloadAllFDs(fds: FixedDeposit[]) {
  const XLSX = await getXLSX();
  const rows: (string | number)[][] = [
    [BANK_NAME],
    [`IFSC: ${IFSC}`],
    ["All Fixed Deposits Report"],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    [
      "#",
      "Customer Name",
      "Account Number",
      "CIF Number",
      "Contact",
      "Opening Date",
      "FD Amount (\u20b9)",
      "Tenure (Yrs)",
      "Rate (%)",
      "Interest (\u20b9)",
      "Maturity Amount (\u20b9)",
      "Closure Date",
      "Maturity Deposit Date",
    ],
  ];

  for (let i = 0; i < fds.length; i++) {
    const fd = fds[i];
    rows.push([
      i + 1,
      fd.customerName,
      fd.accountNumber,
      fd.cifNumber,
      fd.contactNumber,
      formatDate(fd.openingDate),
      fd.fdAmount,
      Number(fd.tenure),
      fd.interestRate,
      fd.interestAmount,
      fd.maturityAmount,
      formatDate(fd.closureDate),
      formatDate(fd.maturityDepositDate),
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [4, 24, 18, 14, 14, 14, 16, 12, 10, 16, 20, 14, 22].map(
    (w: number) => ({ wch: w }),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fixed Deposits");
  XLSX.writeFile(
    wb,
    `All_Fixed_Deposits_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

export async function downloadTransactions(
  transactions: Transaction[],
  label = "All",
) {
  const XLSX = await getXLSX();
  const rows: (string | number)[][] = [
    [BANK_NAME],
    [`IFSC: ${IFSC}`],
    [`Transaction History - ${label}`],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    [
      "#",
      "Date",
      "Reference ID",
      "Type",
      "Account Number",
      "Account Holder",
      "Bank Name",
      "IFSC",
      "Amount (\u20b9)",
      "Frequency",
      "Remark",
      "Status",
    ],
  ];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    rows.push([
      i + 1,
      formatDate(tx.transactionDate),
      tx.referenceId,
      tx.transactionType,
      tx.accountNumber,
      tx.accountHolderName,
      tx.bankName,
      tx.ifscCode,
      tx.amount,
      tx.frequencyType,
      tx.remark,
      tx.status,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [4, 14, 18, 14, 18, 22, 18, 14, 14, 12, 22, 10].map(
    (w: number) => ({ wch: w }),
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(
    wb,
    `Transactions_${label}_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

export interface Merchant {
  id: string;
  name: string;
  merchantId: string;
  mobileNo: string;
  address: string;
}

export async function downloadMerchants(merchants: Merchant[]) {
  const XLSX = await getXLSX();
  const rows: (string | number)[][] = [
    ["Fino Small Finance Bank - Doolahat Branch"],
    ["IFSC: FINO0001599"],
    ["Merchant Report"],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    ["#", "Name", "Merchant ID", "Mobile No", "Address"],
  ];
  merchants.forEach((m, i) => {
    rows.push([i + 1, m.name, m.merchantId, m.mobileNo, m.address]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 18 },
    { wch: 16 },
    { wch: 36 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Merchants");
  XLSX.writeFile(
    wb,
    `Merchants_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
}

/** Add months to an ISO date string and return as DD/MM/YYYY */
function addMonthsFormatted(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/** Download a full loan repayment schedule as an Excel file */
export async function downloadLoanSheet(loan: Loan): Promise<void> {
  const XLSX = await getXLSX();
  const n = Number(loan.loanTenureMonths);
  const principalPerInstallment = loan.loanAmount / n;
  const interestPerInstallment = loan.totalInterestAmount / n;
  const totalInstallment = principalPerInstallment + interestPerInstallment;

  const rows: (string | number)[][] = [
    [BANK_NAME],
    [`IFSC: ${IFSC}`],
    ["LOAN REPAYMENT SCHEDULE"],
    [],
    ["Loan Details"],
    [],
    ["Customer Name", loan.customerName],
    ["Father/Husband Name", loan.fatherHusbandName],
    ["Full Address", loan.fullAddress],
    ["Loan Start Date", formatDate(loan.loanStartDate)],
    ["Contact No", loan.contactNo],
    ["Nominee Name", loan.nomineeName],
    ["Date of Birth", formatDate(loan.dateOfBirth)],
    ["Loan Amount (\u20b9)", loan.loanAmount],
    [
      "Total Interest Amount (\u20b9)",
      Number.parseFloat(loan.totalInterestAmount.toFixed(2)),
    ],
    ["Interest Rate (%)", loan.interestRate],
    ["Loan Tenure (months)", n],
    ["Repayment Type", loan.repaymentType],
    [],
    // Header row 1 - group header
    [
      "S.No",
      "Repayment Date",
      "Repayable Amount",
      "",
      "",
      "Remaining Amount",
      "Collection Officer Sign",
    ],
    // Header row 2 - sub-columns
    [
      "",
      "",
      "Principal (\u20b9)",
      "Interest (\u20b9)",
      "Total (\u20b9)",
      "",
      "",
    ],
  ];

  // Installment rows
  for (let i = 0; i < n; i++) {
    const remaining =
      i === n - 1
        ? 0
        : Number.parseFloat(
            (loan.loanAmount - principalPerInstallment * (i + 1)).toFixed(2),
          );
    rows.push([
      i + 1,
      addMonthsFormatted(loan.loanStartDate, i + 1),
      Number.parseFloat(principalPerInstallment.toFixed(2)),
      Number.parseFloat(interestPerInstallment.toFixed(2)),
      Number.parseFloat(totalInstallment.toFixed(2)),
      remaining,
      "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [8, 18, 18, 18, 18, 20, 28].map((w: number) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Loan Schedule");
  XLSX.writeFile(
    wb,
    `Loan_${loan.customerName.replace(/\s+/g, "_")}_Schedule.xlsx`,
  );
}
