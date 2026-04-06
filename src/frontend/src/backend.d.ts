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
export interface DailyPL {
    id: bigint;
    totalProfitLoss: number;
    date: string;
    createdAt: bigint;
    headBalances: Array<HeadBalance>;
}
export interface Complaint {
    id: bigint;
    customerName: string;
    status: string;
    complaintNo: string;
    accountNo: string;
    createdAt: bigint;
    aadharNo: string;
    contactNo: string;
    panNo: string;
    dateOfComplaint: string;
    complaintBrief: string;
}
export interface InventoryProduct {
    id: bigint;
    sku: string;
    reorderPoint: bigint;
    name: string;
    createdAt: bigint;
    description: string;
    barcode: string;
    quantity: bigint;
    category: string;
    salePrice: number;
    unitCost: number;
}
export interface Loan {
    id: bigint;
    loanStartDate: string;
    customerName: string;
    loanAmount: number;
    dateOfBirth: string;
    createdAt: bigint;
    fatherHusbandName: string;
    totalInterestAmount: number;
    interestRate: number;
    nomineeName: string;
    loanTenureMonths: bigint;
    repaymentType: string;
    contactNo: string;
    fullAddress: string;
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
export interface StockTransaction {
    id: bigint;
    transactionDate: string;
    transactionType: string;
    quantityChange: bigint;
    note: string;
    createdAt: bigint;
    productId: bigint;
}
export interface HeadBalance {
    headName: string;
    profitLoss: number;
    closingBalance: number;
    openingBalance: number;
    headId: bigint;
}
export interface UserProfile {
    name: string;
}
export interface PaymentHead {
    id: bigint;
    headType: string;
    name: string;
    isDefault: boolean;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComplaint(customerName: string, complaintNo: string, contactNo: string, accountNo: string, aadharNo: string, panNo: string, dateOfComplaint: string, complaintBrief: string, status: string): Promise<bigint>;
    addFixedDeposit(customerName: string, accountNumber: string, cifNumber: string, contactNumber: string, openingDate: string, fdAmount: number, tenure: bigint, interestRate: number, interestAmount: number, maturityAmount: number, closureDate: string, maturityDepositDate: string): Promise<bigint>;
    addLoan(customerName: string, fatherHusbandName: string, fullAddress: string, loanStartDate: string, contactNo: string, nomineeName: string, dateOfBirth: string, loanAmount: number, totalInterestAmount: number, interestRate: number, loanTenureMonths: bigint, repaymentType: string): Promise<bigint>;
    addPaymentHead(name: string, headType: string): Promise<bigint>;
    addProduct(name: string, description: string, sku: string, barcode: string, category: string, quantity: bigint, unitCost: number, salePrice: number, reorderPoint: bigint): Promise<bigint>;
    addStockTransaction(productId: bigint, txType: string, quantityChange: bigint, note: string, transactionDate: string): Promise<bigint>;
    addTransaction(tx: Transaction): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bulkUpdateProducts(ids: Array<bigint>, unitCosts: Array<number>, salePrices: Array<number>, reorderPoints: Array<bigint>): Promise<void>;
    deleteComplaint(id: bigint): Promise<void>;
    deleteDailyPL(id: bigint): Promise<void>;
    deleteFixedDeposit(id: bigint): Promise<void>;
    deleteLoan(id: bigint): Promise<void>;
    deletePaymentHead(id: bigint): Promise<void>;
    deleteProduct(id: bigint): Promise<void>;
    deleteTransaction(id: bigint): Promise<void>;
    editPaymentHead(id: bigint, name: string, headType: string): Promise<void>;
    editProduct(id: bigint, name: string, description: string, sku: string, barcode: string, category: string, unitCost: number, salePrice: number, reorderPoint: bigint): Promise<void>;
    getAllComplaints(): Promise<Array<Complaint>>;
    getAllDailyPLs(): Promise<Array<DailyPL>>;
    getAllFixedDeposits(): Promise<Array<FixedDeposit>>;
    getAllLoans(): Promise<Array<Loan>>;
    getAllPaymentHeads(): Promise<Array<PaymentHead>>;
    getAllProducts(): Promise<Array<InventoryProduct>>;
    getAllStockTransactions(): Promise<Array<StockTransaction>>;
    getAllTransactions(): Promise<Array<Transaction>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getComplaintsByStatus(status: string): Promise<Array<Complaint>>;
    getDailyPLByDateRange(startDate: string, endDate: string): Promise<Array<DailyPL>>;
    getLoanById(id: bigint): Promise<Loan | null>;
    getStockTransactionsByProduct(productId: bigint): Promise<Array<StockTransaction>>;
    getTodayStockTransactions(today: string): Promise<Array<StockTransaction>>;
    getTransactionsByTypeAndStatus(txType: string, status: string): Promise<Array<Transaction>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveDailyPL(date: string, headBalances: Array<HeadBalance>): Promise<bigint>;
    updateComplaint(id: bigint, customerName: string, complaintNo: string, contactNo: string, accountNo: string, aadharNo: string, panNo: string, dateOfComplaint: string, complaintBrief: string, status: string): Promise<void>;
    updateComplaintStatus(id: bigint, status: string): Promise<void>;
}
