const transactionLabels = {
  PURCHASE: "ซื้อเข้า",
  MATERIAL_REQUEST: "เบิกวัตถุดิบ",
  MANUAL_ISSUE: "เบิกออกเอง",
  ADJUSTMENT: "ปรับสต็อก",
  DAMAGE: "ของเสีย",
  EXPIRED: "หมดอายุ"
};

const foodTransitions = {
  CREATED: "SHIPPED",
  SHIPPED: "BRANCH_RECEIVED"
};

const materialTransitions = {
  CREATED: "OFFICE_RECEIVED",
  OFFICE_RECEIVED: "PREPARING",
  PREPARING: "READY",
  READY: "SHIPPED",
  SHIPPED: "BRANCH_RECEIVED"
};

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix, collection) {
  const today = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const count = collection.filter((item) => item.id.includes(today)).length + 1;
  return `${prefix}-${today}-${String(count).padStart(3, "0")}`;
}

export function formatType(type) {
  return transactionLabels[type] || type;
}

export function getProduct(db, productId) {
  const product = db.materialProducts.find((item) => item.id === productId);
  if (!product) throw new Error("ไม่พบสินค้าวัตถุดิบ");
  return product;
}

export function getFoodProduct(db, productId) {
  const product = db.foodProducts.find((item) => item.id === productId);
  if (!product) throw new Error("ไม่พบเมนูอาหาร");
  return product;
}

export function getBranch(db, branchId) {
  const branch = db.branches.find((item) => item.id === branchId);
  if (!branch) throw new Error("ไม่พบสาขา");
  return branch;
}

export function getBalance(db, branchId, productId) {
  return db.inventoryTransactions
    .filter((txn) => txn.branchId === branchId && txn.productId === productId)
    .reduce((sum, txn) => sum + Number(txn.quantityChanged), 0);
}

export function getInventorySnapshot(db) {
  return db.branches.flatMap((branch) =>
    db.materialProducts.map((product) => {
      const quantity = getBalance(db, branch.id, product.id);
      const setting = db.inventorySettings.find(
        (item) => item.branchId === branch.id && item.productId === product.id
      );
      const reorderPoint = setting?.reorderPoint ?? 0;
      return {
        branchId: branch.id,
        branchName: branch.name,
        warehouseName: branch.warehouseName,
        productId: product.id,
        productName: product.name,
        category: product.category || "",
        unit: product.unit,
        standardCost: product.standardCost,
        quantity,
        reorderPoint,
        inventoryValue: roundMoney(quantity * product.standardCost),
        isLow: reorderPoint > 0 && quantity <= reorderPoint
      };
    })
  );
}

export function createInventoryTransaction(db, input) {
  const product = getProduct(db, input.productId);
  getBranch(db, input.branchId);

  const quantityChanged = Number(input.quantityChanged);
  if (!Number.isFinite(quantityChanged) || quantityChanged === 0) {
    throw new Error("จำนวนเคลื่อนไหวต้องไม่เป็นศูนย์");
  }

  const previousQuantity = getBalance(db, input.branchId, input.productId);
  const currentQuantity = previousQuantity + quantityChanged;
  if (currentQuantity < 0) {
    throw new Error(`${product.name} มีสต็อกไม่พอสำหรับรายการนี้`);
  }

  const unitCost = Number(input.unitCost ?? product.standardCost);
  const transaction = {
    id: makeId("TXN", db.inventoryTransactions),
    dateTime: input.dateTime || nowIso(),
    branchId: input.branchId,
    productId: input.productId,
    type: input.type,
    referenceNumber: input.referenceNumber || makeId(referencePrefix(input.type), db.inventoryTransactions),
    previousQuantity,
    quantityChanged,
    currentQuantity,
    unitCost,
    totalValue: roundMoney(quantityChanged * unitCost),
    createdBy: input.createdBy || "ออฟฟิศ",
    remarks: input.remarks || ""
  };

  db.inventoryTransactions.push(transaction);
  return transaction;
}

export function setReorderPoint(db, branchId, productId, reorderPoint) {
  getBranch(db, branchId);
  getProduct(db, productId);
  const nextPoint = Number(reorderPoint);
  if (!Number.isFinite(nextPoint) || nextPoint < 0) throw new Error("จุดสั่งซื้อขั้นต่ำต้องไม่ต่ำกว่าศูนย์");

  let setting = db.inventorySettings.find((item) => item.branchId === branchId && item.productId === productId);
  if (!setting) {
    setting = { branchId, productId, reorderPoint: nextPoint };
    db.inventorySettings.push(setting);
  } else {
    setting.reorderPoint = nextPoint;
  }
  return setting;
}

