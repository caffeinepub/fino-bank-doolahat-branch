// Inventory-specific types for the Fino Bank portal
// These types match the backend.d.ts declarations for inventory

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
