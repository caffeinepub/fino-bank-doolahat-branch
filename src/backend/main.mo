import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";

actor {
  // 1. Payment Heads Types & Logic
  type PaymentHead = {
    id : Nat;
    name : Text;
    headType : Text; // "opening", "closing", "both"
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

  // Seed Default Payment Heads (called if no heads exist)
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
  public shared ({ caller }) func addPaymentHead(name : Text, headType : Text) : async Nat {
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
  public shared ({ caller }) func editPaymentHead(id : Nat, name : Text, headType : Text) : async () {
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
  public shared ({ caller }) func deletePaymentHead(id : Nat) : async () {
    switch (paymentHeads.get(id)) {
      case (null) { Runtime.trap("Payment head not found") };
      case (?head) {
        if (head.isDefault) { Runtime.trap("Cannot delete default payment head") };
        paymentHeads.remove(id);
      };
    };
  };

  public query ({ caller }) func getAllPaymentHeads() : async [PaymentHead] {
    paymentHeads.values().toArray().sort(PaymentHead.compareById);
  };

  // 2. Daily P&L - Save Entry
  public shared ({ caller }) func saveDailyPL(date : Text, headBalances : [HeadBalance]) : async Nat {
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
    dailyPLs.values().toArray().sort(DailyPL.compareById);
  };

  // 3. FDs - Add FD
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
    fixedDeposits.values().toArray().sort(FixedDeposit.compareById);
  };

  // 3. FDs - Delete FD
  public shared ({ caller }) func deleteFixedDeposit(id : Nat) : async () {
    if (not fixedDeposits.containsKey(id)) { Runtime.trap("FD not found") };
    fixedDeposits.remove(id);
  };

  // 4. Transactions - Add
  public shared ({ caller }) func addTransaction(tx : Transaction) : async Nat {
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
    transactions.values().toArray().sort(Transaction.compareById);
  };

  // 4. Transactions - Delete
  public shared ({ caller }) func deleteTransaction(id : Nat) : async () {
    if (not transactions.containsKey(id)) { Runtime.trap("Transaction not found") };
    transactions.remove(id);
  };

  // Utility - Date Between (ISO format)
  func dateBetween(date : Text, startDate : Text, endDate : Text) : Bool {
    Text.compare(date, startDate) != #less and Text.compare(date, endDate) != #greater;
  };

  // Daily PL - Get by Date Range
  public query ({ caller }) func getDailyPLByDateRange(startDate : Text, endDate : Text) : async [DailyPL] {
    dailyPLs.values().filter(
      func(pl) {
        dateBetween(pl.date, startDate, endDate);
      }
    ).toArray();
  };

  // Transactions - Filter by Type/Status
  public query ({ caller }) func getTransactionsByTypeAndStatus(txType : Text, status : Text) : async [Transaction] {
    transactions.values().filter(
      func(tx) {
        tx.transactionType == txType and tx.status == status
      }
    ).toArray();
  };
};