export function createMaterialRequest(db, input) {
  getBranch(db, input.branchId);
  const items = cleanRequestItems(db, input.items);
  const request = {
    id: makeDateSequenceId("OF", db.materialRequests),
    branchId: input.branchId,
    status: "CREATED",
    createdAt: nowIso(),
    items: items.map((item) => ({ ...item, actualIssuedQty: item.requestedQty })),
    timeline: [{ at: nowIso(), label: "สาขาสร้างรายการ" }],
    issueTransactionIds: []
  };
  db.materialRequests.unshift(request);
  return enrichMaterialRequest(db, request);
}

export function createFoodRequest(db, input) {
  getBranch(db, input.branchId);
  const items = input.items
    .map((item) => {
      const product = getFoodProduct(db, item.productId);
      const requestedQty = positiveNumber(item.requestedQty, "จำนวนที่ขอเบิก");
      return {
        productId: product.id,
        requestedQty,
        deliveredQty: requestedQty,
        unitCost: Number(product.standardCost || 0),
        sellingPrice: Number(product.sellingPrice || 0),
        productionRoom: product.productionRoom || defaultProductionRoom(product),
        status: "REQUESTED"
      };
    })
    .filter(Boolean);

  if (!items.length) throw new Error("กรุณาเพิ่มเมนูอย่างน้อยหนึ่งรายการ");

  const request = {
    id: makeDateSequenceId("KC", db.foodRequests),
    branchId: input.branchId,
    sourceType: "BRANCH_REQUEST",
    status: "CREATED",
    createdAt: nowIso(),
    items,
    timeline: [{ at: nowIso(), label: "สาขาสร้างรายการ" }]
  };
  db.foodRequests.unshift(request);
  return enrichFoodRequest(db, request);
}

export function createKitchenDispatch(db, input) {
  getBranch(db, input.branchId);
  const product = getFoodProduct(db, input.productId);
  const actualQty = positiveNumber(input.actualQty ?? input.quantity ?? input.plannedQty, "จำนวนที่ส่งเพิ่ม");

  const dispatch = {
    id: makeDateSequenceId("KC", db.kitchenDispatches || []),
    branchId: input.branchId,
    productId: product.id,
    sourceType: input.sourceType || "KITCHEN_EXTRA",
    plannedQty: actualQty,
    actualQty,
    unitCost: Number(product.standardCost || 0),
    sellingPrice: Number(product.sellingPrice || 0),
    productionRoom: product.productionRoom || defaultProductionRoom(product),
    status: input.status || "PLANNED",
    dispatchDate: input.dispatchDate || new Date().toISOString().slice(0, 10),
    dispatchTime: input.dispatchTime || new Date().toTimeString().slice(0, 5),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    timeline: [{ at: nowIso(), label: labelForStatus(input.status || "PLANNED") }],
    remarks: input.remarks || ""
  };

  db.kitchenDispatches ||= [];
  db.kitchenDispatches.unshift(dispatch);
  return enrichKitchenDispatch(db, dispatch);
}

export function updateKitchenDispatch(db, dispatchId, updates = {}) {
  const dispatch = (db.kitchenDispatches || []).find((item) => item.id === dispatchId);
  if (!dispatch) throw new Error("ไม่พบรายการส่งจากครัวกลาง");

  if (updates.actualQty != null) {
    const actualQty = Number(updates.actualQty);
    if (!Number.isFinite(actualQty) || actualQty < 0) throw new Error("จำนวนส่งจริงต้องไม่ต่ำกว่าศูนย์");
    dispatch.actualQty = actualQty;
  }
  if (updates.status) dispatch.status = updates.status;
  if (updates.remarks != null) dispatch.remarks = updates.remarks;
  if (updates.dispatchTime != null) dispatch.dispatchTime = updates.dispatchTime;
  dispatch.updatedAt = nowIso();
  dispatch.timeline ||= [];
  dispatch.timeline.push({ at: nowIso(), label: labelForStatus(dispatch.status) });
  return enrichKitchenDispatch(db, dispatch);
}

