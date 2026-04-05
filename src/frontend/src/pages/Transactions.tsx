import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Transaction } from "../backend";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import {
  useAddTransaction,
  useDeleteTransaction,
  useTransactions,
} from "../hooks/useQueries";
import { downloadTransactions } from "../utils/excelExport";
import { formatDate, formatINR, todayISO } from "../utils/helpers";

// ── Constants ────────────────────────────────────────────────────────────────

const TX_TYPES = [
  "NEFT",
  "IMPS",
  "DMT",
  "Credit",
  "Debit",
  "AEPS",
  "New CASA",
  "MISC Payment",
];
const TX_STATUSES = ["Success", "Pending", "Failed"];
const CREDIT_TYPES = new Set(["Credit", "AEPS", "New CASA"]);
const DEBIT_TYPES = new Set(["Debit", "NEFT", "IMPS", "DMT", "MISC Payment"]);
const TX_PENDING_KEY = "fino_tx_pending";

// ── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  referenceId: string;
  transactionType: string;
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  ifscCode: string;
  amount: string;
  transactionDate: string;
  remark: string;
  status: string;
}

interface PendingTransaction {
  id: string;
  submittedAt: string;
  submittedByUserId: string;
  referenceId: string;
  transactionType: string;
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  ifscCode: string;
  amount: number;
  transactionDate: string;
  frequencyType: string;
  remark: string;
  status: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function genTxId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

function loadPendingTxs(): PendingTransaction[] {
  try {
    const stored = localStorage.getItem(TX_PENDING_KEY);
    return stored ? (JSON.parse(stored) as PendingTransaction[]) : [];
  } catch {
    return [];
  }
}

function savePendingTxs(txs: PendingTransaction[]): void {
  localStorage.setItem(TX_PENDING_KEY, JSON.stringify(txs));
}

// ── TxForm ───────────────────────────────────────────────────────────────────

const emptyForm: FormState = {
  referenceId: "",
  transactionType: "NEFT",
  accountNumber: "",
  accountHolderName: "",
  bankName: "",
  ifscCode: "",
  amount: "",
  transactionDate: todayISO(),
  remark: "",
  status: "Success",
};

function TxForm({
  onClose,
  role,
  onPendingAdd,
  initialValues,
}: {
  onClose: () => void;
  role: "staff" | "manager";
  onPendingAdd?: (tx: PendingTransaction) => void;
  initialValues?: Partial<FormState>;
}) {
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    ...initialValues,
  });
  const [staffUserId, setStaffUserId] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffError, setStaffError] = useState("");

  const addTx = useAddTransaction();
  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.referenceId || !form.accountNumber || !form.amount) {
      toast.error("Please fill in required fields.");
      return;
    }

    if (role !== "manager") {
      // Staff mode: validate credentials then queue for approval
      if (staffUserId !== "156399746" || staffPassword !== "156399746") {
        setStaffError(
          "Invalid Staff User ID or Password. Please check and retry.",
        );
        return;
      }
      const pending: PendingTransaction = {
        id: genTxId(),
        submittedAt: new Date().toISOString(),
        submittedByUserId: staffUserId,
        referenceId: form.referenceId,
        transactionType: form.transactionType,
        accountNumber: form.accountNumber,
        accountHolderName: form.accountHolderName,
        bankName: form.bankName,
        ifscCode: form.ifscCode,
        amount: Number.parseFloat(form.amount) || 0,
        transactionDate: form.transactionDate,
        frequencyType: "One Time",
        remark: form.remark,
        status: form.status,
      };
      if (onPendingAdd) {
        onPendingAdd(pending);
      }
      toast.success("Transaction submitted for manager approval");
      onClose();
      return;
    }

    // Manager mode: direct backend submit
    try {
      await addTx.mutateAsync({
        referenceId: form.referenceId,
        transactionType: form.transactionType,
        accountNumber: form.accountNumber,
        accountHolderName: form.accountHolderName,
        bankName: form.bankName,
        ifscCode: form.ifscCode,
        amount: Number.parseFloat(form.amount) || 0,
        transactionDate: form.transactionDate,
        frequencyType: "One Time",
        remark: form.remark,
        status: form.status,
      });
      toast.success("Transaction added successfully!");
      onClose();
    } catch {
      toast.error("Failed to add transaction.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {role !== "manager" && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
          ⚡ Staff submission — this transaction will require{" "}
          <strong>manager approval</strong> before being recorded.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="tx-ref">Reference ID *</Label>
          <Input
            id="tx-ref"
            value={form.referenceId}
            onChange={(e) => update("referenceId", e.target.value)}
            placeholder="REF001"
            className="mt-1"
            data-ocid="tx.reference_id.input"
          />
        </div>
        <div>
          <Label>Transaction Type</Label>
          <Select
            value={form.transactionType}
            onValueChange={(v) => update("transactionType", v)}
          >
            <SelectTrigger className="mt-1" data-ocid="tx.type.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="tx-account">Account Number *</Label>
          <Input
            id="tx-account"
            value={form.accountNumber}
            onChange={(e) => update("accountNumber", e.target.value)}
            placeholder="Account no."
            className="mt-1"
            data-ocid="tx.account_number.input"
          />
        </div>
        <div>
          <Label htmlFor="tx-holder">Account Holder Name</Label>
          <Input
            id="tx-holder"
            value={form.accountHolderName}
            onChange={(e) => update("accountHolderName", e.target.value)}
            placeholder="Full name"
            className="mt-1"
            data-ocid="tx.account_holder.input"
          />
        </div>
        <div>
          <Label htmlFor="tx-bank">Bank Name</Label>
          <Input
            id="tx-bank"
            value={form.bankName}
            onChange={(e) => update("bankName", e.target.value)}
            placeholder="Bank name"
            className="mt-1"
            data-ocid="tx.bank_name.input"
          />
        </div>
        <div>
          <Label htmlFor="tx-ifsc">IFSC Code</Label>
          <Input
            id="tx-ifsc"
            value={form.ifscCode}
            onChange={(e) => update("ifscCode", e.target.value)}
            placeholder="IFSC"
            className="mt-1"
            data-ocid="tx.ifsc.input"
          />
        </div>
        <div>
          <Label htmlFor="tx-amount">Amount (₹) *</Label>
          <Input
            id="tx-amount"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            placeholder="0.00"
            className="mt-1"
            data-ocid="tx.amount.input"
          />
        </div>
        <div>
          <Label htmlFor="tx-date">Transaction Date</Label>
          <Input
            id="tx-date"
            type="date"
            value={form.transactionDate}
            onChange={(e) => update("transactionDate", e.target.value)}
            className="mt-1"
            data-ocid="tx.date.input"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => update("status", v)}
          >
            <SelectTrigger className="mt-1" data-ocid="tx.status.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <Label htmlFor="tx-remark">Remark</Label>
          <Textarea
            id="tx-remark"
            value={form.remark}
            onChange={(e) => update("remark", e.target.value)}
            placeholder="Optional remark..."
            className="mt-1 resize-none h-16"
            data-ocid="tx.remark.textarea"
          />
        </div>
      </div>

      {/* Staff Authentication — only for staff role */}
      {role !== "manager" && (
        <>
          <Separator />
          <div
            className="rounded-lg p-4 space-y-3"
            style={{
              backgroundColor: "oklch(0.97 0.016 72 / 0.4)",
              border: "1px solid oklch(0.78 0.18 72 / 0.3)",
            }}
          >
            <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              Staff Authentication Required
            </p>
            <p className="text-xs text-amber-700">
              Enter your Staff credentials to submit this transaction for
              manager approval.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tx-staff-id">Staff User ID</Label>
                <Input
                  id="tx-staff-id"
                  placeholder="Enter your staff ID"
                  value={staffUserId}
                  onChange={(e) => {
                    setStaffUserId(e.target.value);
                    setStaffError("");
                  }}
                  data-ocid="tx.staff_id.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tx-staff-pass">Staff Password</Label>
                <Input
                  id="tx-staff-pass"
                  type="password"
                  placeholder="Enter your password"
                  value={staffPassword}
                  onChange={(e) => {
                    setStaffPassword(e.target.value);
                    setStaffError("");
                  }}
                  data-ocid="tx.staff_password.input"
                />
              </div>
            </div>
            {staffError && (
              <p
                className="text-xs text-red-600"
                data-ocid="tx.staff_auth.error_state"
              >
                {staffError}
              </p>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          data-ocid="tx.cancel.button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={addTx.isPending}
          className="text-white gap-2"
          style={{ backgroundColor: "var(--brand-red)" }}
          data-ocid="tx.submit.button"
        >
          {addTx.isPending
            ? "Saving..."
            : role === "manager"
              ? "Add Transaction"
              : "Submit for Approval"}
        </Button>
      </div>
    </form>
  );
}

// ── Pending Edit Dialog ───────────────────────────────────────────────────────

function PendingTxEditDialog({
  pending,
  onSave,
  onClose,
}: {
  pending: PendingTransaction | null;
  onSave: (updated: PendingTransaction) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (pending) {
      setForm({
        referenceId: pending.referenceId,
        transactionType: pending.transactionType,
        accountNumber: pending.accountNumber,
        accountHolderName: pending.accountHolderName,
        bankName: pending.bankName,
        ifscCode: pending.ifscCode,
        amount: String(pending.amount),
        transactionDate: pending.transactionDate,
        remark: pending.remark,
        status: pending.status,
      });
    }
  }, [pending]);

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!pending) return;
    if (!form.referenceId || !form.accountNumber || !form.amount) {
      toast.error("Please fill in required fields.");
      return;
    }
    onSave({
      ...pending,
      referenceId: form.referenceId,
      transactionType: form.transactionType,
      accountNumber: form.accountNumber,
      accountHolderName: form.accountHolderName,
      bankName: form.bankName,
      ifscCode: form.ifscCode,
      amount: Number.parseFloat(form.amount) || 0,
      transactionDate: form.transactionDate,
      remark: form.remark,
      status: form.status,
    });
    toast.success("Pending transaction updated");
    onClose();
  };

  return (
    <Dialog open={!!pending} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="tx.pending_edit.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" style={{ color: "var(--brand-red)" }} />
            Edit Pending Transaction
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Reference ID *</Label>
            <Input
              value={form.referenceId}
              onChange={(e) => update("referenceId", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Transaction Type</Label>
            <Select
              value={form.transactionType}
              onValueChange={(v) => update("transactionType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TX_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Account Number *</Label>
            <Input
              value={form.accountNumber}
              onChange={(e) => update("accountNumber", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Account Holder Name</Label>
            <Input
              value={form.accountHolderName}
              onChange={(e) => update("accountHolderName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Bank Name</Label>
            <Input
              value={form.bankName}
              onChange={(e) => update("bankName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>IFSC Code</Label>
            <Input
              value={form.ifscCode}
              onChange={(e) => update("ifscCode", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Amount (₹) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Transaction Date</Label>
            <Input
              type="date"
              value={form.transactionDate}
              onChange={(e) => update("transactionDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => update("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TX_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Remark</Label>
            <Textarea
              value={form.remark}
              onChange={(e) => update("remark", e.target.value)}
              className="resize-none h-16"
            />
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="tx.pending_edit.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            style={{ backgroundColor: "var(--brand-red)" }}
            className="text-white"
            data-ocid="tx.pending_edit.save_button"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── TxTable ──────────────────────────────────────────────────────────────────

function TxTable({
  transactions,
  onDelete,
  ocidPrefix,
}: {
  transactions: Transaction[];
  onDelete: (id: bigint) => void;
  ocidPrefix: string;
}) {
  if (transactions.length === 0) {
    return (
      <div
        className="py-12 text-center text-muted-foreground"
        data-ocid={`${ocidPrefix}.empty_state`}
      >
        No transactions found.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/50">
            {[
              "#",
              "Date",
              "Ref ID",
              "Type",
              "Account No",
              "Account Holder",
              "Bank",
              "IFSC",
              "Amount",
              "Freq.",
              "Remark",
              "Status",
              "Action",
            ].map((h) => (
              <th
                key={h}
                className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx: Transaction, i) => (
            <tr
              key={String(tx.id)}
              className="border-b border-border last:border-0 hover:bg-secondary/30"
              data-ocid={`${ocidPrefix}.item.${i + 1}`}
            >
              <td className="px-3 py-3 text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-3 text-xs whitespace-nowrap">
                {formatDate(tx.transactionDate)}
              </td>
              <td className="px-3 py-3 font-mono text-xs">{tx.referenceId}</td>
              <td className="px-3 py-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary">
                  {tx.transactionType}
                </span>
              </td>
              <td className="px-3 py-3 font-mono text-xs">
                {tx.accountNumber}
              </td>
              <td className="px-3 py-3 text-xs whitespace-nowrap">
                {tx.accountHolderName}
              </td>
              <td className="px-3 py-3 text-xs whitespace-nowrap">
                {tx.bankName}
              </td>
              <td className="px-3 py-3 font-mono text-xs">{tx.ifscCode}</td>
              <td className="px-3 py-3 font-medium whitespace-nowrap">
                {formatINR(tx.amount)}
              </td>
              <td className="px-3 py-3 text-xs">{tx.frequencyType}</td>
              <td
                className="px-3 py-3 text-xs max-w-[120px] truncate"
                title={tx.remark}
              >
                {tx.remark}
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={tx.status} />
              </td>
              <td className="px-3 py-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => onDelete(tx.id)}
                  data-ocid={`${ocidPrefix}.delete_button.${i + 1}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Transactions page ─────────────────────────────────────────────────────────

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [deleteId, setDeleteId] = useState<bigint | null>(null);

  // Role detection — uses shared InventoryAuthContext (reactive, no polling)
  const { isManager } = useInventoryAuth();
  const role = isManager ? "manager" : "staff";

  // Pending transactions state
  const [pendingTxs, setPendingTxs] = useState<PendingTransaction[]>(() =>
    loadPendingTxs(),
  );

  const updatePendingTxs = (updated: PendingTransaction[]) => {
    setPendingTxs(updated);
    savePendingTxs(updated);
  };

  const handlePendingAdd = (tx: PendingTransaction) => {
    const updated = [...pendingTxs, tx];
    updatePendingTxs(updated);
  };

  // Pending tx approval state
  const [approvingTxIds, setApprovingTxIds] = useState<Set<string>>(new Set());
  const [pendingEditTarget, setPendingEditTarget] =
    useState<PendingTransaction | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const addTxMut = useAddTransaction();

  const handleTxApprove = async (pending: PendingTransaction) => {
    setApprovingTxIds((prev) => new Set(prev).add(pending.id));
    try {
      await addTxMut.mutateAsync({
        referenceId: pending.referenceId,
        transactionType: pending.transactionType,
        accountNumber: pending.accountNumber,
        accountHolderName: pending.accountHolderName,
        bankName: pending.bankName,
        ifscCode: pending.ifscCode,
        amount: pending.amount,
        transactionDate: pending.transactionDate,
        frequencyType: pending.frequencyType,
        remark: pending.remark,
        status: pending.status,
      });
      const updated = pendingTxs.filter((t) => t.id !== pending.id);
      updatePendingTxs(updated);
      toast.success(
        `Transaction "${pending.referenceId}" approved and recorded!`,
      );
    } catch (err) {
      console.error("Approve transaction error:", err);
      toast.error("Failed to approve transaction. Please try again.");
    } finally {
      setApprovingTxIds((prev) => {
        const next = new Set(prev);
        next.delete(pending.id);
        return next;
      });
    }
  };

  const handlePendingTxEdit = (updated: PendingTransaction) => {
    const list = pendingTxs.map((t) => (t.id === updated.id ? updated : t));
    updatePendingTxs(list);
  };

  const handlePendingTxDelete = (id: string) => {
    const updated = pendingTxs.filter((t) => t.id !== id);
    updatePendingTxs(updated);
    setPendingDeleteId(null);
    toast.success("Pending transaction removed");
  };

  const { data: txs, isLoading } = useTransactions();
  const deleteTx = useDeleteTransaction();

  const filterTxs = useMemo(() => {
    if (!txs) return [];
    const q = search.toLowerCase();
    return txs.filter((tx) => {
      if (
        q &&
        !tx.accountNumber.toLowerCase().includes(q) &&
        !tx.accountHolderName.toLowerCase().includes(q) &&
        !tx.referenceId.toLowerCase().includes(q)
      )
        return false;
      if (filterType && tx.transactionType !== filterType) return false;
      if (filterStatus && tx.status !== filterStatus) return false;
      if (filterDateStart && tx.transactionDate < filterDateStart) return false;
      if (filterDateEnd && tx.transactionDate > filterDateEnd) return false;
      return true;
    });
  }, [txs, search, filterType, filterStatus, filterDateStart, filterDateEnd]);

  const creditTxs = useMemo(
    () => filterTxs.filter((tx) => CREDIT_TYPES.has(tx.transactionType)),
    [filterTxs],
  );
  const debitTxs = useMemo(
    () => filterTxs.filter((tx) => DEBIT_TYPES.has(tx.transactionType)),
    [filterTxs],
  );

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteTx.mutateAsync(deleteId);
      toast.success("Transaction deleted.");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete transaction.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Transaction History
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all bank transactions
          </p>
        </div>
        <div className="flex gap-2">
          {txs && txs.length > 0 && (
            <Button
              variant="outline"
              onClick={() => downloadTransactions(filterTxs, "Filtered")}
              className="gap-2"
              data-ocid="tx.download.button"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          )}
          <Button
            onClick={() => setShowForm((v) => !v)}
            className="gap-2 text-white"
            style={{ backgroundColor: "var(--brand-red)" }}
            data-ocid="tx.add.button"
          >
            {showForm ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <PlusCircle className="w-4 h-4" />
            )}
            {showForm ? "Hide Form" : "Add Transaction"}
          </Button>
        </div>
      </div>

      {/* Staff pending banner */}
      {!isManager && pendingTxs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800"
          data-ocid="tx.pending.toast"
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            <strong>{pendingTxs.length}</strong> transaction
            {pendingTxs.length > 1 ? "s" : ""} pending manager approval.
          </span>
        </motion.div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="shadow-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  New Transaction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TxForm
                  onClose={() => setShowForm(false)}
                  role={role}
                  onPendingAdd={handlePendingAdd}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manager: Pending Approvals Panel */}
      {isManager && pendingTxs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card
            className="border-amber-200 bg-amber-50 shadow-sm"
            data-ocid="tx.pending_approvals.panel"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-amber-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Pending Approvals
                <Badge className="ml-auto bg-amber-200 text-amber-900 border-amber-300">
                  {pendingTxs.length}
                </Badge>
              </CardTitle>
              <p className="text-xs text-amber-700 mt-0.5">
                Review staff-submitted transactions before they are recorded.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence>
                {pendingTxs.map((pt, idx) => (
                  <motion.div
                    key={pt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: idx * 0.04 }}
                    className="flex flex-wrap items-start gap-3 p-3 bg-white rounded-lg border border-amber-200"
                    data-ocid={`tx.pending.item.${idx + 1}`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        <span className="font-mono">{pt.referenceId}</span>
                        <Badge variant="outline" className="text-xs">
                          {pt.transactionType}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {pt.accountNumber} — {pt.accountHolderName}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>
                          Amount:{" "}
                          <strong className="text-foreground">
                            {formatINR(pt.amount)}
                          </strong>
                        </span>
                        <span>Date: {formatDate(pt.transactionDate)}</span>
                        <span>
                          Status:{" "}
                          <strong className="text-foreground">
                            {pt.status}
                          </strong>
                        </span>
                        <span>
                          Submitted:{" "}
                          {new Date(pt.submittedAt).toLocaleDateString()} by{" "}
                          <strong className="text-foreground">
                            {pt.submittedByUserId}
                          </strong>
                        </span>
                      </div>
                      {pt.remark && (
                        <p className="text-xs text-muted-foreground italic">
                          Remark: {pt.remark}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleTxApprove(pt)}
                        disabled={approvingTxIds.has(pt.id)}
                        data-ocid={`tx.pending.approve_button.${idx + 1}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        {approvingTxIds.has(pt.id) ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => setPendingEditTarget(pt)}
                        data-ocid={`tx.pending.edit_button.${idx + 1}`}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => setPendingDeleteId(pt.id)}
                        data-ocid={`tx.pending.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <Card className="shadow-card border-border">
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search ref, account, holder..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-52"
                data-ocid="tx.search.input"
              />
            </div>
            <div>
              <Select
                value={filterType || "all"}
                onValueChange={(v) => setFilterType(v === "all" ? "" : v)}
              >
                <SelectTrigger
                  className="w-36"
                  data-ocid="tx.filter_type.select"
                >
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {TX_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select
                value={filterStatus || "all"}
                onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}
              >
                <SelectTrigger
                  className="w-32"
                  data-ocid="tx.filter_status.select"
                >
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {TX_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-38"
                placeholder="From"
                data-ocid="tx.filter_start.input"
              />
            </div>
            <div>
              <Input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="w-38"
                placeholder="To"
                data-ocid="tx.filter_end.input"
              />
            </div>
            {(search ||
              filterType ||
              filterStatus ||
              filterDateStart ||
              filterDateEnd) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterType("");
                  setFilterStatus("");
                  setFilterDateStart("");
                  setFilterDateEnd("");
                }}
                className="text-muted-foreground"
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      {isLoading ? (
        <LoadingSpinner text="Loading transactions..." />
      ) : (
        <Card className="shadow-card border-border">
          <CardContent className="p-0">
            <Tabs defaultValue="all">
              <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4 pt-2">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:border-b-2 rounded-none"
                  data-ocid="tx.all.tab"
                >
                  All ({filterTxs.length})
                </TabsTrigger>
                <TabsTrigger value="credit" data-ocid="tx.credit.tab">
                  Credit Head ({creditTxs.length})
                </TabsTrigger>
                <TabsTrigger value="debit" data-ocid="tx.debit.tab">
                  Debit Head ({debitTxs.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-0">
                <TxTable
                  transactions={filterTxs}
                  onDelete={(id) => setDeleteId(id)}
                  ocidPrefix="tx.all"
                />
              </TabsContent>
              <TabsContent value="credit" className="mt-0">
                <TxTable
                  transactions={creditTxs}
                  onDelete={(id) => setDeleteId(id)}
                  ocidPrefix="tx.credit"
                />
              </TabsContent>
              <TabsContent value="debit" className="mt-0">
                <TxTable
                  transactions={debitTxs}
                  onDelete={(id) => setDeleteId(id)}
                  ocidPrefix="tx.debit"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Delete transaction confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="tx.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="tx.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="tx.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete pending transaction confirmation */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
      >
        <AlertDialogContent data-ocid="tx.pending_delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Pending Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This pending submission will be discarded and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="tx.pending_delete.cancel_button"
              onClick={() => setPendingDeleteId(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                pendingDeleteId && handlePendingTxDelete(pendingDeleteId)
              }
              className="text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="tx.pending_delete.confirm_button"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit pending transaction dialog */}
      <PendingTxEditDialog
        pending={pendingEditTarget}
        onSave={handlePendingTxEdit}
        onClose={() => setPendingEditTarget(null)}
      />
    </div>
  );
}
