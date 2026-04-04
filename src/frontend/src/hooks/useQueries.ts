import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DailyPL,
  FixedDeposit,
  HeadBalance,
  PaymentHead,
  Transaction,
} from "../backend";
import type { InventoryProduct, StockTransaction } from "../types/inventory";
import { useActor } from "./useActor";

// Extended actor type to cover inventory methods not yet in auto-generated backend.ts
interface InventoryActor {
  getAllProducts(): Promise<InventoryProduct[]>;
  addProduct(
    name: string,
    description: string,
    sku: string,
    barcode: string,
    category: string,
    quantity: bigint,
    unitCost: number,
    salePrice: number,
    reorderPoint: bigint,
  ): Promise<bigint>;
  editProduct(
    id: bigint,
    name: string,
    description: string,
    sku: string,
    barcode: string,
    category: string,
    unitCost: number,
    salePrice: number,
    reorderPoint: bigint,
  ): Promise<void>;
  deleteProduct(id: bigint): Promise<void>;
  getAllStockTransactions(): Promise<StockTransaction[]>;
  getTodayStockTransactions(today: string): Promise<StockTransaction[]>;
  getStockTransactionsByProduct(productId: bigint): Promise<StockTransaction[]>;
  addStockTransaction(
    productId: bigint,
    txType: string,
    quantityChange: bigint,
    note: string,
    transactionDate: string,
  ): Promise<bigint>;
  bulkUpdateProducts(
    ids: bigint[],
    unitCosts: number[],
    salePrices: number[],
    reorderPoints: bigint[],
  ): Promise<void>;
}

export function usePaymentHeads() {
  const { actor, isFetching } = useActor();
  return useQuery<PaymentHead[]>({
    queryKey: ["paymentHeads"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPaymentHeads();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddPaymentHead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      headType,
    }: { name: string; headType: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.addPaymentHead(name, headType);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentHeads"] }),
  });
}

export function useEditPaymentHead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      headType,
    }: { id: bigint; name: string; headType: string }) => {
      if (!actor) throw new Error("No actor");
      return actor.editPaymentHead(id, name, headType);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentHeads"] }),
  });
}

export function useDeletePaymentHead() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deletePaymentHead(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["paymentHeads"] }),
  });
}

export function useAllDailyPLs() {
  const { actor, isFetching } = useActor();
  return useQuery<DailyPL[]>({
    queryKey: ["dailyPLs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllDailyPLs();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useDailyPLByDateRange(start: string, end: string) {
  const { actor, isFetching } = useActor();
  return useQuery<DailyPL[]>({
    queryKey: ["dailyPLs", start, end],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDailyPLByDateRange(start, end);
    },
    enabled: !!actor && !isFetching && !!start && !!end,
  });
}

export function useSaveDailyPL() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      date,
      headBalances,
    }: { date: string; headBalances: HeadBalance[] }) => {
      if (!actor) throw new Error("No actor");
      return actor.saveDailyPL(date, headBalances);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dailyPLs"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteDailyPL() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteDailyPL(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dailyPLs"] });
    },
  });
}

export function useFixedDeposits() {
  const { actor, isFetching } = useActor();
  return useQuery<FixedDeposit[]>({
    queryKey: ["fixedDeposits"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllFixedDeposits();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddFixedDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fd: Omit<FixedDeposit, "id" | "createdAt">) => {
      if (!actor) throw new Error("No actor");
      return actor.addFixedDeposit(
        fd.customerName,
        fd.accountNumber,
        fd.cifNumber,
        fd.contactNumber,
        fd.openingDate,
        fd.fdAmount,
        fd.tenure,
        fd.interestRate,
        fd.interestAmount,
        fd.maturityAmount,
        fd.closureDate,
        fd.maturityDepositDate,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixedDeposits"] }),
  });
}

export function useDeleteFixedDeposit() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteFixedDeposit(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fixedDeposits"] }),
  });
}

export function useTransactions() {
  const { actor, isFetching } = useActor();
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTransactions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddTransaction() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Omit<Transaction, "id" | "createdAt">) => {
      if (!actor) throw new Error("No actor");
      const fullTx: Transaction = {
        ...tx,
        id: 0n,
        createdAt: 0n,
      };
      return actor.addTransaction(fullTx);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

export function useDeleteTransaction() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteTransaction(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });
}

// ── Inventory Hooks ──────────────────────────────────────────────────────────

function asInventoryActor(actor: unknown): InventoryActor {
  return actor as InventoryActor;
}

export function useInventoryProducts() {
  const { actor, isFetching } = useActor();
  return useQuery<InventoryProduct[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      if (!actor) return [];
      return asInventoryActor(actor).getAllProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      name: string;
      description: string;
      sku: string;
      barcode: string;
      category: string;
      quantity: bigint;
      unitCost: number;
      salePrice: number;
      reorderPoint: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return asInventoryActor(actor).addProduct(
        p.name,
        p.description,
        p.sku,
        p.barcode,
        p.category,
        p.quantity,
        p.unitCost,
        p.salePrice,
        p.reorderPoint,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useEditProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: bigint;
      name: string;
      description: string;
      sku: string;
      barcode: string;
      category: string;
      unitCost: number;
      salePrice: number;
      reorderPoint: bigint;
    }) => {
      if (!actor) throw new Error("No actor");
      return asInventoryActor(actor).editProduct(
        p.id,
        p.name,
        p.description,
        p.sku,
        p.barcode,
        p.category,
        p.unitCost,
        p.salePrice,
        p.reorderPoint,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return asInventoryActor(actor).deleteProduct(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}

export function useAllStockTransactions() {
  const { actor, isFetching } = useActor();
  return useQuery<StockTransaction[]>({
    queryKey: ["stockTransactions"],
    queryFn: async () => {
      if (!actor) return [];
      return asInventoryActor(actor).getAllStockTransactions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useTodayStockTransactions(today: string) {
  const { actor, isFetching } = useActor();
  return useQuery<StockTransaction[]>({
    queryKey: ["stockTransactions", "today", today],
    queryFn: async () => {
      if (!actor) return [];
      return asInventoryActor(actor).getTodayStockTransactions(today);
    },
    enabled: !!actor && !isFetching && !!today,
  });
}

export function useStockTransactionsByProduct(productId: bigint) {
  const { actor, isFetching } = useActor();
  return useQuery<StockTransaction[]>({
    queryKey: ["stockTransactions", "product", String(productId)],
    queryFn: async () => {
      if (!actor) return [];
      return asInventoryActor(actor).getStockTransactionsByProduct(productId);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddStockTransaction() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      productId: bigint;
      txType: string;
      quantityChange: bigint;
      note: string;
      transactionDate: string;
    }) => {
      if (!actor) throw new Error("No actor");
      return asInventoryActor(actor).addStockTransaction(
        p.productId,
        p.txType,
        p.quantityChange,
        p.note,
        p.transactionDate,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["stockTransactions"] });
    },
  });
}

export function useBulkUpdateProducts() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      ids: bigint[];
      unitCosts: number[];
      salePrices: number[];
      reorderPoints: bigint[];
    }) => {
      if (!actor) throw new Error("No actor");
      return asInventoryActor(actor).bulkUpdateProducts(
        p.ids,
        p.unitCosts,
        p.salePrices,
        p.reorderPoints,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventory"] }),
  });
}