export function updateProductPricing(db, kind, productId, input) {
  const collection = kind === "food" ? db.foodProducts : db.materialProducts;
  const product = collection.find((item) => item.id === productId);
  if (!product) throw new Error("ไม่พบสินค้า");

  const standardCost = input.standardCost == null || input.standardCost === "" ? Number(product.standardCost || 0) : Number(input.standardCost);
  const sellingPrice = kind === "food" ? Number(input.sellingPrice) : 0;
  if (!Number.isFinite(standardCost) || standardCost < 0) throw new Error("ต้นทุนต้องไม่ต่ำกว่าศูนย์");
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error("ราคาขายต้องไม่ต่ำกว่าศูนย์");

  product.standardCost = roundMoney(standardCost);
  product.sellingPrice = roundMoney(sellingPrice);
  if (input.category != null) product.category = String(input.category);
  if (input.unit != null) product.unit = String(input.unit);
  if (kind === "food" && input.productionRoom != null) product.productionRoom = String(input.productionRoom);
  if (input.imageData != null) product.imageData = String(input.imageData || "");
  return product;
}

export function createProduct(db, kind, input) {
  const collection = kind === "food" ? db.foodProducts : db.materialProducts;
  if (!collection) throw new Error("ประเภทสินค้าไม่ถูกต้อง");

  const name = String(input.name || "").trim();
  const category = String(input.category || "").trim();
  const unit = String(input.unit || "").trim();
  const standardCost = Number(input.standardCost || 0);
  const sellingPrice = kind === "food" ? Number(input.sellingPrice) : 0;

  if (!name) throw new Error("กรุณากรอกชื่อสินค้า");
  if (!category) throw new Error("กรุณากรอกหมวดหมู่");
  if (!unit) throw new Error("กรุณากรอกหน่วย");
  if (!Number.isFinite(standardCost) || standardCost < 0) throw new Error("ต้นทุนต้องไม่ต่ำกว่าศูนย์");
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error("ราคาขายต้องไม่ต่ำกว่าศูนย์");

  const product = {
    id: makeProductId(kind === "food" ? "food" : "mat", collection),
    name,
    category,
    unit,
    standardCost: roundMoney(standardCost),
    sellingPrice: kind === "food" ? roundMoney(sellingPrice) : 0,
    imageData: String(input.imageData || ""),
    ...(kind === "food" ? { productionRoom: String(input.productionRoom || defaultProductionRoom({ name, category })) } : {})
  };
  collection.push(product);
  return product;
}

export function upsertDailySales(db, input) {
  getBranch(db, input.branchId);
  const salesDate = String(input.salesDate || "").slice(0, 10);
  if (!salesDate) throw new Error("กรุณาเลือกวันที่ขาย");

  const cashSales = nonNegativeMoney(input.cashSales, "ยอดเงินสด");
  const transferSales = nonNegativeMoney(input.transferSales, "ยอดสแกน/โอน");
  db.dailySales ||= [];

  let record = db.dailySales.find((item) => item.branchId === input.branchId && item.salesDate === salesDate);
  if (!record) {
    record = {
      id: makeDateSequenceId("SALE", db.dailySales),
      branchId: input.branchId,
      salesDate,
      cashSales: 0,
      transferSales: 0,
      remarks: ""
    };
    db.dailySales.unshift(record);
  }

  record.cashSales = roundMoney(cashSales);
  record.transferSales = roundMoney(transferSales);
  record.remarks = String(input.remarks || "");
  record.updatedAt = nowIso();
  return enrichDailySale(db, record);
}

export function advanceFoodRequest(db, requestId, updates = {}) {
  const request = db.foodRequests.find((item) => item.id === requestId);
  if (!request) throw new Error("ไม่พบรายการเบิกอาหาร");

  if (updates.items) {
    request.items = request.items.map((item) => {
      const next = updates.items.find((candidate) => candidate.productId === item.productId);
      if (!next) return item;
      return { ...item, deliveredQty: Math.max(0, Number(next.deliveredQty ?? item.deliveredQty)) };
    });
  }

  const nextStatus = foodTransitions[request.status];
  if (!nextStatus) return enrichFoodRequest(db, request);
  request.status = nextStatus;
  request.timeline.push({ at: nowIso(), label: labelForStatus(nextStatus) });
  return enrichFoodRequest(db, request);
}

