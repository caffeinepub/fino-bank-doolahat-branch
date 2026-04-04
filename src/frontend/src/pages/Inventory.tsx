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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BoxIcon,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Layers,
  Loader2,
  Pencil,
  PlusCircle,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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

// ── Types ────────────────────────────────────────────────────────────────────

type UserRole = "manager" | "staff";
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

// ── Main Component ───────────────────────────────────────────────────────────

const emptyProductForm = {
  name: "",
  description: "",
  sku: "",
  barcode: "",
  category: "",
  quantity: "",
  unitCost: "",
  salePrice: "",
  reorderPoint: "",
};

const emptyStockForm = {
  txType: "purchase",
  quantity: "",
  adjustSign: "+" as "+" | "-",
  note: "",
  date: todayISO(),
};

export default function Inventory() {
  const today = todayISO();
  const [userRole, setUserRole] = useState<UserRole>("manager");

  // Table state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialogs
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<InventoryProduct | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<bigint | null>(null);
  const [stockUpdateProduct, setStockUpdateProduct] =
    useState<InventoryProduct | null>(null);
  const [bulkActionType, setBulkActionType] = useState<
    "prices" | "reorder" | null
  >(null);

  // Forms
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editForm, setEditForm] = useState(emptyProductForm);
  const [stockForm, setStockForm] = useState(emptyStockForm);
  const [bulkUnitCost, setBulkUnitCost] = useState("");
  const [bulkSalePrice, setBulkSalePrice] = useState("");
  const [bulkReorderPoint, setBulkReorderPoint] = useState("");

  // Queries & mutations
  const { data: products = [], isLoading: productsLoading } =
    useInventoryProducts();
  const { data: todayTxs = [], isLoading: txLoading } =
    useTodayStockTransactions(today);
  const addProduct = useAddProduct();
  const editProductMut = useEditProduct();
  const deleteProductMut = useDeleteProduct();
  const addStockTx = useAddStockTransaction();
  const bulkUpdate = useBulkUpdateProducts();

  // ── Derived metrics ────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.quantity) * p.unitCost,
      0,
    );
    const lowStock = products.filter(
      (p) =>
        Number(p.quantity) > 0 && Number(p.quantity) <= Number(p.reorderPoint),
    ).length;
    const outOfStock = products.filter((p) => Number(p.quantity) === 0).length;
    const currentYearMonth = today.slice(0, 7);
    // Use today's transactions for monthly orders (proxy — real total would need all)
    const monthlyOrders = todayTxs.length;
    void monthlyOrders;
    return { totalValue, lowStock, outOfStock, currentYearMonth };
  }, [products, today, todayTxs]);

  // ── Unique categories ──────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  // ── Filtered + sorted table ────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q),
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
  }, [products, search, categoryFilter, sortField, sortDir]);

  // ── Sort helpers ───────────────────────────────────────────────────────────
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

  // ── Selection helpers ──────────────────────────────────────────────────────
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

  // ── Add product submit ────────────────────────────────────────────────────
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.sku.trim()) {
      toast.error("Product Name and SKU are required.");
      return;
    }
    try {
      await addProduct.mutateAsync({
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        sku: productForm.sku.trim(),
        barcode: productForm.barcode.trim(),
        category: productForm.category.trim(),
        quantity: BigInt(
          Math.max(0, Number.parseInt(productForm.quantity) || 0),
        ),
        unitCost: Number.parseFloat(productForm.unitCost) || 0,
        salePrice: Number.parseFloat(productForm.salePrice) || 0,
        reorderPoint: BigInt(
          Math.max(0, Number.parseInt(productForm.reorderPoint) || 0),
        ),
      });
      toast.success("Product added successfully");
      setProductForm(emptyProductForm);
      setAddProductOpen(false);
    } catch {
      toast.error("Failed to add product.");
    }
  };

  // ── Edit product submit ───────────────────────────────────────────────────
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProduct) return;
    if (!editForm.name.trim() || !editForm.sku.trim()) {
      toast.error("Product Name and SKU are required.");
      return;
    }
    try {
      await editProductMut.mutateAsync({
        id: editProduct.id,
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        sku: editForm.sku.trim(),
        barcode: editForm.barcode.trim(),
        category: editForm.category.trim(),
        unitCost: Number.parseFloat(editForm.unitCost) || 0,
        salePrice: Number.parseFloat(editForm.salePrice) || 0,
        reorderPoint: BigInt(
          Math.max(0, Number.parseInt(editForm.reorderPoint) || 0),
        ),
      });
      toast.success("Product updated");
      setEditProduct(null);
    } catch {
      toast.error("Failed to update product.");
    }
  };

  // ── Delete product submit ─────────────────────────────────────────────────
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

  // ── Stock update submit ───────────────────────────────────────────────────
  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockUpdateProduct) return;
    const qty = Number.parseInt(stockForm.quantity);
    if (!qty || qty <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    let change: bigint;
    if (stockForm.txType === "purchase") {
      change = BigInt(qty);
    } else if (stockForm.txType === "sale") {
      change = -BigInt(qty);
    } else {
      change = stockForm.adjustSign === "+" ? BigInt(qty) : -BigInt(qty);
    }
    try {
      await addStockTx.mutateAsync({
        productId: stockUpdateProduct.id,
        txType: stockForm.txType,
        quantityChange: change,
        note: stockForm.note.trim(),
        transactionDate: stockForm.date,
      });
      toast.success("Stock updated");
      setStockUpdateProduct(null);
      setStockForm(emptyStockForm);
    } catch {
      toast.error("Failed to update stock.");
    }
  };

  // ── Bulk update submit ────────────────────────────────────────────────────
  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = Array.from(selectedIds).map((id) => BigInt(id));
    const count = ids.length;
    try {
      if (bulkActionType === "prices") {
        const uc = Number.parseFloat(bulkUnitCost);
        const sp = Number.parseFloat(bulkSalePrice);
        if (Number.isNaN(uc) || Number.isNaN(sp)) {
          toast.error("Enter valid price values.");
          return;
        }
        await bulkUpdate.mutateAsync({
          ids,
          unitCosts: Array(count).fill(uc),
          salePrices: Array(count).fill(sp),
          reorderPoints: ids.map((id) => {
            const p = products.find((pr) => pr.id === id);
            return p ? p.reorderPoint : 0n;
          }),
        });
        setBulkUnitCost("");
        setBulkSalePrice("");
      } else {
        const rp = Number.parseInt(bulkReorderPoint);
        if (Number.isNaN(rp) || rp < 0) {
          toast.error("Enter a valid reorder point.");
          return;
        }
        await bulkUpdate.mutateAsync({
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
        setBulkReorderPoint("");
      }
      toast.success(`Updated ${count} product${count > 1 ? "s" : ""}.`);
      setBulkActionType(null);
      setSelectedIds(new Set());
    } catch {
      toast.error("Bulk update failed.");
    }
  };

  // ── Open edit dialog ──────────────────────────────────────────────────────
  const openEdit = (product: InventoryProduct) => {
    setEditProduct(product);
    setEditForm({
      name: product.name,
      description: product.description,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category,
      quantity: String(Number(product.quantity)),
      unitCost: String(product.unitCost),
      salePrice: String(product.salePrice),
      reorderPoint: String(Number(product.reorderPoint)),
    });
  };

  const openStockUpdate = (product: InventoryProduct) => {
    setStockUpdateProduct(product);
    setStockForm({ ...emptyStockForm, date: today });
  };

  // ── Today's tx product name lookup ────────────────────────────────────────
  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) {
      m.set(String(p.id), p.name);
    }
    return m;
  }, [products]);

  const formatTime = (createdAt: bigint) => {
    // createdAt is nanoseconds from IC
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

  // ── Loading skeleton ──────────────────────────────────────────────────────
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

  const isManager = userRole === "manager";
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
              Manage product stock, prices and reorder levels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Role Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              View as:
            </span>
            <Select
              value={userRole}
              onValueChange={(v) => setUserRole(v as UserRole)}
            >
              <SelectTrigger
                className="h-8 text-xs w-32"
                data-ocid="inventory.role.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff (View Only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isManager && (
            <Button
              className="gap-2 text-white text-sm"
              style={{ backgroundColor: "var(--brand-red)" }}
              onClick={() => {
                setProductForm(emptyProductForm);
                setAddProductOpen(true);
              }}
              data-ocid="inventory.add_product.open_modal_button"
            >
              <PlusCircle className="w-4 h-4" />
              Add Product
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
          color="var(--brand-red)"
          subtitle={`${products.length} products`}
          delay={0}
        />
        <MetricCard
          title="Low Stock Items"
          value={String(metrics.lowStock)}
          icon={AlertCircle}
          color="oklch(0.72 0.18 72)"
          subtitle="Below reorder point"
          delay={0.05}
        />
        <MetricCard
          title="Out of Stock"
          value={String(metrics.outOfStock)}
          icon={BoxIcon}
          color="oklch(0.44 0.19 21)"
          subtitle="Critical — zero units"
          delay={0.1}
        />
        <MetricCard
          title="Today's Transactions"
          value={String(todayTxs.length)}
          icon={ShoppingCart}
          color="oklch(0.52 0.16 250)"
          subtitle={"As of today"}
          delay={0.15}
        />
      </div>

      {/* Table Controls */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Search by name or SKU…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-ocid="inventory.search.search_input"
                />
              </div>

              {/* Category filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger
                  className="h-9 text-sm w-44"
                  data-ocid="inventory.category.select"
                >
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Bulk action toolbar */}
              {isManager && selectedIds.size >= 2 && (
                <div
                  className="flex gap-2 items-center ml-auto"
                  data-ocid="inventory.bulk_actions.panel"
                >
                  <span className="text-xs text-muted-foreground">
                    {selectedIds.size} selected:
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => setBulkActionType("prices")}
                    data-ocid="inventory.bulk_prices.button"
                  >
                    <TrendingUp className="w-3 h-3" /> Update Prices
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => setBulkActionType("reorder")}
                    data-ocid="inventory.bulk_reorder.button"
                  >
                    <RefreshCw className="w-3 h-3" /> Update Reorder Level
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
        <Card className="shadow-sm border-border">
          <CardContent className="p-0">
            {products.length === 0 ? (
              <div
                className="py-20 text-center text-muted-foreground"
                data-ocid="inventory.empty_state"
              >
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-25" />
                <p className="font-semibold text-base">No products yet</p>
                <p className="text-sm mt-1 mb-4">
                  Start building your inventory by adding your first product.
                </p>
                {isManager && (
                  <Button
                    className="text-white gap-2"
                    style={{ backgroundColor: "var(--brand-red)" }}
                    onClick={() => {
                      setProductForm(emptyProductForm);
                      setAddProductOpen(true);
                    }}
                    data-ocid="inventory.empty.add_product.primary_button"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Your First Product
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50">
                      {isManager && (
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allFilteredSelected}
                            onCheckedChange={toggleSelectAll}
                            data-ocid="inventory.select_all.checkbox"
                          />
                        </TableHead>
                      )}
                      <TableHead>
                        <button
                          type="button"
                          className="flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleSort("name")}
                          data-ocid="inventory.sort_name.button"
                        >
                          Product
                          <SortIcon field="name" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleSort("sku")}
                          data-ocid="inventory.sort_sku.button"
                        >
                          SKU / Barcode
                          <SortIcon field="sku" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleSort("category")}
                          data-ocid="inventory.sort_category.button"
                        >
                          Category
                          <SortIcon field="category" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleSort("quantity")}
                          data-ocid="inventory.sort_qty.button"
                        >
                          Qty
                          <SortIcon field="quantity" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleSort("unitCost")}
                          data-ocid="inventory.sort_cost.button"
                        >
                          Cost / Price
                          <SortIcon field="unitCost" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleSort("reorderPoint")}
                          data-ocid="inventory.sort_reorder.button"
                        >
                          Reorder At
                          <SortIcon field="reorderPoint" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => handleSort("status")}
                          data-ocid="inventory.sort_status.button"
                        >
                          Status
                          <SortIcon field="status" />
                        </button>
                      </TableHead>
                      {isManager && (
                        <TableHead className="text-xs font-semibold text-muted-foreground">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isManager ? 9 : 8}
                          className="text-center py-10 text-muted-foreground text-sm"
                          data-ocid="inventory.search.empty_state"
                        >
                          No products match your search or filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product, idx) => {
                        const qty = Number(product.quantity);
                        const reorder = Number(product.reorderPoint);
                        const status = getStatus(qty, reorder);
                        const isSelected = selectedIds.has(String(product.id));
                        const qtyColor =
                          status === "out-of-stock"
                            ? "text-red-600 font-bold"
                            : status === "low"
                              ? "text-amber-600 font-semibold"
                              : "text-green-700 font-semibold";

                        return (
                          <TableRow
                            key={String(product.id)}
                            className={`hover:bg-secondary/30 transition-colors ${
                              isSelected ? "bg-accent/40" : ""
                            }`}
                            data-ocid={`inventory.item.${idx + 1}`}
                          >
                            {isManager && (
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleSelect(String(product.id))
                                  }
                                  data-ocid={`inventory.checkbox.${idx + 1}`}
                                />
                              </TableCell>
                            )}
                            <TableCell className="max-w-[180px]">
                              <div className="font-semibold text-sm truncate">
                                {product.name}
                              </div>
                              {product.description && (
                                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {product.description}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-mono text-xs font-medium">
                                {product.sku}
                              </div>
                              {product.barcode && (
                                <div className="font-mono text-xs text-muted-foreground mt-0.5">
                                  {product.barcode}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {product.category ? (
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-normal"
                                >
                                  {product.category}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={`text-sm ${qtyColor}`}>
                                {qty.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs font-medium">
                                {formatINR(product.unitCost)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {formatINR(product.salePrice)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {reorder.toLocaleString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <StatusBadgeInv qty={qty} reorder={reorder} />
                            </TableCell>
                            {isManager && (
                              <TableCell>
                                <div className="flex gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 gap-1 text-xs"
                                    title="Update Stock"
                                    onClick={() => openStockUpdate(product)}
                                    data-ocid={`inventory.stock_update.button.${idx + 1}`}
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                    Stock
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 gap-1 text-xs"
                                    title="Edit"
                                    onClick={() => openEdit(product)}
                                    data-ocid={`inventory.edit_button.${idx + 1}`}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                    title="Delete"
                                    onClick={() =>
                                      setDeleteProductId(product.id)
                                    }
                                    data-ocid={`inventory.delete_button.${idx + 1}`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's Transactions Panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ShoppingCart
                className="w-4 h-4"
                style={{ color: "var(--brand-red)" }}
              />
              Today&apos;s Stock Transactions
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {today}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : todayTxs.length === 0 ? (
              <div
                className="py-10 text-center text-muted-foreground text-sm"
                data-ocid="inventory.today_txs.empty_state"
              >
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="font-medium">No stock movements today</p>
                <p className="text-xs mt-1">
                  Use &quot;Update Stock&quot; on a product row to record a
                  transaction.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                        Time
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                        Product
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                        Type
                      </th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                        Qty Change
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                        Note
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(todayTxs as StockTransaction[]).map((tx, idx) => {
                      const qtyChange = Number(tx.quantityChange);
                      const isPositive = qtyChange >= 0;
                      return (
                        <tr
                          key={String(tx.id)}
                          className="border-b border-border last:border-0 hover:bg-secondary/30"
                          data-ocid={`inventory.today_tx.item.${idx + 1}`}
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {formatTime(tx.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-medium text-sm">
                            {productMap.get(String(tx.productId)) ||
                              `#${String(tx.productId)}`}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${txTypeColor(
                                tx.transactionType,
                              )}`}
                            >
                              {tx.transactionType.charAt(0).toUpperCase() +
                                tx.transactionType.slice(1)}
                            </span>
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold text-sm ${
                              isPositive ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {qtyChange.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {tx.note || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Add Product Dialog ─────────────────────────────────────────────── */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="inventory.add_product.dialog"
        >
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddProduct} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="ap-name">Product Name *</Label>
                <Input
                  id="ap-name"
                  className="mt-1"
                  placeholder="e.g. HP LaserJet Toner"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, name: e.target.value }))
                  }
                  data-ocid="inventory.add_product.name.input"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="ap-desc">Description</Label>
                <Input
                  id="ap-desc"
                  className="mt-1"
                  placeholder="Brief product description"
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  data-ocid="inventory.add_product.description.input"
                />
              </div>
              <div>
                <Label htmlFor="ap-sku">SKU *</Label>
                <Input
                  id="ap-sku"
                  className="mt-1 font-mono"
                  placeholder="e.g. SKU-0001"
                  value={productForm.sku}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  data-ocid="inventory.add_product.sku.input"
                />
              </div>
              <div>
                <Label htmlFor="ap-barcode">Barcode</Label>
                <Input
                  id="ap-barcode"
                  className="mt-1 font-mono"
                  placeholder="e.g. 8901234567890"
                  value={productForm.barcode}
                  onChange={(e) =>
                    setProductForm((f) => ({ ...f, barcode: e.target.value }))
                  }
                  data-ocid="inventory.add_product.barcode.input"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="ap-cat">Category</Label>
                <Input
                  id="ap-cat"
                  className="mt-1"
                  placeholder="e.g. Electronics, Stationery…"
                  value={productForm.category}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      category: e.target.value,
                    }))
                  }
                  list="categories-list"
                  data-ocid="inventory.add_product.category.input"
                />
                <datalist id="categories-list">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="ap-qty">Initial Quantity</Label>
                <Input
                  id="ap-qty"
                  type="number"
                  min="0"
                  className="mt-1"
                  placeholder="0"
                  value={productForm.quantity}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      quantity: e.target.value,
                    }))
                  }
                  data-ocid="inventory.add_product.quantity.input"
                />
              </div>
              <div>
                <Label htmlFor="ap-reorder">Reorder Point</Label>
                <Input
                  id="ap-reorder"
                  type="number"
                  min="0"
                  className="mt-1"
                  placeholder="0"
                  value={productForm.reorderPoint}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      reorderPoint: e.target.value,
                    }))
                  }
                  data-ocid="inventory.add_product.reorder.input"
                />
              </div>
              <div>
                <Label htmlFor="ap-cost">Unit Cost (₹)</Label>
                <Input
                  id="ap-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  placeholder="0.00"
                  value={productForm.unitCost}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      unitCost: e.target.value,
                    }))
                  }
                  data-ocid="inventory.add_product.unit_cost.input"
                />
              </div>
              <div>
                <Label htmlFor="ap-sale">Sale Price (₹)</Label>
                <Input
                  id="ap-sale"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  placeholder="0.00"
                  value={productForm.salePrice}
                  onChange={(e) =>
                    setProductForm((f) => ({
                      ...f,
                      salePrice: e.target.value,
                    }))
                  }
                  data-ocid="inventory.add_product.sale_price.input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddProductOpen(false)}
                data-ocid="inventory.add_product.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: "var(--brand-red)" }}
                disabled={addProduct.isPending}
                data-ocid="inventory.add_product.submit_button"
              >
                {addProduct.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Add Product
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Product Dialog ────────────────────────────────────────────── */}
      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
      >
        <DialogContent
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          data-ocid="inventory.edit_product.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditProduct} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="ep-name">Product Name *</Label>
                <Input
                  id="ep-name"
                  className="mt-1"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                  data-ocid="inventory.edit_product.name.input"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="ep-desc">Description</Label>
                <Input
                  id="ep-desc"
                  className="mt-1"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      description: e.target.value,
                    }))
                  }
                  data-ocid="inventory.edit_product.description.input"
                />
              </div>
              <div>
                <Label htmlFor="ep-sku">SKU *</Label>
                <Input
                  id="ep-sku"
                  className="mt-1 font-mono"
                  value={editForm.sku}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, sku: e.target.value }))
                  }
                  data-ocid="inventory.edit_product.sku.input"
                />
              </div>
              <div>
                <Label htmlFor="ep-barcode">Barcode</Label>
                <Input
                  id="ep-barcode"
                  className="mt-1 font-mono"
                  value={editForm.barcode}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, barcode: e.target.value }))
                  }
                  data-ocid="inventory.edit_product.barcode.input"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="ep-cat">Category</Label>
                <Input
                  id="ep-cat"
                  className="mt-1"
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      category: e.target.value,
                    }))
                  }
                  list="categories-list-edit"
                  data-ocid="inventory.edit_product.category.input"
                />
                <datalist id="categories-list-edit">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <Label htmlFor="ep-reorder">Reorder Point</Label>
                <Input
                  id="ep-reorder"
                  type="number"
                  min="0"
                  className="mt-1"
                  value={editForm.reorderPoint}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      reorderPoint: e.target.value,
                    }))
                  }
                  data-ocid="inventory.edit_product.reorder.input"
                />
              </div>
              <div />
              <div>
                <Label htmlFor="ep-cost">Unit Cost (₹)</Label>
                <Input
                  id="ep-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  value={editForm.unitCost}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      unitCost: e.target.value,
                    }))
                  }
                  data-ocid="inventory.edit_product.unit_cost.input"
                />
              </div>
              <div>
                <Label htmlFor="ep-sale">Sale Price (₹)</Label>
                <Input
                  id="ep-sale"
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  value={editForm.salePrice}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      salePrice: e.target.value,
                    }))
                  }
                  data-ocid="inventory.edit_product.sale_price.input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditProduct(null)}
                data-ocid="inventory.edit_product.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: "var(--brand-red)" }}
                disabled={editProductMut.isPending}
                data-ocid="inventory.edit_product.save_button"
              >
                {editProductMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Stock Update Modal ─────────────────────────────────────────────── */}
      <Dialog
        open={!!stockUpdateProduct}
        onOpenChange={(open) => !open && setStockUpdateProduct(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="inventory.stock_update.dialog"
        >
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
          </DialogHeader>
          {stockUpdateProduct && (
            <form onSubmit={handleStockUpdate} className="space-y-4 mt-2">
              <div className="bg-secondary/50 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="text-sm font-semibold">
                  {stockUpdateProduct.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current stock:{" "}
                  <strong>
                    {Number(stockUpdateProduct.quantity).toLocaleString()}
                  </strong>{" "}
                  units
                </p>
              </div>

              <div>
                <Label htmlFor="su-type">Transaction Type</Label>
                <Select
                  value={stockForm.txType}
                  onValueChange={(v) =>
                    setStockForm((f) => ({ ...f, txType: v }))
                  }
                >
                  <SelectTrigger
                    id="su-type"
                    className="mt-1"
                    data-ocid="inventory.stock_update.type.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">
                      Purchase (Add Stock)
                    </SelectItem>
                    <SelectItem value="sale">Sale (Remove Stock)</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 items-end">
                {stockForm.txType === "adjustment" && (
                  <div>
                    <Label>Sign</Label>
                    <div className="flex gap-1 mt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          stockForm.adjustSign === "+" ? "default" : "outline"
                        }
                        style={
                          stockForm.adjustSign === "+"
                            ? {
                                backgroundColor: "var(--brand-red)",
                                color: "white",
                              }
                            : {}
                        }
                        className="w-9 h-9 p-0"
                        onClick={() =>
                          setStockForm((f) => ({ ...f, adjustSign: "+" }))
                        }
                        data-ocid="inventory.stock_update.plus.toggle"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          stockForm.adjustSign === "-" ? "default" : "outline"
                        }
                        style={
                          stockForm.adjustSign === "-"
                            ? {
                                backgroundColor: "oklch(0.44 0.19 21)",
                                color: "white",
                              }
                            : {}
                        }
                        className="w-9 h-9 p-0"
                        onClick={() =>
                          setStockForm((f) => ({ ...f, adjustSign: "-" }))
                        }
                        data-ocid="inventory.stock_update.minus.toggle"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <Label htmlFor="su-qty">Quantity</Label>
                  <Input
                    id="su-qty"
                    type="number"
                    min="1"
                    className="mt-1"
                    placeholder="e.g. 50"
                    value={stockForm.quantity}
                    onChange={(e) =>
                      setStockForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    data-ocid="inventory.stock_update.quantity.input"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="su-note">Note (optional)</Label>
                <Input
                  id="su-note"
                  className="mt-1"
                  placeholder="e.g. Restocked from supplier"
                  value={stockForm.note}
                  onChange={(e) =>
                    setStockForm((f) => ({ ...f, note: e.target.value }))
                  }
                  data-ocid="inventory.stock_update.note.input"
                />
              </div>

              <div>
                <Label htmlFor="su-date">Date</Label>
                <Input
                  id="su-date"
                  type="date"
                  className="mt-1"
                  value={stockForm.date}
                  onChange={(e) =>
                    setStockForm((f) => ({ ...f, date: e.target.value }))
                  }
                  data-ocid="inventory.stock_update.date.input"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStockUpdateProduct(null)}
                  data-ocid="inventory.stock_update.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="text-white"
                  style={{ backgroundColor: "var(--brand-red)" }}
                  disabled={addStockTx.isPending}
                  data-ocid="inventory.stock_update.submit_button"
                >
                  {addStockTx.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Update Stock
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Update Prices Dialog ─────────────────────────────────────── */}
      <Dialog
        open={bulkActionType === "prices"}
        onOpenChange={(open) => !open && setBulkActionType(null)}
      >
        <DialogContent data-ocid="inventory.bulk_prices.dialog">
          <DialogHeader>
            <DialogTitle>
              Update Prices — {selectedIds.size} product
              {selectedIds.size > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkUpdate} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="bp-cost">New Unit Cost (₹)</Label>
              <Input
                id="bp-cost"
                type="number"
                min="0"
                step="0.01"
                className="mt-1"
                placeholder="0.00"
                value={bulkUnitCost}
                onChange={(e) => setBulkUnitCost(e.target.value)}
                data-ocid="inventory.bulk_prices.unit_cost.input"
              />
            </div>
            <div>
              <Label htmlFor="bp-sale">New Sale Price (₹)</Label>
              <Input
                id="bp-sale"
                type="number"
                min="0"
                step="0.01"
                className="mt-1"
                placeholder="0.00"
                value={bulkSalePrice}
                onChange={(e) => setBulkSalePrice(e.target.value)}
                data-ocid="inventory.bulk_prices.sale_price.input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkActionType(null)}
                data-ocid="inventory.bulk_prices.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: "var(--brand-red)" }}
                disabled={bulkUpdate.isPending}
                data-ocid="inventory.bulk_prices.submit_button"
              >
                {bulkUpdate.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Apply to Selected
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Update Reorder Level Dialog ─────────────────────────────── */}
      <Dialog
        open={bulkActionType === "reorder"}
        onOpenChange={(open) => !open && setBulkActionType(null)}
      >
        <DialogContent data-ocid="inventory.bulk_reorder.dialog">
          <DialogHeader>
            <DialogTitle>
              Update Reorder Level — {selectedIds.size} product
              {selectedIds.size > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkUpdate} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="br-rp">New Reorder Point (units)</Label>
              <Input
                id="br-rp"
                type="number"
                min="0"
                className="mt-1"
                placeholder="e.g. 10"
                value={bulkReorderPoint}
                onChange={(e) => setBulkReorderPoint(e.target.value)}
                data-ocid="inventory.bulk_reorder.reorder_point.input"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBulkActionType(null)}
                data-ocid="inventory.bulk_reorder.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white"
                style={{ backgroundColor: "var(--brand-red)" }}
                disabled={bulkUpdate.isPending}
                data-ocid="inventory.bulk_reorder.submit_button"
              >
                {bulkUpdate.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Apply to Selected
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <AlertDialog
        open={deleteProductId !== null}
        onOpenChange={(open) => !open && setDeleteProductId(null)}
      >
        <AlertDialogContent data-ocid="inventory.delete_product.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the product and its stock history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="inventory.delete_product.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="text-white"
              style={{ backgroundColor: "oklch(0.44 0.19 21)" }}
              data-ocid="inventory.delete_product.confirm_button"
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
