import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  Clock,
  Download,
  Eye,
  History,
  Info,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  User,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import { addItem, loadItems, saveItems, updateItem } from "../utils/localStore";

// ── Types ──────────────────────────────────────────────────────────────────

interface LienAccount {
  id: number;
  cifNo: string;
  customerName: string;
  startDate: string;
  mobileNo: string;
  aadharNo: string;
  panNo: string;
  accountNo: string;
  accountType: "Savings" | "Current" | "Salary" | "OD";
  accountStatus: "Active" | "Inactive" | "Dormant" | "Frozen";
  balance: number;
}

interface LienTransaction {
  id: string;
  txnDate: string;
  refNo: string;
  type: "credit" | "debit";
  amount: number;
  remarks: string;
  balanceAfter: number;
  serialNo: number;
}

// ── Storage helpers ────────────────────────────────────────────────────────

const ACCOUNTS_KEY = "fino_lien_accounts";

function loadAccounts(): LienAccount[] {
  return loadItems<LienAccount>(ACCOUNTS_KEY);
}

function loadAccountTxns(accountId: number): LienTransaction[] {
  return loadItems<LienTransaction>(`fino_lien_txns_${accountId}`);
}

function saveAccountTxns(accountId: number, txns: LienTransaction[]) {
  saveItems(`fino_lien_txns_${accountId}`, txns);
}

// ── Migration ──────────────────────────────────────────────────────────────

function migrateOldData() {
  try {
    const oldAccount = localStorage.getItem("fino_lien_account");
    const newAccounts = localStorage.getItem(ACCOUNTS_KEY);
    if (oldAccount && !newAccounts) {
      const parsed = JSON.parse(oldAccount) as Omit<LienAccount, "id">;
      const migrated: LienAccount = { ...parsed, id: 1 } as LienAccount;
      saveItems(ACCOUNTS_KEY, [migrated]);
      const oldTxns = localStorage.getItem("fino_lien_transactions");
      if (oldTxns) {
        localStorage.setItem("fino_lien_txns_1", oldTxns);
      }
      localStorage.removeItem("fino_lien_account");
      localStorage.removeItem("fino_lien_transactions");
    }
  } catch {
    // ignore migration errors
  }
}

// ── Masking helper ─────────────────────────────────────────────────────────

function maskField(value: string | undefined, visibleCount = 4): string {
  if (!value) return "—";
  if (value.length <= visibleCount) return value;
  return "•".repeat(value.length - visibleCount) + value.slice(-visibleCount);
}

// ── Utility helpers ────────────────────────────────────────────────────────