export function advanceMaterialRequest(db, requestId, updates = {}) {
  const request = db.materialRequests.find((item) => item.id === requestId);
  if (!request) throw new Error("ไม่พบรายการเบิกวัตถุดิบ");

  if (updates.items) {
    request.items = request.items.map((item) => {
      const next = updates.items.find((candidate) => candidate.productId === item.productId);
      if (!next) return item;
      return { ...item, actualIssuedQty: Math.max(0, Number(next.actualIssuedQty ?? item.actualIssuedQty)) };
    });
  }

  const nextStatus = materialTransitions[request.status];
  if (!nextStatus) return enrichMaterialRequest(db, request);

  if (nextStatus === "READY" && !request.issueTransactionIds?.length) {
    request.issueTransactionIds = request.items
      .filter((item) => Number(item.actualIssuedQty) > 0)
      .map((item) => {
        const product = getProduct(db, item.productId);
        const txn = createInventoryTransaction(db, {
          branchId: request.branchId,
          productId: item.productId,
          type: "MATERIAL_REQUEST",
          referenceNumber: request.id,
          quantityChanged: -Number(item.actualIssuedQty),
          unitCost: product.standardCost,
          createdBy: "ออฟฟิศ",
          remarks: "ตัดสต็อกจากรายการเบิกวัตถุดิบ"
        });
        return txn.id;
      });
  }

  request.status = nextStatus;
  request.timeline.push({ at: nowIso(), label: labelForStatus(nextStatus) });
  return enrichMaterialRequest(db, request);
}

export function getReports(db) {
  const snapshot = getInventorySnapshot(db);
  const today = new Date().toISOString().slice(0, 10);
  const issueTypes = new Set(["MATERIAL_REQUEST", "MANUAL_ISSUE", "DAMAGE", "EXPIRED"]);
  const dailyIssuedCost = db.inventoryTransactions
    .filter((txn) => txn.dateTime.slice(0, 10) === today && issueTypes.has(txn.type))
    .reduce((sum, txn) => sum + Math.abs(txn.totalValue), 0);

  return {
    dailyIssuedCost: roundMoney(dailyIssuedCost),
    todayBranchUsage: db.branches.map((branch) => {
      const materialCost = db.materialRequests
        .filter((request) => request.branchId === branch.id && request.createdAt.slice(0, 10) === today)
        .reduce((sum, request) => sum + enrichMaterialRequest(db, request).totalCost, 0);
      const foodCost = db.foodRequests
        .filter((request) => request.branchId === branch.id && request.createdAt.slice(0, 10) === today)
        .reduce((sum, request) => sum + enrichFoodRequest(db, request).totalCost, 0);
      const foodSelling = db.foodRequests
        .filter((request) => request.branchId === branch.id && request.createdAt.slice(0, 10) === today)
        .reduce((sum, request) => sum + enrichFoodRequest(db, request).totalSellingValue, 0);
      const sales = (db.dailySales || [])
        .filter((sale) => sale.branchId === branch.id && sale.salesDate === today)
        .reduce((sum, sale) => sum + Number(sale.cashSales || 0) + Number(sale.transferSales || 0), 0);
      return {
        branchId: branch.id,
        branchName: branch.name,
        sales: roundMoney(sales),
        materialCost: roundMoney(materialCost),
        foodCost: roundMoney(foodCost),
        foodSellingValue: roundMoney(foodSelling),
        totalCost: roundMoney(materialCost + foodCost),
        grossProfit: roundMoney(sales - materialCost - foodCost)
      };
    }),
    inventoryValueByBranch: db.branches.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      value: roundMoney(snapshot.filter((item) => item.branchId === branch.id).reduce((sum, item) => sum + item.inventoryValue, 0))
    })),
    lowInventory: snapshot.filter((item) => item.isLow),
    purchaseHistory: db.inventoryTransactions.filter((txn) => txn.type === "PURCHASE"),
    inventoryTransactionHistory: db.inventoryTransactions,
    materialRequestHistory: db.materialRequests.map((request) => enrichMaterialRequest(db, request)),
    foodRequestHistory: db.foodRequests.map((request) => enrichFoodRequest(db, request)),
    kitchenDispatchHistory: (db.kitchenDispatches || []).map((dispatch) => enrichKitchenDispatch(db, dispatch)),
    dailySalesHistory: (db.dailySales || []).map((sale) => enrichDailySale(db, sale))
  };
}

