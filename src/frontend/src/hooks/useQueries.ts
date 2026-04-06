import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addItem,
  loadItems,
  removeItem,
  saveItems,
  updateItem,
} from "../utils/localStore";

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEYS = {
  paymentHeads: "fino_payment_heads",
  dailyPLs: "fino_daily_pls",
  fixedDeposits: "fino_fixed_deposits",
  transactions: "fino_transactions_approved",
  inventory: "fino_inventory_approved",
  stockTransactions: "fino_stock_transactions",
  complaints: "fino_complaints",
  loans: "fino_loans",
  merchants: "fino_merchants",
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentHead {
  id: number;
  name: string;
  headType: string;
  isDefault: boolean;
}

export interface HeadBalance {
  headId: number;
  headName: string;
  openingBalance: number;
  closingBalance: number;
  profitLoss: number;
}

export interface DailyPL {
  id: number;
  date: string;
  headBalances: HeadBalance[];
  totalProfitLoss: number;
  createdAt: number;
}

export interface FixedDeposit {
  id: number;
  customerName: string;
  accountNumber: string;
  cifNumber: string;
  contactNumber: string;
  openingDate: string;
  fdAmount: number;
  tenure: number;
  interestRate: number;
  interestAmount: number;
  maturityAmount: number;
  closureDate: string;
  maturityDepositDate: string;
  createdAt: number;
}

export interface Transaction {
  id: number;
  referenceId: string;
  transactionType: string;
  accountNumber: string;
  accountHolderName: string;
  bankName: string;
  ifscCode: string;
  amount: number;
  transactionDate: string;
  frequencyType: string;
  remark: string;
  status: string;
  createdAt: number;
}

export interface InventoryProduct {
  id: number;
  name: string;
  description: string;
  sku: string;
  barcode: string;
  category: string;
  quantity: number;
  unitCost: number;
  salePrice: number;
  reorderPoint: number;
  createdAt: number;
}

export interface StockTransaction {
  id: number;
  productId: number;
  transactionType: string;
  quantityChange: number;
  note: string;
  transactionDate: string;
  createdAt: number;
}

export interface Complaint {
  id: number;
  customerName: string;
  complaintNo: string;
  contactNo: string;
  accountNo: string;
  aadharNo: string;
  panNo: string;
  dateOfComplaint: string;
  complaintBrief: string;
  status: string;
  createdAt: number;
}

export interface Loan {
  id: number;
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
  createdAt: number;
}

export interface Merchant {
  id: number;
  merchantId: string;
  name: string;
  mobileNo: string;
  address: string;
  createdAt: number;
}

// ── Default seeds ─────────────────────────────────────────────────────────────

function seedPaymentHeads(): PaymentHead[] {
  const existing = loadItems<PaymentHead>(KEYS.paymentHeads);
  if (existing.length > 0) return existing;
  const defaults: PaymentHead[] = [
    { id: 1, name: "Cash Balance", headType: "Both", isDefault: true },
    { id: 2, name: "Fino(R) Balance", headType: "Both", isDefault: true },
    { id: 3, name: "Fino(S) Balance", headType: "Both", isDefault: true },
    { id: 4, name: "DPL Balance", headType: "Both", isDefault: true },
  ];
  saveItems(KEYS.paymentHeads, defaults);
  return defaults;
}

// ── Payment Heads ─────────────────────────────────────────────────────────────

export function usePaymentHeads() {
  return useQuery<PaymentHead[]>({
    queryKey: ["paymentHeads"],
    queryFn: () => seedPaymentHeads(),
    staleTime: 0,
  });
}

export function useAddPaymentHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      headType,
    }: { name: string; headType: string }) => {
      seedPaymentHeads();
      return addItem<PaymentHead>(KEYS.paymentHeads, {
        name,
        headType,
        isDefault: false,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentHeads"] }),
  });
}

export function useEditPaymentHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      headType,
    }: { id: number; name: string; headType: string }) => {
      updateItem<PaymentHead>(KEYS.paymentHeads, id, { name, headType });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentHeads"] }),
  });
}

