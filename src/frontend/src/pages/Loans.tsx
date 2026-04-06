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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BadgeIndianRupee,
  Calculator,
  CalendarDays,
  Download,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Loan } from "../backend";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import { useActor } from "../hooks/useActor";
import { downloadLoanSheet } from "../utils/excelExport";
import { formatDate } from "../utils/helpers";

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useLoans() {
  const { actor, isFetching } = useActor();
  return useQuery<Loan[]>({
    queryKey: ["loans"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllLoans();
    },
    enabled: !!actor && !isFetching,
  });
}

function useAddLoan() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loan: {
      customerName: string;
      fatherHusbandName: string;
      fullAddress: string;
      loanStartDate: string;
      contactNo: string;
      nomineeName: string;
      dateOfBirth: string;
      loanAmount: number;
      totalInterestAmount: number;
      interestRate: number;
      loanTenureMonths: number;
      repaymentType: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).addLoan(
        loan.customerName,
        loan.fatherHusbandName,
        loan.fullAddress,
        loan.loanStartDate,
        loan.contactNo,
        loan.nomineeName,
        loan.dateOfBirth,
        loan.loanAmount,
        loan.totalInterestAmount,
        loan.interestRate,
        Number(loan.loanTenureMonths),
        loan.repaymentType,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loans"] }),
  });
}

