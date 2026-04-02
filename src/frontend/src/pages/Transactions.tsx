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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronUp,
  Download,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Transaction } from "../backend";
import LoadingSpinner from "../components/LoadingSpinner";
import StatusBadge from "../components/StatusBadge";
import {
  useAddTransaction,
  useDeleteTransaction,
  useTransactions,
} from "../hooks/useQueries";
import { downloadTransactions } from "../utils/excelExport";
import { formatDate, formatINR, todayISO } from "../utils/helpers";

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

function TxForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<FormState>({
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
  });

  const addTx = useAddTransaction();
  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.referenceId || !form.accountNumber || !form.amount) {
      toast.error("Please fill in required fields.");
      return;
    }
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

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={addTx.isPending}
          className="text-white gap-2"
          style={{ backgroundColor: "var(--brand-red)" }}
          data-ocid="tx.submit.button"
        >
          {addTx.isPending ? "Saving..." : "Add Transaction"}
        </Button>
      </div>
    </form>
  );
}

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

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [deleteId, setDeleteId] = useState<bigint | null>(null);

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
                <TxForm onClose={() => setShowForm(false)} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
                  style={{}}
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

      {/* Delete confirmation */}
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
    </div>
  );
}
