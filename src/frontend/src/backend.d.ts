import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Transaction {
    id: bigint;
    remark: string;
    status: string;
    transactionDate: string;
    frequencyType: string;
    transactionType: string;
    ifscCode: string;
    createdAt: bigint;
    accountHolderName: string;
    referenceId: string;
    bankName: string;
    accountNumber: string;
    amount: number;
}
export interface FixedDeposit {
    id: bigint;
    customerName: string;
    closureDate: string;
    fdAmount: number;
    maturityDepositDate: string;
    createdAt: bigint;
    openingDate: string;
    cifNumber: string;
    interestRate: number;
    contactNumber: string;
    accountNumber: string;
    maturityAmount: number;
    tenure: bigint;
    interestAmount: number;
}
export interface DailyPL {
    id: bigint;
    totalProfitLoss: number;
    date: string;
    createdAt: bigint;
    headBalances: Array<HeadBalance>;
}
export interface HeadBalance {
    headName: string;
    profitLoss: number;
    closingBalance: number;
    openingBalance: number;
    headId: bigint;
}
export interface PaymentHead {
    id: bigint;
    headType: string;
    name: string;
    isDefault: boolean;
}
export interface backendInterface {
    addFixedDeposit(customerName: string, accountNumber: string, cifNumber: string, contactNumber: string, openingDate: string, fdAmount: number, tenure: bigint, interestRate: number, interestAmount: number, maturityAmount: number, closureDate: string, maturityDepositDate: string): Promise<bigint>;
    addPaymentHead(name: string, headType: string): Promise<bigint>;
    addTransaction(tx: Transaction): Promise<bigint>;
    deleteDailyPL(id: bigint): Promise<void>;
    deleteFixedDeposit(id: bigint): Promise<void>;
    deletePaymentHead(id: bigint): Promise<void>;
    deleteTransaction(id: bigint): Promise<void>;
    editPaymentHead(id: bigint, name: string, headType: string): Promise<void>;
    getAllDailyPLs(): Promise<Array<DailyPL>>;
    getAllFixedDeposits(): Promise<Array<FixedDeposit>>;
    getAllPaymentHeads(): Promise<Array<PaymentHead>>;
    getAllTransactions(): Promise<Array<Transaction>>;
    getDailyPLByDateRange(startDate: string, endDate: string): Promise<Array<DailyPL>>;
    getTransactionsByTypeAndStatus(txType: string, status: string): Promise<Array<Transaction>>;
    saveDailyPL(date: string, headBalances: Array<HeadBalance>): Promise<bigint>;
}
