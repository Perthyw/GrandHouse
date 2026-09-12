import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceMaterialRequest,
  advanceFoodRequest,
  createFoodRequest,
  createInventoryTransaction,
  createKitchenDispatch,
  createKitchenDispatchBatch,
  createProduct,
  createMaterialRequest,
  getReports,
  getBalance,
  getOfficeInventorySnapshot,
  getStockPoolBalance,
  getInventorySnapshot,
  stockOwnerTypes,
  setReorderPoint,
  updateFoodRequestProduction,
  updateProductPricing,
  upsertBranchDailyClosing,
  upsertDailySales
} from "../src/domain.js";
import { seedData } from "../src/seed.js";

function freshDb() {
  return structuredClone(seedData);
}

test("inventory balance is derived from transactions", () => {
  const db = freshDb();
  const before = getBalance(db, "br-phu-doi", "mat-pork");

  createInventoryTransaction(db, {
    branchId: "br-phu-doi",
    productId: "mat-pork",
    type: "PURCHASE",
    quantityChanged: 10,
    unitCost: 165,
    createdBy: "ออฟฟิศ"
  });

  assert.equal(getBalance(db, "br-phu-doi", "mat-pork"), before + 10);
});

test("office warehouse keeps Grand and branch-owned pools separate", () => {
  const db = freshDb();
  const grandBefore = getStockPoolBalance(db, "mat-pork", { warehouseId: "office", stockOwnerType: stockOwnerTypes.GRAND_SUPPLIED });

  const deposit = createInventoryTransaction(db, {
    warehouseId: "office",
    stockOwnerType: stockOwnerTypes.BRANCH_OWNED,
    stockOwnerBranchId: "br-phu-doi",
    branchId: "br-phu-doi",
    productId: "mat-pork",
    type: "BRANCH_DEPOSIT",
    quantityChanged: 12,
    unitCost: null,
    createdBy: "ออฟฟิศ"
  });
  const issue = createInventoryTransaction(db, {
    warehouseId: "office",
    stockOwnerType: stockOwnerTypes.BRANCH_OWNED,
    stockOwnerBranchId: "br-phu-doi",
    destinationBranchId: "br-phu-doi",
    branchId: "br-phu-doi",
    productId: "mat-pork",
    type: "MANUAL_ISSUE",
    quantityChanged: -5,
    unitCost: null,
    createdBy: "ออฟฟิศ"
  });

  assert.equal(deposit.totalValue, null);
  assert.equal(issue.totalValue, null);
  assert.equal(getStockPoolBalance(db, "mat-pork", { warehouseId: "office", stockOwnerType: stockOwnerTypes.GRAND_SUPPLIED }), grandBefore);
  assert.equal(getStockPoolBalance(db, "mat-pork", { warehouseId: "office", stockOwnerType: stockOwnerTypes.BRANCH_OWNED, stockOwnerBranchId: "br-phu-doi" }), 7);
  const row = getOfficeInventorySnapshot(db).find((item) => item.productId === "mat-pork" && item.stockOwnerType === stockOwnerTypes.BRANCH_OWNED);
  assert.equal(row.inventoryValue, null);
  assert.equal(row.averageCost, null);
});

test("office warehouse supports Phelaฝากเก็บ without cost", () => {
  const db = freshDb();
  const transaction = createInventoryTransaction(db, {
    warehouseId: "office",
    stockOwnerType: stockOwnerTypes.BRANCH_OWNED,
    stockOwnerBranchId: "owner-phela",
    branchId: "office",
    productId: "mat-rice",
    type: "BRANCH_DEPOSIT",
    quantityChanged: 24,
    unitCost: null,
    createdBy: "ออฟฟิศ"
  });
  assert.equal(transaction.totalValue, null);
  setReorderPoint(db, "owner-phela", "mat-rice", 8, 20, {
    warehouseId: "office",
    stockOwnerType: stockOwnerTypes.BRANCH_OWNED,
    stockOwnerBranchId: "owner-phela"
  });
  const row = getOfficeInventorySnapshot(db).find((item) => item.productId === "mat-rice" && item.stockOwnerBranchId === "owner-phela");
  assert.equal(row.stockOwnerLabel, "ของเพลาฝากเก็บ");
  assert.equal(row.quantity, 24);
  assert.equal(row.inventoryValue, null);
  assert.equal(row.reorderPoint, 8);
  assert.equal(row.targetStock, 20);
});

test("target stock cannot be set below reorder point", () => {
  const db = freshDb();
  assert.throws(() => setReorderPoint(db, "br-phu-doi", "mat-pork", 50, 20), /สต็อกเป้าหมายต้องไม่น้อยกว่า/);
});

test("branch-owned material requests are limited to Phu Doi", () => {
  const db = freshDb();
  assert.throws(() => createMaterialRequest(db, {
    branchId: "br-ban-jo",
    sourceType: stockOwnerTypes.BRANCH_OWNED,
    items: [{ productId: "mat-pork", requestedQty: 1 }]
  }), /รองรับเฉพาะสาขาภูดอย/);
});