export function useDeletePaymentHead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const items = loadItems<PaymentHead>(KEYS.paymentHeads);
      const head = items.find((h) => h.id === id);
      if (head?.isDefault)
        throw new Error("Cannot delete default payment head");
      removeItem<PaymentHead>(KEYS.paymentHeads, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentHeads"] }),
  });
}

// ── Daily P&L ─────────────────────────────────────────────────────────────────

export function useAllDailyPLs() {
  return useQuery<DailyPL[]>({
    queryKey: ["dailyPLs"],
    queryFn: () => loadItems<DailyPL>(KEYS.dailyPLs),
    staleTime: 0,
  });
}

export function useDailyPLByDateRange(start: string, end: string) {
  return useQuery<DailyPL[]>({
    queryKey: ["dailyPLs", start, end],
    queryFn: () => {
      const all = loadItems<DailyPL>(KEYS.dailyPLs);
      return all.filter((pl) => pl.date >= start && pl.date <= end);
    },
    enabled: !!start && !!end,
    staleTime: 0,
  });
}

export function useSaveDailyPL() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      headBalances,
    }: { date: string; headBalances: HeadBalance[] }) => {
      const totalProfitLoss = headBalances.reduce(
        (s, h) => s + (h.closingBalance - h.openingBalance),
        0,
      );
      const existing = loadItems<DailyPL>(KEYS.dailyPLs);
      const idx = existing.findIndex((pl) => pl.date === date);
      if (idx >= 0) {
        const updated = existing.map((pl, i) =>
          i === idx ? { ...pl, headBalances, totalProfitLoss } : pl,
        );
        saveItems(KEYS.dailyPLs, updated);
        return existing[idx].id;
      }
      const newItem = addItem<DailyPL>(KEYS.dailyPLs, {
        date,
        headBalances,
        totalProfitLoss,
        createdAt: Date.now(),
      });
      return newItem.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dailyPLs"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteDailyPL() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      removeItem<DailyPL>(KEYS.dailyPLs, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dailyPLs"] }),
  });
}

// ── Fixed Deposits ────────────────────────────────────────────────────────────

export function useFixedDeposits() {
  return useQuery<FixedDeposit[]>({
    queryKey: ["fixedDeposits"],
    queryFn: () => loadItems<FixedDeposit>(KEYS.fixedDeposits),
    staleTime: 0,
  });
}

export function useAddFixedDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fd: Omit<FixedDeposit, "id" | "createdAt">) => {
      return addItem<FixedDeposit>(KEYS.fixedDeposits, {
        ...fd,
        createdAt: Date.now(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixedDeposits"] }),
  });
}

export function useDeleteFixedDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      removeItem<FixedDeposit>(KEYS.fixedDeposits, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixedDeposits"] }),
  });
}

// ── Transactions ──────────────────────────────────────────────────────────────

export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: () => loadItems<Transaction>(KEYS.transactions),
    staleTime: 0,
  });
}

