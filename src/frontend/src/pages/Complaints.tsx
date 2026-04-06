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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  FileText,
  Filter,
  HelpCircle,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import RoleSwitcherBar from "../components/RoleSwitcherBar";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import type { Complaint } from "../hooks/useQueries";
import {
  useAddComplaint,
  useComplaints,
  useDeleteComplaint,
  useUpdateComplaint,
  useUpdateComplaintStatus,
} from "../hooks/useQueries";

// ── Types ────────────────────────────────────────────────────────────────────

type ComplaintStatus = "Resolved" | "Pending" | "Cancelled" | "Unknown";

const STATUS_OPTIONS: ComplaintStatus[] = [
  "Pending",
  "Resolved",
  "Cancelled",
  "Unknown",
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTicketId(id: number): string {
  return `TKT-${String(id).padStart(5, "0")}`;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "Resolved":
      return "#16a34a";
    case "Pending":
      return "#d97706";
    case "Cancelled":
      return "#dc2626";
    default:
      return "#6b7280";
  }
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { cls: string; icon: React.ReactNode }> = {
    Resolved: {
      cls: "bg-green-100 text-green-700 border-green-200",
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    Pending: {
      cls: "bg-amber-100 text-amber-700 border-amber-200",
      icon: <Clock className="w-3 h-3" />,
    },
    Cancelled: {
      cls: "bg-red-100 text-red-700 border-red-200",
      icon: <XCircle className="w-3 h-3" />,
    },
    Unknown: {
      cls: "bg-gray-100 text-gray-600 border-gray-200",
      icon: <HelpCircle className="w-3 h-3" />,
    },
  };
  const cfg = configs[status] ?? configs.Unknown;
  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.cls}`}
    >
      {cfg.icon}
      {status}
    </Badge>
  );
}

// ── Analytics Section ─────────────────────────────────────────────────────────

function AnalyticsSection({ complaints }: { complaints: Complaint[] }) {
  const resolved = complaints.filter((c) => c.status === "Resolved").length;
  const pending = complaints.filter((c) => c.status === "Pending").length;
  const cancelled = complaints.filter((c) => c.status === "Cancelled").length;
  const unknown = complaints.filter((c) => c.status === "Unknown").length;
  const total = complaints.length;

  const pieData = [
    { name: "Resolved", value: resolved, color: "#16a34a" },
    { name: "Pending", value: pending, color: "#d97706" },
    { name: "Cancelled", value: cancelled, color: "#dc2626" },
    { name: "Unknown", value: unknown, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  // Monthly bar chart data
  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of complaints) {
      const month = c.dateOfComplaint.slice(0, 7); // YYYY-MM
      map[month] = (map[month] ?? 0) + 1;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, count]) => ({
        month: new Date(`${month}-01`).toLocaleString("default", {
          month: "short",
          year: "2-digit",
        }),
        count,
      }));
  }, [complaints]);

  const kpiCards = [
    {
      label: "Total Complaints",
      value: total,
      icon: <ClipboardList className="w-5 h-5" />,
      color: "var(--brand-red)",
      bg: "oklch(0.97 0.018 293.8)",
    },
    {
      label: "Resolved",
      value: resolved,
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: "#16a34a",
      bg: "#f0fdf4",
    },
    {
      label: "Pending",
      value: pending,
      icon: <Clock className="w-5 h-5" />,
      color: "#d97706",
      bg: "#fffbeb",
    },
    {
      label: "Cancelled / Unknown",
      value: cancelled + unknown,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: "#dc2626",
      bg: "#fef2f2",
    },
  ];

  const progressRows = [
    {
      label: "Resolved",
      count: resolved,
      color: "#16a34a",
      bg: "#dcfce7",
    },
    {
      label: "Pending",
      count: pending,
      color: "#d97706",
      bg: "#fef9c3",
    },
    {
      label: "Cancelled",
      count: cancelled,
      color: "#dc2626",
      bg: "#fee2e2",
    },
    {
      label: "Unknown",
      count: unknown,
      color: "#6b7280",
      bg: "#f3f4f6",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
      data-ocid="complaints.analytics.section"
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">
                      {kpi.label}
                    </p>
                    <p
                      className="text-3xl font-bold tracking-tight"
                      style={{ color: kpi.color }}
                    >
                      {kpi.value}
                    </p>
                    {total > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpi.label === "Total Complaints"
                          ? "All time"
                          : `${Math.round((kpi.value / total) * 100)}% of total`}
                      </p>
                    )}
                  </div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: kpi.bg, color: kpi.color }}
                  >
                    {kpi.icon}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp
                className="w-4 h-4"
                style={{ color: "var(--brand-red)" }}
              />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number, name: string) => [value, name]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText
                className="w-4 h-4"
                style={{ color: "var(--brand-red)" }}
              />
              Complaints by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={monthlyData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [value, "Complaints"]}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--brand-red)"
                    radius={[4, 4, 0, 0]}
                    name="Complaints"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Progress Bars */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">No complaints yet.</p>
          ) : (
            progressRows.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-medium"
                    style={{ color: row.color }}
                  >
                    {row.label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {row.count} / {total} (
                    {total > 0 ? Math.round((row.count / total) * 100) : 0}%)
                  </span>
                </div>
                <div
                  className="h-2 rounded-full w-full"
                  style={{ backgroundColor: row.bg }}
                >
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: total > 0 ? `${(row.count / total) * 100}%` : "0%",
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Complaint Form Dialog ─────────────────────────────────────────────────────

interface ComplaintFormData {
  complaintNo: string;
  customerName: string;
  contactNo: string;
  accountNo: string;
  aadharNo: string;
  panNo: string;
  dateOfComplaint: string;
  complaintBrief: string;
  status: ComplaintStatus;
}

const emptyForm = (): ComplaintFormData => ({
  complaintNo: "",
  customerName: "",
  contactNo: "",
  accountNo: "",
  aadharNo: "",
  panNo: "",
  dateOfComplaint: todayISO(),
  complaintBrief: "",
  status: "Pending",
});

interface ComplaintFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editTarget: Complaint | null;
  onSaved: () => void;
}

function ComplaintFormDialog({
  open,
  onOpenChange,
  editTarget,
  onSaved,
}: ComplaintFormDialogProps) {
  const [form, setForm] = useState<ComplaintFormData>(emptyForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ComplaintFormData, string>>
  >({});

  const addMutation = useAddComplaint();
  const updateMutation = useUpdateComplaint();
  const isPending = addMutation.isPending || updateMutation.isPending;

  // Populate form when edit target changes
  const handleOpen = (v: boolean) => {
    if (v) {
      if (editTarget) {
        setForm({
          complaintNo: editTarget.complaintNo ?? "",
          customerName: editTarget.customerName,
          contactNo: editTarget.contactNo,
          accountNo: editTarget.accountNo,
          aadharNo: editTarget.aadharNo,
          panNo: editTarget.panNo,
          dateOfComplaint: editTarget.dateOfComplaint,
          complaintBrief: editTarget.complaintBrief,
          status: editTarget.status as ComplaintStatus,
        });
      } else {
        setForm(emptyForm());
      }
      setErrors({});
    }
    onOpenChange(v);
  };

  const set = (field: keyof ComplaintFormData) => (val: string) => {
    setForm((prev) => ({ ...prev, [field]: val }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof ComplaintFormData, string>> = {};
    if (!form.customerName.trim()) errs.customerName = "Required";
    if (!form.contactNo.trim()) errs.contactNo = "Required";
    if (!form.accountNo.trim()) errs.accountNo = "Required";
    if (!form.aadharNo.trim()) errs.aadharNo = "Required";
    else if (!/^\d{12}$/.test(form.aadharNo.trim()))
      errs.aadharNo = "Must be exactly 12 digits";
    if (!form.dateOfComplaint) errs.dateOfComplaint = "Required";
    if (!form.complaintBrief.trim()) errs.complaintBrief = "Required";
    if (!form.status) errs.status = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      if (editTarget) {
        await updateMutation.mutateAsync({
          id: editTarget.id,
          ...form,
        });
        toast.success("Complaint updated successfully");
      } else {
        await addMutation.mutateAsync(form);
        toast.success("Complaint added successfully");
      }
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to save complaint");
      console.error(e);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        data-ocid="complaints.form.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList
              className="w-5 h-5"
              style={{ color: "var(--brand-red)" }}
            />
            {editTarget ? "Edit Complaint" : "Add New Complaint"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {/* Ticket No — highlighted, read-only on edit, shown as info on add */}
          {editTarget && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cf-ticket" className="text-red-600 font-bold">
                Ticket No
              </Label>
              <Input
                id="cf-ticket"
                value={formatTicketId(editTarget.id)}
                readOnly
                className="font-bold text-red-600 border-red-200 bg-red-50 cursor-default"
                data-ocid="complaints.form.ticketId.display"
              />
            </div>
          )}

          {/* Complaint No */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-cno">
              Complaint No{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="cf-cno"
              placeholder="e.g. COMP-2024-001"
              value={form.complaintNo}
              onChange={(e) => set("complaintNo")(e.target.value)}
              data-ocid="complaints.form.complaintNo.input"
            />
          </div>

          {/* Customer Name */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-cname">
              Customer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cf-cname"
              placeholder="e.g. Rahul Sharma"
              value={form.customerName}
              onChange={(e) => set("customerName")(e.target.value)}
              data-ocid="complaints.form.customerName.input"
            />
            {errors.customerName && (
              <p
                className="text-xs text-red-600"
                data-ocid="complaints.form.customerName.error_state"
              >
                {errors.customerName}
              </p>
            )}
          </div>

          {/* Contact No */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-contact">
              Contact No <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cf-contact"
              placeholder="10-digit mobile number"
              value={form.contactNo}
              onChange={(e) => set("contactNo")(e.target.value)}
              data-ocid="complaints.form.contactNo.input"
            />
            {errors.contactNo && (
              <p
                className="text-xs text-red-600"
                data-ocid="complaints.form.contactNo.error_state"
              >
                {errors.contactNo}
              </p>
            )}
          </div>

          {/* Account No */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-acc">
              Account No <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cf-acc"
              placeholder="Bank account number"
              value={form.accountNo}
              onChange={(e) => set("accountNo")(e.target.value)}
              data-ocid="complaints.form.accountNo.input"
            />
            {errors.accountNo && (
              <p
                className="text-xs text-red-600"
                data-ocid="complaints.form.accountNo.error_state"
              >
                {errors.accountNo}
              </p>
            )}
          </div>

          {/* Aadhar No */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-aadhar">
              Aadhar No <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cf-aadhar"
              placeholder="12-digit Aadhar number"
              maxLength={12}
              value={form.aadharNo}
              onChange={(e) => set("aadharNo")(e.target.value)}
              data-ocid="complaints.form.aadharNo.input"
            />
            {errors.aadharNo && (
              <p
                className="text-xs text-red-600"
                data-ocid="complaints.form.aadharNo.error_state"
              >
                {errors.aadharNo}
              </p>
            )}
          </div>

          {/* PAN No (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-pan">
              PAN No{" "}
              <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="cf-pan"
              placeholder="e.g. ABCDE1234F"
              maxLength={10}
              value={form.panNo}
              onChange={(e) => set("panNo")(e.target.value.toUpperCase())}
              data-ocid="complaints.form.panNo.input"
            />
          </div>

          {/* Date of Complaint */}
          <div className="space-y-1.5">
            <Label htmlFor="cf-date">
              Date of Complaint <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cf-date"
              type="date"
              value={form.dateOfComplaint}
              onChange={(e) => set("dateOfComplaint")(e.target.value)}
              data-ocid="complaints.form.date.input"
            />
            {errors.dateOfComplaint && (
              <p
                className="text-xs text-red-600"
                data-ocid="complaints.form.date.error_state"
              >
                {errors.dateOfComplaint}
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cf-status">
              Complaint Status <span className="text-red-500">*</span>
            </Label>
            <Select value={form.status} onValueChange={set("status")}>
              <SelectTrigger data-ocid="complaints.form.status.select">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: getStatusColor(s) }}
                      />
                      {s}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-xs text-red-600">{errors.status}</p>
            )}
          </div>

          {/* Complaint Brief */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cf-brief">
              Complaint in Brief <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cf-brief"
              placeholder="Describe the complaint in detail..."
              rows={4}
              value={form.complaintBrief}
              onChange={(e) => set("complaintBrief")(e.target.value)}
              data-ocid="complaints.form.brief.textarea"
            />
            {errors.complaintBrief && (
              <p
                className="text-xs text-red-600"
                data-ocid="complaints.form.brief.error_state"
              >
                {errors.complaintBrief}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            data-ocid="complaints.form.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="text-white"
            style={{ backgroundColor: "var(--brand-red)" }}
            data-ocid="complaints.form.submit_button"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : editTarget ? (
              "Update Complaint"
            ) : (
              "Add Complaint"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirmation Dialog ────────────────────────────────────────────────

function DeleteConfirmDialog({
  open,
  onOpenChange,
  complaint,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  complaint: Complaint | null;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-sm"
        data-ocid="complaints.delete.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            Delete Complaint
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this complaint? This action cannot
            be undone.
          </p>
          {complaint && (
            <div className="bg-muted rounded-lg px-3 py-2 text-sm font-medium">
              {formatTicketId(complaint.id)} — {complaint.customerName}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            data-ocid="complaints.delete.cancel_button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            data-ocid="complaints.delete.confirm_button"
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function Complaints() {
  const { isManager } = useInventoryAuth();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Complaint | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Complaint | null>(null);

  const { data: complaints = [], isLoading } = useComplaints();
  const updateStatus = useUpdateComplaintStatus();
  const deleteComplaint = useDeleteComplaint();

  const filtered = useMemo(() => {
    let list = [...complaints].sort(
      (a, b) =>
        new Date(b.dateOfComplaint).getTime() -
        new Date(a.dateOfComplaint).getTime(),
    );
    if (statusFilter !== "All") {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.customerName.toLowerCase().includes(q) ||
          formatTicketId(c.id).toLowerCase().includes(q) ||
          c.accountNo.toLowerCase().includes(q) ||
          (c.complaintNo ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [complaints, search, statusFilter]);

  const handleOpenAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = (c: Complaint) => {
    setEditTarget(c);
    setFormOpen(true);
  };

  const handleDeleteClick = (c: Complaint) => {
    setDeleteTarget(c);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteComplaint.mutateAsync(deleteTarget.id);
      toast.success("Complaint deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
    } catch (e) {
      toast.error("Failed to delete complaint");
      console.error(e);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateStatus.mutateAsync({ id, status });
      toast.success(`Status updated to ${status}`);
    } catch (e) {
      toast.error("Failed to update status");
      console.error(e);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Role Switcher */}
        <RoleSwitcherBar />

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <ShieldAlert
                className="w-5 h-5"
                style={{ color: "var(--brand-red)" }}
              />
              Customer Complaints
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage and track all customer complaints — Manager access only
            </p>
          </div>
          {isManager && (
            <Button
              onClick={handleOpenAdd}
              className="text-white gap-2"
              style={{ backgroundColor: "var(--brand-red)" }}
              data-ocid="complaints.add.primary_button"
            >
              <Plus className="w-4 h-4" />
              Add Complaint
            </Button>
          )}
        </div>

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
              data-ocid="complaints.locked.section"
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
                  The Complaints module is restricted to Manager access only.
                  Please log in as Manager using the switcher above.
                </p>
              </div>
            </motion.div>
          ) : isLoading ? (
            /* Loading skeleton */
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
              data-ocid="complaints.loading_state"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {["kpi-1", "kpi-2", "kpi-3", "kpi-4"].map((k) => (
                  <Skeleton key={k} className="h-28 rounded-xl" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Skeleton className="h-60 rounded-xl" />
                <Skeleton className="h-60 rounded-xl lg:col-span-2" />
              </div>
              <Skeleton className="h-64 rounded-xl" />
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Analytics */}
              <AnalyticsSection complaints={complaints} />

              {/* Table Section */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <CardTitle className="text-sm font-semibold">
                      Complaints List
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        ({filtered.length} records)
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* Search */}
                      <div className="relative flex-1 sm:w-56">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, ticket, A/c..."
                          className="pl-8 h-8 text-xs"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          data-ocid="complaints.search.input"
                        />
                      </div>
                      {/* Filter */}
                      <Select
                        value={statusFilter}
                        onValueChange={setStatusFilter}
                      >
                        <SelectTrigger
                          className="h-8 text-xs w-36 gap-1"
                          data-ocid="complaints.filter.select"
                        >
                          <Filter className="w-3 h-3" />
                          <SelectValue placeholder="Filter status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Statuses</SelectItem>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {filtered.length === 0 ? (
                    <div
                      className="flex flex-col items-center justify-center py-16 text-center"
                      data-ocid="complaints.table.empty_state"
                    >
                      <ClipboardList className="w-12 h-12 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        {complaints.length === 0
                          ? 'No complaints yet. Click "Add Complaint" to get started.'
                          : "No complaints match your search or filter."}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table data-ocid="complaints.table">
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-xs font-semibold">
                              #
                            </TableHead>
                            <TableHead className="text-xs font-bold text-red-600">
                              Ticket No
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Complaint No
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Customer Name
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Contact No
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              A/c No
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Aadhar No
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              PAN No
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Date
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Brief
                            </TableHead>
                            <TableHead className="text-xs font-semibold">
                              Status
                            </TableHead>
                            <TableHead className="text-xs font-semibold text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((complaint, idx) => (
                            <TableRow
                              key={String(complaint.id)}
                              className="text-sm hover:bg-muted/20"
                              data-ocid={`complaints.table.item.${idx + 1}`}
                            >
                              <TableCell className="text-xs text-muted-foreground">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-mono text-xs font-bold text-red-600">
                                {formatTicketId(complaint.id)}
                              </TableCell>
                              <TableCell className="text-xs font-mono text-muted-foreground">
                                {complaint.complaintNo || "—"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {complaint.customerName}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-xs">
                                {complaint.contactNo}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {complaint.accountNo}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {complaint.aadharNo}
                              </TableCell>
                              <TableCell className="text-xs font-mono">
                                {complaint.panNo || "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {complaint.dateOfComplaint}
                              </TableCell>
                              <TableCell className="max-w-48">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground cursor-default line-clamp-2">
                                      {truncate(complaint.complaintBrief)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs text-xs">
                                    {complaint.complaintBrief}
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                {/* Quick status update dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="flex items-center gap-1 cursor-pointer"
                                      data-ocid={`complaints.status.toggle.${idx + 1}`}
                                    >
                                      <StatusBadge status={complaint.status} />
                                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    className="w-40"
                                  >
                                    {STATUS_OPTIONS.map((s) => (
                                      <DropdownMenuItem
                                        key={s}
                                        onClick={() =>
                                          handleStatusChange(complaint.id, s)
                                        }
                                        className="flex items-center gap-2 text-xs"
                                      >
                                        <span
                                          className="w-2 h-2 rounded-full"
                                          style={{
                                            backgroundColor: getStatusColor(s),
                                          }}
                                        />
                                        {s}
                                        {complaint.status === s && (
                                          <CheckCircle2 className="w-3 h-3 ml-auto text-green-600" />
                                        )}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => handleEdit(complaint)}
                                    data-ocid={`complaints.table.edit_button.${idx + 1}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteClick(complaint)}
                                    data-ocid={`complaints.table.delete_button.${idx + 1}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dialogs */}
        <ComplaintFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editTarget={editTarget}
          onSaved={() => setEditTarget(null)}
        />
        <DeleteConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          complaint={deleteTarget}
          onConfirm={handleDeleteConfirm}
          isDeleting={deleteComplaint.isPending}
        />
      </div>
    </TooltipProvider>
  );
}