test("material request issues stock when office marks packing complete", () => {
  const db = freshDb();
  const request = createMaterialRequest(db, {
    branchId: "br-phu-doi",
    items: [{ productId: "mat-pork", requestedQty: 5 }]
  });
  const before = getBalance(db, "br-phu-doi", "mat-pork");

  const shipped = advanceMaterialRequest(db, request.id);
  assert.equal(shipped.status, "SHIPPED");
  assert.equal(shipped.issueTransactionIds.length, 1);
  assert.equal(getBalance(db, "br-phu-doi", "mat-pork"), before - 5);
});

test("new branch requests use readable date sequence ids without branch codes", () => {
  const db = freshDb();
  const material = createMaterialRequest(db, {
    branchId: "br-phu-doi",
    items: [{ productId: "mat-pork", requestedQty: 5 }]
  });
  const food = createFoodRequest(db, {
    branchId: "br-phu-doi",
    items: [{ productId: "food-pork", requestedQty: 5 }]
  });

  assert.match(material.id, /^OF\d{11}$/);
  assert.match(food.id, /^KC\d{11}$/);
});

test("kitchen sends a food request with one status update", () => {
  const db = freshDb();
  const request = createFoodRequest(db, {
    branchId: "br-phu-doi",
    items: [{ productId: "food-pork", requestedQty: 5 }]
  });

  const shipped = advanceFoodRequest(db, request.id);
  assert.equal(shipped.status, "SHIPPED");
});

test("production rooms can save only their own request quantities", () => {
  const db = freshDb();
  const request = createFoodRequest(db, {
    branchId: "br-phu-doi",
    items: [
      { productId: "food-pork", requestedQty: 10 },
      { productId: "food-tea", requestedQty: 4 }
    ]
  });

  const updated = updateFoodRequestProduction(db, request.id, {
    productionRoom: "ห้องอาหาร",
    items: [{ productId: "food-pork", deliveredQty: 8 }]
  });

  assert.equal(updated.items.find((item) => item.productId === "food-pork").deliveredQty, 8);
  assert.equal(updated.items.find((item) => item.productId === "food-tea").deliveredQty, 0);
  assert.equal(db.foodRequests.find((item) => item.id === request.id).status, "CREATED");
});

test("reorder point is branch and product specific", () => {
  const db = freshDb();
  setReorderPoint(db, "br-tha-rua-2", "mat-box", 125, 200);

  const box = getInventorySnapshot(db).find((item) => item.branchId === "br-tha-rua-2" && item.productId === "mat-box");
  assert.equal(box.reorderPoint, 125);
  assert.equal(box.targetStock, 200);
  assert.equal(box.reserveTarget, 200);
  assert.equal(box.suggestedPurchaseQty, 200);
  assert.equal(box.isLow, true);
});

test("branch daily closing estimates used quantity and distinguishes waste", () => {
  const db = freshDb();
  const closing = upsertBranchDailyClosing(db, {
    branchId: "br-phu-doi",
    closingDate: "2026-07-21",
    entries: [{
      sourceType: "KITCHEN",
      productId: "food-pork",
      openingQty: 5,
      receivedQty: 20,
      endingQty: 3,
      wasteQty: 2,
      wasteReason: "หมดอายุ"
    }]
  });

  assert.equal(closing.status, "HAS_WASTE");
  assert.equal(closing.entries[0].estimatedUsedQty, 20);
});

test("branch daily closing accepts ending-only rows and manually added items", () => {
  const db = freshDb();
  const closing = upsertBranchDailyClosing(db, {
    branchId: "br-phu-doi",
    closingDate: "2026-07-22",
    entries: [
      { sourceType: "KITCHEN", productId: "food-pork", endingQty: 3 },
      { sourceType: "CENTRAL_WAREHOUSE", productId: "mat-rice", endingQty: 4 },
      { sourceType: "BRANCH_MADE", itemName: "น้ำจิ้มทำเอง", unit: "ขวด", endingQty: 2 }
    ]
  });

  assert.equal(closing.status, "RECORDED");
  assert.equal(closing.entries[0].entryMode, "ENDING_ONLY");
  assert.equal(closing.entries[0].endingQty, 3);
  assert.equal(closing.entries[0].estimatedUsedQty, null);
  assert.equal(closing.entries[1].itemName, "ข้าวสาร");
  assert.equal(closing.entries[1].productId, "mat-rice");
  assert.equal(closing.entries[2].itemName, "น้ำจิ้มทำเอง");
  assert.equal(closing.entries[2].unit, "ขวด");
});

