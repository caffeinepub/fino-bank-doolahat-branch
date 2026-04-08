import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Download,
  Edit2,
  FileText,
  Lock,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import { loadItems, removeItem, saveItems } from "../utils/localStore";

// ── Types ──────────────────────────────────────────────────────────────────

type ClosureStatus = "Pending" | "Approved" | "Rejected";

interface AccountClosureRecord {
  id: number;
  referenceNo: string;
  accountNo: string;
  customerName: string;
  fatherHusbandName: string;
  contactNo: string;
  accountType: string;
  dateOfOpening: string;
  dateOfClosureRequest: string;
  reasonForClosure: string;
  otherReason: string;
  outstandingBalance: string;
  modeOfSettlement: string;
  settlementAccountNo: string;
  remarks: string;
  status: ClosureStatus;
  submittedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const RECORDS_KEY = "fino_account_closure_records";
const COUNTER_KEY = "closure_counter";
const BANK_NAME = "Fino Small Finance Bank";
const BRANCH_NAME = "Doolahat Branch";

const CLOSURE_REASONS = [
  "Customer Request",
  "Transfer to Another Branch",
  "Duplicate Account",
  "Inoperative",
  "Deceased",
  "Other",
];

const SETTLEMENT_MODES = [
  "Cash",
  "Transfer to Another Account",
  "Demand Draft",
];

const STATUS_OPTIONS: ClosureStatus[] = ["Pending", "Approved", "Rejected"];

function getCounter(): number {
  try {
    const v = localStorage.getItem(COUNTER_KEY);
    return v ? Number.parseInt(v, 10) : 1;
  } catch {
    return 1;
  }
}

function claimReferenceNo(): string {
  const n = getCounter();
  const ref = `AC/${String(n).padStart(3, "0")}`;
  localStorage.setItem(COUNTER_KEY, String(n + 1));
  return ref;
}

function getInitialForm() {
  return {
    accountNo: "",
    customerName: "",
    fatherHusbandName: "",
    contactNo: "",
    accountType: "",
    dateOfOpening: "",
    dateOfClosureRequest: new Date().toISOString().split("T")[0],
    reasonForClosure: "",
    otherReason: "",
    outstandingBalance: "",
    modeOfSettlement: "",
    settlementAccountNo: "",
    remarks: "",
  };
}

// ── Excel Generator ────────────────────────────────────────────────────────

async function getXLSX(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).XLSX) {
    return (window as any).XLSX;
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = () => reject(new Error("Failed to load xlsx from CDN"));
    document.head.appendChild(script);
  });
}

