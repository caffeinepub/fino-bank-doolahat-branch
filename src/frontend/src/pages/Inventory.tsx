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
import { Checkbox } from "@/components/ui/checkbox";
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
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BoxIcon,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  KeyRound,
  Layers,
  Loader2,
  LogOut,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useInventoryAuth } from "../context/InventoryAuthContext";
import {
  useAddProduct,
  useAddStockTransaction,
  useBulkUpdateProducts,
  useDeleteProduct,
  useEditProduct,
  useInventoryProducts,
  useTodayStockTransactions,
} from "../hooks/useQueries";
import type { InventoryProduct, StockTransaction } from "../types/inventory";
import { formatINR, todayISO } from "../utils/helpers";

// ── Constants ────────────────────────────────────────────────────────────────

const PENDING_KEY = "fino_inventory_pending";
const APPROVED_KEY = "fino_inventory_approved";

// ── Types ────────────────────────────────────────────────────────────────────

type SortField =
  | "name"
  | "sku"
  | "category"
  | "quantity"
  | "unitCost"
  | "salePrice"
  | "reorderPoint"
  | "status";
type SortDir = "asc" | "desc";

interface PendingProduct {
  id: string;
  submittedAt: string;
  submittedByUserId: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  quantity: number;
  unitCost: number;
  salePrice: number;
  reorderPoint: number;
  status: "pending";
}

interface AddProductForm {
  name: string;
  description: string;
  sku: string;
  category: string;
  quantity: string;
  unitCost: string;
  salePrice: string;
  reorderPoint: string;
  staffUserId: string;
  staffPassword: string;
}

// ── Helper functions ─────────────────────────────────────────────────────────

function getStatus(
  qty: number,
  reorder: number,
): "in-stock" | "low" | "out-of-stock" {
  if (qty === 0) return "out-of-stock";
  if (qty <= reorder) return "low";
  return "in-stock";
}

function statusSortValue(status: "in-stock" | "low" | "out-of-stock"): number {
  if (status === "out-of-stock") return 0;
  if (status === "low") return 1;
  return 2;
}

