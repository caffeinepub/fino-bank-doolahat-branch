import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DailyPL,
  FixedDeposit,
  HeadBalance,
  PaymentHead,
  Transaction,
} from "../backend";
import { useActor } from "./useActor";

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