test("branch daily closing can be saved with no listed items", () => {
  const db = freshDb();
  const closing = upsertBranchDailyClosing(db, {
    branchId: "br-phu-doi",
    closingDate: "2026-07-23",
    entries: []
  });

  assert.equal(closing.status, "RECORDED");
  assert.deepEqual(closing.entries, []);
});

test("products without reorder point do not create low stock alerts", () => {
  const db = freshDb();
  const pork = getInventorySnapshot(db).find((item) => item.branchId === "br-kaset-mai" && item.productId === "mat-pork");

  assert.equal(pork.reorderPoint, 0);
  assert.equal(pork.quantity, 0);
  assert.equal(pork.isLow, false);
});

test("material products keep only direct cost while food products can have selling price", () => {
  const db = freshDb();

  const material = createProduct(db, "material", {
    name: "ถ้วยซุป",
    category: "บรรจุภัณฑ์",
    unit: "ใบ",
    standardCost: 2.5,
    sellingPrice: 99
  });
  const food = createProduct(db, "food", {
    name: "หมูย่างกล่อง",
    category: "อาหารสำเร็จรูป",
    unit: "กล่อง",
    standardCost: 45,
    sellingPrice: 89,
    productionRoom: "ห้องอาหาร"
  });

  assert.equal(material.sellingPrice, 0);
  assert.equal(food.sellingPrice, 89);
});

test("food products require a production room", () => {
  const db = freshDb();

  assert.throws(() => createProduct(db, "food", {
    name: "เมนูที่ยังไม่ระบุห้อง",
    category: "อาหารสำเร็จรูป",
    unit: "กล่อง",
    standardCost: 20,
    sellingPrice: 40
  }), /กรุณาเลือกห้องผลิต/);
});

test("food price updates keep existing cost and production room", () => {
  const db = freshDb();
  const before = db.foodProducts.find((product) => product.id === "food-pork");

  updateProductPricing(db, "food", before.id, {
    sellingPrice: 345,
    productionRoom: "ครัวกลาง"
  });

  assert.equal(before.standardCost, 210);
  assert.equal(before.sellingPrice, 345);
  assert.equal(before.productionRoom, "ครัวกลาง");
});

test("material product details can update name, unit, and cost", () => {
  const db = freshDb();
  const product = db.materialProducts.find((item) => item.id === "mat-pork");

  updateProductPricing(db, "material", product.id, {
    name: "หมูสดคัดพิเศษ",
    category: "วัตถุดิบ",
    unit: "กก.",
    standardCost: 175
  });

  assert.equal(product.name, "หมูสดคัดพิเศษ");
  assert.equal(product.unit, "กก.");
  assert.equal(product.standardCost, 175);
});

test("kitchen extra dispatch snapshots price and production room", () => {
  const db = freshDb();
  const dispatch = createKitchenDispatch(db, {
    branchId: "br-ban-jo",
    productId: "food-tea",
    actualQty: 12,
    status: "SHIPPED"
  });

  assert.equal(dispatch.sourceType, "KITCHEN_EXTRA");
  assert.equal(dispatch.sourceLabel, "ส่งเพิ่ม");
  assert.equal(dispatch.productionRoom, "ห้องของหวาน");
  assert.equal(dispatch.totalSellingValue, 540);
});

test("kitchen can create several extra dispatches for one branch in one submission", () => {
  const db = freshDb();
  const dispatches = createKitchenDispatchBatch(db, {
    branchId: "br-ban-jo",
    status: "SHIPPED",
    dispatchDate: "2026-08-25",
    dispatchTime: "09:30",
    items: [
      { productId: "food-tea", actualQty: 12 },
      { productId: "food-herbal", actualQty: 8 }
    ]
  });

  assert.equal(dispatches.length, 2);
  assert.deepEqual(dispatches.map((item) => item.productId), ["food-tea", "food-herbal"]);
  assert.equal(dispatches.every((item) => item.branchId === "br-ban-jo"), true);
  assert.equal(dispatches.every((item) => item.status === "SHIPPED"), true);
});

test("daily sales update one branch date and feed owner reports", () => {
  const db = freshDb();
  const salesDate = new Date().toISOString().slice(0, 10);

  upsertDailySales(db, {
    branchId: "br-phu-doi",
    salesDate,
    cashSales: 1000,
    transferSales: 2500,
    remarks: "ปิดยอด"
  });
  upsertDailySales(db, {
    branchId: "br-phu-doi",
    salesDate,
    cashSales: 1200,
    transferSales: 2800,
    remarks: "แก้ยอด"
  });

  const records = db.dailySales.filter((item) => item.branchId === "br-phu-doi" && item.salesDate === salesDate);
  assert.equal(records.length, 1);
  assert.equal(records[0].cashSales, 1200);
  assert.equal(records[0].transferSales, 2800);

  const report = getReports(db).todayBranchUsage.find((item) => item.branchId === "br-phu-doi");
  assert.equal(report.sales, 4000);
  assert.equal(report.grossProfit, report.sales - report.totalCost);
});