export function enrichAll(db) {
  return {
    ...db,
    foodProducts: db.foodProducts.map((product) => ({
      ...product,
      productionRoom: product.productionRoom || defaultProductionRoom(product)
    })),
    inventorySnapshot: getInventorySnapshot(db),
    foodRequests: db.foodRequests.map((request) => enrichFoodRequest(db, request)),
    materialRequests: db.materialRequests.map((request) => enrichMaterialRequest(db, request)),
    kitchenDispatches: (db.kitchenDispatches || []).map((dispatch) => enrichKitchenDispatch(db, dispatch)),
    dailySales: (db.dailySales || []).map((sale) => enrichDailySale(db, sale)),
    reports: getReports(db)
  };
}

function enrichDailySale(db, sale) {
  const cashSales = Number(sale.cashSales || 0);
  const transferSales = Number(sale.transferSales || 0);
  return {
    ...sale,
    branchName: db.branches.find((branch) => branch.id === sale.branchId)?.name || sale.branchId,
    cashSales: roundMoney(cashSales),
    transferSales: roundMoney(transferSales),
    totalSales: roundMoney(cashSales + transferSales)
  };
}

function enrichFoodRequest(db, request) {
  return {
    ...request,
    sourceType: request.sourceType || "BRANCH_REQUEST",
    sourceLabel: "สาขาเบิกเพิ่ม",
    branchName: db.branches.find((branch) => branch.id === request.branchId)?.name || request.branchId,
    totalCost: roundMoney(
      request.items.reduce((sum, item) => {
        const product = db.foodProducts.find((food) => food.id === item.productId);
        return sum + Number(item.deliveredQty || 0) * Number(item.unitCost ?? product?.standardCost ?? 0);
      }, 0)
    ),
    totalSellingValue: roundMoney(
      request.items.reduce((sum, item) => {
        const product = db.foodProducts.find((food) => food.id === item.productId);
        return sum + Number(item.deliveredQty || 0) * Number(item.sellingPrice ?? product?.sellingPrice ?? 0);
      }, 0)
    ),
    items: request.items.map((item) => {
      const product = db.foodProducts.find((food) => food.id === item.productId);
      const deliveredQty = Number(item.deliveredQty || 0);
      const unitCost = Number(item.unitCost ?? product?.standardCost ?? 0);
      const sellingPrice = Number(item.sellingPrice ?? product?.sellingPrice ?? 0);
      return {
        ...item,
        productName: product?.name || item.productId,
        unit: product?.unit || "",
        standardCost: unitCost,
        sellingPrice,
        productionRoom: item.productionRoom || product?.productionRoom || defaultProductionRoom(product || {}),
        totalCost: roundMoney(deliveredQty * unitCost),
        totalSellingValue: roundMoney(deliveredQty * sellingPrice)
      };
    })
  };
}

function enrichMaterialRequest(db, request) {
  return {
    ...request,
    branchName: db.branches.find((branch) => branch.id === request.branchId)?.name || request.branchId,
    totalCost: roundMoney(
      request.items.reduce((sum, item) => {
        const product = db.materialProducts.find((material) => material.id === item.productId);
        const txn = db.inventoryTransactions.find((entry) => request.issueTransactionIds?.includes(entry.id) && entry.productId === item.productId);
        return sum + Number(item.actualIssuedQty || 0) * Number(txn?.unitCost ?? product?.standardCost ?? 0);
      }, 0)
    ),
    totalSellingValue: roundMoney(
      request.items.reduce((sum, item) => {
        const product = db.materialProducts.find((material) => material.id === item.productId);
        return sum + Number(item.actualIssuedQty || 0) * Number(product?.sellingPrice || 0);
      }, 0)
    ),
    items: request.items.map((item) => {
      const product = db.materialProducts.find((material) => material.id === item.productId);
      const txn = db.inventoryTransactions.find((entry) => request.issueTransactionIds?.includes(entry.id) && entry.productId === item.productId);
      const actualIssuedQty = Number(item.actualIssuedQty || 0);
      return {
        ...item,
        productName: product?.name || item.productId,
        unit: product?.unit || "",
        category: product?.category || "",
        unitCost: Number(txn?.unitCost ?? product?.standardCost ?? 0),
        sellingPrice: product?.sellingPrice || 0,
        totalCost: roundMoney(actualIssuedQty * Number(txn?.unitCost ?? product?.standardCost ?? 0)),
        totalSellingValue: roundMoney(actualIssuedQty * Number(product?.sellingPrice || 0))
      };
    })
  };
}

