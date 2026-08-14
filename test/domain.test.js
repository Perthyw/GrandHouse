import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceMaterialRequest,
  createFoodRequest,
  createInventoryTransaction,
  createKitchenDispatch,
  createProduct,
  createMaterialRequest,
  getReports,
  getBalance,
  getInventorySnapshot,
  setReorderPoint,
  updateProductPricing,
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

test("material request issues stock only when office marks packing complete", () => {
  const db = freshDb();
  const request = createMaterialRequest(db, {
    branchId: "br-phu-doi",
    items: [{ productId: "mat-pork", requestedQty: 5 }]
  });
  const before = getBalance(db, "br-phu-doi", "mat-pork");

  advanceMaterialRequest(db, request.id);
  assert.equal(getBalance(db, "br-phu-doi", "mat-pork"), before);

  advanceMaterialRequest(db, request.id);
  assert.equal(getBalance(db, "br-phu-doi", "mat-pork"), before);

  const ready = advanceMaterialRequest(db, request.id);
  assert.equal(ready.issueTransactionIds.length, 1);
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

test("reorder point is branch and product specific", () => {
  const db = freshDb();
  setReorderPoint(db, "br-tha-rua-2", "mat-box", 125);

  const box = getInventorySnapshot(db).find((item) => item.branchId === "br-tha-rua-2" && item.productId === "mat-box");
  assert.equal(box.reorderPoint, 125);
  assert.equal(box.isLow, true);
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
    sellingPrice: 89
  });

  assert.equal(material.sellingPrice, 0);
  assert.equal(food.sellingPrice, 89);
});

test("food price updates keep existing cost and production room", () => {
  const db = freshDb();
  const before = db.foodProducts.find((product) => product.id === "food-pork");

  updateProductPricing(db, "food", before.id, {
    sellingPrice: 345,
    productionRoom: "ห้องอาหาร2"
  });

  assert.equal(before.standardCost, 210);
  assert.equal(before.sellingPrice, 345);
  assert.equal(before.productionRoom, "ห้องอาหาร2");
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
  assert.equal(dispatch.sourceLabel, "ครัวกลางส่งเพิ่ม");
  assert.equal(dispatch.productionRoom, "ห้องของหวาน");
  assert.equal(dispatch.totalSellingValue, 540);
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