export function useAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Omit<Transaction, "id" | "createdAt">) => {
      return addItem<Transaction>(KEYS.transactions, {
        ...tx,
        createdAt: Date.now(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      removeItem<Transaction>(KEYS.transactions, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export function useInventoryProducts() {
  return useQuery<InventoryProduct[]>({
    queryKey: ["inventory"],
    queryFn: () => loadItems<InventoryProduct>(KEYS.inventory),
    staleTime: 0,
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<InventoryProduct, "id" | "createdAt">) => {
      return addItem<InventoryProduct>(KEYS.inventory, {
        ...p,
        createdAt: Date.now(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useEditProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      p: Pick<InventoryProduct, "id"> & Partial<InventoryProduct>,
    ) => {
      updateItem<InventoryProduct>(KEYS.inventory, p.id, p);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      removeItem<InventoryProduct>(KEYS.inventory, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useAllStockTransactions() {
  return useQuery<StockTransaction[]>({
    queryKey: ["stockTransactions"],
    queryFn: () => loadItems<StockTransaction>(KEYS.stockTransactions),
    staleTime: 0,
  });
}

export function useTodayStockTransactions(today: string) {
  return useQuery<StockTransaction[]>({
    queryKey: ["stockTransactions", "today", today],
    queryFn: () =>
      loadItems<StockTransaction>(KEYS.stockTransactions).filter(
        (s) => s.transactionDate === today,
      ),
    enabled: !!today,
    staleTime: 0,
  });
}

export function useStockTransactionsByProduct(productId: number) {
  return useQuery<StockTransaction[]>({
    queryKey: ["stockTransactions", "product", productId],
    queryFn: () =>
      loadItems<StockTransaction>(KEYS.stockTransactions).filter(
        (s) => s.productId === productId,
      ),
    staleTime: 0,
  });
}

export function useAddStockTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Omit<StockTransaction, "id" | "createdAt">) => {
      const products = loadItems<InventoryProduct>(KEYS.inventory);
      const product = products.find((pr) => pr.id === p.productId);
      if (product) {
        const newQty = product.quantity + p.quantityChange;
        if (newQty < 0) throw new Error("Insufficient stock");
        updateItem<InventoryProduct>(KEYS.inventory, p.productId, {
          quantity: newQty,
        });
      }
      return addItem<StockTransaction>(KEYS.stockTransactions, {
        ...p,
        createdAt: Date.now(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stockTransactions"] });
    },
  });
}

export function useBulkUpdateProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      ids: number[];
      unitCosts: number[];
      salePrices: number[];
      reorderPoints: number[];
    }) => {
      p.ids.forEach((id, i) => {
        updateItem<InventoryProduct>(KEYS.inventory, id, {
          unitCost: p.unitCosts[i],
          salePrice: p.salePrices[i],
          reorderPoint: p.reorderPoints[i],
        });
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

// ── Complaints ────────────────────────────────────────────────────────────────

export function useComplaints() {
  return useQuery<Complaint[]>({
    queryKey: ["complaints"],
    queryFn: () => loadItems<Complaint>(KEYS.complaints),
    staleTime: 0,
  });
}

export function useAddComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: Omit<Complaint, "id" | "createdAt">) => {
      return addItem<Complaint>(KEYS.complaints, {
        ...c,
        createdAt: Date.now(),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["complaints"] }),
  });
}

export function useUpdateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Complaint> & { id: number }) => {
      updateItem<Complaint>(KEYS.complaints, id, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["complaints"] }),
  });
}

export function useUpdateComplaintStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      updateItem<Complaint>(KEYS.complaints, id, { status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["complaints"] }),
  });
}

export function useDeleteComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      removeItem<Complaint>(KEYS.complaints, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["complaints"] }),
  });
}

// ── Loans ─────────────────────────────────────────────────────────────────────

export function useLoans() {
  return useQuery<Loan[]>({
    queryKey: ["loans"],
    queryFn: () => loadItems<Loan>(KEYS.loans),
    staleTime: 0,
  });
}

export function useAddLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loan: Omit<Loan, "id" | "createdAt">) => {
      return addItem<Loan>(KEYS.loans, { ...loan, createdAt: Date.now() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loans"] }),
  });
}

export function useDeleteLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      removeItem<Loan>(KEYS.loans, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["loans"] }),
  });
}

// ── Merchants ─────────────────────────────────────────────────────────────────

export function useMerchants() {
  return useQuery<Merchant[]>({
    queryKey: ["merchants"],
    queryFn: () => loadItems<Merchant>(KEYS.merchants),
    staleTime: 0,
  });
}

export function useAddMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Omit<Merchant, "id" | "createdAt">) => {
      return addItem<Merchant>(KEYS.merchants, { ...m, createdAt: Date.now() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchants"] }),
  });
}

export function useUpdateMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Merchant> & { id: number }) => {
      updateItem<Merchant>(KEYS.merchants, id, updates);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchants"] }),
  });
}

export function useDeleteMerchant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      removeItem<Merchant>(KEYS.merchants, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["merchants"] }),
  });
}
