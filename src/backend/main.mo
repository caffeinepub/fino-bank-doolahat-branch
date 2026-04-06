import Migration "migration";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

(with migration = Migration.run)
actor {
  // Initialize access control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Payment Head Type
  type PaymentHead = {
    id : Nat;
    name : Text;
    headType : Text;
    isDefault : Bool;
  };

  module PaymentHead {
    public func compareById(p1 : PaymentHead, p2 : PaymentHead) : Order.Order {
      Nat.compare(p1.id, p2.id);
    };
  };

  let paymentHeads = Map.empty<Nat, PaymentHead>();
  var nextHeadId = 1;
  func seedDefaultPaymentHeads() {
    addPaymentHeadInternal("Cash Balance", "both", true);
    addPaymentHeadInternal("Fino(R) Balance", "both", true);
    addPaymentHeadInternal("Fino(S) Balance", "both", true);
    addPaymentHeadInternal("DPL Balance", "both", true);
  };

  func addPaymentHeadInternal(name : Text, headType : Text, isDefault : Bool) {
    let head : PaymentHead = {
      id = nextHeadId;
      name;
      headType;
      isDefault;
    };
    paymentHeads.add(nextHeadId, head);
    nextHeadId += 1;
  };

  public shared ({ caller }) func addPaymentHead(name : Text, headType : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add payment heads");
    };
    if (paymentHeads.size() == 0) { seedDefaultPaymentHeads() };
    let head : PaymentHead = {
      id = nextHeadId;
      name;
      headType;
      isDefault = false;
    };
    paymentHeads.add(nextHeadId, head);
    nextHeadId += 1;
    head.id;
  };

  public shared ({ caller }) func editPaymentHead(id : Nat, name : Text, headType : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can edit payment heads");
    };
    switch (paymentHeads.get(id)) {
      case (null) { Runtime.trap("Payment head not found") };
      case (?existing) {
        let updated : PaymentHead = {
          id;
          name;
          headType;
          isDefault = existing.isDefault;
        };
        paymentHeads.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deletePaymentHead(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete payment heads");
    };
    switch (paymentHeads.get(id)) {
      case (null) { Runtime.trap("Payment head not found") };
      case (?head) {
        if (head.isDefault) { Runtime.trap("Cannot delete default payment head") };
        paymentHeads.remove(id);
      };
    };
  };

  public query ({ caller }) func getAllPaymentHeads() : async [PaymentHead] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view payment heads");
    };
    paymentHeads.values().toArray().sort(PaymentHead.compareById);
  };

  // Head Balance & Daily PL
  type HeadBalance = {
    headId : Nat;
    headName : Text;
    openingBalance : Float;
    closingBalance : Float;
    profitLoss : Float;
  };

  type DailyPL = {
    id : Nat;
    date : Text;
    headBalances : [HeadBalance];
    totalProfitLoss : Float;
    createdAt : Int;
  };

  module DailyPL {
    public func compareById(pl1 : DailyPL, pl2 : DailyPL) : Order.Order {
      Nat.compare(pl1.id, pl2.id);
    };
  };

  let dailyPLs = Map.empty<Nat, DailyPL>();
  var nextPLId = 1;

  public shared ({ caller }) func saveDailyPL(date : Text, headBalances : [HeadBalance]) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can save daily P&L");
    };
    let totalPL = headBalances.foldLeft(
      0.0,
      func(sum, h) { sum + (h.closingBalance - h.openingBalance) },
    );

    let newPl : DailyPL = {
      id = nextPLId;
      date;
      headBalances;
      totalProfitLoss = totalPL;
      createdAt = Time.now();
    };
    dailyPLs.add(nextPLId, newPl);
    nextPLId += 1;
    newPl.id;
  };

  public query ({ caller }) func getAllDailyPLs() : async [DailyPL] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view daily P&L");
    };
    dailyPLs.values().toArray().sort(DailyPL.compareById);
  };

  public shared ({ caller }) func deleteDailyPL(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete daily P&L");
    };
    if (not dailyPLs.containsKey(id)) { Runtime.trap("Daily P&L entry not found") };
    dailyPLs.remove(id);
  };

  // Fixed Deposit
  type FixedDeposit = {
    id : Nat;
    customerName : Text;
    accountNumber : Text;
    cifNumber : Text;
    contactNumber : Text;
    openingDate : Text;
    fdAmount : Float;
    tenure : Nat;
    interestRate : Float;
    interestAmount : Float;
    maturityAmount : Float;
    closureDate : Text;
    maturityDepositDate : Text;
    createdAt : Int;
  };

  module FixedDeposit {
    public func compareById(fd1 : FixedDeposit, fd2 : FixedDeposit) : Order.Order {
      Nat.compare(fd1.id, fd2.id);
    };
  };

  let fixedDeposits = Map.empty<Nat, FixedDeposit>();
  var nextFDId = 1;

  public shared ({ caller }) func addFixedDeposit(
    customerName : Text,
    accountNumber : Text,
    cifNumber : Text,
    contactNumber : Text,
    openingDate : Text,
    fdAmount : Float,
    tenure : Nat,
    interestRate : Float,
    interestAmount : Float,
    maturityAmount : Float,
    closureDate : Text,
    maturityDepositDate : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add fixed deposits");
    };
    let fd : FixedDeposit = {
      id = nextFDId;
      customerName;
      accountNumber;
      cifNumber;
      contactNumber;
      openingDate;
      fdAmount;
      tenure;
      interestRate;
      interestAmount;
      maturityAmount;
      closureDate;
      maturityDepositDate;
      createdAt = Time.now();
    };
    fixedDeposits.add(nextFDId, fd);
    nextFDId += 1;
    fd.id;
  };

  public query ({ caller }) func getAllFixedDeposits() : async [FixedDeposit] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view fixed deposits");
    };
    fixedDeposits.values().toArray().sort(FixedDeposit.compareById);
  };

  public shared ({ caller }) func deleteFixedDeposit(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete fixed deposits");
    };
    if (not fixedDeposits.containsKey(id)) { Runtime.trap("FD not found") };
    fixedDeposits.remove(id);
  };

  // Transaction
  type Transaction = {
    id : Nat;
    referenceId : Text;
    transactionType : Text;
    accountNumber : Text;
    accountHolderName : Text;
    bankName : Text;
    ifscCode : Text;
    amount : Float;
    transactionDate : Text;
    frequencyType : Text;
    remark : Text;
    status : Text;
    createdAt : Int;
  };

  module Transaction {
    public func compareById(t1 : Transaction, t2 : Transaction) : Order.Order {
      Nat.compare(t1.id, t2.id);
    };
  };

  let transactions = Map.empty<Nat, Transaction>();
  var nextTxId = 1;

  public shared ({ caller }) func addTransaction(tx : Transaction) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add transactions");
    };
    let newTx : Transaction = {
      id = nextTxId;
      referenceId = tx.referenceId;
      transactionType = tx.transactionType;
      accountNumber = tx.accountNumber;
      accountHolderName = tx.accountHolderName;
      bankName = tx.bankName;
      ifscCode = tx.ifscCode;
      amount = tx.amount;
      transactionDate = tx.transactionDate;
      frequencyType = tx.frequencyType;
      remark = tx.remark;
      status = tx.status;
      createdAt = Time.now();
    };
    transactions.add(nextTxId, newTx);
    nextTxId += 1;
    newTx.id;
  };

  public query ({ caller }) func getAllTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transactions");
    };
    transactions.values().toArray().sort(Transaction.compareById);
  };

  public shared ({ caller }) func deleteTransaction(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete transactions");
    };
    if (not transactions.containsKey(id)) { Runtime.trap("Transaction not found") };
    transactions.remove(id);
  };

  func dateBetween(date : Text, startDate : Text, endDate : Text) : Bool {
    Text.compare(date, startDate) != #less and Text.compare(date, endDate) != #greater;
  };

  public query ({ caller }) func getDailyPLByDateRange(startDate : Text, endDate : Text) : async [DailyPL] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view daily P&L");
    };
    dailyPLs.values().filter(
      func(pl) {
        dateBetween(pl.date, startDate, endDate);
      }
    ).toArray();
  };

  public query ({ caller }) func getTransactionsByTypeAndStatus(txType : Text, status : Text) : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transactions");
    };
    transactions.values().filter(
      func(tx) {
        tx.transactionType == txType and tx.status == status
      }
    ).toArray();
  };

  // Inventory
  type InventoryProduct = {
    id : Nat;
    name : Text;
    description : Text;
    sku : Text;
    barcode : Text;
    category : Text;
    quantity : Nat;
    unitCost : Float;
    salePrice : Float;
    reorderPoint : Nat;
    createdAt : Int;
  };

  module InventoryProduct {
    public func compareById(p1 : InventoryProduct, p2 : InventoryProduct) : Order.Order {
      Nat.compare(p1.id, p2.id);
    };
  };

  type StockTransaction = {
    id : Nat;
    productId : Nat;
    transactionType : Text;
    quantityChange : Int;
    note : Text;
    transactionDate : Text;
    createdAt : Int;
  };

  module StockTransaction {
    public func compareById(s1 : StockTransaction, s2 : StockTransaction) : Order.Order {
      Nat.compare(s1.id, s2.id);
    };
  };

  let inventoryProducts = Map.empty<Nat, InventoryProduct>();
  var nextProductId = 1;
  let stockTransactions = Map.empty<Nat, StockTransaction>();
  var nextStockTxId = 1;

  public shared ({ caller }) func addProduct(
    name : Text,
    description : Text,
    sku : Text,
    barcode : Text,
    category : Text,
    quantity : Nat,
    unitCost : Float,
    salePrice : Float,
    reorderPoint : Nat,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add products");
    };
    let product : InventoryProduct = {
      id = nextProductId;
      name;
      description;
      sku;
      barcode;
      category;
      quantity;
      unitCost;
      salePrice;
      reorderPoint;
      createdAt = Time.now();
    };
    inventoryProducts.add(nextProductId, product);
    nextProductId += 1;
    product.id;
  };

  public shared ({ caller }) func editProduct(
    id : Nat,
    name : Text,
    description : Text,
    sku : Text,
    barcode : Text,
    category : Text,
    unitCost : Float,
    salePrice : Float,
    reorderPoint : Nat,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can edit products");
    };
    switch (inventoryProducts.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?existing) {
        let updated : InventoryProduct = {
          id;
          name;
          description;
          sku;
          barcode;
          category;
          quantity = existing.quantity;
          unitCost;
          salePrice;
          reorderPoint;
          createdAt = existing.createdAt;
        };
        inventoryProducts.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteProduct(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete products");
    };
    if (not inventoryProducts.containsKey(id)) { Runtime.trap("Product not found") };
    inventoryProducts.remove(id);
  };

  public query ({ caller }) func getAllProducts() : async [InventoryProduct] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view products");
    };
    inventoryProducts.values().toArray().sort(InventoryProduct.compareById);
  };

  public shared ({ caller }) func addStockTransaction(
    productId : Nat,
    txType : Text,
    quantityChange : Int,
    note : Text,
    transactionDate : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add stock transactions");
    };
    switch (inventoryProducts.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        let newQty : Int = Int.fromNat(product.quantity) + quantityChange;
        if (newQty < 0) { Runtime.trap("Insufficient stock") };
        let updatedProduct : InventoryProduct = {
          id = product.id;
          name = product.name;
          description = product.description;
          sku = product.sku;
          barcode = product.barcode;
          category = product.category;
          quantity = newQty.toNat();
          unitCost = product.unitCost;
          salePrice = product.salePrice;
          reorderPoint = product.reorderPoint;
          createdAt = product.createdAt;
        };
        inventoryProducts.add(productId, updatedProduct);
        let stx : StockTransaction = {
          id = nextStockTxId;
          productId;
          transactionType = txType;
          quantityChange;
          note;
          transactionDate;
          createdAt = Time.now();
        };
        stockTransactions.add(nextStockTxId, stx);
        nextStockTxId += 1;
        stx.id;
      };
    };
  };

  public query ({ caller }) func getAllStockTransactions() : async [StockTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stock transactions");
    };
    stockTransactions.values().toArray().sort(StockTransaction.compareById);
  };

  public query ({ caller }) func getStockTransactionsByProduct(productId : Nat) : async [StockTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stock transactions");
    };
    stockTransactions.values().filter(
      func(stx) { stx.productId == productId }
    ).toArray().sort(StockTransaction.compareById);
  };

  public query ({ caller }) func getTodayStockTransactions(today : Text) : async [StockTransaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view stock transactions");
    };
    stockTransactions.values().filter(
      func(stx) { stx.transactionDate == today }
    ).toArray().sort(StockTransaction.compareById);
  };

  public shared ({ caller }) func bulkUpdateProducts(
    ids : [Nat],
    unitCosts : [Float],
    salePrices : [Float],
    reorderPoints : [Nat],
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can bulk update products");
    };
    var i = 0;
    while (i < ids.size()) {
      let id = ids[i];
      switch (inventoryProducts.get(id)) {
        case (null) {};
        case (?product) {
          let updated : InventoryProduct = {
            id = product.id;
            name = product.name;
            description = product.description;
            sku = product.sku;
            barcode = product.barcode;
            category = product.category;
            quantity = product.quantity;
            unitCost = if (i < unitCosts.size()) unitCosts[i] else product.unitCost;
            salePrice = if (i < salePrices.size()) salePrices[i] else product.salePrice;
            reorderPoint = if (i < reorderPoints.size()) reorderPoints[i] else product.reorderPoint;
            createdAt = product.createdAt;
          };
          inventoryProducts.add(id, updated);
        };
      };
      i += 1;
    };
  };

  // Complaint Type (Updated: add complaintNo field)
  type Complaint = {
    id : Nat;
    customerName : Text;
    complaintNo : Text;
    contactNo : Text;
    accountNo : Text;
    aadharNo : Text;
    panNo : Text;
    dateOfComplaint : Text;
    complaintBrief : Text;
    status : Text;
    createdAt : Int;
  };

  module Complaint {
    public func compareById(c1 : Complaint, c2 : Complaint) : Order.Order {
      Nat.compare(c1.id, c2.id);
    };
  };

  let complaints = Map.empty<Nat, Complaint>();
  var nextComplaintId = 1;

  // Add Complaint (Updated: add complaintNo)
  public shared ({ caller }) func addComplaint(
    customerName : Text,
    complaintNo : Text,
    contactNo : Text,
    accountNo : Text,
    aadharNo : Text,
    panNo : Text,
    dateOfComplaint : Text,
    complaintBrief : Text,
    status : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add complaints");
    };
    let complaint : Complaint = {
      id = nextComplaintId;
      customerName;
      complaintNo;
      contactNo;
      accountNo;
      aadharNo;
      panNo;
      dateOfComplaint;
      complaintBrief;
      status;
      createdAt = Time.now();
    };
    complaints.add(nextComplaintId, complaint);
    nextComplaintId += 1;
    complaint.id;
  };

  public shared ({ caller }) func updateComplaintStatus(id : Nat, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update complaint status");
    };
    switch (complaints.get(id)) {
      case (null) { Runtime.trap("Complaint not found") };
      case (?existing) {
        let updated : Complaint = {
          id = existing.id;
          customerName = existing.customerName;
          complaintNo = existing.complaintNo;
          contactNo = existing.contactNo;
          accountNo = existing.accountNo;
          aadharNo = existing.aadharNo;
          panNo = existing.panNo;
          dateOfComplaint = existing.dateOfComplaint;
          complaintBrief = existing.complaintBrief;
          status;
          createdAt = existing.createdAt;
        };
        complaints.add(id, updated);
      };
    };
  };

  // Update Complaint (Updated: complaintNo)
  public shared ({ caller }) func updateComplaint(
    id : Nat,
    customerName : Text,
    complaintNo : Text,
    contactNo : Text,
    accountNo : Text,
    aadharNo : Text,
    panNo : Text,
    dateOfComplaint : Text,
    complaintBrief : Text,
    status : Text,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update complaints");
    };
    switch (complaints.get(id)) {
      case (null) { Runtime.trap("Complaint not found") };
      case (?existing) {
        let updated : Complaint = {
          id;
          customerName;
          complaintNo;
          contactNo;
          accountNo;
          aadharNo;
          panNo;
          dateOfComplaint;
          complaintBrief;
          status;
          createdAt = existing.createdAt;
        };
        complaints.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteComplaint(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete complaints");
    };
    if (not complaints.containsKey(id)) { Runtime.trap("Complaint not found") };
    complaints.remove(id);
  };

  public query ({ caller }) func getAllComplaints() : async [Complaint] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view complaints");
    };
    complaints.values().toArray().sort(Complaint.compareById);
  };

  public query ({ caller }) func getComplaintsByStatus(status : Text) : async [Complaint] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view complaints");
    };
    complaints.values().filter(
      func(c) { c.status == status }
    ).toArray().sort(Complaint.compareById);
  };

  // ----------- Loan Management (NEW) -----------
  type Loan = {
    id : Nat;
    customerName : Text;
    fatherHusbandName : Text;
    fullAddress : Text;
    loanStartDate : Text;
    contactNo : Text;
    nomineeName : Text;
    dateOfBirth : Text;
    loanAmount : Float;
    totalInterestAmount : Float;
    interestRate : Float;
    loanTenureMonths : Nat;
    repaymentType : Text;
    createdAt : Int;
  };

  module Loan {
    public func compareById(loan1 : Loan, loan2 : Loan) : Order.Order {
      Nat.compare(loan1.id, loan2.id);
    };
  };

  let loans = Map.empty<Nat, Loan>();
  var nextLoanId = 1;

  // Add Loan
  public shared ({ caller }) func addLoan(
    customerName : Text,
    fatherHusbandName : Text,
    fullAddress : Text,
    loanStartDate : Text,
    contactNo : Text,
    nomineeName : Text,
    dateOfBirth : Text,
    loanAmount : Float,
    totalInterestAmount : Float,
    interestRate : Float,
    loanTenureMonths : Nat,
    repaymentType : Text,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add loans");
    };
    if (interestRate <= 0 or interestRate > 50) {
      Runtime.trap("Interest rate must be between 1% and 50%");
    };
    switch (loanTenureMonths) {
      case (12 or 18 or 24 or 30 or 36 or 42 or 48 or 54 or 60) {};
      case (_) { Runtime.trap("Invalid tenure") };
    };
    if (loanAmount <= 0) { Runtime.trap("Loan amount must be positive") };
    if (totalInterestAmount < 0) { Runtime.trap("Total interest must be >= 0") };
    if (not (repaymentType == "Monthly")) {
      Runtime.trap("Repayment type must be `Monthly`");
    };
    let loan : Loan = {
      id = nextLoanId;
      customerName;
      fatherHusbandName;
      fullAddress;
      loanStartDate;
      contactNo;
      nomineeName;
      dateOfBirth;
      loanAmount;
      totalInterestAmount;
      interestRate;
      loanTenureMonths;
      repaymentType;
      createdAt = Time.now();
    };
    loans.add(nextLoanId, loan);
    nextLoanId += 1;
    loan.id;
  };

  // Get All Loans
  public query ({ caller }) func getAllLoans() : async [Loan] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view loans");
    };
    loans.values().toArray().sort(Loan.compareById);
  };

  // Get Loan by ID
  public query ({ caller }) func getLoanById(id : Nat) : async ?Loan {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view loans");
    };
    loans.get(id);
  };

  // Delete Loan
  public shared ({ caller }) func deleteLoan(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete loans");
    };
    if (not loans.containsKey(id)) { Runtime.trap("Loan not found") };
    loans.remove(id);
  };
};