function generateRefNo(
  accountNo: string,
  type: "credit" | "debit",
  date: Date,
  serialNo: number,
): string {
  const last4 = accountNo.slice(-4).padStart(4, "0");
  const letters = ["A", "B", "C", "D"];
  const randomLetter = letters[Math.floor(Math.random() * 4)];
  const typeDigit = type === "credit" ? "0" : "1";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const serial = String(serialNo).padStart(3, "0");
  return `${last4}${randomLetter}${typeDigit}${dd}${mm}${yyyy}${serial}`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function formatCurrency(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800 border-green-300";
    case "Inactive":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "Dormant":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "Frozen":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

// ── RTF generator ──────────────────────────────────────────────────────────

function buildRtfRow(cells: string[], bold = false): string {
  const fmt = bold ? "\\b\\fs18" : "\\fs18";
  const cellDefs =
    "\\cellx1800\\cellx3600\\cellx5400\\cellx7000\\cellx8200\\cellx9500";
  const cellContent = cells.map((c) => `{${fmt} ${c}}\\cell`).join("");
  return `\\trowd\\trgaph60\\trleft0${cellDefs}\\pard\\intbl ${cellContent}\\row`;
}

function generateRTF(
  account: LienAccount,
  transactions: LienTransaction[],
): string {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.txnDate).getTime() - new Date(b.txnDate).getTime(),
  );
  const firstDate =
    sorted.length > 0 ? formatDate(sorted[0].txnDate).split(" ")[0] : "N/A";
  const lastDate =
    sorted.length > 0
      ? formatDate(sorted[sorted.length - 1].txnDate).split(" ")[0]
      : "N/A";

  const headerRow = buildRtfRow(
    [
      "Txn Date",
      "Reference No",
      "Description",
      "Debit (Rs.)",
      "Credit (Rs.)",
      "Balance (Rs.)",
    ],
    true,
  );
  const txnRows = sorted
    .map((t) => {
      const debit = t.type === "debit" ? formatCurrency(t.amount) : "";
      const credit = t.type === "credit" ? formatCurrency(t.amount) : "";
      const prefix = t.type === "credit" ? "Cr" : "Dr";
      const desc = t.remarks ? `${prefix} - ${t.remarks}` : prefix;
      return buildRtfRow([
        formatDate(t.txnDate),
        t.refNo,
        desc,
        debit,
        credit,
        formatCurrency(t.balanceAfter),
      ]);
    })
    .join("\n");

  return [
    "{\\rtf1\\ansi\\deff0",
    "{\\fonttbl{\\f0\\froman Times New Roman;}{\\f1\\fswiss Arial;}}",
    "{\\colortbl ;\\red70\\green41\\blue128;}",
    "\\paperw11907\\paperh16838\\margl1440\\margr1440\\margt1440\\margb1440",
    "\\pard\\qc{\\f1\\b\\fs28\\cf1 Fino Small Finance Bank \\endash  Doolahat Branch}\\par",
    "\\pard\\qc{\\f1\\b\\fs22 Account Statement}\\par",
    `\\pard\\qc{\\f1\\fs18 Statement Period: ${firstDate} to ${lastDate}}\\par\\par`,
    "\\pard\\qc{\\f1\\b\\fs20 Account Holder Details}\\par",
    `\\pard\\ql{\\f1\\fs18 CIF No: ${account.cifNo}}\\par`,
    `\\pard\\ql{\\f1\\fs18 Customer Name: ${account.customerName}}\\par`,
    `\\pard\\ql{\\f1\\fs18 Start Date: ${account.startDate}}\\par`,
    `\\pard\\ql{\\f1\\fs18 Mobile No: ${account.mobileNo}}\\par`,
    `\\pard\\ql{\\f1\\fs18 Aadhar No: ${account.aadharNo}}\\par`,
    `\\pard\\ql{\\f1\\fs18 PAN No: ${account.panNo}}\\par`,
    `\\pard\\ql{\\f1\\fs18 Account No: ${account.accountNo}}\\par`,
    `\\pard\\ql{\\f1\\fs18 Account Type: ${account.accountType}}\\par`,
    `\\pard\\ql{\\f1\\fs18 Account Status: ${account.accountStatus}}\\par`,
    `\\pard\\ql{\\f1\\fs18 Current Balance: ${formatCurrency(account.balance)}}\\par\\par`,
    "\\pard\\qc{\\f1\\b\\fs20 Transaction History}\\par",
    headerRow,
    txnRows,
    "\\par\\par",
    "\\pard\\qc{\\f1\\fs16 Fino Small Finance Bank \\endash  Doolahat Branch | IFSC: FINO0001599}\\par",
    "\\pard\\qc{\\f1\\fs16 Helpline: 91938-7411-594 | Email: customercare@finobankpartner.com}\\par",
    "}",
  ].join("\n");
}

// ── Shared small components ────────────────────────────────────────────────

function DetailCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium truncate">
        {label}
      </span>
      <span
        className={`text-sm font-semibold truncate ${highlight ? "text-green-700" : "text-foreground"}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </span>
      <p className="text-sm font-medium text-foreground border border-border rounded-md px-3 py-2 bg-muted/30 truncate">
        {value || "—"}
      </p>
    </div>
  );
}

// ── STATE 1: Search/Landing ─────────────────────────────────────────────────

function SearchPanel({
  isManager,
  allAccounts,
  onFound,
  onNotFound,
  onAddNew,
  onViewAccount,
}: {
  isManager: boolean;
  allAccounts: LienAccount[];
  onFound: (account: LienAccount) => void;
  onNotFound: (query: string) => void;
  onAddNew: () => void;
  onViewAccount: (account: LienAccount) => void;
}) {
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<"idle" | "not-found">(
    "idle",
  );
  const [notFoundQuery, setNotFoundQuery] = useState("");

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) {
      toast.error("Please enter an Account No or Mobile No to search");
      return;
    }
    const found = allAccounts.find(
      (a) =>
        a.accountNo.toLowerCase().includes(q) ||
        a.mobileNo.toLowerCase().includes(q),
    );
    if (found) {
      setSearchResult("idle");
      onFound(found);
    } else {
      setNotFoundQuery(query.trim());
      setSearchResult("not-found");
      onNotFound(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-6" data-ocid="lien.search.panel">
      {/* Search card */}
      <Card className="max-w-xl mx-auto shadow-md">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold flex items-center gap-2"
            style={{ color: "#462980" }}
          >
            <Search className="w-4 h-4" />
            Lien Transaction – Account Search
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Search by Account No or Mobile No to access account details
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Account No or Mobile No"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchResult("idle");
              }}
              onKeyDown={handleKeyDown}
              className="flex-1"
              data-ocid="lien.search.input"
            />
            <Button
              onClick={handleSearch}
              className="gap-2 text-white"
              style={{ backgroundColor: "#462980" }}
              data-ocid="lien.search.button"
            >
              <Search className="w-4 h-4" />
              Search
            </Button>
          </div>

          {searchResult === "not-found" && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-3"
              data-ocid="lien.search.not_found"
            >
              <div className="flex items-center gap-2 text-amber-800 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No account found for &quot;{notFoundQuery}&quot;
              </div>
              {isManager ? (
                <Button
                  size="sm"
                  onClick={onAddNew}
                  className="gap-2 text-white"
                  style={{ backgroundColor: "#462980" }}
                  data-ocid="lien.search.add_new_button"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Account
                </Button>
              ) : (
                <p className="text-xs text-amber-700">
                  Account not found. Please contact your manager to add this
                  account.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manager: All Accounts list */}
      {isManager && (
        <Card data-ocid="lien.all_accounts.card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle
                className="text-base font-semibold flex items-center gap-2"
                style={{ color: "#462980" }}
              >
                <List className="w-4 h-4" />
                All Account Profiles
                <Badge variant="secondary" className="text-xs">
                  {allAccounts.length}
                </Badge>
              </CardTitle>
              <Button
                size="sm"
                onClick={onAddNew}
                className="gap-2 text-white"
                style={{ backgroundColor: "#462980" }}
                data-ocid="lien.all_accounts.add_button"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Account
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {allAccounts.length === 0 ? (
              <div
                className="flex flex-col items-center gap-2 py-10 text-muted-foreground"
                data-ocid="lien.all_accounts.empty_state"
              >
                <User className="w-8 h-8 opacity-30" />
                <p className="text-sm">No accounts added yet.</p>
                <p className="text-xs">
                  Use the search bar above to add the first account.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table data-ocid="lien.all_accounts.table">
                  <TableHeader>
                    <TableRow
                      style={{ backgroundColor: "#462980" }}
                      className="hover:bg-transparent"
                    >
                      <TableHead className="text-white font-semibold text-xs">
                        CIF No
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs">
                        Customer Name
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs">
                        Account No
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs">
                        Account Type
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs">
                        Status
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs text-right">
                        Balance
                      </TableHead>
                      <TableHead className="text-white font-semibold text-xs text-center">
                        Action
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allAccounts.map((acc, idx) => (
                      <TableRow
                        key={acc.id}
                        className={`text-xs ${idx % 2 === 0 ? "" : "bg-muted/20"} hover:bg-muted/40 transition-colors`}
                        data-ocid={`lien.all_accounts.row.${idx + 1}`}
                      >
                        <TableCell className="text-xs font-mono">
                          {acc.cifNo || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {acc.customerName}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {acc.accountNo}
                        </TableCell>
                        <TableCell className="text-xs">
                          {acc.accountType}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBadgeClass(acc.accountStatus)}`}
                          >
                            {acc.accountStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold text-green-700">
                          {formatCurrency(acc.balance)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewAccount(acc)}
                            className="gap-1.5 text-xs h-7"
                            data-ocid={`lien.all_accounts.view_button.${idx + 1}`}
                          >
                            <Eye className="w-3 h-3" />
                            View Data
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Account Details Card ────────────────────────────────────────────────────

function AccountDetailsCard({
  account,
  isManager,
}: {
  account: LienAccount;
  isManager: boolean;
}) {
  const m = (val: string | undefined) =>
    isManager ? val || "—" : maskField(val);

  return (
    <Card className="mb-4" data-ocid="lien.account_details.card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle
            className="text-base font-semibold flex items-center gap-2"
            style={{ color: "#462980" }}
          >
            <User className="w-4 h-4" />
            Account Details
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {!isManager && (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                Sensitive fields masked for staff
              </span>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadgeClass(account.accountStatus)}`}
            >
              {account.accountStatus}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: CIF, Name, Start Date, Mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-border/60">
          <DetailCell label="CIF No" value={m(account.cifNo)} />
          <DetailCell
            label="Customer Name"
            value={account.customerName || "—"}
          />
          <DetailCell label="Start Date" value={account.startDate || "—"} />
          <DetailCell label="Mobile No" value={m(account.mobileNo)} />
        </div>
        {/* Row 2: Aadhar, PAN, Account No, Account Type — each own column */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-border/60">
          <DetailCell label="Aadhar No" value={m(account.aadharNo)} />
          <DetailCell label="PAN No" value={m(account.panNo)} />
          <DetailCell label="Account No" value={m(account.accountNo)} />
          <DetailCell label="Account Type" value={account.accountType || "—"} />
        </div>
        {/* Row 3: Account Status, Balance (always unmasked) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <DetailCell
            label="Account Status"
            value={account.accountStatus || "—"}
          />
          <DetailCell
            label="Balance"
            value={formatCurrency(account.balance)}
            highlight
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Account Profile Tab ─────────────────────────────────────────────────────

function AccountProfileTab({
  account,
  onSave,
  isManager,
}: {
  account: LienAccount;
  onSave: (acc: LienAccount) => void;
  isManager: boolean;
}) {
  const [form, setForm] = useState<LienAccount>(account);

  useEffect(() => {
    setForm(account);
  }, [account]);

  const setField = (field: keyof LienAccount, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.cifNo.trim()) {
      toast.error("CIF No is required");
      return;
    }
    if (!form.customerName.trim()) {
      toast.error("Customer Name is required");
      return;
    }
    if (!form.accountNo.trim()) {
      toast.error("Account No is required");
      return;
    }
    onSave(form);
    toast.success("Account profile updated successfully");
  };

  if (!isManager) {
    const m = (val: string | undefined) => maskField(val);
    return (
      <div className="space-y-4" data-ocid="lien.account_profile.panel">
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
          data-ocid="lien.account_profile.error_state"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          Account profile management is restricted to managers.
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-border/60">
            <ReadonlyField label="CIF No" value={m(account.cifNo)} />
            <ReadonlyField label="Customer Name" value={account.customerName} />
            <ReadonlyField label="Start Date" value={account.startDate} />
            <ReadonlyField label="Mobile No" value={m(account.mobileNo)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-border/60">
            <ReadonlyField label="Aadhar No" value={m(account.aadharNo)} />
            <ReadonlyField label="PAN No" value={m(account.panNo)} />
            <ReadonlyField label="Account No" value={m(account.accountNo)} />
            <ReadonlyField label="Account Type" value={account.accountType} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ReadonlyField
              label="Account Status"
              value={account.accountStatus}
            />
            <ReadonlyField
              label="Balance"
              value={formatCurrency(account.balance)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-ocid="lien.account_profile.panel">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cifNo">CIF No *</Label>
            <Input
              id="cifNo"
              value={form.cifNo}
              onChange={(e) => setField("cifNo", e.target.value)}
              placeholder="Enter CIF No"
              data-ocid="lien.cif_no.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
              placeholder="Enter customer name"
              data-ocid="lien.customer_name.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={(e) => setField("startDate", e.target.value)}
              data-ocid="lien.start_date.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobileNo">Mobile No (10 digits)</Label>
            <Input
              id="mobileNo"
              value={form.mobileNo}
              onChange={(e) =>
                setField(
                  "mobileNo",
                  e.target.value.replace(/\D/g, "").slice(0, 10),
                )
              }
              placeholder="10-digit mobile number"
              data-ocid="lien.mobile_no.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="aadharNo">Aadhar No (12 digits)</Label>
            <Input
              id="aadharNo"
              value={form.aadharNo}
              onChange={(e) =>
                setField(
                  "aadharNo",
                  e.target.value.replace(/\D/g, "").slice(0, 12),
                )
              }
              placeholder="12-digit Aadhar number"
              data-ocid="lien.aadhar_no.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="panNo">PAN No (optional)</Label>
            <Input
              id="panNo"
              value={form.panNo}
              onChange={(e) =>
                setField("panNo", e.target.value.toUpperCase().slice(0, 10))
              }
              placeholder="e.g. ABCDE1234F"
              data-ocid="lien.pan_no.input"
            />
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="accountNo">Account No *</Label>
            <Input
              id="accountNo"
              value={form.accountNo}
              onChange={(e) => setField("accountNo", e.target.value)}
              placeholder="Enter account number"
              data-ocid="lien.account_no.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountType">Account Type</Label>
            <Select
              value={form.accountType}
              onValueChange={(v) => setField("accountType", v)}
            >
              <SelectTrigger data-ocid="lien.account_type.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Savings">Savings</SelectItem>
                <SelectItem value="Current">Current</SelectItem>
                <SelectItem value="Salary">Salary</SelectItem>
                <SelectItem value="OD">OD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accountStatus">Account Status</Label>
            <Select
              value={form.accountStatus}
              onValueChange={(v) => setField("accountStatus", v)}
            >
              <SelectTrigger data-ocid="lien.account_status.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Dormant">Dormant</SelectItem>
                <SelectItem value="Frozen">Frozen</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="balance">Balance (Rs.)</Label>
            <Input
              id="balance"
              type="number"
              min="0"
              value={form.balance}
              onChange={(e) =>
                setField("balance", Number.parseFloat(e.target.value) || 0)
              }
              placeholder="Enter balance"
              data-ocid="lien.balance.input"
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          className="gap-2 text-white"
          style={{ backgroundColor: "#462980" }}
          data-ocid="lien.account_profile.save_button"
        >
          <Save className="w-4 h-4" />
          Save Account Profile
        </Button>
      </div>
    </div>
  );
}

// ── Cash Operation Tab ──────────────────────────────────────────────────────

function CashOperationTab({
  type,
  account,
  onComplete,
}: {
  type: "deposit" | "withdrawal";
  account: LienAccount;
  onComplete: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const isDeposit = type === "deposit";
  const label = isDeposit ? "Cash Deposit" : "Cash Withdrawal";
  const btnLabel = isDeposit ? "Deposit" : "Withdraw";
  const Icon = isDeposit ? ArrowDownCircle : ArrowUpCircle;
  const iconColor = isDeposit ? "text-green-600" : "text-red-600";

  const handleSubmit = () => {
    const amt = Number.parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    if (!isDeposit && amt > account.balance) {
      toast.error(
        `Insufficient balance. Available: ${formatCurrency(account.balance)}`,
      );
      return;
    }
    setLoading(true);
    try {
      const txns = loadAccountTxns(account.id);
      const newSerialNo = txns.length + 1;
      const now = new Date();
      const txnType = isDeposit ? "credit" : "debit";
      const newBalance = isDeposit
        ? account.balance + amt
        : account.balance - amt;

      const newTxn: LienTransaction = {
        id: `${Date.now()}${Math.random()}`,
        txnDate: now.toISOString(),
        refNo: generateRefNo(account.accountNo, txnType, now, newSerialNo),
        type: txnType,
        amount: amt,
        remarks: remarks.trim(),
        balanceAfter: newBalance,
        serialNo: newSerialNo,
      };

      saveAccountTxns(account.id, [...txns, newTxn]);
      updateItem<LienAccount>(ACCOUNTS_KEY, account.id, {
        balance: newBalance,
      });

      setAmount("");
      setRemarks("");
      onComplete();
      toast.success(
        isDeposit
          ? `₹${amt.toLocaleString("en-IN")} deposited successfully`
          : `₹${amt.toLocaleString("en-IN")} withdrawn successfully`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md space-y-5" data-ocid={`lien.${type}.panel`}>
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-3 ${isDeposit ? "bg-green-50" : "bg-red-50"}`}
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <span
          className={`text-sm font-semibold ${isDeposit ? "text-green-700" : "text-red-700"}`}
        >
          {label}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          Available: {formatCurrency(account.balance)}
        </span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${type}-amount`}>Amount (Rs.) *</Label>
        <Input
          id={`${type}-amount`}
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          data-ocid={`lien.${type}_amount.input`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${type}-remarks`}>Remarks (optional)</Label>
        <Textarea
          id={`${type}-remarks`}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Add a remark (optional)"
          rows={3}
          data-ocid={`lien.${type}_remarks.textarea`}
        />
      </div>
      <Button
        onClick={handleSubmit}
        disabled={loading}
        className={`gap-2 text-white ${isDeposit ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
        data-ocid={`lien.${type}.submit_button`}
      >
        <Icon className="w-4 h-4" />
        {btnLabel}
      </Button>
    </div>
  );
}

// ── Transaction History Tab ─────────────────────────────────────────────────

function TransactionHistoryTab({
  transactions,
  account,
  isManager,
  onDelete,
}: {
  transactions: LienTransaction[];
  account: LienAccount;
  isManager: boolean;
  onDelete: (id: string) => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime(),
  );

  const handlePrintStatement = useCallback(() => {
    if (transactions.length === 0) {
      toast.error("No transactions to export.");
      return;
    }
    const rtf = generateRTF(account, transactions);
    const blob = new Blob([rtf], { type: "application/rtf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}${String(today.getMonth() + 1).padStart(2, "0")}${today.getFullYear()}`;
    a.download = `LienStatement_${account.accountNo}_${dateStr}.rtf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Statement downloaded successfully");
  }, [account, transactions]);

  return (
    <div className="space-y-4" data-ocid="lien.txn_history.panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" style={{ color: "#462980" }} />
          <span className="text-sm font-semibold text-foreground">
            Transaction History
          </span>
          <Badge variant="secondary" className="text-xs">
            {transactions.length} record{transactions.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrintStatement}
          className="gap-2 text-xs"
          data-ocid="lien.print_statement.button"
        >
          <Printer className="w-3.5 h-3.5" />
          <Download className="w-3.5 h-3.5" />
          Print Statement (.rtf)
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div
          className="flex flex-col items-center gap-2 py-12 text-muted-foreground"
          data-ocid="lien.txn_history.empty_state"
        >
          <Clock className="w-8 h-8 opacity-40" />
          <p className="text-sm">No transactions recorded yet.</p>
          <p className="text-xs">
            Use Cash Deposit or Cash Withdrawal to record transactions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table data-ocid="lien.txn_history.table">
            <TableHeader>
              <TableRow
                style={{ backgroundColor: "#462980" }}
                className="hover:bg-transparent"
              >
                <TableHead className="text-white font-semibold text-xs">
                  Txn Date
                </TableHead>
                <TableHead className="text-white font-semibold text-xs">
                  Reference No
                </TableHead>
                <TableHead className="text-white font-semibold text-xs">
                  Description
                </TableHead>
                <TableHead className="text-white font-semibold text-xs text-right">
                  Debit (Rs.)
                </TableHead>
                <TableHead className="text-white font-semibold text-xs text-right">
                  Credit (Rs.)
                </TableHead>
                <TableHead className="text-white font-semibold text-xs text-right">
                  Balance (Rs.)
                </TableHead>
                {isManager && (
                  <TableHead className="text-white font-semibold text-xs text-center">
                    Action
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((txn, idx) => (
                <TableRow
                  key={txn.id}
                  className={`text-xs ${idx % 2 === 0 ? "" : "bg-muted/20"} hover:bg-muted/40 transition-colors`}
                  data-ocid={`lien.txn_history.row.${idx + 1}`}
                >
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(txn.txnDate)}
                  </TableCell>
                  <TableCell className="text-xs font-mono whitespace-nowrap">
                    {txn.refNo}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span
                      className={`font-semibold ${txn.type === "credit" ? "text-green-700" : "text-red-700"}`}
                    >
                      {txn.type === "credit" ? "Cr" : "Dr"}
                    </span>
                    {txn.remarks ? (
                      <span className="text-muted-foreground">
                        {" "}
                        - {txn.remarks}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-xs text-right text-red-600">
                    {txn.type === "debit" ? formatCurrency(txn.amount) : ""}
                  </TableCell>
                  <TableCell className="text-xs text-right text-green-600">
                    {txn.type === "credit" ? formatCurrency(txn.amount) : ""}
                  </TableCell>
                  <TableCell className="text-xs text-right font-semibold">
                    {formatCurrency(txn.balanceAfter)}
                  </TableCell>
                  {isManager && (
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(txn.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        data-ocid={`lien.txn_history.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) setDeleteId(null);
        }}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="lien.delete_txn.dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete Transaction?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This action will permanently remove the selected transaction record.
            This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              data-ocid="lien.delete_txn.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              data-ocid="lien.delete_txn.confirm_button"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── STATE 3: Add Account Form ───────────────────────────────────────────────