async function generateExcel(rec: AccountClosureRecord): Promise<void> {
  const XLSX = await getXLSX();

  const reasonDisplay =
    rec.reasonForClosure === "Other" && rec.otherReason
      ? `Other — ${rec.otherReason}`
      : rec.reasonForClosure;

  const settlementDisplay =
    rec.modeOfSettlement === "Transfer to Another Account" &&
    rec.settlementAccountNo
      ? `${rec.modeOfSettlement} (A/c: ${rec.settlementAccountNo})`
      : rec.modeOfSettlement;

  const closureDateFormatted = rec.dateOfClosureRequest
    ? new Date(rec.dateOfClosureRequest).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const openingDateFormatted = rec.dateOfOpening
    ? new Date(rec.dateOfOpening).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const rows: (string | number)[][] = [
    ["ACCOUNT CLOSURE REQUEST FORM"],
    [`${BANK_NAME} – ${BRANCH_NAME}`],
    [],
    ["Reference No", rec.referenceNo],
    ["Closure Request Date", closureDateFormatted],
    ["Status", rec.status],
    [],
    ["CUSTOMER DETAILS"],
    ["Account No", rec.accountNo],
    ["Customer Name", rec.customerName],
    ["Father / Husband Name", rec.fatherHusbandName],
    ["Contact No", rec.contactNo],
    [],
    ["ACCOUNT DETAILS"],
    ["Account Type", rec.accountType],
    ["Date of Opening", openingDateFormatted],
    [
      "Outstanding Balance (Rs.)",
      rec.outstandingBalance ? `Rs. ${rec.outstandingBalance}` : "—",
    ],
    [],
    ["CLOSURE DETAILS"],
    ["Reason for Closure", reasonDisplay || "—"],
    ["Mode of Settlement", settlementDisplay || "—"],
    ["Remarks", rec.remarks || "—"],
    [],
    ["SIGNATURES"],
    ["Signature of Account Holder", "_________________________________"],
    ["Branch Manager / DbrM Signature", "_________________________________"],
    [],
    ["——————————— FOR BANK USE ONLY ———————————"],
    ["Processed By", ""],
    ["Date of Processing", ""],
    ["Remarks (Bank)", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 36 }, { wch: 42 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Account Closure Form");
  XLSX.writeFile(
    wb,
    `Account_Closure_${rec.referenceNo.replace(/\//g, "_")}.xlsx`,
  );
}

// ── Field helpers ──────────────────────────────────────────────────────────

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function statusColor(status: ClosureStatus) {
  if (status === "Approved")
    return "text-green-700 border-green-300 bg-green-50";
  if (status === "Rejected") return "text-red-700 border-red-300 bg-red-50";
  return "text-amber-700 border-amber-300 bg-amber-50";
}

// ── Main Component ─────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function AccountClosureForm({ onBack }: Props) {
  const { isManager } = useInventoryAuth();
  const [tab, setTab] = useState("new-entry");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [records, setRecords] = useState<AccountClosureRecord[]>(() =>
    loadItems<AccountClosureRecord>(RECORDS_KEY),
  );
  const [form, setForm] = useState(getInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refreshRecords = () =>
    setRecords(loadItems<AccountClosureRecord>(RECORDS_KEY));

  const setF = <K extends keyof ReturnType<typeof getInitialForm>>(
    key: K,
    val: ReturnType<typeof getInitialForm>[K],
  ) => setForm((prev) => ({ ...prev, [key]: val }));

  // ── Validation ─────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.accountNo.trim()) errs.accountNo = "Account No is required";
    if (!form.customerName.trim())
      errs.customerName = "Customer Name is required";
    if (!form.fatherHusbandName.trim())
      errs.fatherHusbandName = "Father/Husband Name is required";
    if (!form.contactNo || !/^\d{10}$/.test(form.contactNo))
      errs.contactNo = "Enter valid 10-digit contact number";
    if (!form.accountType) errs.accountType = "Account Type is required";
    if (!form.dateOfOpening) errs.dateOfOpening = "Date of Opening is required";
    if (!form.dateOfClosureRequest)
      errs.dateOfClosureRequest = "Closure Request Date is required";
    if (!form.reasonForClosure)
      errs.reasonForClosure = "Reason for Closure is required";
    if (form.reasonForClosure === "Other" && !form.otherReason.trim())
      errs.otherReason = "Please specify the other reason";
    if (!form.outstandingBalance.trim())
      errs.outstandingBalance = "Outstanding Balance is required";
    if (!form.modeOfSettlement)
      errs.modeOfSettlement = "Mode of Settlement is required";
    if (
      form.modeOfSettlement === "Transfer to Another Account" &&
      !form.settlementAccountNo.trim()
    )
      errs.settlementAccountNo = "Settlement Account No is required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    return true;
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }
    const existing = loadItems<AccountClosureRecord>(RECORDS_KEY);
    if (editId !== null) {
      const updated = existing.map((r) =>
        r.id === editId ? { ...r, ...form } : r,
      );
      saveItems(RECORDS_KEY, updated);
      toast.success("Closure record updated successfully!");
      setEditId(null);
    } else {
      const refNo = claimReferenceNo();
      const newRecord: AccountClosureRecord = {
        ...form,
        id:
          existing.length > 0 ? Math.max(...existing.map((r) => r.id)) + 1 : 1,
        referenceNo: refNo,
        status: "Pending",
        submittedAt: new Date().toISOString(),
      };
      saveItems(RECORDS_KEY, [...existing, newRecord]);
      toast.success(`Closure request saved! Ref No: ${refNo}`);
    }
    refreshRecords();
    setForm(getInitialForm());
    setErrors({});
    setTab("saved-records");
  }

  // ── Status Quick-Edit ──────────────────────────────────────────────────
  function handleStatusChange(id: number, status: ClosureStatus) {
    const existing = loadItems<AccountClosureRecord>(RECORDS_KEY);
    const updated = existing.map((r) => (r.id === id ? { ...r, status } : r));
    saveItems(RECORDS_KEY, updated);
    refreshRecords();
    toast.success(`Status updated to ${status}`);
  }

  // ── Download ───────────────────────────────────────────────────────────
  async function handleDownload(rec: AccountClosureRecord) {
    try {
      toast.info("Downloading Excel...");
      await generateExcel(rec);
      toast.success("Closure form downloaded as Excel (.xlsx)");
    } catch {
      toast.error("Failed to generate Excel. Please try again.");
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────
  function handleEdit(rec: AccountClosureRecord) {
    const {
      id: _id,
      referenceNo: _ref,
      status: _st,
      submittedAt: _sat,
      ...rest
    } = rec;
    setForm(rest);
    setEditId(rec.id);
    setErrors({});
    setTab("new-entry");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function handleDelete(id: number) {
    if (!window.confirm("Delete this closure record permanently?")) return;
    removeItem<AccountClosureRecord>(RECORDS_KEY, id);
    refreshRecords();
    toast.success("Record deleted");
  }

  const filtered = records.filter(
    (r) =>
      !search ||
      r.accountNo.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase()),
  );

  const err = (key: string) =>
    errors[key] ? (
      <p className="text-xs text-red-500 mt-0.5">{errors[key]}</p>
    ) : null;

  // ── Manager gate ───────────────────────────────────────────────────────
  if (!isManager) {
    return (
      <div className="space-y-4" data-ocid="account_closure.page">
        <RoleSwitcherBar />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Customer Services
          </Button>
        </div>
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Lock className="w-10 h-10" style={{ color: "#462980" }} />
            <p className="text-base font-semibold text-foreground">
              Manager Access Required
            </p>
            <p className="text-sm text-muted-foreground max-w-xs">
              This section is accessible to managers only. Please switch to
              Manager view to access the Account Closure Form.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="account_closure.page">
      <RoleSwitcherBar />

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-1 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Customer Services
        </Button>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
            style={{ backgroundColor: "#462980" }}
          >
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Account Closure Form
            </h2>
            <p className="text-xs text-muted-foreground">
              {BANK_NAME} — {BRANCH_NAME}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger
            value="new-entry"
            data-ocid="account_closure.new_entry.tab"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {editId ? "Edit Record" : "New Entry"}
          </TabsTrigger>
          <TabsTrigger
            value="saved-records"
            data-ocid="account_closure.saved_records.tab"
          >
            <FileText className="w-3.5 h-3.5 mr-1" />
            Saved Records
            {records.length > 0 && (
              <Badge
                className="ml-1.5 text-[10px] px-1 py-0 h-4"
                style={{ backgroundColor: "#462980", color: "#fff" }}
              >
                {records.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── NEW ENTRY TAB ── */}
        <TabsContent value="new-entry">
          <Card>
            <CardHeader
              className="pb-3 border-b"
              style={{ backgroundColor: "#f5f0ff" }}
            >
              <div className="text-center">
                <CardTitle
                  className="text-xl font-bold tracking-widest uppercase"
                  style={{ color: "#462980" }}
                >
                  ACCOUNT CLOSURE FORM
                </CardTitle>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  {BANK_NAME} — {BRANCH_NAME}
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* Bank Info (read-only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldRow label="Bank Name">
                  <Input
                    value={BANK_NAME}
                    disabled
                    className="h-8 text-sm bg-muted"
                  />
                </FieldRow>
                <FieldRow label="Branch">
                  <Input
                    value={BRANCH_NAME}
                    disabled
                    className="h-8 text-sm bg-muted"
                  />
                </FieldRow>
              </div>

              {/* Customer Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  Customer Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="Account No" required>
                    <Input
                      value={form.accountNo}
                      onChange={(e) => setF("accountNo", e.target.value)}
                      placeholder="Enter Account No"
                      className="h-8 text-sm"
                      data-ocid="account_closure.account_no.input"
                    />
                    {err("accountNo")}
                  </FieldRow>
                  <FieldRow label="Customer Name" required>
                    <Input
                      value={form.customerName}
                      onChange={(e) =>
                        setF("customerName", e.target.value.toUpperCase())
                      }
                      placeholder="IN BLOCK LETTERS"
                      className="h-8 text-sm uppercase font-semibold tracking-wide"
                      data-ocid="account_closure.customer_name.input"
                    />
                    {err("customerName")}
                  </FieldRow>
                  <FieldRow label="Father / Husband Name" required>
                    <Input
                      value={form.fatherHusbandName}
                      onChange={(e) =>
                        setF("fatherHusbandName", e.target.value)
                      }
                      placeholder="Father or Husband Name"
                      className="h-8 text-sm"
                      data-ocid="account_closure.father.input"
                    />
                    {err("fatherHusbandName")}
                  </FieldRow>
                  <FieldRow label="Contact No (10 digits)" required>
                    <Input
                      value={form.contactNo}
                      onChange={(e) => {
                        if (/^\d{0,10}$/.test(e.target.value))
                          setF("contactNo", e.target.value);
                      }}
                      placeholder="9876543210"
                      maxLength={10}
                      className="h-8 text-sm"
                      data-ocid="account_closure.contact.input"
                    />
                    {err("contactNo")}
                  </FieldRow>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  Account Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FieldRow label="Account Type" required>
                    <Select
                      value={form.accountType}
                      onValueChange={(v) => setF("accountType", v)}
                    >
                      <SelectTrigger
                        className="h-8 text-sm"
                        data-ocid="account_closure.account_type.select"
                      >
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Savings">Savings</SelectItem>
                        <SelectItem value="Current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                    {err("accountType")}
                  </FieldRow>
                  <FieldRow label="Date of Opening" required>
                    <Input
                      type="date"
                      value={form.dateOfOpening}
                      onChange={(e) => setF("dateOfOpening", e.target.value)}
                      className="h-8 text-sm"
                      data-ocid="account_closure.date_opening.input"
                    />
                    {err("dateOfOpening")}
                  </FieldRow>
                  <FieldRow label="Closure Request Date" required>
                    <Input
                      type="date"
                      value={form.dateOfClosureRequest}
                      onChange={(e) =>
                        setF("dateOfClosureRequest", e.target.value)
                      }
                      className="h-8 text-sm"
                      data-ocid="account_closure.date_closure.input"
                    />
                    {err("dateOfClosureRequest")}
                  </FieldRow>
                </div>
              </div>

              {/* Closure Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  Closure Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="Reason for Closure" required>
                    <Select
                      value={form.reasonForClosure}
                      onValueChange={(v) => {
                        setF("reasonForClosure", v);
                        if (v !== "Other") setF("otherReason", "");
                      }}
                    >
                      <SelectTrigger
                        className="h-8 text-sm"
                        data-ocid="account_closure.reason.select"
                      >
                        <SelectValue placeholder="Select reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CLOSURE_REASONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err("reasonForClosure")}
                  </FieldRow>
                  {form.reasonForClosure === "Other" && (
                    <FieldRow label="Please Specify" required>
                      <Input
                        value={form.otherReason}
                        onChange={(e) => setF("otherReason", e.target.value)}
                        placeholder="Describe the reason"
                        className="h-8 text-sm"
                        data-ocid="account_closure.other_reason.input"
                      />
                      {err("otherReason")}
                    </FieldRow>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="Outstanding Balance (Rs.)" required>
                    <div className="flex">
                      <span className="inline-flex items-center px-2 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        value={form.outstandingBalance}
                        onChange={(e) =>
                          setF("outstandingBalance", e.target.value)
                        }
                        placeholder="0.00"
                        className="h-8 text-sm rounded-l-none"
                        data-ocid="account_closure.balance.input"
                      />
                    </div>
                    {err("outstandingBalance")}
                  </FieldRow>
                  <FieldRow label="Mode of Settlement" required>
                    <Select
                      value={form.modeOfSettlement}
                      onValueChange={(v) => {
                        setF("modeOfSettlement", v);
                        if (v !== "Transfer to Another Account")
                          setF("settlementAccountNo", "");
                      }}
                    >
                      <SelectTrigger
                        className="h-8 text-sm"
                        data-ocid="account_closure.settlement_mode.select"
                      >
                        <SelectValue placeholder="Select mode..." />
                      </SelectTrigger>
                      <SelectContent>
                        {SETTLEMENT_MODES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {err("modeOfSettlement")}
                  </FieldRow>
                  {form.modeOfSettlement === "Transfer to Another Account" && (
                    <FieldRow label="Settlement Account No" required>
                      <Input
                        value={form.settlementAccountNo}
                        onChange={(e) =>
                          setF("settlementAccountNo", e.target.value)
                        }
                        placeholder="Account No for transfer"
                        className="h-8 text-sm"
                        data-ocid="account_closure.settlement_account.input"
                      />
                      {err("settlementAccountNo")}
                    </FieldRow>
                  )}
                </div>

                <FieldRow label="Remarks (optional)">
                  <Textarea
                    value={form.remarks}
                    onChange={(e) => setF("remarks", e.target.value)}
                    placeholder="Additional remarks..."
                    className="text-sm resize-none"
                    rows={3}
                    data-ocid="account_closure.remarks.input"
                  />
                </FieldRow>
              </div>

              {/* Signature Lines */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  Signatures
                </h3>
                <div className="grid grid-cols-2 gap-8 mt-4">
                  <div className="text-center">
                    <div className="border-b-2 border-foreground h-8 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Signature of Account Holder
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="border-b-2 border-foreground h-8 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Signature of Branch Manager
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 flex-wrap">
                <Button
                  onClick={handleSubmit}
                  className="text-white"
                  style={{ backgroundColor: "#462980" }}
                  data-ocid="account_closure.submit.button"
                >
                  {editId ? "Update Record" : "Submit & Save"}
                </Button>
                {editId && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setEditId(null);
                      setForm(getInitialForm());
                      setErrors({});
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SAVED RECORDS TAB ── */}
        <TabsContent value="saved-records">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base">Saved Records</CardTitle>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by Account No or Name..."
                    className="pl-8 h-8 text-sm w-60"
                    data-ocid="account_closure.search.input"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div
                  className="py-12 text-center text-muted-foreground"
                  data-ocid="account_closure.empty_state"
                >
                  <XCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">
                    {search
                      ? "No records match your search"
                      : "No records yet. Fill the form to add one."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Ref No
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Account No
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Customer Name
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Account Type
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Closure Date
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Status
                        </th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((rec) => (
                        <tr
                          key={rec.id}
                          className="border-b hover:bg-muted/20 transition-colors"
                          data-ocid={`account_closure.record_row.${rec.id}`}
                        >
                          <td
                            className="px-4 py-2.5 font-mono text-xs font-semibold"
                            style={{ color: "#462980" }}
                          >
                            {rec.referenceNo}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-medium">
                            {rec.accountNo}
                          </td>
                          <td className="px-4 py-2.5 text-xs font-medium">
                            {rec.customerName}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {rec.accountType}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {new Date(
                              rec.dateOfClosureRequest,
                            ).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            <Select
                              value={rec.status}
                              onValueChange={(v) =>
                                handleStatusChange(rec.id, v as ClosureStatus)
                              }
                            >
                              <SelectTrigger
                                className={`h-6 text-[10px] px-1.5 w-24 border font-semibold ${statusColor(rec.status)}`}
                                data-ocid={`account_closure.status_select.${rec.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((s) => (
                                  <SelectItem
                                    key={s}
                                    value={s}
                                    className="text-xs"
                                  >
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(rec)}
                                className="h-7 text-xs gap-1 px-2"
                                data-ocid={`account_closure.download_record.${rec.id}`}
                              >
                                <Download className="w-3 h-3" /> .xlsx
                              </Button>
                              {isManager && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEdit(rec)}
                                    className="h-7 text-xs gap-1 px-2"
                                    data-ocid={`account_closure.edit_record.${rec.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" /> Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(rec.id)}
                                    className="h-7 text-xs gap-1 px-2 text-red-600 hover:bg-red-50 border-red-200"
                                    data-ocid={`account_closure.delete_record.${rec.id}`}
                                  >
                                    <Trash2 className="w-3 h-3" /> Del
                                  </Button>
                                </>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
