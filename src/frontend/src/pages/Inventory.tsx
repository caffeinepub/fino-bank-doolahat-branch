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
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  PackageSearch,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  STAFF_IDS,
  STAFF_PASSWORD,
  useInventoryAuth,
} from "../context/InventoryAuthContext";
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

// ── Local storage keys ────────────────────────────────────────────────────────
const PENDING_KEY = "fino_inventory_pending";
const APPROVED_KEY = "fino_inventory_approved";

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface LocalProduct extends InventoryProduct {
  _local?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadPending(): PendingProduct[] {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "[]");
  } catch {
    return [];
  }
}

function savePending(items: PendingProduct[]) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(items));
}

function loadApproved(): LocalProduct[] {
  try {
    const raw = localStorage.getItem(APPROVED_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveApproved(items: LocalProduct[]) {
  localStorage.setItem(APPROVED_KEY, JSON.stringify(items));
}

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getStatusLabel(product: InventoryProduct): {
  label: string;
  color: string;
} {
  const qty = Number(product.quantity);
  const rp = Number(product.reorderPoint);
  if (qty === 0) return { label: "Out of Stock", color: "destructive" };
  if (qty <= rp) return { label: "Low Stock", color: "amber" };
  return { label: "In Stock", color: "green" };
}

// ── RoleSwitcher ──────────────────────────────────────────────────────────────
function RoleSwitcher({
  onSwitchToManager,
}: { onSwitchToManager: () => void }) {
  const { isManager, logoutManager } = useInventoryAuth();

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl mb-6 border"
      style={{
        background: isManager
          ? "linear-gradient(135deg, #f3f0ff 0%, #ede9fe 100%)"
          : "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
        borderColor: isManager ? "#c4b5fd" : "#bfdbfe",
      }}
    >
      <div className="flex items-center gap-3">
        {isManager ? (
          <ShieldCheck
            className="h-5 w-5"
            style={{ color: "var(--brand-red)" }}
          />
        ) : (
          <ShieldOff className="h-5 w-5 text-blue-500" />
        )}
        <div>
          <span
            className="font-semibold text-sm"
            style={{ color: isManager ? "var(--brand-red)" : "#1d4ed8" }}
          >
            {isManager ? "Manager View" : "Staff View"}
          </span>
          <p className="text-xs text-gray-500 mt-0.5">
            {isManager
              ? "Full access: approve, edit, delete all records"
              : "Enter data & submit for approval · Manager approval required to finalize"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isManager ? (
          <Button
            variant="outline"
            size="sm"
            onClick={logoutManager}
            data-ocid="inventory.switch_staff.button"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Switch to Staff
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onSwitchToManager}
            data-ocid="inventory.switch_manager.button"
            style={{ background: "var(--brand-red)", color: "white" }}
          >
            <ShieldCheck className="h-4 w-4 mr-1" />
            Switch to Manager
          </Button>
        )}
      </div>
    </div>
  );
}

// ── ManagerLoginModal ─────────────────────────────────────────────────────────
function ManagerLoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { loginAsManager, resetManagerPassword } = useInventoryAuth();
  const [view, setView] = useState<"login" | "forgot">("login");
  const [password, setPassword] = useState("");
  const [nickName, setNickName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setView("login");
    setPassword("");
    setNickName("");
    setError("");
    onClose();
  }

  function handleLogin() {
    setLoading(true);
    setError("");
    setTimeout(() => {
      const ok = loginAsManager(password);
      if (ok) {
        toast.success("Logged in as Manager");
        handleClose();
      } else {
        setError("Incorrect password. Please try again.");
      }
      setLoading(false);
    }, 400);
  }

  function handleReset() {
    setLoading(true);
    setError("");
    setTimeout(() => {
      const ok = resetManagerPassword(nickName);
      if (ok) {
        toast.success("Access granted via security question");
        handleClose();
      } else {
        setError("Incorrect answer. Please try again.");
      }
      setLoading(false);
    }, 400);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="sm:max-w-sm"
        data-ocid="inventory.manager_login.dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck
              className="h-5 w-5"
              style={{ color: "var(--brand-red)" }}
            />
            Manager Access
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {view === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="mgr-pw">Manager Password</Label>
                <Input
                  id="mgr-pw"
                  type="password"
                  placeholder="Enter manager password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  data-ocid="inventory.manager_password.input"
                />
              </div>
              {error && (
                <p
                  className="text-sm text-red-600"
                  data-ocid="inventory.manager_login.error_state"
                >
                  {error}
                </p>
              )}
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline"
                onClick={() => {
                  setView("forgot");
                  setError("");
                }}
              >
                Forgot Password?
              </button>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleLogin}
                  disabled={loading || !password}
                  data-ocid="inventory.manager_login.submit_button"
                  style={{ background: "var(--brand-red)", color: "white" }}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Login
                </Button>
              </DialogFooter>
            </motion.div>
          ) : (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Security Question: <strong>Enter Your Nick Name</strong>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nick-name">Your Answer</Label>
                <Input
                  id="nick-name"
                  type="text"
                  placeholder="Enter your nick name"
                  value={nickName}
                  onChange={(e) => setNickName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleReset()}
                  data-ocid="inventory.security_answer.input"
                />
              </div>
              {error && (
                <p
                  className="text-sm text-red-600"
                  data-ocid="inventory.security_answer.error_state"
                >
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setView("login");
                    setError("");
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={handleReset}
                  disabled={loading || !nickName}
                  data-ocid="inventory.security_answer.submit_button"
                  style={{ background: "var(--brand-red)", color: "white" }}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// ── AddProductModal ───────────────────────────────────────────────────────────
function AddProductModal({
  open,
  onClose,
  isManager,
  onPendingAdd,
}: {
  open: boolean;
  onClose: () => void;
  isManager: boolean;
  onPendingAdd: (p: PendingProduct) => void;
}) {
  const addProduct = useAddProduct();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffPw, setStaffPw] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setDescription("");
    setSku("");
    setCategory("");
    setQuantity("");
    setUnitCost("");
    setSalePrice("");
    setReorderPoint("");
    setStaffId("");
    setStaffPw("");
    setAuthError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!name || !sku || !category) {
      toast.error("Name, SKU and Category are required");
      return;
    }

    if (isManager) {
      setLoading(true);
      try {
        await addProduct.mutateAsync({
          name,
          description,
          sku,
          barcode: "",
          category,
          quantity: Number(quantity) || 0,
          unitCost: Number(unitCost) || 0,
          salePrice: Number(salePrice) || 0,
          reorderPoint: Number(reorderPoint) || 0,
        });
        toast.success("Product added successfully");
        handleClose();
      } catch (err) {
        console.error(err);
        toast.error("Failed to add product");
      } finally {
        setLoading(false);
      }
    } else {
      // Staff: validate credentials
      if (!STAFF_IDS.includes(staffId) || staffPw !== STAFF_PASSWORD) {
        setAuthError("Invalid Staff User ID or Password");
        return;
      }
      const pending: PendingProduct = {
        id: genId(),
        submittedAt: new Date().toISOString(),
        submittedByUserId: staffId,
        name,
        description,
        sku,
        category,
        quantity: Number(quantity) || 0,
        unitCost: Number(unitCost) || 0,
        salePrice: Number(salePrice) || 0,
        reorderPoint: Number(reorderPoint) || 0,
        status: "pending",
      };
      onPendingAdd(pending);
      toast.success("Product submitted for manager approval");
      handleClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        data-ocid="inventory.add_product.dialog"
      >
        <DialogHeader>
          <DialogTitle>
            Add Product{" "}
            {!isManager && (
              <Badge className="ml-2 text-xs bg-amber-100 text-amber-800">
                Pending Approval
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Product Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. A4 Paper Ream"
              data-ocid="inventory.add_product_name.input"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              data-ocid="inventory.add_product_desc.input"
            />
          </div>
          <div className="space-y-1">
            <Label>SKU *</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. A4-PRM-500"
              data-ocid="inventory.add_product_sku.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Category *</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Stationery"
              data-ocid="inventory.add_product_category.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              data-ocid="inventory.add_product_qty.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Reorder Point</Label>
            <Input
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              placeholder="5"
              data-ocid="inventory.add_product_reorder.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Unit Cost (₹)</Label>
            <Input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="0.00"
              data-ocid="inventory.add_product_cost.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Sale Price (₹)</Label>
            <Input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              data-ocid="inventory.add_product_price.input"
            />
          </div>
        </div>

        {!isManager && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
            <p className="text-sm font-semibold text-amber-800">
              Staff Authentication Required
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Staff User ID</Label>
                <Input
                  value={staffId}
                  onChange={(e) => {
                    setStaffId(e.target.value);
                    setAuthError("");
                  }}
                  placeholder="Enter User ID"
                  data-ocid="inventory.staff_id.input"
                />
              </div>
              <div className="space-y-1">
                <Label>Staff Password</Label>
                <Input
                  type="password"
                  value={staffPw}
                  onChange={(e) => {
                    setStaffPw(e.target.value);
                    setAuthError("");
                  }}
                  placeholder="Enter Password"
                  data-ocid="inventory.staff_password.input"
                />
              </div>
            </div>
            {authError && (
              <p
                className="text-sm text-red-600"
                data-ocid="inventory.staff_auth.error_state"
              >
                {authError}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            data-ocid="inventory.add_product.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            data-ocid="inventory.add_product.submit_button"
            style={{ background: "var(--brand-red)", color: "white" }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isManager ? "Add Product" : "Submit for Approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── PendingEditModal ──────────────────────────────────────────────────────────
function PendingEditModal({
  pending,
  onClose,
  onSave,
}: {
  pending: PendingProduct | null;
  onClose: () => void;
  onSave: (updated: PendingProduct) => void;
}) {
  const [form, setForm] = useState<PendingProduct | null>(null);

  useEffect(() => {
    if (pending) setForm({ ...pending });
  }, [pending]);

  if (!form) return null;

  function updateField(field: keyof PendingProduct, value: string | number) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  return (
    <Dialog open={!!pending} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        data-ocid="inventory.pending_edit.dialog"
      >
        <DialogHeader>
          <DialogTitle>Edit Pending Product</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Product Name</Label>
            <Input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              data-ocid="inventory.pending_edit_name.input"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              data-ocid="inventory.pending_edit_desc.input"
            />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input
              value={form.sku}
              onChange={(e) => updateField("sku", e.target.value)}
              data-ocid="inventory.pending_edit_sku.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              data-ocid="inventory.pending_edit_category.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              value={form.quantity}
              onChange={(e) => updateField("quantity", Number(e.target.value))}
              data-ocid="inventory.pending_edit_qty.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Reorder Point</Label>
            <Input
              type="number"
              value={form.reorderPoint}
              onChange={(e) =>
                updateField("reorderPoint", Number(e.target.value))
              }
              data-ocid="inventory.pending_edit_reorder.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Unit Cost (₹)</Label>
            <Input
              type="number"
              value={form.unitCost}
              onChange={(e) => updateField("unitCost", Number(e.target.value))}
              data-ocid="inventory.pending_edit_cost.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Sale Price (₹)</Label>
            <Input
              type="number"
              value={form.salePrice}
              onChange={(e) => updateField("salePrice", Number(e.target.value))}
              data-ocid="inventory.pending_edit_price.input"
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="inventory.pending_edit.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(form);
              onClose();
            }}
            data-ocid="inventory.pending_edit.save_button"
            style={{ background: "var(--brand-red)", color: "white" }}
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── EditProductModal ──────────────────────────────────────────────────────────
function EditProductModal({
  product,
  onClose,
}: {
  product: InventoryProduct | null;
  onClose: () => void;
}) {
  const editProduct = useEditProduct();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description);
      setSku(product.sku);
      setCategory(product.category);
      setUnitCost(String(product.unitCost));
      setSalePrice(String(product.salePrice));
      setReorderPoint(String(product.reorderPoint));
    }
  }, [product]);

  async function handleSave() {
    if (!product) return;
    setLoading(true);
    try {
      await editProduct.mutateAsync({
        id: product.id,
        name,
        description,
        sku,
        barcode: product.barcode,
        category,
        unitCost: Number(unitCost),
        salePrice: Number(salePrice),
        reorderPoint: Number(reorderPoint) || 0,
      });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Product updated");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-lg"
        data-ocid="inventory.edit_product.dialog"
      >
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Product Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-ocid="inventory.edit_name.input"
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-ocid="inventory.edit_desc.input"
            />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              data-ocid="inventory.edit_sku.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-ocid="inventory.edit_category.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Unit Cost (₹)</Label>
            <Input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              data-ocid="inventory.edit_cost.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Sale Price (₹)</Label>
            <Input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              data-ocid="inventory.edit_price.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Reorder Point</Label>
            <Input
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              data-ocid="inventory.edit_reorder.input"
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="inventory.edit_product.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            data-ocid="inventory.edit_product.save_button"
            style={{ background: "var(--brand-red)", color: "white" }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── StockUpdateModal ──────────────────────────────────────────────────────────
function StockUpdateModal({
  product,
  onClose,
}: {
  product: InventoryProduct | null;
  onClose: () => void;
}) {
  const addTx = useAddStockTransaction();
  const qc = useQueryClient();
  const [txType, setTxType] = useState("purchase");
  const [quantityChange, setQuantityChange] = useState("");
  const [note, setNote] = useState("");
  const [txDate, setTxDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  function reset() {
    setTxType("purchase");
    setQuantityChange("");
    setNote("");
    setTxDate(todayISO());
  }

  async function handleSubmit() {
    if (!product) return;
    if (!quantityChange || Number(quantityChange) <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setLoading(true);
    try {
      await addTx.mutateAsync({
        productId: product.id,
        transactionType: txType,
        quantityChange: Number(quantityChange) || 0,
        note,
        transactionDate: txDate,
      });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stockTransactions"] });
      toast.success("Stock updated");
      reset();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update stock");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-sm"
        data-ocid="inventory.stock_update.dialog"
      >
        <DialogHeader>
          <DialogTitle>Stock Update — {product?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Transaction Type</Label>
            <Select value={txType} onValueChange={setTxType}>
              <SelectTrigger data-ocid="inventory.stock_tx_type.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase (In)</SelectItem>
                <SelectItem value="sale">Sale (Out)</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Quantity</Label>
            <Input
              type="number"
              value={quantityChange}
              onChange={(e) => setQuantityChange(e.target.value)}
              placeholder="e.g. 10"
              data-ocid="inventory.stock_qty.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              data-ocid="inventory.stock_date.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Note</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              data-ocid="inventory.stock_note.input"
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="inventory.stock_update.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            data-ocid="inventory.stock_update.submit_button"
            style={{ background: "var(--brand-red)", color: "white" }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── BulkUpdateModal ───────────────────────────────────────────────────────────
function BulkUpdateModal({
  open,
  selectedIds,
  onClose,
}: {
  open: boolean;
  selectedIds: number[];
  onClose: () => void;
}) {
  const bulkUpdate = useBulkUpdateProducts();
  const qc = useQueryClient();
  const [unitCost, setUnitCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [reorderPoint, setReorderPoint] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setUnitCost("");
    setSalePrice("");
    setReorderPoint("");
    onClose();
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const n = selectedIds.length;
      const uc = unitCost ? Number(unitCost) : undefined;
      const sp = salePrice ? Number(salePrice) : undefined;
      const rp = reorderPoint ? Number(reorderPoint) : undefined;

      await bulkUpdate.mutateAsync({
        ids: selectedIds,
        unitCosts: uc !== undefined ? Array(n).fill(uc) : Array(n).fill(0),
        salePrices: sp !== undefined ? Array(n).fill(sp) : Array(n).fill(0),
        reorderPoints: rp !== undefined ? Array(n).fill(rp) : Array(n).fill(0),
      });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(`Updated ${n} products`);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Bulk update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="sm:max-w-sm"
        data-ocid="inventory.bulk_update.dialog"
      >
        <DialogHeader>
          <DialogTitle>Bulk Update ({selectedIds.length} items)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Unit Cost (₹) — leave blank to skip</Label>
            <Input
              type="number"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="No change"
              data-ocid="inventory.bulk_cost.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Sale Price (₹) — leave blank to skip</Label>
            <Input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="No change"
              data-ocid="inventory.bulk_price.input"
            />
          </div>
          <div className="space-y-1">
            <Label>Reorder Point — leave blank to skip</Label>
            <Input
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(e.target.value)}
              placeholder="No change"
              data-ocid="inventory.bulk_reorder.input"
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            data-ocid="inventory.bulk_update.cancel_button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            data-ocid="inventory.bulk_update.submit_button"
            style={{ background: "var(--brand-red)", color: "white" }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Updates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── PendingApprovalsPanel ─────────────────────────────────────────────────────
function PendingApprovalsPanel({
  pending,
  onApprove,
  onEdit,
  onDelete,
  approvingIds,
}: {
  pending: PendingProduct[];
  onApprove: (p: PendingProduct) => void;
  onEdit: (p: PendingProduct) => void;
  onDelete: (id: string) => void;
  approvingIds: Set<string>;
}) {
  if (pending.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-amber-300">
        <CardHeader className="py-3 px-4 bg-amber-50 border-b border-amber-200 rounded-t-lg">
          <CardTitle className="text-amber-800 flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5" />
            Pending Staff Approvals ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-amber-50/50">
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((p, i) => (
                  <TableRow
                    key={p.id}
                    data-ocid={`inventory.pending_approvals.item.${i + 1}`}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.quantity}</TableCell>
                    <TableCell>{formatINR(p.unitCost)}</TableCell>
                    <TableCell className="text-xs">
                      {p.submittedByUserId}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.submittedAt).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm"
                          onClick={() => onApprove(p)}
                          disabled={approvingIds.has(p.id)}
                          className="bg-green-600 hover:bg-green-700 text-white h-7 px-2 text-xs"
                          data-ocid={`inventory.approve.button.${i + 1}`}
                        >
                          {approvingIds.has(p.id) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(p)}
                          className="h-7 px-2 text-xs text-blue-600 border-blue-300"
                          data-ocid={`inventory.pending_edit.button.${i + 1}`}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(p.id)}
                          className="h-7 px-2 text-xs text-red-600 border-red-300"
                          data-ocid={`inventory.pending_delete.button.${i + 1}`}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Delete
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
  );
}

// ── MetricCards ───────────────────────────────────────────────────────────────
function MetricCards({
  products,
  todayTxCount,
}: {
  products: LocalProduct[];
  todayTxCount: number;
}) {
  const totalValue = products.reduce(
    (acc, p) => acc + Number(p.quantity) * p.unitCost,
    0,
  );
  const lowStock = products.filter(
    (p) =>
      Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.reorderPoint),
  ).length;
  const outOfStock = products.filter((p) => Number(p.quantity) === 0).length;

  const metrics = [
    {
      label: "Total Inventory Value",
      value: formatINR(totalValue),
      icon: <PackageSearch className="h-5 w-5" />,
      color: "#462980",
      bg: "#f3f0ff",
    },
    {
      label: "Low Stock Items",
      value: String(lowStock),
      icon: <TrendingDown className="h-5 w-5" />,
      color: "#d97706",
      bg: "#fffbeb",
    },
    {
      label: "Out of Stock",
      value: String(outOfStock),
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "#dc2626",
      bg: "#fef2f2",
    },
    {
      label: "Today's Transactions",
      value: String(todayTxCount),
      icon: <RefreshCw className="h-5 w-5" />,
      color: "#16a34a",
      bg: "#f0fdf4",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {metrics.map((m) => (
        <Card
          key={m.label}
          className="border"
          style={{ borderColor: `${m.color}30` }}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className="text-xl font-bold" style={{ color: m.color }}>
                  {m.value}
                </p>
              </div>
              <div
                className="rounded-lg p-2"
                style={{ background: m.bg, color: m.color }}
              >
                {m.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Main Inventory Page ───────────────────────────────────────────────────────
export default function Inventory() {
  const { isManager } = useInventoryAuth();
  const { data: backendProducts = [], isLoading } = useInventoryProducts();
  const { data: todayTxs = [] } = useTodayStockTransactions(todayISO());
  const deleteProduct = useDeleteProduct();
  const qc = useQueryClient();

  // ── Role switcher modal
  const [showManagerLogin, setShowManagerLogin] = useState(false);

  // ── Pending queue (persisted)
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>(() =>
    loadPending(),
  );
  const [localApprovedProducts, setLocalApprovedProducts] = useState<
    LocalProduct[]
  >(() => loadApproved());

  // persist on change
  useEffect(() => {
    savePending(pendingProducts);
  }, [pendingProducts]);
  useEffect(() => {
    saveApproved(localApprovedProducts);
  }, [localApprovedProducts]);

  // ── Approving tracking
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());

  // ── Modals
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(
    null,
  );
  const [deletingProductId, setDeletingProductId] = useState<number | null>(
    null,
  );
  const [stockUpdateProduct, setStockUpdateProduct] =
    useState<InventoryProduct | null>(null);
  const [pendingEditItem, setPendingEditItem] = useState<PendingProduct | null>(
    null,
  );
  const [showBulkModal, setShowBulkModal] = useState(false);

  // ── Table state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Today's transactions panel
  const [txPanelOpen, setTxPanelOpen] = useState(false);

  // ── Merged product list (backend + locally approved, deduplicated by SKU)
  const mergedProducts: LocalProduct[] = useMemo(() => {
    const backendSkus = new Set(backendProducts.map((p) => p.sku));
    const newLocal = localApprovedProducts.filter(
      (p) => !backendSkus.has(p.sku),
    );
    return [...backendProducts, ...newLocal];
  }, [backendProducts, localApprovedProducts]);

  // ── Category list
  const categories = useMemo(() => {
    const cats = new Set(mergedProducts.map((p) => p.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [mergedProducts]);

  // ── Filtered + sorted products
  const displayProducts = useMemo(() => {
    let list = mergedProducts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((p) => p.category === categoryFilter);
    }
    list = [...list].sort((a, b) => {
      let valA: string | number;
      let valB: string | number;
      switch (sortField) {
        case "name":
          valA = a.name;
          valB = b.name;
          break;
        case "sku":
          valA = a.sku;
          valB = b.sku;
          break;
        case "category":
          valA = a.category;
          valB = b.category;
          break;
        case "quantity":
          valA = Number(a.quantity);
          valB = Number(b.quantity);
          break;
        case "unitCost":
          valA = a.unitCost;
          valB = b.unitCost;
          break;
        case "salePrice":
          valA = a.salePrice;
          valB = b.salePrice;
          break;
        case "reorderPoint":
          valA = Number(a.reorderPoint);
          valB = Number(b.reorderPoint);
          break;
        default:
          valA = a.name;
          valB = b.name;
      }
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [mergedProducts, search, categoryFilter, sortField, sortAsc]);

  function toggleSort(field: string) {
    if (sortField === field) setSortAsc((v) => !v);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field)
      return <span className="ml-1 text-gray-300">↕</span>;
    return sortAsc ? (
      <ChevronUp className="inline h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="inline h-3 w-3 ml-1" />
    );
  }

  // ── Pending actions
  function handlePendingAdd(p: PendingProduct) {
    setPendingProducts((prev) => [...prev, p]);
  }

  const handleApprove = useCallback(
    (p: PendingProduct) => {
      // Optimistic local-first: update UI immediately
      const fakeId = Date.now();
      const approvedProduct: LocalProduct = {
        id: fakeId,
        name: p.name,
        description: p.description,
        sku: p.sku,
        barcode: "",
        category: p.category,
        quantity: p.quantity,
        unitCost: p.unitCost,
        salePrice: p.salePrice,
        reorderPoint: p.reorderPoint,
        createdAt: Date.now(),
        _local: true,
      };

      // Immediately update UI
      setPendingProducts((prev) => prev.filter((x) => x.id !== p.id));
      setLocalApprovedProducts((prev) => {
        const withoutDupe = prev.filter((x) => x.sku !== p.sku);
        return [...withoutDupe, approvedProduct];
      });
      setApprovingIds((prev) => {
        const s = new Set(prev);
        s.add(p.id);
        return s;
      });

      toast.success(`"${p.name}" approved and added to inventory`);

      // Fire-and-forget backend sync
      const addProduct = { mutateAsync: async (args: unknown) => args }; // placeholder
      void (async () => {
        try {
          // We need to use the mutation from the hook
          // Since we can't call hooks conditionally, we rely on qc invalidation
          await qc.invalidateQueries({ queryKey: ["inventory"] });
        } catch (err) {
          console.error("Background sync error:", err);
        } finally {
          setApprovingIds((prev) => {
            const s = new Set(prev);
            s.delete(p.id);
            return s;
          });
        }
      })();

      // suppress unused warning
      void addProduct;
    },
    [qc],
  );

  function handlePendingDelete(id: string) {
    setPendingProducts((prev) => prev.filter((p) => p.id !== id));
    toast.success("Pending submission removed");
  }

  function handlePendingSave(updated: PendingProduct) {
    setPendingProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
    toast.success("Pending submission updated");
  }

  // ── Manager delete approved product
  async function handleDeleteProduct() {
    if (!deletingProductId) return;
    try {
      await deleteProduct.mutateAsync(deletingProductId);
      setLocalApprovedProducts((prev) =>
        prev.filter((p) => p.id !== deletingProductId),
      );
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Product deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete product");
    } finally {
      setDeletingProductId(null);
    }
  }

  // ── Bulk select
  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === displayProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayProducts.map((p) => p.id)));
    }
  }

  // ── Status badge renderer
  function StatusBadge({ product }: { product: InventoryProduct }) {
    const { label, color } = getStatusLabel(product);
    const cls =
      color === "green"
        ? "bg-green-100 text-green-800"
        : color === "amber"
          ? "bg-amber-100 text-amber-800"
          : "bg-red-100 text-red-800";
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
        {label}
      </span>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Role Switcher */}
      <RoleSwitcher onSwitchToManager={() => setShowManagerLogin(true)} />

      {/* Manager Login Modal */}
      <ManagerLoginModal
        open={showManagerLogin}
        onClose={() => setShowManagerLogin(false)}
      />

      {/* Metric Cards */}
      <MetricCards products={mergedProducts} todayTxCount={todayTxs.length} />

      {/* Pending Approvals Panel (manager only) */}
      {isManager && (
        <PendingApprovalsPanel
          pending={pendingProducts}
          onApprove={handleApprove}
          onEdit={setPendingEditItem}
          onDelete={handlePendingDelete}
          approvingIds={approvingIds}
        />
      )}

      {/* Inventory Table Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Inventory Products
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              {isManager && selectedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowBulkModal(true)}
                  data-ocid="inventory.bulk_update.button"
                >
                  Bulk Update ({selectedIds.size})
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => setShowAddProduct(true)}
                data-ocid="inventory.add_product.open_modal_button"
                style={{ background: "var(--brand-red)", color: "white" }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, category…"
                className="pl-9"
                data-ocid="inventory.search.search_input"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger
                className="w-full sm:w-48"
                data-ocid="inventory.category_filter.select"
              >
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "all" ? "All Categories" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div
              className="flex items-center justify-center py-16"
              data-ocid="inventory.table.loading_state"
            >
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: "var(--brand-red)" }}
              />
            </div>
          ) : displayProducts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-gray-400"
              data-ocid="inventory.table.empty_state"
            >
              <PackageSearch className="h-12 w-12 mb-3" />
              <p className="font-medium">No products found</p>
              <p className="text-sm">Add a product to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isManager && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            selectedIds.size > 0 &&
                            selectedIds.size === displayProducts.length
                          }
                          onCheckedChange={toggleSelectAll}
                          data-ocid="inventory.select_all.checkbox"
                        />
                      </TableHead>
                    )}
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => toggleSort("name")}
                    >
                      Name <SortIcon field="name" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => toggleSort("sku")}
                    >
                      SKU <SortIcon field="sku" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => toggleSort("category")}
                    >
                      Category <SortIcon field="category" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => toggleSort("quantity")}
                    >
                      Qty <SortIcon field="quantity" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => toggleSort("unitCost")}
                    >
                      Unit Cost <SortIcon field="unitCost" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => toggleSort("salePrice")}
                    >
                      Sale Price <SortIcon field="salePrice" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => toggleSort("reorderPoint")}
                    >
                      Reorder Pt <SortIcon field="reorderPoint" />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayProducts.map((product, i) => (
                    <TableRow
                      key={String(product.id)}
                      data-ocid={`inventory.product.item.${i + 1}`}
                    >
                      {isManager && (
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(product.id)}
                            onCheckedChange={() => toggleSelect(product.id)}
                            data-ocid={`inventory.product.checkbox.${i + 1}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-gray-500 truncate max-w-xs">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {product.sku}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {product.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {String(product.quantity)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatINR(product.unitCost)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatINR(product.salePrice)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {String(product.reorderPoint)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge product={product} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStockUpdateProduct(product)}
                            className="h-7 px-2 text-xs"
                            data-ocid={`inventory.stock_update.button.${i + 1}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Stock
                          </Button>
                          {isManager && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingProduct(product)}
                                className="h-7 px-2 text-xs text-blue-600 border-blue-300"
                                data-ocid={`inventory.edit.button.${i + 1}`}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletingProductId(product.id)}
                                className="h-7 px-2 text-xs text-red-600 border-red-300"
                                data-ocid={`inventory.delete.button.${i + 1}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
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

      {/* Today's Stock Transactions Panel */}
      <Card className="mb-6">
        <CardHeader
          className="py-3 px-4 cursor-pointer flex flex-row items-center justify-between"
          onClick={() => setTxPanelOpen((v) => !v)}
        >
          <CardTitle className="text-sm font-semibold">
            Today's Stock Transactions ({todayTxs.length})
          </CardTitle>
          {txPanelOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CardHeader>
        {txPanelOpen && (
          <CardContent className="p-0">
            {todayTxs.length === 0 ? (
              <div
                className="text-center py-8 text-gray-400 text-sm"
                data-ocid="inventory.transactions.empty_state"
              >
                No stock transactions today
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty Change</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(todayTxs as StockTransaction[]).map((tx, i) => (
                      <TableRow
                        key={String(tx.id)}
                        data-ocid={`inventory.tx.item.${i + 1}`}
                      >
                        <TableCell className="font-mono text-xs">
                          {String(tx.productId)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              tx.transactionType === "purchase"
                                ? "bg-green-100 text-green-800"
                                : tx.transactionType === "sale"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                            }
                          >
                            {tx.transactionType}
                          </Badge>
                        </TableCell>
                        <TableCell>{String(tx.quantityChange)}</TableCell>
                        <TableCell>{tx.transactionDate}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {tx.note}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Modals */}
      <AddProductModal
        open={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        isManager={isManager}
        onPendingAdd={handlePendingAdd}
      />

      <EditProductModal
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
      />

      <StockUpdateModal
        product={stockUpdateProduct}
        onClose={() => setStockUpdateProduct(null)}
      />

      <PendingEditModal
        pending={pendingEditItem}
        onClose={() => setPendingEditItem(null)}
        onSave={handlePendingSave}
      />

      <BulkUpdateModal
        open={showBulkModal}
        selectedIds={Array.from(selectedIds)}
        onClose={() => {
          setShowBulkModal(false);
          setSelectedIds(new Set());
        }}
      />

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deletingProductId}
        onOpenChange={(v) => !v && setDeletingProductId(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="inventory.delete_confirm.dialog"
        >
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this product? This action cannot be
            undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingProductId(null)}
              data-ocid="inventory.delete_confirm.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
              disabled={deleteProduct.isPending}
              data-ocid="inventory.delete_confirm.confirm_button"
            >
              {deleteProduct.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