const EMPTY_ACCOUNT_FORM = {
  cifNo: "",
  customerName: "",
  startDate: "",
  mobileNo: "",
  aadharNo: "",
  panNo: "",
  accountNo: "",
  accountType: "Savings" as const,
  accountStatus: "Active" as const,
  balance: 0,
};

function AddAccountForm({
  isManager,
  prefillAccountNo,
  prefillMobileNo,
  onSaved,
  onBack,
}: {
  isManager: boolean;
  prefillAccountNo?: string;
  prefillMobileNo?: string;
  onSaved: (account: LienAccount) => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState({
    ...EMPTY_ACCOUNT_FORM,
    accountNo: prefillAccountNo || "",
    mobileNo: prefillMobileNo || "",
  });

  const setField = (
    field: keyof typeof EMPTY_ACCOUNT_FORM,
    value: string | number,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!form.accountNo.trim()) {
      toast.error("Account No is required");
      return;
    }
    if (!form.mobileNo.trim()) {
      toast.error("Mobile No is required");
      return;
    }
    if (!form.cifNo.trim()) {
      toast.error("CIF No is required");
      return;
    }
    if (!form.customerName.trim()) {
      toast.error("Customer Name is required");
      return;
    }
    if (!form.startDate) {
      toast.error("Start Date is required");
      return;
    }
    if (!form.aadharNo.trim()) {
      toast.error("Aadhar No is required");
      return;
    }

    const newAccount = addItem<LienAccount>(ACCOUNTS_KEY, form);
    toast.success(`Account for ${form.customerName} added successfully`);
    onSaved(newAccount);
  };

  return (
    <div className="space-y-4" data-ocid="lien.add_account.panel">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold flex items-center gap-2"
            style={{ color: "#462980" }}
          >
            <Plus className="w-4 h-4" />
            Add New Account Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isManager ? (
            <div
              className="flex items-center gap-3 rounded-lg px-4 py-5 text-sm"
              style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
              data-ocid="lien.add_account.staff_notice"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">Manager Access Required</p>
                <p className="text-xs mt-0.5">
                  Account creation requires manager access. Please ask your
                  manager to add this account.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="add-accountNo">Account No *</Label>
                    <Input
                      id="add-accountNo"
                      value={form.accountNo}
                      onChange={(e) => setField("accountNo", e.target.value)}
                      placeholder="Enter account number"
                      data-ocid="lien.add.account_no.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-mobileNo">
                      Mobile No * (10 digits)
                    </Label>
                    <Input
                      id="add-mobileNo"
                      value={form.mobileNo}
                      onChange={(e) =>
                        setField(
                          "mobileNo",
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      placeholder="10-digit mobile number"
                      data-ocid="lien.add.mobile_no.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-cifNo">CIF No *</Label>
                    <Input
                      id="add-cifNo"
                      value={form.cifNo}
                      onChange={(e) => setField("cifNo", e.target.value)}
                      placeholder="Enter CIF No"
                      data-ocid="lien.add.cif_no.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-customerName">Customer Name *</Label>
                    <Input
                      id="add-customerName"
                      value={form.customerName}
                      onChange={(e) => setField("customerName", e.target.value)}
                      placeholder="Enter customer name"
                      data-ocid="lien.add.customer_name.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-startDate">Start Date *</Label>
                    <Input
                      id="add-startDate"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setField("startDate", e.target.value)}
                      data-ocid="lien.add.start_date.input"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="add-aadharNo">
                      Aadhar No * (12 digits)
                    </Label>
                    <Input
                      id="add-aadharNo"
                      value={form.aadharNo}
                      onChange={(e) =>
                        setField(
                          "aadharNo",
                          e.target.value.replace(/\D/g, "").slice(0, 12),
                        )
                      }
                      placeholder="12-digit Aadhar number"
                      data-ocid="lien.add.aadhar_no.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-panNo">PAN No (optional)</Label>
                    <Input
                      id="add-panNo"
                      value={form.panNo}
                      onChange={(e) =>
                        setField(
                          "panNo",
                          e.target.value.toUpperCase().slice(0, 10),
                        )
                      }
                      placeholder="e.g. ABCDE1234F"
                      data-ocid="lien.add.pan_no.input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-accountType">Account Type</Label>
                    <Select
                      value={form.accountType}
                      onValueChange={(v) => setField("accountType", v)}
                    >
                      <SelectTrigger data-ocid="lien.add.account_type.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Savings">Savings</SelectItem>
                        <SelectItem value="Current">Current</SelectItem>
                        <SelectItem value="Salary">Salary</SelectItem>
                        <SelectItem value="OD">OD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-accountStatus">Account Status</Label>
                    <Select
                      value={form.accountStatus}
                      onValueChange={(v) => setField("accountStatus", v)}
                    >
                      <SelectTrigger data-ocid="lien.add.account_status.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Dormant">Dormant</SelectItem>
                        <SelectItem value="Frozen">Frozen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="add-balance">Opening Balance (Rs.)</Label>
                    <Input
                      id="add-balance"
                      type="number"
                      min="0"
                      value={form.balance}
                      onChange={(e) =>
                        setField(
                          "balance",
                          Number.parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="Enter opening balance"
                      data-ocid="lien.add.balance.input"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={onBack}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="gap-2 text-white"
                  style={{ backgroundColor: "#462980" }}
                  data-ocid="lien.add_account.save_button"
                >
                  <Save className="w-4 h-4" />
                  Save Account
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── STATE 2: Account Detail View ────────────────────────────────────────────

function AccountDetailView({
  account: initialAccount,
  isManager,
  onBack,
}: {
  account: LienAccount;
  isManager: boolean;
  onBack: () => void;
}) {
  const [account, setAccount] = useState<LienAccount>(initialAccount);
  const [transactions, setTransactions] = useState<LienTransaction[]>(() =>
    loadAccountTxns(initialAccount.id),
  );
  const [activeTab, setActiveTab] = useState("account-profile");

  // Keep in sync if isManager changes (role switch)
  useEffect(() => {
    const fresh = loadItems<LienAccount>(ACCOUNTS_KEY).find(
      (a) => a.id === account.id,
    );
    if (fresh) setAccount(fresh);
  }, [account.id]);

  const handleSaveAccount = (acc: LienAccount) => {
    updateItem<LienAccount>(ACCOUNTS_KEY, acc.id, acc);
    setAccount(acc);
  };

  const handleTransactionComplete = () => {
    const fresh = loadItems<LienAccount>(ACCOUNTS_KEY).find(
      (a) => a.id === account.id,
    );
    if (fresh) setAccount(fresh);
    setTransactions(loadAccountTxns(account.id));
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    saveAccountTxns(account.id, updated);
    setTransactions(updated);
    toast.success("Transaction deleted");
  };

  return (
    <div className="space-y-4" data-ocid="lien.detail.panel">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-2 -ml-1 text-muted-foreground hover:text-foreground"
        data-ocid="lien.detail.back_button"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Search
      </Button>

      <AccountDetailsCard account={account} isManager={isManager} />

      <Card data-ocid="lien.operations.panel">
        <CardContent className="pt-5">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList
              className="grid w-full grid-cols-4 mb-5"
              data-ocid="lien.operations.tab"
            >
              <TabsTrigger
                value="account-profile"
                className="text-xs"
                data-ocid="lien.account_profile.tab"
              >
                <User className="w-3.5 h-3.5 mr-1.5" />
                Account Profile
              </TabsTrigger>
              <TabsTrigger
                value="cash-deposit"
                className="text-xs"
                data-ocid="lien.cash_deposit.tab"
              >
                <ArrowDownCircle className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                Cash Deposit
              </TabsTrigger>
              <TabsTrigger
                value="cash-withdrawal"
                className="text-xs"
                data-ocid="lien.cash_withdrawal.tab"
              >
                <ArrowUpCircle className="w-3.5 h-3.5 mr-1.5 text-red-600" />
                Cash Withdrawal
              </TabsTrigger>
              <TabsTrigger
                value="txn-history"
                className="text-xs"
                data-ocid="lien.txn_history.tab"
              >
                <History className="w-3.5 h-3.5 mr-1.5" />
                Transaction History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account-profile">
              <AccountProfileTab
                account={account}
                onSave={handleSaveAccount}
                isManager={isManager}
              />
            </TabsContent>
            <TabsContent value="cash-deposit">
              <CashOperationTab
                type="deposit"
                account={account}
                onComplete={handleTransactionComplete}
              />
            </TabsContent>
            <TabsContent value="cash-withdrawal">
              <CashOperationTab
                type="withdrawal"
                account={account}
                onComplete={handleTransactionComplete}
              />
            </TabsContent>
            <TabsContent value="txn-history">
              <TransactionHistoryTab
                transactions={transactions}
                account={account}
                isManager={isManager}
                onDelete={handleDeleteTransaction}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

type PageState = "search" | "detail" | "add";

export default function LienTransactionPage() {
  const { isManager } = useInventoryAuth();
  const [pageState, setPageState] = useState<PageState>("search");
  const [selectedAccount, setSelectedAccount] = useState<LienAccount | null>(
    null,
  );
  const [allAccounts, setAllAccounts] = useState<LienAccount[]>([]);
  const [prefillAccountNo, setPrefillAccountNo] = useState("");
  const [prefillMobileNo, setPrefillMobileNo] = useState("");

  // Run migration on mount, then load accounts
  useEffect(() => {
    migrateOldData();
    setAllAccounts(loadAccounts());
  }, []);

  // Reload accounts whenever we return to search state
  useEffect(() => {
    if (pageState === "search") {
      setAllAccounts(loadAccounts());
    }
  }, [pageState]);

  const handleFound = (account: LienAccount) => {
    setSelectedAccount(account);
    setPageState("detail");
  };

  const handleNotFound = (query: string) => {
    // Detect whether it looks like an account no or mobile no
    const isLikelyMobile = /^\d{10}$/.test(query);
    if (isLikelyMobile) {
      setPrefillMobileNo(query);
      setPrefillAccountNo("");
    } else {
      setPrefillAccountNo(query);
      setPrefillMobileNo("");
    }
  };

  const handleAddNew = () => {
    setPageState("add");
  };

  const handleAccountSaved = (account: LienAccount) => {
    setAllAccounts(loadAccounts());
    setSelectedAccount(account);
    setPageState("detail");
  };

  const handleBack = () => {
    setSelectedAccount(null);
    setPrefillAccountNo("");
    setPrefillMobileNo("");
    setPageState("search");
  };

  return (
    <div className="space-y-4" data-ocid="lien.page">
      <RoleSwitcherBar />

      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: "#462980" }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Lien Transaction
          </h1>
          <p className="text-xs text-muted-foreground">
            Search account by Account No or Mobile No to manage deposits,
            withdrawals and history
          </p>
        </div>
      </div>

      {pageState === "search" && (
        <SearchPanel
          isManager={isManager}
          allAccounts={allAccounts}
          onFound={handleFound}
          onNotFound={handleNotFound}
          onAddNew={handleAddNew}
          onViewAccount={handleFound}
        />
      )}

      {pageState === "detail" && selectedAccount && (
        <AccountDetailView
          account={selectedAccount}
          isManager={isManager}
          onBack={handleBack}
        />
      )}

      {pageState === "add" && (
        <AddAccountForm
          isManager={isManager}
          prefillAccountNo={prefillAccountNo}
          prefillMobileNo={prefillMobileNo}
          onSaved={handleAccountSaved}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
