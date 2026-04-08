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
  Clock,
  Download,
  History,
  Info,
  Printer,
  Save,
  Trash2,
  User,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";

// ── Types ──────────────────────────────────────────────────────────────────

interface LienAccount {
  cifNo: string;
  customerName: string;
  startDate: string;
  mobileNo: string;
  aadharNo: string;
  panNo: string;
  accountNo: string;
  accountType: string;
  accountStatus: string;
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

const ACCOUNT_KEY = "fino_lien_account";
const TXNS_KEY = "fino_lien_transactions";

function loadAccount(): LienAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as LienAccount) : null;
  } catch {
    return null;
  }
}

function saveAccount(acc: LienAccount) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc));
}

function loadTransactions(): LienTransaction[] {
  try {
    const raw = localStorage.getItem(TXNS_KEY);
    return raw ? (JSON.parse(raw) as LienTransaction[]) : [];
  } catch {
    return [];
  }
}

function saveTransactions(txns: LienTransaction[]) {
  localStorage.setItem(TXNS_KEY, JSON.stringify(txns));
}

// ── Masking helper ─────────────────────────────────────────────────────────

/**
 * For staff: show only the last 4 characters of the value, prefixed with "••••".
 * Start Date is NEVER masked.
 * Manager always sees the full value.
 */
