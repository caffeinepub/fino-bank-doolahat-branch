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
import {
  ArrowLeft,
  Download,
  Edit2,
  FileText,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import { loadItems, removeItem, saveItems } from "../utils/localStore";

// ── Types ──────────────────────────────────────────────────────────────────

type YesNo = "yes" | "no" | "";
type Category = "fino" | "csp" | "";

interface Form60Data {
  txnAmount: string;
  txnDate: string;
  panApplied: YesNo;
  panApplicationDate: string;
  panAcknowledgementNo: string;
  agriIncome: string;
  otherIncome: string;
}

interface AddressData {
  village: string;
  postOffice: string;
  subDistrict: string;
  district: string;
  state: string;
  pinCode: string;
}

interface AccountOpeningRecord {
  id: number;
  registrationNumber: string;
  category: Category;
  submittedAt: string;
  // fields
  accountType: string;
  modeOfOperation: "Self" | "Joint" | "";
  services: Record<string, YesNo>;
  eduQualification: string;
  panAvailable: YesNo;
  panNo: string;
  form60: Form60Data;
  aadharNo: string;
  contactNo: string;
  initialDeposit: string;
  email: string;
  applicantName: string;
  dob: string;
  fatherHusbandName: string;
  motherMaidenName: string;
  currentAddress: AddressData;
  permanentSameAsCurrent: YesNo;
  permanentAddress: AddressData;
  isMinor: YesNo;
  guardianContactNo: string;
  nomineeName: string;
  nomineeDob: string;
  nomineeRelationship: string;
  occupation: string;
  bankCustomerId: string;
  bankAccountNo: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

const RECORDS_KEY = "fino_account_opening_records";
const COUNTER_FINO_KEY = "reg_counter_fino";
const COUNTER_CSP_KEY = "reg_counter_csp";

const ACCOUNT_TYPES = [
  "Gati Savings Account",
  "Jan Savings Account",
  "Subh Savings Account",
  "Bhavishya Savings Account",
  "Gullak Savings Account",
  "Saral Savings Account",
  "Suvidha DMT Account",
  "Arambh Savings Account",
  "Women Savings Account",
  "FinoPay Digital Account",
  "Pragati Current Account",
  "Sahaj Current Account",
  "Sampann Current Account",
];

const EDU_QUALIFICATIONS = [
  "Illiterate",
  "Below Primary",
  "Primary",
  "Middle School",
  "High School",
  "Higher Secondary School",
  "Graduate",
  "Post Graduate",
];

const NOMINEE_RELATIONSHIPS = [
  "Father",
  "Husband",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Wife",
  "Grand Father",
  "Grand Mother",
];

const OCCUPATIONS = [
  "Agriculture",
  "Salaried",
  "Self Employed",
  "SE Professional",
  "Student",
  "Housewife",
];

const SERVICE_ITEMS = [
  { key: "atm", label: "ATM cum Debit Card" },
  { key: "netBanking", label: "Net Banking" },
  { key: "aeps", label: "AEPS Service" },
  { key: "aadharSeeding", label: "Aadhar Seeding (DBT Link)" },
  { key: "eStatement", label: "eStatement" },
];

const EMPTY_ADDRESS: AddressData = {
  village: "",
  postOffice: "",
  subDistrict: "",
  district: "",
  state: "Assam",
  pinCode: "",
};

const EMPTY_FORM60: Form60Data = {
  txnAmount: "",
  txnDate: "",
  panApplied: "",
  panApplicationDate: "",
  panAcknowledgementNo: "",
  agriIncome: "",
  otherIncome: "",
};

function getInitialServices(): Record<string, YesNo> {
  return {
    atm: "",
    netBanking: "",
    aeps: "",
    aadharSeeding: "",
    eStatement: "",
  };
}

function getInitialForm(): Omit<
  AccountOpeningRecord,
  "id" | "registrationNumber" | "submittedAt"
> {
  return {
    category: "",
    accountType: "",
    modeOfOperation: "",
    services: getInitialServices(),
    eduQualification: "",
    panAvailable: "",
    panNo: "",
    form60: { ...EMPTY_FORM60 },
    aadharNo: "",
    contactNo: "",
    initialDeposit: "",
    email: "",
    applicantName: "",
    dob: "",
    fatherHusbandName: "",
    motherMaidenName: "",
    currentAddress: { ...EMPTY_ADDRESS },
    permanentSameAsCurrent: "",
    permanentAddress: { ...EMPTY_ADDRESS },
    isMinor: "",
    guardianContactNo: "",
    nomineeName: "",
    nomineeDob: "",
    nomineeRelationship: "",
    occupation: "",
    bankCustomerId: "",
    bankAccountNo: "",
  };
}

// ── Counter helpers ──────────────────────────────────────────────────────────

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 4) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

function getCounter(key: string, defaultVal: number): number {
  try {
    const v = localStorage.getItem(key);
    return v ? Number.parseInt(v, 10) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setCounter(key: string, val: number) {
  localStorage.setItem(key, String(val));
}

function previewRegNumber(category: Category): string {
  const fy = getCurrentFY();
  if (category === "fino") {
    const serial = getCounter(COUNTER_FINO_KEY, 781);
    return `FB/${serial}/${fy}`;
  }
  if (category === "csp") {
    const serial = getCounter(COUNTER_CSP_KEY, 1);
    return `FB/BC/${String(serial).padStart(2, "0")}/${fy}`;
  }
  return "—";
}

function claimRegNumber(category: Category): string {
  const fy = getCurrentFY();
  if (category === "fino") {
    const serial = getCounter(COUNTER_FINO_KEY, 781);
    const regNo = `FB/${serial}/${fy}`;
    setCounter(COUNTER_FINO_KEY, serial + 1);
    return regNo;
  }
  if (category === "csp") {
    const serial = getCounter(COUNTER_CSP_KEY, 1);
    const regNo = `FB/BC/${String(serial).padStart(2, "0")}/${fy}`;
    setCounter(COUNTER_CSP_KEY, serial + 1);
    return regNo;
  }
  return "";
}

// ── Excel utilities ──────────────────────────────────────────────────────────

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

function addrStr(a: AddressData): string {
  return [
    a.village,
    a.postOffice ? `P.O: ${a.postOffice}` : "",
    a.subDistrict ? `Sub-Dist: ${a.subDistrict}` : "",
    a.district ? `Dist: ${a.district}` : "",
    `${a.state}${a.pinCode ? ` - ${a.pinCode}` : ""}`,
  ]
    .filter(Boolean)
    .join(", ");
}

async function generateExcel(rec: AccountOpeningRecord): Promise<void> {
  const XLSX = await getXLSX();
  const categoryLabel =
    rec.category === "fino" ? "Fino Bank Doolahat Account" : "CSP Account";
  const submittedDate = new Date(rec.submittedAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const yesNo = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "—");

  const permanentAddr =
    rec.permanentSameAsCurrent === "yes"
      ? "Same as Current Address"
      : addrStr(rec.permanentAddress);

  const rows: (string | number)[][] = [
    ["ACCOUNT OPENING FORM"],
    ["MINOR, SAVINGS, CURRENT ACCOUNT"],
    ["Fino Small Finance Bank – Doolahat Branch"],
    [],
    ["Registration No", rec.registrationNumber],
    ["Category", categoryLabel],
    ["Date", submittedDate],
    [],
    ["PASSPORT SIZE PHOTO", "(Paste photo manually on printed form)"],
    [],
    ["A. TYPE OF ACCOUNT"],
    ["Type of Account", rec.accountType || "—"],
    ["Mode of Operation", rec.modeOfOperation || "—"],
    [],
    ["C. ADDITIONAL SERVICE REQUEST"],
    ...SERVICE_ITEMS.map((s) => [s.label, yesNo(rec.services[s.key] ?? "")]),
    [],
    ["D. EDUCATION QUALIFICATION"],
    ["Education Qualification", rec.eduQualification || "—"],
    [],
    ["E. PAN DETAILS"],
    ["PAN Available", yesNo(rec.panAvailable)],
    ...(rec.panAvailable === "yes"
      ? [["PAN Number", rec.panNo || "—"]]
      : [
          ["Form 60 — Txn Amount (Rs.)", rec.form60.txnAmount || "—"],
          ["Form 60 — Txn Date", rec.form60.txnDate || "—"],
          ["Form 60 — PAN Applied", yesNo(rec.form60.panApplied)],
          ...(rec.form60.panApplied === "yes"
            ? [
                [
                  "Form 60 — PAN Application Date",
                  rec.form60.panApplicationDate || "—",
                ],
                [
                  "Form 60 — PAN Acknowledgement No",
                  rec.form60.panAcknowledgementNo || "—",
                ],
              ]
            : []),
          ["Form 60 — Agricultural Income (Rs.)", rec.form60.agriIncome || "—"],
          ["Form 60 — Other Income (Rs.)", rec.form60.otherIncome || "—"],
        ]),
    [],
    ["F–I. CONTACT & IDENTITY DETAILS"],
    ["F. Aadhar No", rec.aadharNo || "—"],
    ["G. Contact No", rec.contactNo || "—"],
    [
      "H. Initial Deposit (Rs.)",
      rec.initialDeposit ? `Rs. ${rec.initialDeposit}` : "—",
    ],
    ["I. Email ID", rec.email || "—"],
    [],
    ["J–M. APPLICANT DETAILS"],
    ["J. Applicant's Name", rec.applicantName || "—"],
    ["K. Date of Birth", rec.dob || "—"],
    ["L. Father / Husband Name", rec.fatherHusbandName || "—"],
    ["M. Mother's Maiden Name", rec.motherMaidenName || "—"],
    [],
    ["N. CURRENT ADDRESS"],
    ["Village / Town", rec.currentAddress.village || "—"],
    ["Post Office", rec.currentAddress.postOffice || "—"],
    ["Sub-District", rec.currentAddress.subDistrict || "—"],
    ["District", rec.currentAddress.district || "—"],
    ["State", rec.currentAddress.state],
    ["Pin Code", rec.currentAddress.pinCode || "—"],
    [],
    ["O. PERMANENT ADDRESS"],
    ...(rec.permanentSameAsCurrent === "yes"
      ? [["Permanent Address", permanentAddr]]
      : [
          ["Village / Town", rec.permanentAddress.village || "—"],
          ["Post Office", rec.permanentAddress.postOffice || "—"],
          ["Sub-District", rec.permanentAddress.subDistrict || "—"],
          ["District", rec.permanentAddress.district || "—"],
          ["State", rec.permanentAddress.state],
          ["Pin Code", rec.permanentAddress.pinCode || "—"],
        ]),
    [],
    ["P. MINOR STATUS"],
    ["Is Applicant a Minor?", yesNo(rec.isMinor)],
    ...(rec.isMinor === "yes"
      ? [["Guardian Contact No", rec.guardianContactNo || "—"]]
      : []),
    [],
    ["Q. NOMINEE DETAILS"],
    ["a. Nominee Name", rec.nomineeName || "—"],
    ["b. Nominee Date of Birth", rec.nomineeDob || "—"],
    ["c. Relationship to Nominee", rec.nomineeRelationship || "—"],
    [],
    ["R. APPLICANT'S OCCUPATION"],
    ["Occupation", rec.occupation || "—"],
    [],
    ["S. SIGNATURES"],
    ["Signature of Applicant", "_________________________________"],
    ["Signature of Nominee", "_________________________________"],
    [],
    ["——————————— FOR BANK USE ONLY ———————————"],
    ["a. Customer ID", rec.bankCustomerId || "—"],
    ["b. Account No", rec.bankAccountNo || "—"],
    [],
    ["Signature of Bank DbrM / Manager", "_________________________________"],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 38 }, { wch: 42 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Account Opening Form");
  XLSX.writeFile(
    wb,
    `${rec.registrationNumber.replace(/\//g, "_")}_AccountOpeningForm.xlsx`,
  );
}

// ── Address sub-form ──────────────────────────────────────────────────────

function AddressFields({
  prefix,
  data,
  onChange,
}: {
  prefix: string;
  data: AddressData;
  onChange: (d: AddressData) => void;
}) {
  const f = (field: keyof AddressData, val: string) =>
    onChange({ ...data, [field]: val });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-village`} className="text-xs">
          Village / Town Name
        </Label>
        <Input
          id={`${prefix}-village`}
          value={data.village}
          onChange={(e) => f("village", e.target.value)}
          placeholder="Village or Town"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-po`} className="text-xs">
          Post Office
        </Label>
        <Input
          id={`${prefix}-po`}
          value={data.postOffice}
          onChange={(e) => f("postOffice", e.target.value)}
          placeholder="Post Office"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-subdistrict`} className="text-xs">
          Sub-District
        </Label>
        <Input
          id={`${prefix}-subdistrict`}
          value={data.subDistrict}
          onChange={(e) => f("subDistrict", e.target.value)}
          placeholder="Sub-District"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-district`} className="text-xs">
          District
        </Label>
        <Input
          id={`${prefix}-district`}
          value={data.district}
          onChange={(e) => f("district", e.target.value)}
          placeholder="District"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-state`} className="text-xs">
          State
        </Label>
        <Input
          id={`${prefix}-state`}
          value="Assam"
          disabled
          className="h-8 text-sm bg-muted"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${prefix}-pin`} className="text-xs">
          Pin Code
        </Label>
        <Input
          id={`${prefix}-pin`}
          value={data.pinCode}
          onChange={(e) => {
            if (/^\d{0,6}$/.test(e.target.value)) f("pinCode", e.target.value);
          }}
          placeholder="6-digit Pin Code"
          maxLength={6}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}

// ── Radio helper ──────────────────────────────────────────────────────────

function RadioGroup({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex gap-4 flex-wrap">
      {options.map((o) => (
        <label
          key={o.value}
          className="flex items-center gap-1.5 cursor-pointer text-sm"
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="accent-[#462980]"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

// ── Field row wrapper ─────────────────────────────────────────────────────

function FieldRow({
  label,
  required,
  children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
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

// ── Main component ─────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export default function AccountOpeningForm({ onBack }: Props) {
  const { isManager } = useInventoryAuth();
  const [tab, setTab] = useState("new-entry");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [records, setRecords] = useState<AccountOpeningRecord[]>(() =>
    loadItems<AccountOpeningRecord>(RECORDS_KEY),
  );
  const [form, setForm] = useState(getInitialForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preview reg number reactively
  const previewReg = previewRegNumber(form.category);

  // Reload records
  const refreshRecords = () =>
    setRecords(loadItems<AccountOpeningRecord>(RECORDS_KEY));

  // Helper to update nested fields
  const setF = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const setService = (key: string, val: YesNo) =>
    setF("services", { ...form.services, [key]: val });

  // Email mandatory if eStatement=yes
  const emailRequired = form.services.eStatement === "yes";

  // ── Validation ──────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.category) errs.category = "Select a category";
    if (!form.accountType) errs.accountType = "Select account type";
    if (!form.modeOfOperation)
      errs.modeOfOperation = "Select mode of operation";
    if (!form.aadharNo || !/^\d{12}$/.test(form.aadharNo))
      errs.aadharNo = "Enter valid 12-digit Aadhar No";
    if (!form.contactNo || !/^\d{10}$/.test(form.contactNo))
      errs.contactNo = "Enter valid 10-digit contact number";
    if (!form.applicantName.trim())
      errs.applicantName = "Applicant name is required";
    if (!form.dob) errs.dob = "Date of birth is required";
    if (!form.fatherHusbandName.trim())
      errs.fatherHusbandName = "Father/Husband name is required";
    if (!form.currentAddress.village.trim())
      errs["addr.village"] = "Village/Town is required";
    if (!form.currentAddress.district.trim())
      errs["addr.district"] = "District is required";
    if (
      form.currentAddress.pinCode &&
      !/^\d{6}$/.test(form.currentAddress.pinCode)
    )
      errs["addr.pin"] = "Pin Code must be 6 digits";
    if (emailRequired && !form.email.trim())
      errs.email = "Email is required when eStatement is Yes";
    if (
      form.panAvailable === "yes" &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.panNo)
    )
      errs.panNo =
        "PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    return true;
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (!validate()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    const existing = loadItems<AccountOpeningRecord>(RECORDS_KEY);

    if (editId !== null) {
      // Update existing record
      const updated = existing.map((r) =>
        r.id === editId
          ? { ...r, ...form, category: form.category as Category }
          : r,
      );
      saveItems(RECORDS_KEY, updated);
      toast.success("Record updated successfully!");
      setEditId(null);
    } else {
      const regNo = claimRegNumber(form.category);
      const newRecord: AccountOpeningRecord = {
        ...form,
        id:
          existing.length > 0 ? Math.max(...existing.map((r) => r.id)) + 1 : 1,
        registrationNumber: regNo,
        category: form.category as Category,
        submittedAt: new Date().toISOString(),
      };
      saveItems(RECORDS_KEY, [...existing, newRecord]);
      toast.success(`Account opening form saved! Reg No: ${regNo}`);
    }

    refreshRecords();
    setForm(getInitialForm());
    setErrors({});
    setTab("saved-records");
  }

  // ── Download ──────────────────────────────────────────────────────────
  async function handleDownload(rec: AccountOpeningRecord) {
    try {
      toast.info("Downloading Excel...");
      await generateExcel(rec);
      toast.success("Form downloaded as Excel (.xlsx)");
    } catch {
      toast.error("Failed to generate Excel. Please try again.");
    }
  }

  async function handleDownloadCurrent() {
    if (!validate()) {
      toast.error("Please fill required fields before downloading.");
      return;
    }
    const tempRec: AccountOpeningRecord = {
      ...form,
      id: 0,
      registrationNumber: previewReg,
      category: form.category as Category,
      submittedAt: new Date().toISOString(),
    };
    await handleDownload(tempRec);
  }

  // ── Edit ──────────────────────────────────────────────────────────────
  function handleEdit(rec: AccountOpeningRecord) {
    const { id, registrationNumber, category, submittedAt, ...rest } = rec;
    setForm({ ...rest, category });
    setEditId(id);
    setErrors({});
    setTab("new-entry");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Delete ────────────────────────────────────────────────────────────
  function handleDelete(id: number) {
    if (!window.confirm("Delete this record permanently?")) return;
    removeItem<AccountOpeningRecord>(RECORDS_KEY, id);
    refreshRecords();
    toast.success("Record deleted");
  }

  // ── Filtered records ──────────────────────────────────────────────────
  const filtered = records.filter(
    (r) =>
      !search ||
      r.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.applicantName.toLowerCase().includes(search.toLowerCase()),
  );

  const err = (key: string) =>
    errors[key] ? (
      <p className="text-xs text-red-500 mt-0.5">{errors[key]}</p>
    ) : null;

  return (
    <div className="space-y-4" data-ocid="account_opening.page">
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
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Account Opening Form
            </h2>
            <p className="text-xs text-muted-foreground">
              Fino Bank Doolahat & CSP Accounts
            </p>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger
            value="new-entry"
            data-ocid="account_opening.new_entry.tab"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            {editId ? "Edit Record" : "New Entry"}
          </TabsTrigger>
          <TabsTrigger
            value="saved-records"
            data-ocid="account_opening.saved_records.tab"
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
                  ACCOUNT OPENING FORM
                </CardTitle>
                <p className="text-sm font-semibold text-muted-foreground mt-1">
                  MINOR | SAVINGS | CURRENT ACCOUNT
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* Category & Reg No */}
              <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                <div className="flex-1 space-y-1">
                  <FieldRow label="Category" required>
                    <Select
                      value={form.category}
                      onValueChange={(v) => setF("category", v as Category)}
                    >
                      <SelectTrigger
                        className="h-8 text-sm"
                        data-ocid="account_opening.category.select"
                      >
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fino">
                          Fino Bank Doolahat Account
                        </SelectItem>
                        <SelectItem value="csp">CSP Accounts</SelectItem>
                      </SelectContent>
                    </Select>
                    {err("category")}
                  </FieldRow>
                  {form.category && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Registration No (preview):
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs font-mono border-[#462980]/30 text-[#462980]"
                      >
                        {previewReg}
                      </Badge>
                    </div>
                  )}
                </div>
                {/* Photo placeholder */}
                <div
                  className="flex-shrink-0 flex items-center justify-center border-2 border-dashed rounded"
                  style={{
                    width: 120,
                    height: 150,
                    borderColor: "#462980",
                    color: "#462980",
                  }}
                >
                  <span
                    className="text-[10px] text-center leading-tight px-2 font-medium"
                    style={{ color: "#462980" }}
                  >
                    Paste Photo Here
                  </span>
                </div>
              </div>

              {/* A. Type of Account */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  A. Type of Account
                </h3>
                <FieldRow label="Account Type" required>
                  <Select
                    value={form.accountType}
                    onValueChange={(v) => setF("accountType", v)}
                  >
                    <SelectTrigger
                      className="h-8 text-sm"
                      data-ocid="account_opening.account_type.select"
                    >
                      <SelectValue placeholder="Select account type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err("accountType")}
                </FieldRow>
              </div>

              {/* B. Mode of Operation */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  B. Mode of Operation
                </h3>
                <FieldRow label="Mode" required>
                  <RadioGroup
                    name="modeOfOperation"
                    value={form.modeOfOperation}
                    onChange={(v) =>
                      setF("modeOfOperation", v as "Self" | "Joint")
                    }
                    options={[
                      { label: "Self", value: "Self" },
                      { label: "Joint", value: "Joint" },
                    ]}
                  />
                  {err("modeOfOperation")}
                </FieldRow>
              </div>

              {/* C. Additional Service Request */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  C. Additional Service Request
                </h3>
                <div className="space-y-2">
                  {SERVICE_ITEMS.map((svc) => (
                    <div
                      key={svc.key}
                      className="flex items-center justify-between gap-4 py-1 border-b border-border/40 last:border-0"
                    >
                      <span className="text-sm">{svc.label}</span>
                      <RadioGroup
                        name={`svc-${svc.key}`}
                        value={form.services[svc.key] ?? ""}
                        onChange={(v) => setService(svc.key, v as YesNo)}
                        options={[
                          { label: "Yes", value: "yes" },
                          { label: "No", value: "no" },
                        ]}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* D. Education Qualification */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  D. Education Qualification
                </h3>
                <FieldRow label="Qualification">
                  <Select
                    value={form.eduQualification}
                    onValueChange={(v) => setF("eduQualification", v)}
                  >
                    <SelectTrigger
                      className="h-8 text-sm"
                      data-ocid="account_opening.edu.select"
                    >
                      <SelectValue placeholder="Select qualification..." />
                    </SelectTrigger>
                    <SelectContent>
                      {EDU_QUALIFICATIONS.map((q) => (
                        <SelectItem key={q} value={q}>
                          {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>

              {/* E. PAN */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  E. PAN Available?
                </h3>
                <RadioGroup
                  name="panAvailable"
                  value={form.panAvailable}
                  onChange={(v) => setF("panAvailable", v as YesNo)}
                  options={[
                    { label: "Yes", value: "yes" },
                    { label: "No", value: "no" },
                  ]}
                />
                {form.panAvailable === "yes" && (
                  <div className="pl-2 mt-2 space-y-1">
                    <FieldRow label="PAN Number (ABCDE1234F format)">
                      <Input
                        value={form.panNo}
                        onChange={(e) =>
                          setF(
                            "panNo",
                            e.target.value.toUpperCase().slice(0, 10),
                          )
                        }
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className="h-8 text-sm font-mono uppercase"
                        data-ocid="account_opening.pan_no.input"
                      />
                      {err("panNo")}
                    </FieldRow>
                  </div>
                )}
                {form.panAvailable === "no" && (
                  <div className="border rounded-lg p-4 bg-amber-50/50 border-amber-200 mt-2 space-y-3">
                    <p className="text-xs font-bold text-amber-700">
                      Form 60 Details
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          1. Amount of Transaction (Rs.)
                        </Label>
                        <Input
                          value={form.form60.txnAmount}
                          onChange={(e) =>
                            setF("form60", {
                              ...form.form60,
                              txnAmount: e.target.value,
                            })
                          }
                          placeholder="Amount"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          2. Date of Transaction
                        </Label>
                        <Input
                          type="date"
                          value={form.form60.txnDate}
                          onChange={(e) =>
                            setF("form60", {
                              ...form.form60,
                              txnDate: e.target.value,
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">3. PAN Applied?</Label>
                      <RadioGroup
                        name="panApplied"
                        value={form.form60.panApplied}
                        onChange={(v) =>
                          setF("form60", {
                            ...form.form60,
                            panApplied: v as YesNo,
                          })
                        }
                        options={[
                          { label: "Yes", value: "yes" },
                          { label: "No", value: "no" },
                        ]}
                      />
                    </div>
                    {form.form60.panApplied === "yes" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                        <div className="space-y-1">
                          <Label className="text-xs">
                            a. Date of Application
                          </Label>
                          <Input
                            type="date"
                            value={form.form60.panApplicationDate}
                            onChange={(e) =>
                              setF("form60", {
                                ...form.form60,
                                panApplicationDate: e.target.value,
                              })
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            b. Acknowledgement No
                          </Label>
                          <Input
                            value={form.form60.panAcknowledgementNo}
                            onChange={(e) =>
                              setF("form60", {
                                ...form.form60,
                                panAcknowledgementNo: e.target.value,
                              })
                            }
                            placeholder="Ack No"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">
                          4a. Agricultural Income (Rs.)
                        </Label>
                        <Input
                          value={form.form60.agriIncome}
                          onChange={(e) =>
                            setF("form60", {
                              ...form.form60,
                              agriIncome: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          4b. Other than Agricultural Income (Rs.)
                        </Label>
                        <Input
                          value={form.form60.otherIncome}
                          onChange={(e) =>
                            setF("form60", {
                              ...form.form60,
                              otherIncome: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* F–I: Core fields */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  F–I. Contact & Identity Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="F. Aadhar No (12 digits)" required>
                    <Input
                      value={form.aadharNo}
                      onChange={(e) => {
                        if (/^\d{0,12}$/.test(e.target.value))
                          setF("aadharNo", e.target.value);
                      }}
                      placeholder="123456789012"
                      maxLength={12}
                      className="h-8 text-sm"
                      data-ocid="account_opening.aadhar.input"
                    />
                    {err("aadharNo")}
                  </FieldRow>
                  <FieldRow label="G. Contact No (10 digits)" required>
                    <Input
                      value={form.contactNo}
                      onChange={(e) => {
                        if (/^\d{0,10}$/.test(e.target.value))
                          setF("contactNo", e.target.value);
                      }}
                      placeholder="9876543210"
                      maxLength={10}
                      className="h-8 text-sm"
                      data-ocid="account_opening.contact.input"
                    />
                    {err("contactNo")}
                  </FieldRow>
                  <FieldRow label="H. Initial Deposit Amount (Rs.)">
                    <div className="flex">
                      <span className="inline-flex items-center px-2 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground">
                        ₹
                      </span>
                      <Input
                        value={form.initialDeposit}
                        onChange={(e) => setF("initialDeposit", e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-sm rounded-l-none"
                      />
                    </div>
                  </FieldRow>
                  <FieldRow
                    label={`I. Email ID${emailRequired ? " *" : " (optional)"}`}
                    required={emailRequired}
                  >
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setF("email", e.target.value)}
                      placeholder="email@example.com"
                      className="h-8 text-sm"
                      data-ocid="account_opening.email.input"
                    />
                    {emailRequired && (
                      <p className="text-[10px] text-amber-600">
                        Required because eStatement is Yes
                      </p>
                    )}
                    {err("email")}
                  </FieldRow>
                </div>
              </div>

              {/* J–M: Applicant details */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  J–M. Applicant Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow
                    label="J. Applicant's Name (Block Letters)"
                    required
                  >
                    <Input
                      value={form.applicantName}
                      onChange={(e) =>
                        setF("applicantName", e.target.value.toUpperCase())
                      }
                      placeholder="IN BLOCK LETTERS"
                      className="h-8 text-sm uppercase font-semibold tracking-wide"
                      data-ocid="account_opening.applicant_name.input"
                    />
                    {err("applicantName")}
                  </FieldRow>
                  <FieldRow label="K. Date of Birth" required>
                    <Input
                      type="date"
                      value={form.dob}
                      onChange={(e) => setF("dob", e.target.value)}
                      className="h-8 text-sm"
                      data-ocid="account_opening.dob.input"
                    />
                    {err("dob")}
                  </FieldRow>
                  <FieldRow label="L. Father / Husband Name" required>
                    <Input
                      value={form.fatherHusbandName}
                      onChange={(e) =>
                        setF("fatherHusbandName", e.target.value)
                      }
                      placeholder="Father or Husband Name"
                      className="h-8 text-sm"
                      data-ocid="account_opening.father.input"
                    />
                    {err("fatherHusbandName")}
                  </FieldRow>
                  <FieldRow label="M. Mother's Maiden Name">
                    <Input
                      value={form.motherMaidenName}
                      onChange={(e) => setF("motherMaidenName", e.target.value)}
                      placeholder="Mother's Maiden Name"
                      className="h-8 text-sm"
                    />
                  </FieldRow>
                </div>
              </div>

              {/* N. Current Address */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  N. Current Address
                </h3>
                <AddressFields
                  prefix="curr"
                  data={form.currentAddress}
                  onChange={(d) => setF("currentAddress", d)}
                />
                {err("addr.village")}
                {err("addr.district")}
                {err("addr.pin")}
              </div>

              {/* O. Permanent Address */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  O. Permanent Address
                </h3>
                <FieldRow label="Same as Current Address?">
                  <RadioGroup
                    name="permanentSame"
                    value={form.permanentSameAsCurrent}
                    onChange={(v) => setF("permanentSameAsCurrent", v as YesNo)}
                    options={[
                      { label: "Yes", value: "yes" },
                      { label: "No", value: "no" },
                    ]}
                  />
                </FieldRow>
                {form.permanentSameAsCurrent === "yes" && (
                  <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200 text-green-700 text-sm">
                    <span>✔</span> Same as Current Address
                  </div>
                )}
                {form.permanentSameAsCurrent === "no" && (
                  <AddressFields
                    prefix="perm"
                    data={form.permanentAddress}
                    onChange={(d) => setF("permanentAddress", d)}
                  />
                )}
              </div>

              {/* P. Minor */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  P. Is Applicant a Minor?
                </h3>
                <RadioGroup
                  name="isMinor"
                  value={form.isMinor}
                  onChange={(v) => setF("isMinor", v as YesNo)}
                  options={[
                    { label: "Yes", value: "yes" },
                    { label: "No", value: "no" },
                  ]}
                />
                {form.isMinor === "yes" && (
                  <FieldRow label="Guardian Contact No">
                    <Input
                      value={form.guardianContactNo}
                      onChange={(e) => {
                        if (/^\d{0,10}$/.test(e.target.value))
                          setF("guardianContactNo", e.target.value);
                      }}
                      placeholder="10-digit contact number"
                      maxLength={10}
                      className="h-8 text-sm"
                      data-ocid="account_opening.guardian.input"
                    />
                  </FieldRow>
                )}
              </div>

              {/* Q. Nominee */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  Q. Nominee Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FieldRow label="a. Nominee Name">
                    <Input
                      value={form.nomineeName}
                      onChange={(e) => setF("nomineeName", e.target.value)}
                      placeholder="Nominee Name"
                      className="h-8 text-sm"
                      data-ocid="account_opening.nominee_name.input"
                    />
                  </FieldRow>
                  <FieldRow label="b. Nominee Date of Birth">
                    <Input
                      type="date"
                      value={form.nomineeDob}
                      onChange={(e) => setF("nomineeDob", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </FieldRow>
                  <FieldRow label="c. Relationship to Nominee">
                    <Select
                      value={form.nomineeRelationship}
                      onValueChange={(v) => setF("nomineeRelationship", v)}
                    >
                      <SelectTrigger
                        className="h-8 text-sm"
                        data-ocid="account_opening.nominee_rel.select"
                      >
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {NOMINEE_RELATIONSHIPS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldRow>
                </div>
              </div>

              {/* R. Occupation */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  R. Applicant's Occupation
                </h3>
                <FieldRow label="Occupation">
                  <Select
                    value={form.occupation}
                    onValueChange={(v) => setF("occupation", v)}
                  >
                    <SelectTrigger
                      className="h-8 text-sm"
                      data-ocid="account_opening.occupation.select"
                    >
                      <SelectValue placeholder="Select occupation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {OCCUPATIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldRow>
              </div>

              {/* S. Signature */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold" style={{ color: "#462980" }}>
                  S. Signatures
                </h3>
                <div className="grid grid-cols-2 gap-8 mt-4">
                  <div className="text-center">
                    <div className="border-b-2 border-foreground h-8 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Signature of Applicant
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="border-b-2 border-foreground h-8 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Signature of Nominee
                    </p>
                  </div>
                </div>
              </div>

              {/* T. Bank Use Only */}
              <div
                className="rounded-lg border border-border/60 p-4 space-y-3"
                style={{ backgroundColor: "#f9f9f9" }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "#b91c1c" }}
                >
                  For Bank Use Only
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FieldRow label="a. Customer ID">
                    <Input
                      value={form.bankCustomerId}
                      onChange={(e) => setF("bankCustomerId", e.target.value)}
                      placeholder="Customer ID"
                      disabled={!isManager}
                      className="h-8 text-sm font-bold"
                      style={{ color: "#b91c1c" }}
                      data-ocid="account_opening.bank_customer_id.input"
                    />
                    {!isManager && (
                      <p className="text-[10px] text-muted-foreground">
                        Manager access required
                      </p>
                    )}
                  </FieldRow>
                  <FieldRow label="b. Account No">
                    <Input
                      value={form.bankAccountNo}
                      onChange={(e) => setF("bankAccountNo", e.target.value)}
                      placeholder="Account No"
                      disabled={!isManager}
                      className="h-8 text-sm font-bold"
                      style={{ color: "#b91c1c" }}
                      data-ocid="account_opening.bank_account_no.input"
                    />
                  </FieldRow>
                </div>
                <div className="flex justify-end mt-4">
                  <div className="text-center">
                    <div className="border-b-2 border-foreground w-48 h-8 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      Signature of Bank DbrM / Manager
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
                  data-ocid="account_opening.submit.button"
                >
                  {editId ? "Update Record" : "Submit & Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadCurrent}
                  className="gap-1.5"
                  data-ocid="account_opening.download.button"
                >
                  <Download className="w-4 h-4" /> Download (.xlsx)
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
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by Reg No or Name..."
                      className="pl-8 h-8 text-sm w-56"
                      data-ocid="account_opening.search.input"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div
                  className="py-12 text-center text-muted-foreground"
                  data-ocid="account_opening.empty_state"
                >
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
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
                          Reg No
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Applicant Name
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Category
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Account Type
                        </th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                          Contact
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
                          data-ocid={`account_opening.record_row.${rec.id}`}
                        >
                          <td
                            className="px-4 py-2.5 font-mono text-xs font-semibold"
                            style={{ color: "#462980" }}
                          >
                            {rec.registrationNumber}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-xs">
                            {rec.applicantName}
                          </td>
                          <td className="px-4 py-2.5 text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {rec.category === "fino" ? "Fino Bank" : "CSP"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {rec.accountType || "—"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {rec.contactNo}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {new Date(rec.submittedAt).toLocaleDateString(
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
                                data-ocid={`account_opening.download_record.${rec.id}`}
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
                                    data-ocid={`account_opening.edit_record.${rec.id}`}
                                  >
                                    <Edit2 className="w-3 h-3" /> Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(rec.id)}
                                    className="h-7 text-xs gap-1 px-2 text-red-600 hover:bg-red-50 border-red-200"
                                    data-ocid={`account_opening.delete_record.${rec.id}`}
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
