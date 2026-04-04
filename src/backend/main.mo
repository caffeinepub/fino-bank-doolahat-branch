import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

actor {
  // 1. Payment Heads Types & Logic
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

  // 2. Daily P&L Types & Logic
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

  // 3. Fixed Deposit Types & Logic
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

  // 4. Transaction Types & Logic
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

  // 5. Inventory Types & Logic
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

  // Seed Default Payment Heads
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

  // 1. Payment Heads - Add
  public shared ({ caller = _ }) func addPaymentHead(name : Text, headType : Text) : async Nat {
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

  // 1. Payment Heads - Edit
  public shared ({ caller = _ }) func editPaymentHead(id : Nat, name : Text, headType : Text) : async () {
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

  // 1. Payment Heads - Delete (non-default only)
  public shared ({ caller = _ }) func deletePaymentHead(id : Nat) : async () {
    switch (paymentHeads.get(id)) {
      case (null) { Runtime.trap("Payment head not found") };
      case (?head) {
        if (head.isDefault) { Runtime.trap("Cannot delete default payment head") };
        paymentHeads.remove(id);
      };
    };
  };

  public query ({ caller = _ }) func getAllPaymentHeads() : async [PaymentHead] {
    paymentHeads.values().toArray().sort(PaymentHead.compareById);
  };

  // 2. Daily P&L - Save Entry
  public shared ({ caller = _ }) func saveDailyPL(date : Text, headBalances : [HeadBalance]) : async Nat {
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

  public query ({ caller = _ }) func getAllDailyPLs() : async [DailyPL] {
    dailyPLs.values().toArray().sort(DailyPL.compareById);
  };

  // 2. Daily P&L - Delete Entry
  public shared ({ caller = _ }) func deleteDailyPL(id : Nat) : async () {
    if (not dailyPLs.containsKey(id)) { Runtime.trap("Daily P&L entry not found") };
    dailyPLs.remove(id);
  };

  // 3. FDs - Add FD
  public shared ({ caller = _ }) func addFixedDeposit(
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

  public query ({ caller = _ }) func getAllFixedDeposits() : async [FixedDeposit] {
    fixedDeposits.values().toArray().sort(FixedDeposit.compareById);
  };

  // 3. FDs - Delete FD
  public shared ({ caller = _ }) func deleteFixedDeposit(id : Nat) : async () {
    if (not fixedDeposits.containsKey(id)) { Runtime.trap("FD not found") };
    fixedDeposits.remove(id);
  };

  // 4. Transactions - Add
  public shared ({ caller = _ }) func addTransaction(tx : Transaction) : async Nat {
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

  public query ({ caller = _ }) func getAllTransactions() : async [Transaction] {
    transactions.values().toArray().sort(Transaction.compareById);
  };

  // 4. Transactions - Delete
  public shared ({ caller = _ }) func deleteTransaction(id : Nat) : async () {
    if (not transactions.containsKey(id)) { Runtime.trap("Transaction not found") };
    transactions.remove(id);
  };

  // Utility - Date Between (ISO format)
  func dateBetween(date : Text, startDate : Text, endDate : Text) : Bool {
    Text.compare(date, startDate) != #less and Text.compare(date, endDate) != #greater;
  };

  // Daily PL - Get by Date Range
  public query ({ caller = _ }) func getDailyPLByDateRange(startDate : Text, endDate : Text) : async [DailyPL] {
    dailyPLs.values().filter(
      func(pl) {
        dateBetween(pl.date, startDate, endDate);
      }
    ).toArray();
  };

  // Transactions - Filter by Type/Status
  public query ({ caller = _ }) func getTransactionsByTypeAndStatus(txType : Text, status : Text) : async [Transaction] {
    transactions.values().filter(
      func(tx) {
        tx.transactionType == txType and tx.status == status
      }
    ).toArray();
  };

  // 5. Inventory - Add Product
  public shared ({ caller = _ }) func addProduct(
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

  // 5. Inventory - Edit Product
  public shared ({ caller = _ }) func editProduct(
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

  // 5. Inventory - Delete Product
  public shared ({ caller = _ }) func deleteProduct(id : Nat) : async () {
    if (not inventoryProducts.containsKey(id)) { Runtime.trap("Product not found") };
    inventoryProducts.remove(id);
  };

  // 5. Inventory - Get All Products
  public query ({ caller = _ }) func getAllProducts() : async [InventoryProduct] {
    inventoryProducts.values().toArray().sort(InventoryProduct.compareById);
  };

  // 5. Inventory - Add Stock Transaction (updates product quantity)
  public shared ({ caller = _ }) func addStockTransaction(
    productId : Nat,
    txType : Text,
    quantityChange : Int,
    note : Text,
    transactionDate : Text,
  ) : async Nat {
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

  // 5. Inventory - Get All Stock Transactions
  public query ({ caller = _ }) func getAllStockTransactions() : async [StockTransaction] {
    stockTransactions.values().toArray().sort(StockTransaction.compareById);
  };

  // 5. Inventory - Get Stock Transactions for a Product
  public query ({ caller = _ }) func getStockTransactionsByProduct(productId : Nat) : async [StockTransaction] {
    stockTransactions.values().filter(
      func(stx) { stx.productId == productId }
    ).toArray().sort(StockTransaction.compareById);
  };

  // 5. Inventory - Get Today's Stock Transactions
  public query ({ caller = _ }) func getTodayStockTransactions(today : Text) : async [StockTransaction] {
    stockTransactions.values().filter(
      func(stx) { stx.transactionDate == today }
    ).toArray().sort(StockTransaction.compareById);
  };

  // 5. Inventory - Bulk Update Products (prices and reorder points)
  public shared ({ caller = _ }) func bulkUpdateProducts(
    ids : [Nat],
    unitCosts : [Float],
    salePrices : [Float],
    reorderPoints : [Nat],
  ) : async () {
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
};
