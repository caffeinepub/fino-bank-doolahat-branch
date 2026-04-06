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
export interface InventoryProduct {
    id: bigint;
    name: string;
    description: string;
    sku: string;
    barcode: string;
    category: string;
    quantity: bigint;
    unitCost: number;
    salePrice: number;
    reorderPoint: bigint;
    createdAt: bigint;
}
export interface StockTransaction {
    id: bigint;
    productId: bigint;
    transactionType: string;
    quantityChange: bigint;
    note: string;
    transactionDate: string;
    createdAt: bigint;
}
export interface Complaint {
    id: bigint;
    customerName: string;
    contactNo: string;
    accountNo: string;
    aadharNo: string;
    panNo: string;
    dateOfComplaint: string;
    complaintBrief: string;
    status: string;
    createdAt: bigint;
}
export interface backendInterface {
    _initializeAccessControlWithSecret(adminToken: string): Promise<void>;
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
    addProduct(name: string, description: string, sku: string, barcode: string, category: string, quantity: bigint, unitCost: number, salePrice: number, reorderPoint: bigint): Promise<bigint>;
    editProduct(id: bigint, name: string, description: string, sku: string, barcode: string, category: string, unitCost: number, salePrice: number, reorderPoint: bigint): Promise<void>;
    deleteProduct(id: bigint): Promise<void>;
    getAllProducts(): Promise<Array<InventoryProduct>>;
    addStockTransaction(productId: bigint, txType: string, quantityChange: bigint, note: string, transactionDate: string): Promise<bigint>;
    getAllStockTransactions(): Promise<Array<StockTransaction>>;
    getStockTransactionsByProduct(productId: bigint): Promise<Array<StockTransaction>>;
    getTodayStockTransactions(today: string): Promise<Array<StockTransaction>>;
    bulkUpdateProducts(ids: Array<bigint>, unitCosts: Array<number>, salePrices: Array<number>, reorderPoints: Array<bigint>): Promise<void>;
    addComplaint(customerName: string, contactNo: string, accountNo: string, aadharNo: string, panNo: string, dateOfComplaint: string, complaintBrief: string, status: string): Promise<bigint>;
    updateComplaintStatus(id: bigint, status: string): Promise<void>;
    updateComplaint(id: bigint, customerName: string, contactNo: string, accountNo: string, aadharNo: string, panNo: string, dateOfComplaint: string, complaintBrief: string, status: string): Promise<void>;
    deleteComplaint(id: bigint): Promise<void>;
    getAllComplaints(): Promise<Array<Complaint>>;
    getComplaintsByStatus(status: string): Promise<Array<Complaint>>;
}
