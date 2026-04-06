import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Int "mo:core/Int";

module {
  // Old Payment Head
  type OldPaymentHead = {
    id : Nat;
    name : Text;
    headType : Text;
    isDefault : Bool;
  };

  // Old Head Balance
  type OldHeadBalance = {
    headId : Nat;
    headName : Text;
    openingBalance : Float;
    closingBalance : Float;
    profitLoss : Float;
  };

  // Old Daily P&L
  type OldDailyPL = {
    id : Nat;
    date : Text;
    headBalances : [OldHeadBalance];
    totalProfitLoss : Float;
    createdAt : Int;
  };

  // Old Fixed Deposit
  type OldFixedDeposit = {
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

  // Old Transaction
  type OldTransaction = {
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

  // Old Inventory Product
  type OldInventoryProduct = {
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

  // Old Stock Transaction
  type OldStockTransaction = {
    id : Nat;
    productId : Nat;
    transactionType : Text;
    quantityChange : Int;
    note : Text;
    transactionDate : Text;
    createdAt : Int;
  };

  // Old Complaint (without complaintNo)
  type OldComplaint = {
    id : Nat;
    customerName : Text;
    contactNo : Text;
    accountNo : Text;
    aadharNo : Text;
    panNo : Text;
    dateOfComplaint : Text;
    complaintBrief : Text;
    status : Text;
    createdAt : Int;
  };

  // Old Actor Type
  type OldActor = {
    paymentHeads : Map.Map<Nat, OldPaymentHead>;
    nextHeadId : Nat;
    dailyPLs : Map.Map<Nat, OldDailyPL>;
    nextPLId : Nat;
    fixedDeposits : Map.Map<Nat, OldFixedDeposit>;
    nextFDId : Nat;
    transactions : Map.Map<Nat, OldTransaction>;
    nextTxId : Nat;
    inventoryProducts : Map.Map<Nat, OldInventoryProduct>;
    nextProductId : Nat;
    stockTransactions : Map.Map<Nat, OldStockTransaction>;
    nextStockTxId : Nat;
    complaints : Map.Map<Nat, OldComplaint>;
    nextComplaintId : Nat;
  };

  // New Loan (already used in main module)
  type NewLoan = {
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

  // New Complaint (with complaintNo)
  type NewComplaint = {
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

  // New Actor Type
  type NewActor = {
    paymentHeads : Map.Map<Nat, OldPaymentHead>;
    nextHeadId : Nat;
    dailyPLs : Map.Map<Nat, OldDailyPL>;
    nextPLId : Nat;
    fixedDeposits : Map.Map<Nat, OldFixedDeposit>;
    nextFDId : Nat;
    transactions : Map.Map<Nat, OldTransaction>;
    nextTxId : Nat;
    inventoryProducts : Map.Map<Nat, OldInventoryProduct>;
    nextProductId : Nat;
    stockTransactions : Map.Map<Nat, OldStockTransaction>;
    nextStockTxId : Nat;
    complaints : Map.Map<Nat, NewComplaint>;
    nextComplaintId : Nat;
    loans : Map.Map<Nat, NewLoan>;
    nextLoanId : Nat;
  };

  public func run(old : OldActor) : NewActor {
    // Migrate complaints, adding complaintNo as empty string (since this was new)
    let newComplaints = old.complaints.map<Nat, OldComplaint, NewComplaint>(
      func(_id, oldComplaint) {
        {
          oldComplaint with
          complaintNo = "";
        };
      }
    );

    // Loans start as empty map and nextLoanId 1 (since this is new)
    {
      old with
      complaints = newComplaints;
      loans = Map.empty<Nat, NewLoan>();
      nextLoanId = 1;
    };
  };
};