function genId(): string {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusBadgeInv({ qty, reorder }: { qty: number; reorder: number }) {
  const status = getStatus(qty, reorder);
  if (status === "out-of-stock")
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
        Out of Stock
      </Badge>
    );
  if (status === "low")
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
        Low Stock
      </Badge>
    );
  return (
    <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
      In Stock
    </Badge>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  delay,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="shadow-sm border-border hover:shadow-md transition-shadow h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {title}
              </p>
              <p
                className="text-2xl font-bold mt-1.5 truncate"
                style={{ color }}
              >
                {value}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${color}18` }}
            >
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Manager Login Modal ───────────────────────────────────────────────────────

function ManagerLoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { loginAsManager, resetManagerPassword } = useInventoryAuth();
  const [password, setPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [nickName, setNickName] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleLogin = () => {
    if (!password.trim()) {
      setPasswordError("Please enter the manager password.");
      return;
    }
    const ok = loginAsManager(password);
    if (ok) {
      toast.success("Manager access granted");
      setPassword("");
      setPasswordError("");
      onClose();
    } else {
      setPasswordError("Incorrect password. Please try again.");
    }
  };

  const handleForgot = () => {
    if (!nickName.trim()) {
      setForgotError("Please enter your nick name.");
      return;
    }
    const ok = resetManagerPassword(nickName);
    if (ok) {
      toast.success("Manager access granted via security question");
      setNickName("");
      setForgotError("");
      setShowForgot(false);
      onClose();
    } else {
      setForgotError("Incorrect answer. Access denied.");
    }
  };

  const handleClose = () => {
    setPassword("");
    setPasswordError("");
    setNickName("");
    setForgotError("");
    setShowForgot(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md" data-ocid="manager_login.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck
              className="w-5 h-5"
              style={{ color: "var(--brand-red)" }}
            />
            Manager Login
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!showForgot ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="mgr-password">Manager Password</Label>
                <Input
                  id="mgr-password"
                  type="password"
                  placeholder="Enter manager password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  data-ocid="manager_login.input"
                />
                {passwordError && (
                  <p
                    className="text-xs text-red-600 flex items-center gap-1"
                    data-ocid="manager_login.error_state"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {passwordError}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="text-xs text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
                onClick={() => {
                  setShowForgot(true);
                  setPasswordError("");
                }}
                data-ocid="manager_login.forgot_link"
              >
                Forgot Password?
              </button>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  data-ocid="manager_login.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleLogin}
                  style={{ backgroundColor: "var(--brand-red)" }}
                  className="text-white"
                  data-ocid="manager_login.submit_button"
                >
                  <KeyRound className="w-4 h-4 mr-1.5" />
                  Login
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4"
            >
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "oklch(0.97 0.012 293.8)",
                  borderLeft: "3px solid var(--brand-red)",
                }}
              >
                <p className="font-medium text-foreground">Security Question</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Answer correctly to regain access
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nick-name">Enter Your Nick Name</Label>
                <Input
                  id="nick-name"
                  type="text"
                  placeholder="Your nick name"
                  value={nickName}
                  onChange={(e) => {
                    setNickName(e.target.value);
                    setForgotError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleForgot()}
                  data-ocid="manager_login.nickname_input"
                />
                {forgotError && (
                  <p
                    className="text-xs text-red-600 flex items-center gap-1"
                    data-ocid="manager_login.forgot_error_state"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {forgotError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForgot(false);
                    setForgotError("");
                    setNickName("");
                  }}
                  data-ocid="manager_login.back_button"
                >
                  Back
                </Button>
                <Button
                  onClick={handleForgot}
                  style={{ backgroundColor: "var(--brand-red)" }}
                  className="text-white"
                  data-ocid="manager_login.reset_button"
                >
                  Reset Access
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ── Add Product Modal ─────────────────────────────────────────────────────────

const emptyAddForm: AddProductForm = {
  name: "",
  description: "",
  sku: "",
  category: "",
  quantity: "",
  unitCost: "",
  salePrice: "",
  reorderPoint: "",
  staffUserId: "",
  staffPassword: "",
};

function AddProductModal({
  open,
  onClose,
  isManager,
  pendingProducts,
  onPendingAdd,
}: {
  open: boolean;
  onClose: () => void;
  isManager: boolean;
  pendingProducts: PendingProduct[];
  onPendingAdd: (p: PendingProduct) => void;
}) {
  const addProduct = useAddProduct();
  const [form, setForm] = useState<AddProductForm>(emptyAddForm);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AddProductForm, string>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const set = (field: keyof AddProductForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof AddProductForm, string>> = {};
    if (!form.name.trim()) newErrors.name = "Product name is required";
    if (!form.sku.trim()) newErrors.sku = "SKU is required";
    if (!isManager) {
      if (!form.staffUserId.trim())
        newErrors.staffUserId = "Staff User ID is required";
      if (!form.staffPassword.trim())
        newErrors.staffPassword = "Staff password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (isManager) {
        // Manager: direct add to backend
        await addProduct.mutateAsync({
          name: form.name.trim(),
          description: form.description.trim(),
          sku: form.sku.trim(),
          barcode: "",
          category: form.category.trim(),
          quantity: BigInt(Math.max(0, Number.parseInt(form.quantity) || 0)),
          unitCost: Number.parseFloat(form.unitCost) || 0,
          salePrice: Number.parseFloat(form.salePrice) || 0,
          reorderPoint: BigInt(
            Math.max(0, Number.parseInt(form.reorderPoint) || 0),
          ),
        });
        toast.success("Product added successfully");
        setForm(emptyAddForm);
        onClose();
      } else {
        // Staff: validate credentials then add to pending
        if (
          form.staffUserId !== "156399746" ||
          form.staffPassword !== "156399746"
        ) {
          toast.error(
            "Invalid Staff credentials. Use your assigned User ID and password.",
          );
          setErrors({
            staffUserId: "Invalid Staff User ID or Password",
            staffPassword: "Invalid Staff User ID or Password",
          });
          setIsSubmitting(false);
          return;
        }
        const pending: PendingProduct = {
          id: genId(),
          submittedAt: new Date().toISOString(),
          submittedByUserId: form.staffUserId,
          name: form.name.trim(),
          description: form.description.trim(),
          sku: form.sku.trim(),
          category: form.category.trim(),
          quantity: Math.max(0, Number.parseInt(form.quantity) || 0),
          unitCost: Number.parseFloat(form.unitCost) || 0,
          salePrice: Number.parseFloat(form.salePrice) || 0,
          reorderPoint: Math.max(0, Number.parseInt(form.reorderPoint) || 0),
          status: "pending",
        };
        onPendingAdd(pending);
        toast.success("Product submitted for manager approval");
        setForm(emptyAddForm);
        onClose();
      }
    } catch (err) {
      console.error("Add product error:", err);
      toast.error("Failed to add product. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setForm(emptyAddForm);
    setErrors({});
    onClose();
  };

  // prevent duplicate SKU in pending
  const skuTaken = pendingProducts.some(
    (p) => p.sku === form.sku.trim() && form.sku.trim(),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="add_product.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle
              className="w-5 h-5"
              style={{ color: "var(--brand-red)" }}
            />
            Add New Product
          </DialogTitle>
          {!isManager && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
              ⚡ Staff submission — will require manager approval before being
              added to inventory.
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ap-name">
              Product Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ap-name"
              placeholder="e.g. A4 Paper Ream"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              data-ocid="add_product.input"
            />
            {errors.name && (
              <p
                className="text-xs text-red-600"
                data-ocid="add_product.name_error"
              >
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="ap-desc">Description</Label>
            <Input
              id="ap-desc"
              placeholder="Brief product description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* SKU */}
          <div className="space-y-1.5">
            <Label htmlFor="ap-sku">
              SKU <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ap-sku"
              placeholder="e.g. PAPER-A4-001"
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
            {errors.sku && (
              <p
                className="text-xs text-red-600"
                data-ocid="add_product.sku_error"
              >
                {errors.sku}
              </p>
            )}
            {skuTaken && (
              <p className="text-xs text-amber-600">
                ⚠️ A pending product with this SKU already exists
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="ap-category">Category</Label>
            <Input
              id="ap-category"
              placeholder="e.g. Stationery, Electronics"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
          </div>

          {/* Quantity + Reorder Point */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-qty">Initial Quantity</Label>
              <Input
                id="ap-qty"
                type="number"
                min="0"
                placeholder="0"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-reorder">Reorder Point</Label>
              <Input
                id="ap-reorder"
                type="number"
                min="0"
                placeholder="0"
                value={form.reorderPoint}
                onChange={(e) => set("reorderPoint", e.target.value)}
              />
            </div>
          </div>

          {/* Unit Cost + Sale Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-cost">Unit Cost (₹)</Label>
              <Input
                id="ap-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.unitCost}
                onChange={(e) => set("unitCost", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-sale">Sale Price (₹)</Label>
              <Input
                id="ap-sale"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
              />
            </div>
          </div>

          {/* Staff Authentication — only for staff role */}
          {!isManager && (
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
                  Enter your Staff credentials to submit this product for
                  manager approval.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="ap-staff-id">Staff User ID</Label>
                  <Input
                    id="ap-staff-id"
                    placeholder="Enter your staff ID"
                    value={form.staffUserId}
                    onChange={(e) => set("staffUserId", e.target.value)}
                    data-ocid="add_product.staff_id_input"
                  />
                  {errors.staffUserId && (
                    <p
                      className="text-xs text-red-600"
                      data-ocid="add_product.staff_id_error"
                    >
                      {errors.staffUserId}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ap-staff-pass">Staff Password</Label>
                  <Input
                    id="ap-staff-pass"
                    type="password"
                    placeholder="Enter your staff password"
                    value={form.staffPassword}
                    onChange={(e) => set("staffPassword", e.target.value)}
                    data-ocid="add_product.staff_password_input"
                  />
                  {errors.staffPassword && (
                    <p
                      className="text-xs text-red-600"
                      data-ocid="add_product.staff_pass_error"
                    >
                      {errors.staffPassword}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-ocid="add_product.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting || addProduct.isPending || (skuTaken && !isManager)
              }
              style={{ backgroundColor: "var(--brand-red)" }}
              className="text-white"
              data-ocid="add_product.submit_button"
            >
              {isSubmitting || addProduct.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4 mr-1.5" />
              )}
              {isManager ? "Add Product" : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Pending Edit Modal ────────────────────────────────────────────────────────

function PendingEditModal({
  pending,
  onSave,
  onClose,
}: {
  pending: PendingProduct | null;
  onSave: (updated: PendingProduct) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<
    Omit<AddProductForm, "staffUserId" | "staffPassword">
  >({
    name: "",
    description: "",
    sku: "",
    category: "",
    quantity: "",
    unitCost: "",
    salePrice: "",
    reorderPoint: "",
  });

  useEffect(() => {
    if (pending) {
      setForm({
        name: pending.name,
        description: pending.description,
        sku: pending.sku,
        category: pending.category,
        quantity: String(pending.quantity),
        unitCost: String(pending.unitCost),
        salePrice: String(pending.salePrice),
        reorderPoint: String(pending.reorderPoint),
      });
    }
  }, [pending]);

  const set = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!pending) return;
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error("Product name and SKU are required.");
      return;
    }
    onSave({
      ...pending,
      name: form.name.trim(),
      description: form.description.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      quantity: Math.max(0, Number.parseInt(form.quantity) || 0),
      unitCost: Number.parseFloat(form.unitCost) || 0,
      salePrice: Number.parseFloat(form.salePrice) || 0,
      reorderPoint: Math.max(0, Number.parseInt(form.reorderPoint) || 0),
    });
    toast.success("Pending product updated");
    onClose();
  };

  return (
    <Dialog open={!!pending} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="pending_edit.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" style={{ color: "var(--brand-red)" }} />
            Edit Pending Product
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>SKU *</Label>
            <Input
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Initial Quantity</Label>
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                min="0"
                value={form.reorderPoint}
                onChange={(e) => set("reorderPoint", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit Cost (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) => set("unitCost", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sale Price (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="pending_edit.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            style={{ backgroundColor: "var(--brand-red)" }}
            className="text-white"
            data-ocid="pending_edit.save_button"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Stock Update Modal ────────────────────────────────────────────────────────

const emptyStockForm = {
  txType: "purchase",
  quantity: "",
  adjustSign: "+" as "+" | "-",
  note: "",
  date: todayISO(),
};

function StockUpdateModal({
  product,
  onClose,
}: {
  product: InventoryProduct | null;
  onClose: () => void;
}) {
  const addStockTx = useAddStockTransaction();
  const [form, setForm] = useState(emptyStockForm);

  useEffect(() => {
    if (product) setForm({ ...emptyStockForm, date: todayISO() });
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    const qty = Number.parseInt(form.quantity);
    if (!qty || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    let change: bigint;
    if (form.txType === "purchase") {
      change = BigInt(qty);
    } else if (form.txType === "sale") {
      change = -BigInt(qty);
    } else {
      change = form.adjustSign === "+" ? BigInt(qty) : -BigInt(qty);
    }
    try {
      await addStockTx.mutateAsync({
        productId: product.id,
        txType: form.txType,
        quantityChange: change,
        note: form.note.trim(),
        transactionDate: form.date,
      });
      toast.success("Stock updated");
      onClose();
    } catch {
      toast.error("Failed to update stock.");
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" data-ocid="stock_update.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw
              className="w-5 h-5"
              style={{ color: "var(--brand-red)" }}
            />
            Stock Update — {product?.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Transaction Type</Label>
            <Select
              value={form.txType}
              onValueChange={(v) => setForm((f) => ({ ...f, txType: v }))}
            >
              <SelectTrigger data-ocid="stock_update.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase (Stock In +)</SelectItem>
                <SelectItem value="sale">Sale (Stock Out −)</SelectItem>
                <SelectItem value="adjustment">Manual Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.txType === "adjustment" && (
            <div className="space-y-1.5">
              <Label>Adjustment Direction</Label>
              <div className="flex gap-2">
                {(
                  [
                    ["+", "Add Stock"],
                    ["-", "Remove Stock"],
                  ] as const
                ).map(([sign, label]) => (
                  <button
                    key={sign}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, adjustSign: sign }))}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      form.adjustSign === sign
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              placeholder="Enter quantity"
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
              data-ocid="stock_update.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input
              placeholder="Reason for update"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="stock_update.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addStockTx.isPending}
              style={{ backgroundColor: "var(--brand-red)" }}
              className="text-white"
              data-ocid="stock_update.submit_button"
            >
              {addStockTx.isPending && (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              )}
              Update Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Update Modal ─────────────────────────────────────────────────────────

function BulkUpdateModal({
  actionType,
  selectedCount,
  onClose,
  onSubmit,
  isPending,
}: {
  actionType: "prices" | "reorder" | null;
  selectedCount: number;
  onClose: () => void;
  onSubmit: (data: {
    type: "prices" | "reorder";
    unitCost?: string;
    salePrice?: string;
    reorderPoint?: string;
  }) => void;
  isPending: boolean;
}) {
  const [unitCost, setUnitCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionType) return;
    onSubmit({ type: actionType, unitCost, salePrice, reorderPoint });
  };

  return (
    <Dialog open={!!actionType} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" data-ocid="bulk_update.dialog">
        <DialogHeader>
          <DialogTitle>
            Bulk Update — {selectedCount} item{selectedCount > 1 ? "s" : ""}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {actionType === "prices" ? (
            <>
              <div className="space-y-1.5">
                <Label>New Unit Cost (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>New Sale Price (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>New Reorder Point</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="bulk_update.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: "var(--brand-red)" }}
              className="text-white"
              data-ocid="bulk_update.submit_button"
            >
              {isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Apply to {selectedCount} item{selectedCount > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Product Modal ────────────────────────────────────────────────────────

function EditProductModal({
  product,
  onClose,
}: {
  product: InventoryProduct | null;
  onClose: () => void;
}) {
  const editProductMut = useEditProduct();
  const [form, setForm] = useState({
    name: "",
    description: "",
    sku: "",
    category: "",
    unitCost: "",
    salePrice: "",
    reorderPoint: "",
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        description: product.description,
        sku: product.sku,
        category: product.category,
        unitCost: String(product.unitCost),
        salePrice: String(product.salePrice),
        reorderPoint: String(Number(product.reorderPoint)),
      });
    }
  }, [product]);

  const set = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!form.name.trim() || !form.sku.trim()) {
      toast.error("Product Name and SKU are required.");
      return;
    }
    try {
      await editProductMut.mutateAsync({
        id: product.id,
        name: form.name.trim(),
        description: form.description.trim(),
        sku: form.sku.trim(),
        barcode: "",
        category: form.category.trim(),
        unitCost: Number.parseFloat(form.unitCost) || 0,
        salePrice: Number.parseFloat(form.salePrice) || 0,
        reorderPoint: BigInt(
          Math.max(0, Number.parseInt(form.reorderPoint) || 0),
        ),
      });
      toast.success("Product updated");
      onClose();
    } catch {
      toast.error("Failed to update product.");
    }
  };

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="edit_product.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" style={{ color: "var(--brand-red)" }} />
            Edit Product
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              data-ocid="edit_product.input"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>SKU *</Label>
            <Input
              value={form.sku}
              onChange={(e) => set("sku", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit Cost (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onChange={(e) => set("unitCost", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sale Price (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reorder Point</Label>
            <Input
              type="number"
              min="0"
              value={form.reorderPoint}
              onChange={(e) => set("reorderPoint", e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-ocid="edit_product.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editProductMut.isPending}
              style={{ backgroundColor: "var(--brand-red)" }}
              className="text-white"
              data-ocid="edit_product.save_button"
            >
              {editProductMut.isPending && (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Inner inventory page (uses context) ───────────────────────────────────────

function InventoryInner() {
  const { isManager, logoutManager } = useInventoryAuth();
  const today = todayISO();

  // Pending products state
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>(
    () => {
      try {
        const stored = localStorage.getItem(PENDING_KEY);
        return stored ? (JSON.parse(stored) as PendingProduct[]) : [];
      } catch {
        return [];
      }
    },
  );

  useEffect(() => {
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingProducts));
  }, [pendingProducts]);

  // Locally approved products (approved optimistically, pending backend sync)
  const [localApprovedProducts, setLocalApprovedProducts] = useState<
    InventoryProduct[]
  >(() => {
    try {
      const stored = localStorage.getItem(APPROVED_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as Array<Record<string, unknown>>;
      return parsed.map((p) => ({
        ...p,
        id: BigInt(String(p.id)),
        quantity: BigInt(String(p.quantity)),
        reorderPoint: BigInt(String(p.reorderPoint)),
        createdAt: BigInt(String(p.createdAt ?? 0)),
      })) as InventoryProduct[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const serializable = localApprovedProducts.map((p) => ({
      ...p,
      id: String(p.id),
      quantity: String(p.quantity),
      reorderPoint: String(p.reorderPoint),
      createdAt: String(p.createdAt),
    }));
    localStorage.setItem(APPROVED_KEY, JSON.stringify(serializable));
  }, [localApprovedProducts]);

  // Table state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [managerLoginOpen, setManagerLoginOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProductTarget, setEditProductTarget] =
    useState<InventoryProduct | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<bigint | null>(null);
  const [stockUpdateProduct, setStockUpdateProduct] =
    useState<InventoryProduct | null>(null);
  const [bulkActionType, setBulkActionType] = useState<
    "prices" | "reorder" | null
  >(null);
  const [pendingEditTarget, setPendingEditTarget] =
    useState<PendingProduct | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Queries
  const { data: products = [], isLoading: productsLoading } =
    useInventoryProducts();
  const { data: todayTxs = [], isLoading: txLoading } =
    useTodayStockTransactions(today);

  const approveProductMut = useAddProduct();
  const queryClient = useQueryClient();
  const deleteProductMut = useDeleteProduct();
  const bulkUpdateMut = useBulkUpdateProducts();

  // ── Derived metrics ──────────────────────────────────────────────────────
  // Merge backend products with locally approved products (deduplicate by SKU)
  const mergedProducts = useMemo(() => {
    const backendSkus = new Set(products.map((p) => p.sku));
    const localOnly = localApprovedProducts.filter(
      (p) => !backendSkus.has(p.sku),
    );
    return [...products, ...localOnly];
  }, [products, localApprovedProducts]);

  const metrics = useMemo(() => {
    const totalValue = mergedProducts.reduce(
      (sum, p) => sum + Number(p.quantity) * p.unitCost,
      0,
    );
    const lowStock = mergedProducts.filter(
      (p) =>
        Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.reorderPoint),
    ).length;
    const outOfStock = mergedProducts.filter(
      (p) => Number(p.quantity) === 0,
    ).length;
    return { totalValue, lowStock, outOfStock, monthlyOrders: todayTxs.length };
  }, [mergedProducts, todayTxs]);

  // ── Unique categories ────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(mergedProducts.map((p) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [mergedProducts]);

  // ── Filtered + sorted table ──────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...mergedProducts];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "sku":
          cmp = a.sku.localeCompare(b.sku);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "quantity":
          cmp = Number(a.quantity) - Number(b.quantity);
          break;
        case "unitCost":
          cmp = a.unitCost - b.unitCost;
          break;
        case "salePrice":
          cmp = a.salePrice - b.salePrice;
          break;
        case "reorderPoint":
          cmp = Number(a.reorderPoint) - Number(b.reorderPoint);
          break;
        case "status":
          cmp =
            statusSortValue(
              getStatus(Number(a.quantity), Number(a.reorderPoint)),
            ) -
            statusSortValue(
              getStatus(Number(b.quantity), Number(b.reorderPoint)),
            );
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [mergedProducts, search, categoryFilter, sortField, sortDir]);

  // ── Sort helpers ─────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1" style={{ color: "var(--brand-red)" }} />
    ) : (
      <ArrowDown
        className="w-3 h-3 ml-1"
        style={{ color: "var(--brand-red)" }}
      />
    );
  };

  // ── Selection helpers ────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map((p) => String(p.id))));
    }
  };

  // ── Delete product ───────────────────────────────────────────────────────
  const handleDeleteProduct = async () => {
    if (deleteProductId === null) return;
    try {
      await deleteProductMut.mutateAsync(deleteProductId);
      toast.success("Product deleted");
      setDeleteProductId(null);
    } catch {
      toast.error("Failed to delete product.");
    }
  };

  // ── Pending product handlers ─────────────────────────────────────────────
  const handlePendingAdd = (p: PendingProduct) => {
    setPendingProducts((prev) => [...prev, p]);
  };

  const handlePendingApprove = (pending: PendingProduct) => {
    // Optimistic local-first approval — works even if backend is unavailable
    const localProduct: InventoryProduct = {
      id: BigInt(Date.now()),
      name: pending.name,
      description: pending.description,
      sku: pending.sku,
      barcode: "",
      category: pending.category,
      quantity: BigInt(pending.quantity),
      unitCost: pending.unitCost,
      salePrice: pending.salePrice,
      reorderPoint: BigInt(pending.reorderPoint),
      createdAt: BigInt(Date.now()),
    };

    // Immediately move from pending → locally approved
    setPendingProducts((prev) => prev.filter((p) => p.id !== pending.id));
    setLocalApprovedProducts((prev) => [...prev, localProduct]);
    toast.success(`"${pending.name}" approved and added to inventory!`);

    // Fire-and-forget backend sync
    approveProductMut
      .mutateAsync({
        name: pending.name,
        description: pending.description,
        sku: pending.sku,
        barcode: "",
        category: pending.category,
        quantity: BigInt(pending.quantity),
        unitCost: pending.unitCost,
        salePrice: pending.salePrice,
        reorderPoint: BigInt(pending.reorderPoint),
      })
      .then(() => {
        // Backend saved — remove local copy since backend now owns it
        setLocalApprovedProducts((prev) =>
          prev.filter((p) => p.sku !== pending.sku),
        );
        queryClient.invalidateQueries({ queryKey: ["inventory"] });
      })
      .catch((err) => {
        // Backend failed — keep local copy so product stays visible
        console.warn(
          "Backend sync failed, keeping locally approved product:",
          err,
        );
      });
  };

  const handlePendingEdit = (updated: PendingProduct) => {
    setPendingProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  };

  const handlePendingDelete = (id: string) => {
    setPendingProducts((prev) => prev.filter((p) => p.id !== id));
    setPendingDeleteId(null);
    toast.success("Pending submission removed");
  };

  // ── Bulk update handler ──────────────────────────────────────────────────
  const handleBulkUpdate = async (data: {
    type: "prices" | "reorder";
    unitCost?: string;
    salePrice?: string;
    reorderPoint?: string;
  }) => {
    const ids = Array.from(selectedIds).map((id) => BigInt(id));
    const count = ids.length;
    try {
      if (data.type === "prices") {
        const uc = Number.parseFloat(data.unitCost ?? "");
        const sp = Number.parseFloat(data.salePrice ?? "");
        if (Number.isNaN(uc) || Number.isNaN(sp)) {
          toast.error("Enter valid price values.");
          return;
        }
        await bulkUpdateMut.mutateAsync({
          ids,
          unitCosts: Array(count).fill(uc),
          salePrices: Array(count).fill(sp),
          reorderPoints: ids.map((id) => {
            const p = products.find((pr) => pr.id === id);
            return p ? p.reorderPoint : 0n;
          }),
        });
      } else {
        const rp = Number.parseInt(data.reorderPoint ?? "");
        if (Number.isNaN(rp) || rp < 0) {
          toast.error("Enter a valid reorder point.");
          return;
        }
        await bulkUpdateMut.mutateAsync({
          ids,
          unitCosts: ids.map((id) => {
            const p = products.find((pr) => pr.id === id);
            return p ? p.unitCost : 0;
          }),
          salePrices: ids.map((id) => {
            const p = products.find((pr) => pr.id === id);
            return p ? p.salePrice : 0;
          }),
          reorderPoints: Array(count).fill(BigInt(rp)),
        });
      }
      toast.success(`Updated ${count} product${count > 1 ? "s" : ""}.`);
      setBulkActionType(null);
      setSelectedIds(new Set());
    } catch {
      toast.error("Bulk update failed.");
    }
  };

  // ── Today's tx product name lookup ──────────────────────────────────────
  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(String(p.id), p.name);
    return m;
  }, [products]);

  const formatTime = (createdAt: bigint) => {
    const ms = Number(createdAt) / 1_000_000;
    if (!ms || ms < 1_000_000) return "—";
    return new Date(ms).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const txTypeColor = (type: string) => {
    if (type === "purchase") return "bg-blue-100 text-blue-700 border-blue-200";
    if (type === "sale") return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-purple-100 text-purple-700 border-purple-200";
  };

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (productsLoading) {
    return (
      <div className="space-y-6" data-ocid="inventory.loading_state">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.has(String(p.id)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "oklch(0.369 0.139 293.8 / 0.1)" }}
          >
            <Layers className="w-5 h-5" style={{ color: "var(--brand-red)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Inventory</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isManager
                ? "Manager View — Full access"
                : "Staff View — View & Submit Products"}
            </p>
          </div>
        </div>

        {/* Role badge + switch button */}
        <div className="flex items-center gap-3 flex-wrap">
          {isManager ? (
            <Badge
              className="flex items-center gap-1.5 px-3 py-1"
              style={{
                backgroundColor: "oklch(0.369 0.139 293.8 / 0.1)",
                color: "var(--brand-red)",
                border: "1px solid oklch(0.369 0.139 293.8 / 0.3)",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Manager View
            </Badge>
          ) : (
            <Badge className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 border-blue-200">
              <UserCheck className="w-3.5 h-3.5" />
              Staff View
            </Badge>
          )}

          {!isManager && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setManagerLoginOpen(true)}
              className="flex items-center gap-1.5"
              data-ocid="inventory.manager_login_button"
            >
              <KeyRound className="w-4 h-4" />
              Switch to Manager
            </Button>
          )}

          {isManager && (
            <Button
              size="sm"
              variant="outline"
              onClick={logoutManager}
              className="flex items-center gap-1.5 text-muted-foreground"
              data-ocid="inventory.logout_button"
            >
              <LogOut className="w-4 h-4" />
              Back to Staff View
            </Button>
          )}
        </div>
      </motion.div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Inventory Value"
          value={formatINR(metrics.totalValue)}
          icon={IndianRupee}
          color="#462980"
          subtitle="Current stock valuation"
          delay={0}
        />
        <MetricCard
          title="Low Stock Items"
          value={String(metrics.lowStock)}
          icon={AlertCircle}
          color="#d97706"
          subtitle="Below reorder point"
          delay={0.05}
        />
        <MetricCard
          title="Out of Stock"
          value={String(metrics.outOfStock)}
          icon={BoxIcon}
          color="#dc2626"
          subtitle="Zero quantity"
          delay={0.1}
        />
        <MetricCard
          title="Today's Transactions"
          value={String(metrics.monthlyOrders)}
          icon={TrendingUp}
          color="#059669"
          subtitle="Stock moves today"
          delay={0.15}
        />
      </div>

      {/* Pending Approvals (Manager only) */}
      <AnimatePresence>
        {isManager && pendingProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card
              className="border-amber-200"
              style={{ backgroundColor: "oklch(0.99 0.025 72)" }}
              data-ocid="pending_approvals.card"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Pending Approvals ({pendingProducts.length})
                  <span className="text-xs font-normal text-amber-600 ml-1">
                    — Review and approve staff submissions
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-amber-200">
                        <TableHead className="text-amber-800">
                          Product
                        </TableHead>
                        <TableHead className="text-amber-800">SKU</TableHead>
                        <TableHead className="text-amber-800">
                          Category
                        </TableHead>
                        <TableHead className="text-amber-800 text-right">
                          Qty
                        </TableHead>
                        <TableHead className="text-amber-800 text-right">
                          Cost
                        </TableHead>
                        <TableHead className="text-amber-800">
                          Submitted By
                        </TableHead>
                        <TableHead className="text-amber-800">Date</TableHead>
                        <TableHead className="text-amber-800 text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingProducts.map((p, idx) => (
                        <TableRow
                          key={p.id}
                          className="border-amber-100"
                          data-ocid={`pending_approvals.item.${idx + 1}`}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm text-foreground">
                                {p.name}
                              </p>
                              {p.description && (
                                <p className="text-xs text-muted-foreground">
                                  {p.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {p.sku}
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.category || "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {p.quantity}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatINR(p.unitCost)}
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {p.submittedByUserId}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(p.submittedAt).toLocaleDateString(
                              "en-IN",
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600 hover:bg-green-50"
                                title="Approve"
                                onClick={() => handlePendingApprove(p)}
                                data-ocid={`pending_approvals.confirm_button.${idx + 1}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                title="Edit"
                                onClick={() => setPendingEditTarget(p)}
                                data-ocid={`pending_approvals.edit_button.${idx + 1}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-600 hover:bg-red-50"
                                title="Delete"
                                onClick={() => setPendingDeleteId(p.id)}
                                data-ocid={`pending_approvals.delete_button.${idx + 1}`}
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
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff: your submissions banner */}
      {!isManager && pendingProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg px-4 py-3 flex items-center gap-3"
          style={{
            backgroundColor: "oklch(0.97 0.016 72 / 0.5)",
            border: "1px solid oklch(0.78 0.18 72 / 0.3)",
          }}
          data-ocid="staff_pending.card"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">
              {pendingProducts.length} submission
              {pendingProducts.length > 1 ? "s" : ""} pending manager approval.
            </span>{" "}
            Products will appear in inventory once approved.
          </p>
        </motion.div>
      )}

      {/* Search + Filter + Actions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or SKU…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-ocid="inventory.search_input"
                />
              </div>

              {/* Category filter */}
              {categories.length > 0 && (
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger
                    className="w-40"
                    data-ocid="inventory.category_select"
                  >
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Add Product */}
              <Button
                onClick={() => setAddProductOpen(true)}
                style={{ backgroundColor: "var(--brand-red)" }}
                className="text-white"
                data-ocid="inventory.add_product_button"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                Add Product
              </Button>

              {/* Bulk actions — manager only */}
              {isManager && selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkActionType("prices")}
                    data-ocid="inventory.bulk_prices_button"
                  >
                    Update Prices
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkActionType("reorder")}
                    data-ocid="inventory.bulk_reorder_button"
                  >
                    Update Reorder
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Inventory Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="shadow-sm border-border" data-ocid="inventory.table">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Products ({filteredProducts.length})
              </CardTitle>
              {filteredProducts.length === 0 && search && (
                <span className="text-xs text-muted-foreground">
                  No results for "{search}"
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredProducts.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="inventory.empty_state"
              >
                <BoxIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-medium">
                  No products found
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {search || categoryFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Add your first product to get started"}
                </p>
                {!search && categoryFilter === "all" && (
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => setAddProductOpen(true)}
                    style={{ backgroundColor: "var(--brand-red)" }}
                    data-ocid="inventory.empty_add_button"
                  >
                    <PlusCircle className="w-4 h-4 mr-1.5" />
                    Add First Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-muted/30">
                      {isManager && (
                        <TableHead className="w-10 pl-4">
                          <Checkbox
                            checked={allFilteredSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                            data-ocid="inventory.select_all_checkbox"
                          />
                        </TableHead>
                      )}
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("name")}
                      >
                        <span className="flex items-center">
                          Product <SortIcon field="name" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("sku")}
                      >
                        <span className="flex items-center">
                          SKU <SortIcon field="sku" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("category")}
                      >
                        <span className="flex items-center">
                          Category <SortIcon field="category" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => handleSort("quantity")}
                      >
                        <span className="flex items-center justify-end">
                          Qty <SortIcon field="quantity" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => handleSort("unitCost")}
                      >
                        <span className="flex items-center justify-end">
                          Unit Cost <SortIcon field="unitCost" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => handleSort("salePrice")}
                      >
                        <span className="flex items-center justify-end">
                          Sale Price <SortIcon field="salePrice" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none text-right"
                        onClick={() => handleSort("reorderPoint")}
                      >
                        <span className="flex items-center justify-end">
                          Reorder <SortIcon field="reorderPoint" />
                        </span>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none"
                        onClick={() => handleSort("status")}
                      >
                        <span className="flex items-center">
                          Status <SortIcon field="status" />
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p, idx) => (
                      <TableRow
                        key={String(p.id)}
                        className="border-border hover:bg-muted/20 transition-colors"
                        data-ocid={`inventory.item.${idx + 1}`}
                      >
                        {isManager && (
                          <TableCell className="pl-4">
                            <Checkbox
                              checked={selectedIds.has(String(p.id))}
                              onCheckedChange={() => toggleSelect(String(p.id))}
                              data-ocid={`inventory.checkbox.${idx + 1}`}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm text-foreground">
                              {p.name}
                            </p>
                            {p.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.sku}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.category || "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {Number(p.quantity)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatINR(p.unitCost)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatINR(p.salePrice)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Number(p.reorderPoint)}
                        </TableCell>
                        <TableCell>
                          <StatusBadgeInv
                            qty={Number(p.quantity)}
                            reorder={Number(p.reorderPoint)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Stock update — everyone can see, manager only can use */}
                            {isManager && (
                              <>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  title="Update Stock"
                                  onClick={() => setStockUpdateProduct(p)}
                                  data-ocid={`inventory.stock_update_button.${idx + 1}`}
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                  title="Edit"
                                  onClick={() => setEditProductTarget(p)}
                                  data-ocid={`inventory.edit_button.${idx + 1}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-red-600 hover:bg-red-50"
                                  title="Delete"
                                  onClick={() => setDeleteProductId(p.id)}
                                  data-ocid={`inventory.delete_button.${idx + 1}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            {!isManager && (
                              <span className="text-xs text-muted-foreground italic">
                                View only
                              </span>
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
      </motion.div>

      {/* Today's Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart
                className="w-4 h-4"
                style={{ color: "var(--brand-red)" }}
              />
              Today's Transactions
              <Badge variant="secondary" className="text-xs">
                {todayTxs.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {txLoading ? (
              <div
                className="p-6 space-y-2"
                data-ocid="transactions.loading_state"
              >
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))}
              </div>
            ) : todayTxs.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-10"
                data-ocid="transactions.empty_state"
              >
                <ShoppingCart className="w-8 h-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No transactions recorded today
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-muted/30">
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayTxs.map((tx: StockTransaction, idx: number) => (
                      <TableRow
                        key={String(tx.id)}
                        className="border-border"
                        data-ocid={`transactions.item.${idx + 1}`}
                      >
                        <TableCell className="font-medium text-sm">
                          {productMap.get(String(tx.productId)) ?? "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${txTypeColor(tx.transactionType)}`}
                          >
                            {tx.transactionType}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold text-sm ${
                            Number(tx.quantityChange) >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {Number(tx.quantityChange) >= 0 ? "+" : ""}
                          {Number(tx.quantityChange)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {tx.note || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTime(tx.createdAt)}
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

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Manager Login */}
      <ManagerLoginModal
        open={managerLoginOpen}
        onClose={() => setManagerLoginOpen(false)}
      />

      {/* Add Product */}
      <AddProductModal
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        isManager={isManager}
        pendingProducts={pendingProducts}
        onPendingAdd={handlePendingAdd}
      />

      {/* Edit Product (manager only) */}
      <EditProductModal
        product={editProductTarget}
        onClose={() => setEditProductTarget(null)}
      />

      {/* Pending product edit */}
      <PendingEditModal
        pending={pendingEditTarget}
        onSave={handlePendingEdit}
        onClose={() => setPendingEditTarget(null)}
      />

      {/* Delete confirmed product */}
      <AlertDialog
        open={deleteProductId !== null}
        onOpenChange={(v) => !v && setDeleteProductId(null)}
      >
        <AlertDialogContent data-ocid="delete_product.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the product from inventory. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="delete_product.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProduct}
              data-ocid="delete_product.confirm_button"
            >
              {deleteProductMut.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete pending submission */}
      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(v) => !v && setPendingDeleteId(null)}
      >
        <AlertDialogContent data-ocid="delete_pending.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Pending Submission</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the pending product submission. It will not be
              added to inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="delete_pending.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                pendingDeleteId && handlePendingDelete(pendingDeleteId)
              }
              data-ocid="delete_pending.confirm_button"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock update */}
      <StockUpdateModal
        product={stockUpdateProduct}
        onClose={() => setStockUpdateProduct(null)}
      />

      {/* Bulk update */}
      <BulkUpdateModal
        actionType={bulkActionType}
        selectedCount={selectedIds.size}
        onClose={() => setBulkActionType(null)}
        onSubmit={handleBulkUpdate}
        isPending={bulkUpdateMut.isPending}
      />
    </div>
  );
}

// ── Exported page ──────────────────────────────────────────────────────────────────

export default function Inventory() {
  return <InventoryInner />;
}