function useDeleteLoan() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return (actor as any).deleteLoan(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loans"] }),
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatINR2(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function addMonthsToDate(isoDate: string, months: number): string {
  const date = new Date(isoDate);
  date.setMonth(date.getMonth() + months);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

const TENURE_OPTIONS = [12, 18, 24, 30, 36, 42, 48, 54, 60];

// ── Loan Form ────────────────────────────────────────────────────────────────

interface LoanFormData {
  customerName: string;
  fatherHusbandName: string;
  fullAddress: string;
  loanStartDate: string;
  contactNo: string;
  nomineeName: string;
  dateOfBirth: string;
  loanAmount: string;
  interestRate: string;
  loanTenureMonths: string;
}

function emptyLoanForm(): LoanFormData {
  return {
    customerName: "",
    fatherHusbandName: "",
    fullAddress: "",
    loanStartDate: new Date().toISOString().split("T")[0],
    contactNo: "",
    nomineeName: "",
    dateOfBirth: "",
    loanAmount: "",
    interestRate: "",
    loanTenureMonths: "",
  };
}

function calcTotalInterest(
  loanAmount: number,
  interestRate: number,
  tenureMonths: number,
): number {
  return loanAmount * (interestRate / 100) * (tenureMonths / 12);
}

interface LoanFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// Section header component
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "oklch(0.94 0.04 293.8)" }}
      >
        <Icon className="w-4 h-4" style={{ color: "var(--brand-red)" }} />
      </div>
      <div>
        <h3 className="text-sm font-bold" style={{ color: "var(--brand-red)" }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function LoanFormDialog({ open, onOpenChange }: LoanFormDialogProps) {
  const [form, setForm] = useState<LoanFormData>(emptyLoanForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof LoanFormData, string>>
  >({});
  const addLoan = useAddLoan();

  const loanAmountNum = Number.parseFloat(form.loanAmount) || 0;
  const interestRateNum = Number.parseFloat(form.interestRate) || 0;
  const tenureNum = Number.parseInt(form.loanTenureMonths) || 0;
  const totalInterest = calcTotalInterest(
    loanAmountNum,
    interestRateNum,
    tenureNum,
  );
  const totalPayable = loanAmountNum + totalInterest;
  const monthlyEMI = tenureNum > 0 ? totalPayable / tenureNum : 0;

  useEffect(() => {
    if (!open) {
      setForm(emptyLoanForm());
      setErrors({});
    }
  }, [open]);

  const set = (field: keyof LoanFormData) => (val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof LoanFormData, string>> = {};
    if (!form.customerName.trim()) errs.customerName = "Required";
    if (!form.fatherHusbandName.trim()) errs.fatherHusbandName = "Required";
    if (!form.fullAddress.trim()) errs.fullAddress = "Required";
    if (!form.loanStartDate) errs.loanStartDate = "Required";
    if (!form.contactNo.trim()) errs.contactNo = "Required";
    if (!form.nomineeName.trim()) errs.nomineeName = "Required";
    if (!form.dateOfBirth) errs.dateOfBirth = "Required";
    if (!form.loanAmount || loanAmountNum <= 0)
      errs.loanAmount = "Must be a positive number";
    if (!form.interestRate || interestRateNum < 1 || interestRateNum > 50)
      errs.interestRate = "Must be between 1 and 50";
    if (!form.loanTenureMonths) errs.loanTenureMonths = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await addLoan.mutateAsync({
        customerName: form.customerName.trim(),
        fatherHusbandName: form.fatherHusbandName.trim(),
        fullAddress: form.fullAddress.trim(),
        loanStartDate: form.loanStartDate,
        contactNo: form.contactNo.trim(),
        nomineeName: form.nomineeName.trim(),
        dateOfBirth: form.dateOfBirth,
        loanAmount: loanAmountNum,
        totalInterestAmount: totalInterest,
        interestRate: interestRateNum,
        loanTenureMonths: tenureNum,
        repaymentType: "Monthly",
      });
      toast.success("Loan record saved successfully");
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to save loan record");
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        data-ocid="loans.form.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BadgeIndianRupee
              className="w-5 h-5"
              style={{ color: "var(--brand-red)" }}
            />
            <span>Add New Loan Record</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ── Section 1: Customer Information ── */}
          <div>
            <SectionHeader
              icon={User}
              title="Customer Information"
              subtitle="Personal and contact details of the borrower"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-cname">
                  Customer Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-cname"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.customerName}
                  onChange={(e) => set("customerName")(e.target.value)}
                  data-ocid="loans.form.customerName.input"
                />
                {errors.customerName && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.customerName.error_state"
                  >
                    {errors.customerName}
                  </p>
                )}
              </div>

              {/* Father/Husband Name */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-fname">
                  Father/Husband Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-fname"
                  placeholder="e.g. Suresh Kumar"
                  value={form.fatherHusbandName}
                  onChange={(e) => set("fatherHusbandName")(e.target.value)}
                  data-ocid="loans.form.fatherHusbandName.input"
                />
                {errors.fatherHusbandName && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.fatherHusbandName.error_state"
                  >
                    {errors.fatherHusbandName}
                  </p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-dob">
                  Date of Birth <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-dob"
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth")(e.target.value)}
                  data-ocid="loans.form.dateOfBirth.input"
                />
                {errors.dateOfBirth && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.dateOfBirth.error_state"
                  >
                    {errors.dateOfBirth}
                  </p>
                )}
              </div>

              {/* Contact No */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-contact">
                  Customer Contact No <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-contact"
                  placeholder="10-digit mobile number"
                  value={form.contactNo}
                  onChange={(e) => set("contactNo")(e.target.value)}
                  data-ocid="loans.form.contactNo.input"
                />
                {errors.contactNo && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.contactNo.error_state"
                  >
                    {errors.contactNo}
                  </p>
                )}
              </div>

              {/* Nominee Name */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-nominee">
                  Nominee Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-nominee"
                  placeholder="e.g. Priya Devi"
                  value={form.nomineeName}
                  onChange={(e) => set("nomineeName")(e.target.value)}
                  data-ocid="loans.form.nomineeName.input"
                />
                {errors.nomineeName && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.nomineeName.error_state"
                  >
                    {errors.nomineeName}
                  </p>
                )}
              </div>

              {/* Full Address - spans 2 cols */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lf-addr">
                  Full Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="lf-addr"
                  placeholder="Enter complete postal address including village/city, district, state and PIN code"
                  rows={2}
                  value={form.fullAddress}
                  onChange={(e) => set("fullAddress")(e.target.value)}
                  data-ocid="loans.form.fullAddress.textarea"
                />
                {errors.fullAddress && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.fullAddress.error_state"
                  >
                    {errors.fullAddress}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section 2: Loan Details ── */}
          <div>
            <SectionHeader
              icon={CalendarDays}
              title="Loan Details"
              subtitle="Loan parameters for calculation and repayment"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Loan Start Date */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-start">
                  Loan Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-start"
                  type="date"
                  value={form.loanStartDate}
                  onChange={(e) => set("loanStartDate")(e.target.value)}
                  data-ocid="loans.form.loanStartDate.input"
                />
                {errors.loanStartDate && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.loanStartDate.error_state"
                  >
                    {errors.loanStartDate}
                  </p>
                )}
              </div>

              {/* Loan Tenure */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-tenure">
                  Loan Tenure <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.loanTenureMonths}
                  onValueChange={set("loanTenureMonths")}
                >
                  <SelectTrigger
                    id="lf-tenure"
                    data-ocid="loans.form.loanTenure.select"
                  >
                    <SelectValue placeholder="Select tenure in months" />
                  </SelectTrigger>
                  <SelectContent>
                    {TENURE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={String(t)}>
                        {t} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.loanTenureMonths && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.tenure.error_state"
                  >
                    {errors.loanTenureMonths}
                  </p>
                )}
              </div>

              {/* Loan Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-amount">
                  Loan Amount in ₹ <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-amount"
                  type="number"
                  min={1}
                  step={0.01}
                  placeholder="e.g. 50000"
                  value={form.loanAmount}
                  onChange={(e) => set("loanAmount")(e.target.value)}
                  data-ocid="loans.form.loanAmount.input"
                />
                {errors.loanAmount && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.loanAmount.error_state"
                  >
                    {errors.loanAmount}
                  </p>
                )}
              </div>

              {/* Interest Rate */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-rate">
                  Interest Rate 1–50% <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lf-rate"
                  type="number"
                  min={1}
                  max={50}
                  step={0.1}
                  placeholder="e.g. 12"
                  value={form.interestRate}
                  onChange={(e) => set("interestRate")(e.target.value)}
                  data-ocid="loans.form.interestRate.input"
                />
                {errors.interestRate && (
                  <p
                    className="text-xs text-red-600"
                    data-ocid="loans.form.interestRate.error_state"
                  >
                    {errors.interestRate}
                  </p>
                )}
              </div>

              {/* Repayment Type (read-only) */}
              <div className="space-y-1.5">
                <Label htmlFor="lf-repay">Repayment Type</Label>
                <Input
                  id="lf-repay"
                  value="Monthly"
                  readOnly
                  className="bg-muted cursor-default text-muted-foreground"
                  data-ocid="loans.form.repaymentType.input"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section 3: Auto-Calculated Summary ── */}
          <div>
            <SectionHeader
              icon={Calculator}
              title="Auto-Calculated Summary"
              subtitle="All values computed from the loan parameters above"
            />
            <div
              className="rounded-xl border-2 p-4 space-y-3"
              style={{
                backgroundColor: "oklch(0.975 0.015 293.8)",
                borderColor: "oklch(0.82 0.06 293.8)",
              }}
              data-ocid="loans.form.summary.panel"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Interest */}
                <div
                  className="bg-white rounded-lg px-4 py-3 border"
                  style={{ borderColor: "oklch(0.88 0.04 293.8)" }}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Interest Amount
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: "var(--brand-red)" }}
                    data-ocid="loans.form.totalInterest.display"
                  >
                    {formatINR2(totalInterest)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    P × R/100 × T/12
                  </p>
                </div>

                {/* Total Payable */}
                <div
                  className="bg-white rounded-lg px-4 py-3 border"
                  style={{ borderColor: "oklch(0.88 0.04 293.8)" }}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Payable Amount
                  </p>
                  <p
                    className="text-lg font-bold text-foreground"
                    data-ocid="loans.form.totalPayable.display"
                  >
                    {formatINR2(totalPayable)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Principal + Interest
                  </p>
                </div>

                {/* Monthly EMI */}
                <div
                  className="bg-white rounded-lg px-4 py-3 border"
                  style={{ borderColor: "oklch(0.88 0.04 293.8)" }}
                >
                  <p className="text-xs text-muted-foreground mb-1">
                    Monthly EMI
                  </p>
                  <p
                    className="text-lg font-bold"
                    style={{ color: "#15803d" }}
                    data-ocid="loans.form.monthlyEMI.display"
                  >
                    {formatINR2(monthlyEMI)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Total Payable ÷ Tenure
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addLoan.isPending}
            data-ocid="loans.form.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addLoan.isPending}
            className="text-white"
            style={{ backgroundColor: "var(--brand-red)" }}
            data-ocid="loans.form.submit_button"
          >
            {addLoan.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Loan Record"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ──────────────────────────────────────────────────────

function DeleteLoanDialog({
  open,
  onOpenChange,
  loan,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loan: Loan | null;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" data-ocid="loans.delete.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Delete Loan Record
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this loan record? This action cannot
            be undone.
          </p>
          {loan && (
            <div className="bg-muted rounded-lg px-3 py-2 text-sm font-medium">
              {loan.customerName} — {formatINR2(loan.loanAmount)}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            data-ocid="loans.delete.cancel_button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            data-ocid="loans.delete.confirm_button"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Repayment Schedule View ────────────────────────────────────────────────────

function RepaymentSchedule({
  loan,
  onBack,
}: {
  loan: Loan;
  onBack: () => void;
}) {
  const n = Number(loan.loanTenureMonths);
  const principalPerInstallment = loan.loanAmount / n;
  const interestPerInstallment = loan.totalInterestAmount / n;
  const totalInstallment = principalPerInstallment + interestPerInstallment;

  const installments = Array.from({ length: n }, (_, i) => {
    const remaining =
      i === n - 1 ? 0 : loan.loanAmount - principalPerInstallment * (i + 1);
    return {
      sno: i + 1,
      repaymentDate: addMonthsToDate(loan.loanStartDate, i + 1),
      principal: principalPerInstallment,
      interest: interestPerInstallment,
      total: totalInstallment,
      remaining,
    };
  });

  const handleDownload = async () => {
    try {
      await downloadLoanSheet(loan);
      toast.success("Excel sheet downloaded");
    } catch (e) {
      toast.error("Failed to download Excel sheet");
      console.error(e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="space-y-5"
      data-ocid="loans.schedule.section"
    >
      {/* Back + title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="gap-1.5"
            data-ocid="loans.schedule.back_button"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {loan.customerName}
            </h2>
            <p className="text-xs text-muted-foreground">
              Loan Repayment Schedule
            </p>
          </div>
        </div>
        <Button
          onClick={handleDownload}
          className="gap-2 text-white"
          style={{ backgroundColor: "var(--brand-red)" }}
          data-ocid="loans.schedule.download_button"
        >
          <Download className="w-4 h-4" />
          Download Excel
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle
            className="text-sm font-semibold"
            style={{ color: "var(--brand-red)" }}
          >
            Loan Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-3">
            {[
              ["Customer Name", loan.customerName],
              ["Father/Husband Name", loan.fatherHusbandName],
              ["Full Address", loan.fullAddress],
              ["Loan Start Date", formatDate(loan.loanStartDate)],
              ["Contact No", loan.contactNo],
              ["Nominee Name", loan.nomineeName],
              ["Date of Birth", formatDate(loan.dateOfBirth)],
              ["Loan Amount", formatINR2(loan.loanAmount)],
              ["Total Interest Amount", formatINR2(loan.totalInterestAmount)],
              ["Interest Rate", `${loan.interestRate}%`],
              ["Loan Tenure", `${Number(loan.loanTenureMonths)} months`],
              ["Repayment Type", loan.repaymentType],
            ].map(([label, value]) => (
              <div key={label} className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Repayment Schedule Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Repayment Installments
            <Badge
              variant="outline"
              className="ml-2 text-xs font-normal"
              style={{
                borderColor: "var(--brand-red)",
                color: "var(--brand-red)",
              }}
            >
              {n} installments
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table data-ocid="loans.schedule.table">
              <TableHeader>
                {/* Group header row */}
                <TableRow
                  className="bg-muted/40 hover:bg-muted/40"
                  style={{ borderBottom: "none" }}
                >
                  <TableHead
                    rowSpan={2}
                    className="text-xs font-semibold align-middle border-r border-border"
                  >
                    S.No
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-xs font-semibold align-middle border-r border-border"
                  >
                    Repayment Date
                  </TableHead>
                  <TableHead
                    colSpan={3}
                    className="text-xs font-semibold text-center border-r border-border"
                    style={{ color: "var(--brand-red)" }}
                  >
                    Repayable Amount
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-xs font-semibold align-middle border-r border-border"
                  >
                    Remaining Amount
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="text-xs font-semibold align-middle"
                  >
                    Collection Officer Sign
                  </TableHead>
                </TableRow>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-medium border-r border-border">
                    Principal (₹)
                  </TableHead>
                  <TableHead className="text-xs font-medium border-r border-border">
                    Interest (₹)
                  </TableHead>
                  <TableHead className="text-xs font-medium border-r border-border">
                    Total (₹)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((inst, idx) => (
                  <TableRow
                    key={inst.sno}
                    className="text-sm hover:bg-muted/20"
                    data-ocid={`loans.schedule.item.${idx + 1}`}
                  >
                    <TableCell className="text-xs font-medium text-muted-foreground border-r border-border">
                      {inst.sno}
                    </TableCell>
                    <TableCell className="text-xs border-r border-border">
                      {inst.repaymentDate}
                    </TableCell>
                    <TableCell className="text-xs border-r border-border">
                      {inst.principal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs border-r border-border">
                      {inst.interest.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className="text-xs font-semibold border-r border-border"
                      style={{ color: "var(--brand-red)" }}
                    >
                      {inst.total.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className="text-xs border-r border-border"
                      style={{
                        color: inst.remaining === 0 ? "#16a34a" : undefined,
                        fontWeight: inst.remaining === 0 ? 600 : undefined,
                      }}
                    >
                      {inst.remaining.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="border-b border-gray-400 w-36 min-h-[1.5rem]" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────

function LoanListView({
  loans,
  isLoading,
  onView,
  isManager,
}: {
  loans: Loan[];
  isLoading: boolean;
  onView: (loan: Loan) => void;
  isManager: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Loan | null>(null);
  const deleteLoan = useDeleteLoan();

  const handleDeleteClick = (loan: Loan) => {
    setDeleteTarget(loan);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLoan.mutateAsync(deleteTarget.id);
      toast.success("Loan record deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (e) {
      toast.error("Failed to delete loan record");
      console.error(e);
    }
  };

  const sorted = [...loans].sort(
    (a, b) => Number(b.createdAt) - Number(a.createdAt),
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-4"
      data-ocid="loans.list.section"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BadgeIndianRupee
              className="w-5 h-5"
              style={{ color: "var(--brand-red)" }}
            />
            Loan Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage loan records and repayment schedules — Manager access only
          </p>
        </div>
        {isManager && (
          <Button
            onClick={() => setFormOpen(true)}
            className="gap-2 text-white"
            style={{ backgroundColor: "var(--brand-red)" }}
            data-ocid="loans.list.add_button"
          >
            <Plus className="w-4 h-4" />
            Add New Loan
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            All Loans
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              ({sorted.length} records)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3" data-ocid="loans.list.loading_state">
              {[1, 2, 3].map((k) => (
                <Skeleton key={k} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="loans.list.empty_state"
            >
              <BadgeIndianRupee className="w-12 h-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                No loan records yet. Click "Add New Loan" to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-ocid="loans.list.table">
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold">#</TableHead>
                    <TableHead className="text-xs font-semibold">
                      Customer Name
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Father/Husband Name
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Contact No
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Loan Amount (₹)
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Interest Rate (%)
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Tenure (months)
                    </TableHead>
                    <TableHead className="text-xs font-semibold">
                      Loan Start Date
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((loan, idx) => (
                    <TableRow
                      key={String(loan.id)}
                      className="text-sm hover:bg-muted/20"
                      data-ocid={`loans.list.item.${idx + 1}`}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {loan.customerName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {loan.fatherHusbandName}
                      </TableCell>
                      <TableCell className="text-xs">
                        {loan.contactNo}
                      </TableCell>
                      <TableCell
                        className="text-xs font-semibold"
                        style={{ color: "var(--brand-red)" }}
                      >
                        {formatINR2(loan.loanAmount)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {loan.interestRate}%
                      </TableCell>
                      <TableCell className="text-xs">
                        {Number(loan.loanTenureMonths)} months
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatDate(loan.loanStartDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => onView(loan)}
                            style={{
                              borderColor: "var(--brand-red)",
                              color: "var(--brand-red)",
                            }}
                            data-ocid={`loans.list.view_button.${idx + 1}`}
                          >
                            View Schedule
                          </Button>
                          {isManager && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClick(loan)}
                              data-ocid={`loans.list.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {isManager && (
        <>
          <LoanFormDialog open={formOpen} onOpenChange={setFormOpen} />
          <DeleteLoanDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            loan={deleteTarget}
            onConfirm={handleDeleteConfirm}
            isDeleting={deleteLoan.isPending}
          />
        </>
      )}
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Loans() {
  const { isManager } = useInventoryAuth();
  const { data: loans = [], isLoading } = useLoans();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  return (
    <div className="space-y-4">
      {/* Role Switcher */}
      <RoleSwitcherBar />

      <AnimatePresence mode="wait">
        {!isManager ? (
          /* Staff locked screen */
          <motion.div
            key="locked"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center justify-center py-24 space-y-4"
            data-ocid="loans.locked.section"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "oklch(0.97 0.018 293.8)" }}
            >
              <ShieldAlert
                className="w-8 h-8"
                style={{ color: "var(--brand-red)" }}
              />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                Manager Access Required
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                The Loan Management module is restricted to Manager access only.
                Please log in as Manager using the switcher above.
              </p>
            </div>
          </motion.div>
        ) : selectedLoan ? (
          <RepaymentSchedule
            key={`schedule-${String(selectedLoan.id)}`}
            loan={selectedLoan}
            onBack={() => setSelectedLoan(null)}
          />
        ) : (
          <LoanListView
            key="list"
            loans={loans}
            isLoading={isLoading}
            onView={setSelectedLoan}
            isManager={isManager}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