function maskField(
  value: string | undefined,
  isManager: boolean,
  fieldName?: string,
): string {
  if (!value) return "—";
  if (isManager) return value;
  if (fieldName === "startDate") return value;
  // Show last 4 chars only
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
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
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function statusStyle(status: string): React.CSSProperties {
  switch (status) {
    case "Active":
      return { backgroundColor: "#16a34a", color: "white" };
    case "Inactive":
      return { backgroundColor: "#dc2626", color: "white" };
    case "Dormant":
      return { backgroundColor: "#ea580c", color: "white" };
    case "Frozen":
      return { backgroundColor: "#2563eb", color: "white" };
    default:
      return {};
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
    "\\pard\\qc{\\f1\\fs16 Fino Small Finance Bank \u2013 Doolahat Branch | IFSC: FINO0001599}\\par",
    "\\pard\\qc{\\f1\\fs16 Helpline: 91938-7411-594 | Email: customercare@finobankpartner.com}\\par",
    "}",
  ].join("\n");
}

// ── DetailCell ─────────────────────────────────────────────────────────────

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
        className={`text-sm font-semibold truncate ${
          highlight ? "text-green-600" : "text-foreground"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

// ── AccountDetailsCard ─────────────────────────────────────────────────────

function AccountDetailsCard({
  account,
  isManager,
}: {
  account: LienAccount | null;
  isManager: boolean;
}) {
  if (!account) {
    return (
      <Card className="mb-6" data-ocid="lien.account_details.card">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-base font-semibold flex items-center gap-2"
            style={{ color: "var(--brand-red)" }}
          >
            <User className="w-4 h-4" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Info className="w-4 h-4" />
            No account profile found. Please set up via Account Profile tab.
          </div>
        </CardContent>
      </Card>
    );
  }

  const m = (val: string | undefined, field?: string) =>
    maskField(val, isManager, field);

  return (
    <Card className="mb-6" data-ocid="lien.account_details.card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-base font-semibold flex items-center gap-2"
            style={{ color: "var(--brand-red)" }}
          >
            <User className="w-4 h-4" />
            Account Details
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isManager && (
              <span className="text-[10px] text-muted-foreground bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                Sensitive fields masked for staff
              </span>
            )}
            <Badge style={statusStyle(account.accountStatus)}>
              {account.accountStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Identity fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-border/60">
          <DetailCell label="CIF No" value={m(account.cifNo)} />
          <DetailCell
            label="Customer Name"
            value={account.customerName || "—"}
          />
          <DetailCell
            label="Start Date"
            value={m(account.startDate, "startDate")}
          />
          <DetailCell label="Mobile No" value={m(account.mobileNo)} />
        </div>
        {/* Row 2: Aadhar, PAN, Account No, Account Type — each separate column */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-border/60">
          <DetailCell label="Aadhar No" value={m(account.aadharNo)} />
          <DetailCell label="PAN No" value={m(account.panNo)} />
          <DetailCell label="Account No" value={m(account.accountNo)} />
          <DetailCell label="Account Type" value={account.accountType || "—"} />
        </div>
        {/* Row 3: Account Status and Balance — each separate column */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <DetailCell
            label="Account Status"
            value={account.accountStatus || "—"}
          />
          <DetailCell
            label="Balance (Rs.)"
            value={
              isManager
                ? formatCurrency(account.balance)
                : `••••${String(account.balance).slice(-4)}`
            }
            highlight
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── AccountProfileTab ──────────────────────────────────────────────────────

const EMPTY_ACCOUNT: LienAccount = {
  cifNo: "",
  customerName: "",
  startDate: "",
  mobileNo: "",
  aadharNo: "",
  panNo: "",
  accountNo: "",
  accountType: "Savings",
  accountStatus: "Active",
  balance: 0,
};

function AccountProfileTab({
  account,
  onSave,
  isManager,
}: {
  account: LienAccount | null;
  onSave: (acc: LienAccount) => void;
  isManager: boolean;
}) {
  const [form, setForm] = useState<LienAccount>(account ?? EMPTY_ACCOUNT);

  useEffect(() => {
    setForm(account ?? EMPTY_ACCOUNT);
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
    toast.success("Account profile saved successfully");
  };

  // Staff view: read-only with masking on all numerical fields
  if (!isManager) {
    const m = (val: string | undefined, field?: string) =>
      maskField(val, false, field);

    return (
      <div className="space-y-4" data-ocid="lien.account_profile.panel">
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
          data-ocid="lien.account_profile.error_state"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          Account updates can only be done by the Manager. Switch to Manager
          View to edit account details. Sensitive fields are masked below.
        </div>
        {account ? (
          <div className="space-y-4">
            {/* Row 1 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-border/60">
              <ReadonlyField label="CIF No" value={m(account.cifNo)} />
              <ReadonlyField
                label="Customer Name"
                value={account.customerName}
              />
              <ReadonlyField
                label="Start Date"
                value={m(account.startDate, "startDate")}
              />
              <ReadonlyField label="Mobile No" value={m(account.mobileNo)} />
            </div>
            {/* Row 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-3 border-b border-border/60">
              <ReadonlyField label="Aadhar No" value={m(account.aadharNo)} />
              <ReadonlyField label="PAN No" value={m(account.panNo)} />
              <ReadonlyField label="Account No" value={m(account.accountNo)} />
              <ReadonlyField label="Account Type" value={account.accountType} />
            </div>
            {/* Row 3 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <ReadonlyField
                label="Account Status"
                value={account.accountStatus}
              />
              <ReadonlyField
                label="Balance (Rs.)"
                value={`••••${String(account.balance).slice(-4)}`}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No account profile set up yet.
          </p>
        )}
      </div>
    );
  }

  // Manager view: full edit form
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
            <Label htmlFor="panNo">PAN No</Label>
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
          style={{ backgroundColor: "var(--brand-red)" }}
          data-ocid="lien.account_profile.save_button"
        >
          <Save className="w-4 h-4" />
          Save Account Profile
        </Button>
      </div>
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

// ── CashOperationTab ───────────────────────────────────────────────────────

function CashOperationTab({
  type,
  account,
  onComplete,
}: {
  type: "deposit" | "withdrawal";
  account: LienAccount | null;
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
    if (!account) {
      toast.error(
        "No account profile set up. Please configure Account Profile first.",
      );
      return;
    }
    if (!isDeposit && amt > account.balance) {
      toast.error(
        `Insufficient funds. Available balance: ${formatCurrency(account.balance)}`,
      );
      return;
    }

    setLoading(true);
    try {
      const txns = loadTransactions();
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

      txns.push(newTxn);
      saveTransactions(txns);
      saveAccount({ ...account, balance: newBalance });

      setAmount("");
      setRemarks("");
      onComplete();
      toast.success(
        isDeposit
          ? `\u20b9${amt.toLocaleString("en-IN")} deposited successfully`
          : `\u20b9${amt.toLocaleString("en-IN")} withdrawn successfully`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md space-y-5" data-ocid={`lien.${type}.panel`}>
      <div
        className={`flex items-center gap-2 rounded-lg px-4 py-3 ${
          isDeposit ? "bg-green-50" : "bg-red-50"
        }`}
      >
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <span
          className={`text-sm font-semibold ${
            isDeposit ? "text-green-700" : "text-red-700"
          }`}
        >
          {label}
        </span>
        {account && (
          <span className="ml-auto text-xs text-muted-foreground">
            Available: {formatCurrency(account.balance)}
          </span>
        )}
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
        className={`gap-2 text-white ${
          isDeposit
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
        data-ocid={`lien.${type}.submit_button`}
      >
        <Icon className="w-4 h-4" />
        {btnLabel}
      </Button>
    </div>
  );
}

// ── TransactionHistoryTab ──────────────────────────────────────────────────

function TransactionHistoryTab({
  transactions,
  account,
  isManager,
  onDelete,
}: {
  transactions: LienTransaction[];
  account: LienAccount | null;
  isManager: boolean;
  onDelete: (id: string) => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...transactions].sort(
    (a, b) => new Date(b.txnDate).getTime() - new Date(a.txnDate).getTime(),
  );

  const handlePrintStatement = useCallback(() => {
    if (!account) {
      toast.error("No account profile found. Please set up account first.");
      return;
    }
    if (transactions.length === 0) {
      toast.error("No transactions to export.");
      return;
    }
    const rtf = generateRTF(account, transactions);
    const blob = new Blob([rtf], { type: "application/rtf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement_${account.accountNo}_${Date.now()}.rtf`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Statement downloaded successfully");
  }, [account, transactions]);

  return (
    <div className="space-y-4" data-ocid="lien.txn_history.panel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" style={{ color: "var(--brand-red)" }} />
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
                style={{ backgroundColor: "var(--brand-red)" }}
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
                  className={`text-xs ${
                    idx % 2 === 0 ? "bg-white" : "bg-muted/20"
                  } hover:bg-muted/40 transition-colors`}
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
                      className={`font-semibold ${
                        txn.type === "credit"
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {txn.type === "credit" ? "Cr" : "Dr"}
                    </span>
                    {txn.remarks ? (
                      <span className="text-muted-foreground">
                        {" - "}
                        {txn.remarks}
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

// ── Main Page ──────────────────────────────────────────────────────────────

export default function LienTransactionPage() {
  const { isManager } = useInventoryAuth();
  const [account, setAccount] = useState<LienAccount | null>(loadAccount);
  const [transactions, setTransactions] =
    useState<LienTransaction[]>(loadTransactions);
  const [activeTab, setActiveTab] = useState("account-profile");

  const handleSaveAccount = (acc: LienAccount) => {
    saveAccount(acc);
    setAccount(acc);
  };

  const handleTransactionComplete = () => {
    setAccount(loadAccount());
    setTransactions(loadTransactions());
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    saveTransactions(updated);
    setTransactions(updated);
    toast.success("Transaction deleted");
  };

  return (
    <div className="space-y-4" data-ocid="lien.page">
      <RoleSwitcherBar />

      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
          style={{ backgroundColor: "var(--brand-red)" }}
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
            Manage account profile, deposits, withdrawals and transaction
            history
          </p>
        </div>
      </div>

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
