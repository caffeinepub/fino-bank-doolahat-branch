import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowLeftRight,
  Download,
  Edit2,
  FileText,
  Lock,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import { loadItems, removeItem, saveItems } from "../utils/localStore";

// ── Types ──────────────────────────────────────────────────────────────────

interface AccountTransferRecord {
  id: number;
  referenceNo: string;
  accountNo: string;
  customerName: string;
  fatherHusbandName: string;
  contactNo: string;
  fromBranch: string;
  toBranch: string;
  transferReason: string;
  applicationDate: string;
  remarks: string;
  submittedAt: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const RECORDS_KEY = "fino_account_transfer_records";
const COUNTER_KEY = "transfer_counter";
const TRANSFER_FEE = "₹236.00 (Including GST)";

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
  const ref = `AT/${String(n).padStart(3, "0")}`;
  localStorage.setItem(COUNTER_KEY, String(n + 1));
  return ref;
}

function getInitialForm() {
  return {
    accountNo: "",
    customerName: "",
    fatherHusbandName: "",
    contactNo: "",
    fromBranch: "Doolahat Branch",
    toBranch: "",
    transferReason: "",
    applicationDate: new Date().toISOString().split("T")[0],
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

async function generateExcel(rec: AccountTransferRecord): Promise<void> {
  const XLSX = await getXLSX();
  const dateFormatted = rec.applicationDate
    ? new Date(rec.applicationDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const rows: (string | number)[][] = [
    ["BANK ACCOUNT TRANSFER REQUEST FORM"],
    ["Fino Small Finance Bank – Doolahat Branch"],
    ["Transfer Fee: Rs. 236.00 (Including GST)"],
    [],
    ["Reference No", rec.referenceNo],
    ["Application Date", dateFormatted],
    [],
    ["CUSTOMER DETAILS"],
    ["Account No", rec.accountNo],
    ["Customer Name", rec.customerName],
    ["Father / Husband Name", rec.fatherHusbandName],
    ["Contact No", rec.contactNo],
    [],
    ["TRANSFER DETAILS"],
    ["Current Branch", rec.fromBranch],
    ["Transfer To Branch", rec.toBranch],
    ["Reason for Transfer", rec.transferReason || "—"],
    ["Remarks", rec.remarks || "—"],
    [],
    ["SIGNATURES"],
    ["Signature of Account Holder", "_________________________________"],
    ["Branch Manager / DbrM Signature", "_________________________________"],
    [],
    ["——————————— FOR BANK USE ONLY ———————————"],
    ["Verified By", ""],
    ["Date of Transfer", ""],
    ["Remarks (Bank)", ""],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 36 }, { wch: 42 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Account Transfer Form");
  XLSX.writeFile(
    wb,
    `Account_Transfer_${rec.referenceNo.replace(/\//g, "_")}.xlsx`,
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

// ── Main Component ─────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function AccountTransferForm({ onBack }: Props) {
  const { isManager } = useInventoryAuth();
  const [tab, setTab] = useState("new-entry");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [records, setRecords] = useState<AccountTransferRecord[]>(() =>
    loadItems<AccountTransferRecord>(RECORDS_KEY),
  );
  const [form, setForm] = useState(getInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refreshRecords = () =>
    setRecords(loadItems<AccountTransferRecord>(RECORDS_KEY));

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
    if (!form.fromBranch.trim()) errs.fromBranch = "From Branch is required";
    if (!form.toBranch.trim()) errs.toBranch = "To Branch is required";
    if (!form.applicationDate)
      errs.applicationDate = "Application Date is required";
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
    const existing = loadItems<AccountTransferRecord>(RECORDS_KEY);
    if (editId !== null) {
      const updated = existing.map((r) =>
        r.id === editId ? { ...r, ...form } : r,
      );
      saveItems(RECORDS_KEY, updated);
      toast.success("Transfer record updated successfully!");
      setEditId(null);
    } else {
      const refNo = claimReferenceNo();
      const newRecord: AccountTransferRecord = {
        ...form,
        id:
          existing.length > 0 ? Math.max(...existing.map((r) => r.id)) + 1 : 1,
        referenceNo: refNo,
        submittedAt: new Date().toISOString(),
      };
      saveItems(RECORDS_KEY, [...existing, newRecord]);
      toast.success(`Transfer record saved! Ref No: ${refNo}`);
    }
    refreshRecords();
    setForm(getInitialForm());
    setErrors({});
    setTab("saved-records");
  }

  // ── Download ───────────────────────────────────────────────────────────
  async function handleDownload(rec: AccountTransferRecord) {
    try {
      toast.info("Downloading Excel...");
      await generateExcel(rec);
      toast.success("Transfer form downloaded as Excel (.xlsx)");
    } catch {
      toast.error("Failed to generate Excel. Please try again.");
    }
  }

  // ── Edit ───────────────────────────────────────────────────────────────
  function handleEdit(rec: AccountTransferRecord) {
    const { id: _id, referenceNo: _ref, submittedAt: _sat, ...rest } = rec;
    setForm(rest);
    setEditId(rec.id);
    setErrors({});
    setTab("new-entry");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Delete ─────────────────────────────────────────────────────────────
  function handleDelete(id: number) {
    if (!window.confirm("Delete this transfer record permanently?")) return;
    removeItem<AccountTransferRecord>(RECORDS_KEY, id);
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
      <div className="space-y-4" data-ocid="account_transfer.page">
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
              Manager view to access the Bank Account Transfer Form.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-ocid="account_transfer.page">
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
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Bank Account Transfer Form
            </h2>
            <p className="text-xs text-muted-foreground">
              Branch-to-branch transfer — Transfer Fee: {TRANSFER_FEE}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger
            value="new-entry"
            data-ocid="account_transfer.new_entry.tab"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {editId ? "Edit Record" : "New Entry"}
          </TabsTrigger>
          <TabsTrigger
            value="saved-records"
            data-ocid="account_transfer.saved_records.tab"
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
                  BANK ACCOUNT TRANSFER FORM
                </CardTitle>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  Fino Small Finance Bank — Doolahat Branch
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* Transfer Fee Info */}
              <div
                className="flex items-center gap-3 rounded-lg border px-4 py-3"
                style={{ backgroundColor: "#f0ebff", borderColor: "#462980" }}
              >
                <ArrowLeftRight
                  className="w-5 h-5 shrink-0"
                  style={{ color: "#462980" }}
                />
                <div>
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "#462980" }}
                  >
                    Transfer Fee
                  </p>
                  <p className="text-base font-bold text-foreground">
                    {TRANSFER_FEE}
                  </p>
                </div>
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
                      data-ocid="account_transfer.account_no.input"
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
                      data-ocid="account_transfer.customer_name.input"
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
                      data-ocid="account_transfer.father.input"
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
                      data-ocid="account_transfer.contact.input"
                    />
                    {err("contactNo")}
                  </FieldRow>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  Transfer Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="From Branch" required>
                    <Input
                      value={form.fromBranch}
                      onChange={(e) => setF("fromBranch", e.target.value)}
                      placeholder="Source Branch"
                      className="h-8 text-sm"
                      data-ocid="account_transfer.from_branch.input"
                    />
                    {err("fromBranch")}
                  </FieldRow>
                  <FieldRow label="To Branch (Destination)" required>
                    <Input
                      value={form.toBranch}
                      onChange={(e) => setF("toBranch", e.target.value)}
                      placeholder="Destination Branch Name"
                      className="h-8 text-sm"
                      data-ocid="account_transfer.to_branch.input"
                    />
                    {err("toBranch")}
                  </FieldRow>
                  <FieldRow label="Application Date" required>
                    <Input
                      type="date"
                      value={form.applicationDate}
                      onChange={(e) => setF("applicationDate", e.target.value)}
                      className="h-8 text-sm"
                      data-ocid="account_transfer.date.input"
                    />
                    {err("applicationDate")}
                  </FieldRow>
                  <FieldRow label="Transfer Reason (optional)">
                    <Input
                      value={form.transferReason}
                      onChange={(e) => setF("transferReason", e.target.value)}
                      placeholder="Reason for transfer"
                      className="h-8 text-sm"
                      data-ocid="account_transfer.reason.input"
                    />
                  </FieldRow>
                </div>
                <FieldRow label="Remarks (optional)">
                  <Textarea
                    value={form.remarks}
                    onChange={(e) => setF("remarks", e.target.value)}
                    placeholder="Additional remarks..."
                    className="text-sm resize-none"
                    rows={3}
                    data-ocid="account_transfer.remarks.input"
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
                  data-ocid="account_transfer.submit.button"
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
                    data-ocid="account_transfer.search.input"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div
                  className="py-12 text-center text-muted-foreground"
                  data-ocid="account_transfer.empty_state"
                >
                  <ArrowLeftRight className="w-8 h-8 mx-auto mb-2 opacity-30" />
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
                          From Branch
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          To Branch
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Date
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
                          data-ocid={`account_transfer.record_row.${rec.id}`}
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
                            {rec.fromBranch}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {rec.toBranch}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {new Date(rec.applicationDate).toLocaleDateString(
                              "en-IN",
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownload(rec)}
                                className="h-7 text-xs gap-1 px-2"
                                data-ocid={`account_transfer.download_record.${rec.id}`}
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
                                    data-ocid={`account_transfer.edit_record.${rec.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" /> Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(rec.id)}
                                    className="h-7 text-xs gap-1 px-2 text-red-600 hover:bg-red-50 border-red-200"
                                    data-ocid={`account_transfer.delete_record.${rec.id}`}
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
