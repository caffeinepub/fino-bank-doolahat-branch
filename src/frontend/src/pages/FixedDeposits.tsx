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
import {
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  PlusCircle,
  Receipt,
  Search,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import LoadingSpinner from "../components/LoadingSpinner";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import type { FixedDeposit } from "../hooks/useQueries";
import {
  useAddFixedDeposit,
  useDeleteFixedDeposit,
  useFixedDeposits,
} from "../hooks/useQueries";
import { downloadAllFDs, downloadFDReceipt } from "../utils/excelExport";
import {
  addDays,
  addYears,
  calcInterestAmount,
  formatDate,
  formatINR,
  getInterestRate,
  todayISO,
} from "../utils/helpers";

const TENURES = [1, 2, 3, 4, 5];

function FDForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    customerName: "",
    accountNumber: "",
    cifNumber: "",
    contactNumber: "",
    openingDate: todayISO(),
    fdAmount: "",
    tenure: "1",
  });

  const addFD = useAddFixedDeposit();
  const tenureNum = Number.parseInt(form.tenure);
  const rate = getInterestRate(tenureNum);
  const fdAmountNum = Number.parseFloat(form.fdAmount) || 0;
  const interestAmount = calcInterestAmount(fdAmountNum, rate, tenureNum);
  const maturityAmount = fdAmountNum + interestAmount;
  const closureDate = form.openingDate
    ? addYears(form.openingDate, tenureNum)
    : "";
  const maturityDepositDate = closureDate ? addDays(closureDate, 8) : "";

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.customerName ||
      !form.accountNumber ||
      !form.fdAmount ||
      !form.openingDate
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      await addFD.mutateAsync({
        customerName: form.customerName,
        accountNumber: form.accountNumber,
        cifNumber: form.cifNumber,
        contactNumber: form.contactNumber,
        openingDate: form.openingDate,
        fdAmount: fdAmountNum,
        tenure: tenureNum,
        interestRate: rate,
        interestAmount,
        maturityAmount,
        closureDate,
        maturityDepositDate,
      });
      toast.success("Fixed Deposit added successfully!");
      onClose();
    } catch {
      toast.error("Failed to add Fixed Deposit.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fd-customer">Customer Name *</Label>
          <Input
            id="fd-customer"
            value={form.customerName}
            onChange={(e) => update("customerName", e.target.value)}
            placeholder="Full name"
            className="mt-1"
            data-ocid="fd.customer_name.input"
          />
        </div>
        <div>
          <Label htmlFor="fd-account">Account Number *</Label>
          <Input
            id="fd-account"
            value={form.accountNumber}
            onChange={(e) => update("accountNumber", e.target.value)}
            placeholder="Account no."
            className="mt-1"
            data-ocid="fd.account_number.input"
          />
        </div>
        <div>
          <Label htmlFor="fd-cif">CIF Number</Label>
          <Input
            id="fd-cif"
            value={form.cifNumber}
            onChange={(e) => update("cifNumber", e.target.value)}
            placeholder="CIF no."
            className="mt-1"
            data-ocid="fd.cif_number.input"
          />
        </div>
        <div>
          <Label htmlFor="fd-contact">Contact Number</Label>
          <Input
            id="fd-contact"
            value={form.contactNumber}
            onChange={(e) => update("contactNumber", e.target.value)}
            placeholder="Mobile no."
            className="mt-1"
            data-ocid="fd.contact_number.input"
          />
        </div>
        <div>
          <Label htmlFor="fd-opening">Date of Opening *</Label>
          <Input
            id="fd-opening"
            type="date"
            value={form.openingDate}
            onChange={(e) => update("openingDate", e.target.value)}
            className="mt-1"
            data-ocid="fd.opening_date.input"
          />
        </div>
        <div>
          <Label htmlFor="fd-amount">FD Amount (₹) *</Label>
          <Input
            id="fd-amount"
            type="number"
            min="0"
            step="0.01"
            value={form.fdAmount}
            onChange={(e) => update("fdAmount", e.target.value)}
            placeholder="0.00"
            className="mt-1"
            data-ocid="fd.amount.input"
          />
        </div>
        <div>
          <Label>Tenure</Label>
          <Select
            value={form.tenure}
            onValueChange={(v) => update("tenure", v)}
          >
            <SelectTrigger className="mt-1" data-ocid="fd.tenure.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TENURES.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t} Year{t > 1 ? "s" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Interest Rate</Label>
          <Input
            value={`${rate}% per annum (flat)`}
            readOnly
            className="mt-1 bg-secondary text-muted-foreground"
          />
        </div>
      </div>

      {/* Auto-calculated fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-secondary rounded-lg">
        <div>
          <div className="text-xs text-muted-foreground">Interest Amount</div>
          <div
            className="font-semibold mt-0.5"
            style={{ color: "var(--profit-green)" }}
          >
            {formatINR(interestAmount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Maturity Amount</div>
          <div
            className="font-semibold mt-0.5"
            style={{ color: "var(--brand-red)" }}
          >
            {formatINR(maturityAmount)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Date of Closure</div>
          <div className="font-semibold mt-0.5 text-sm">
            {closureDate ? formatDate(closureDate) : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            Maturity Deposit Date
          </div>
          <div className="font-semibold mt-0.5 text-sm">
            {maturityDepositDate ? formatDate(maturityDepositDate) : "—"}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={addFD.isPending}
          className="text-white gap-2"
          style={{ backgroundColor: "var(--brand-red)" }}
          data-ocid="fd.submit.button"
        >
          {addFD.isPending ? "Saving..." : "Add Fixed Deposit"}
        </Button>
      </div>
    </form>
  );
}

export default function FixedDeposits() {
  const { isManager } = useInventoryAuth();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: fds, isLoading } = useFixedDeposits();
  const deleteFD = useDeleteFixedDeposit();

  const filtered = useMemo(() => {
    if (!fds) return [];
    const q = search.toLowerCase();
    if (!q) return fds;
    return fds.filter(
      (fd) =>
        fd.customerName.toLowerCase().includes(q) ||
        fd.accountNumber.toLowerCase().includes(q) ||
        fd.cifNumber.toLowerCase().includes(q),
    );
  }, [fds, search]);

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteFD.mutateAsync(deleteId);
      toast.success("Fixed Deposit deleted.");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete FD.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Switcher Bar */}
      <RoleSwitcherBar />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Fixed Deposit Management
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage all fixed deposit accounts
          </p>
        </div>
        <div className="flex gap-2">
          {fds && fds.length > 0 && (
            <Button
              variant="outline"
              onClick={() => downloadAllFDs(fds)}
              className="gap-2"
              data-ocid="fd.download_all.button"
            >
              <Download className="w-4 h-4" />
              Export All
            </Button>
          )}
          {/* Add New FD button only visible to Manager */}
          {isManager && (
            <Button
              onClick={() => setShowForm((v) => !v)}
              className="gap-2 text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="fd.add.button"
            >
              {showForm ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              {showForm ? "Hide Form" : "Add New FD"}
            </Button>
          )}
        </div>
      </div>

      {/* Staff access notice */}
      {!isManager && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-lg border text-sm"
          style={{
            backgroundColor: "oklch(0.97 0.015 255 / 0.5)",
            borderColor: "oklch(0.7 0.1 255 / 0.4)",
            color: "oklch(0.35 0.12 255)",
          }}
          data-ocid="fd.staff_notice.panel"
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Fixed Deposit management is restricted to Manager access only.
            Please switch to Manager to add or delete records.
          </span>
        </div>
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
                  New Fixed Deposit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FDForm onClose={() => setShowForm(false)} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, account, CIF..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-ocid="fd.search.input"
        />
      </div>

      {/* FD Table */}
      <Card className="shadow-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSpinner text="Loading Fixed Deposits..." />
          ) : filtered.length === 0 ? (
            <div
              className="py-12 text-center text-muted-foreground"
              data-ocid="fd.empty_state"
            >
              {search
                ? "No FDs match your search."
                : "No Fixed Deposits yet. Click 'Add New FD' to create one."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    {[
                      "#",
                      "Customer",
                      "Account No",
                      "CIF No",
                      "Contact",
                      "Opening",
                      "Amount",
                      "Tenure",
                      "Rate",
                      "Interest",
                      "Maturity",
                      "Closure",
                      "Mat. Deposit",
                      "Actions",
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
                  {filtered.map((fd: FixedDeposit, i) => (
                    <tr
                      key={String(fd.id)}
                      className="border-b border-border last:border-0 hover:bg-secondary/30"
                      data-ocid={`fd.item.${i + 1}`}
                    >
                      <td className="px-3 py-3 text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-3 py-3 font-medium whitespace-nowrap">
                        {fd.customerName}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {fd.accountNumber}
                      </td>
                      <td className="px-3 py-3 text-xs">{fd.cifNumber}</td>
                      <td className="px-3 py-3 text-xs">{fd.contactNumber}</td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {formatDate(fd.openingDate)}
                      </td>
                      <td className="px-3 py-3 font-medium whitespace-nowrap">
                        {formatINR(fd.fdAmount)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {String(fd.tenure)}Y
                      </td>
                      <td className="px-3 py-3 text-center">
                        {fd.interestRate}%
                      </td>
                      <td
                        className="px-3 py-3 whitespace-nowrap"
                        style={{ color: "var(--profit-green)" }}
                      >
                        {formatINR(fd.interestAmount)}
                      </td>
                      <td
                        className="px-3 py-3 font-semibold whitespace-nowrap"
                        style={{ color: "var(--brand-red)" }}
                      >
                        {formatINR(fd.maturityAmount)}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {formatDate(fd.closureDate)}
                      </td>
                      <td className="px-3 py-3 text-xs whitespace-nowrap">
                        {formatDate(fd.maturityDepositDate)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => downloadFDReceipt(fd)}
                            data-ocid={`fd.receipt.button.${i + 1}`}
                          >
                            <Receipt className="w-3 h-3" />
                            Receipt
                          </Button>
                          {isManager && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteId(fd.id)}
                              data-ocid={`fd.delete_button.${i + 1}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="fd.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fixed Deposit?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The FD record will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="fd.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="text-white"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="fd.delete.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