function enrichKitchenDispatch(db, dispatch) {
  const product = db.foodProducts.find((food) => food.id === dispatch.productId);
  const actualQty = Number(dispatch.actualQty || 0);
  const unitCost = Number(dispatch.unitCost ?? product?.standardCost ?? 0);
  const sellingPrice = Number(dispatch.sellingPrice ?? product?.sellingPrice ?? 0);
  return {
    ...dispatch,
    sourceType: dispatch.sourceType || "KITCHEN_EXTRA",
    sourceLabel: (dispatch.sourceType || "KITCHEN_EXTRA") === "BRANCH_REQUEST" ? "สาขาเบิกเพิ่ม" : "ครัวกลางส่งเพิ่ม",
    branchName: db.branches.find((branch) => branch.id === dispatch.branchId)?.name || dispatch.branchId,
    productName: product?.name || dispatch.productId,
    category: product?.category || "",
    unit: product?.unit || "",
    standardCost: unitCost,
    sellingPrice,
    productionRoom: dispatch.productionRoom || product?.productionRoom || defaultProductionRoom(product || {}),
    totalCost: roundMoney(actualQty * unitCost),
    totalSellingValue: roundMoney(actualQty * sellingPrice)
  };
}

function defaultProductionRoom(product = {}) {
  const text = `${product.name || ""} ${product.category || ""}`;
  if (text.includes("สลัด")) return "ห้องสลัด";
  if (text.includes("ผลไม้") || text.includes("สมุนไพร")) return "ห้องผลไม้";
  if (text.includes("หวาน") || text.includes("ชา") || text.includes("ขนม")) return "ห้องของหวาน";
  if (text.includes("เนื้อ")) return "ครัวกลาง";
  return "ห้องอาหาร";
}

function cleanRequestItems(db, items) {
  const cleaned = items
    .map((item) => {
      const product = getProduct(db, item.productId);
      return { productId: product.id, requestedQty: positiveNumber(item.requestedQty, "จำนวนที่ขอเบิก") };
    })
    .filter(Boolean);
  if (!cleaned.length) throw new Error("กรุณาเพิ่มวัตถุดิบอย่างน้อยหนึ่งรายการ");
  return cleaned;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} ต้องมากกว่าศูนย์`);
  return number;
}

function nonNegativeMoney(value, label) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label}ต้องไม่ต่ำกว่าศูนย์`);
  return number;
}

function referencePrefix(type) {
  return {
    PURCHASE: "PO",
    MATERIAL_REQUEST: "MR",
    MANUAL_ISSUE: "ISS",
    ADJUSTMENT: "ADJ",
    DAMAGE: "DMG",
    EXPIRED: "EXP"
  }[type] || "TXN";
}

function makeProductId(prefix, collection) {
  let index = collection.length + 1;
  let id = `${prefix}-custom-${String(index).padStart(3, "0")}`;
  while (collection.some((item) => item.id === id)) {
    index += 1;
    id = `${prefix}-custom-${String(index).padStart(3, "0")}`;
  }
  return id;
}

function makeDateSequenceId(prefix, collection) {
  const now = new Date();
  const dateCode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const count = collection.filter((item) => String(item.id).startsWith(`${prefix}${dateCode}`)).length + 1;
  return `${prefix}${dateCode}${String(count).padStart(3, "0")}`;
}

function labelForStatus(status) {
  return {
    PLANNED: "รอส่ง",
    SHIPPED: "จัดส่งแล้ว",
    CREATED: "สร้างรายการ",
    ACCEPTED: "รับเรื่อง",
    START_PRODUCTION: "เริ่มผลิต",
    READY_TO_DELIVER: "พร้อมจัดส่ง",
    BRANCH_RECEIVED: "สาขารับของแล้ว",
    COMPLETED: "เสร็จสิ้น",
    OFFICE_RECEIVED: "ออฟฟิศรับเรื่อง",
    PREPARING: "จัดของ",
    READY: "พร้อมส่ง"
  }[status] || status;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
