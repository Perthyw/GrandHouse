const transactionLabels = {
  PURCHASE: "ซื้อเข้า",
  BRANCH_DEPOSIT: "รับฝากจากสาขา",
  MATERIAL_REQUEST: "เบิกวัตถุดิบ",
  MANUAL_ISSUE: "เบิกออกเอง",
  ADJUSTMENT: "ปรับสต็อก",
  DAMAGE: "ของเสีย",
  EXPIRED: "หมดอายุ"
};

export const stockOwnerTypes = {
  GRAND_SUPPLIED: "GRAND_SUPPLIED",
  BRANCH_OWNED: "BRANCH_OWNED"
};

// Office-held stock can belong to Grand or be a branch's own stock temporarily
//ฝากไว้ที่ออฟฟิศ.  These owners are deliberately separate from operational
// branches: Phela is a sibling shop, not one of the five branch workspaces.
export const defaultOfficeStockOwners = [
  { id: "grand", type: stockOwnerTypes.GRAND_SUPPLIED, name: "แกรนด์", label: "ของแกรนด์", hasCost: true },
  { id: "br-phu-doi", type: stockOwnerTypes.BRANCH_OWNED, name: "ภูดอย", label: "ของภูดอยฝากเก็บ", hasCost: false },
  { id: "owner-phela", type: stockOwnerTypes.BRANCH_OWNED, name: "เพลา", label: "ของเพลาฝากเก็บ", hasCost: false }
];

export function getOfficeStockOwners(db) {
  const configured = Array.isArray(db.stockOwners) ? db.stockOwners : [];
  const merged = defaultOfficeStockOwners.map((fallback) => ({
    ...fallback,
    ...(configured.find((owner) => owner.id === fallback.id) || {})
  }));
  configured.filter((owner) => !merged.some((item) => item.id === owner.id)).forEach((owner) => merged.push(owner));
  return merged;
}

export function getOfficeStockOwner(db, ownerId) {
  return getOfficeStockOwners(db).find((owner) => owner.id === String(ownerId || ""));
}

const validTransactionTypes = new Set(Object.keys(transactionLabels));
const OFFICE_WAREHOUSE_ID = "office";

const foodTransitions = {
  CREATED: "SHIPPED",
  SHIPPED: "BRANCH_RECEIVED"
};

const materialTransitions = {
  // Office handles the request and packing in one action. Keep the legacy
  // OFFICE_RECEIVED entry as a compatibility bridge for existing records.
  CREATED: "SHIPPED",
  OFFICE_RECEIVED: "SHIPPED",
  SHIPPED: "BRANCH_RECEIVED"
};

const validProductionRooms = ["ห้องอาหาร", "ครัวกลาง", "ห้องสลัด", "ห้องผลไม้", "ห้องของหวาน"];

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

function normalizeStockOwnerType(value) {
  return value === stockOwnerTypes.BRANCH_OWNED
    ? stockOwnerTypes.BRANCH_OWNED
    : stockOwnerTypes.GRAND_SUPPLIED;
}

function normalizeStockOwnerBranchId(value, ownerType, fallback = "") {
  return ownerType === stockOwnerTypes.BRANCH_OWNED ? String(value || fallback || "") : "";
}

function transactionWarehouseId(txn) {
  // Legacy transactions predate the office warehouse pool. Treat them as
  // office movements for the new view while leaving getBalance() compatible
  // with the original branch-scoped reports and tests.
  return String(txn.warehouseId || OFFICE_WAREHOUSE_ID);
}

function transactionOwner(txn) {
  const stockOwnerType = normalizeStockOwnerType(txn.stockOwnerType);
  return {
    stockOwnerType,
    stockOwnerBranchId: normalizeStockOwnerBranchId(txn.stockOwnerBranchId, stockOwnerType, txn.branchId)
  };
}

function transactionMatchesPool(txn, { warehouseId = OFFICE_WAREHOUSE_ID, stockOwnerType = stockOwnerTypes.GRAND_SUPPLIED, stockOwnerBranchId = "", productId } = {}) {
  const owner = transactionOwner(txn);
  return transactionWarehouseId(txn) === warehouseId
    && owner.stockOwnerType === normalizeStockOwnerType(stockOwnerType)
    && owner.stockOwnerBranchId === normalizeStockOwnerBranchId(stockOwnerBranchId, owner.stockOwnerType)
    && (!productId || txn.productId === productId);
}

export function getStockPoolBalance(db, productId, options = {}) {
  return (db.inventoryTransactions || [])
    .filter((txn) => transactionMatchesPool(txn, { ...options, productId }))
    .reduce((sum, txn) => sum + Number(txn.quantityChanged || 0), 0);
}

function getPoolAverageCost(db, productId, options = {}, fallback = 0) {
  const ownerType = normalizeStockOwnerType(options.stockOwnerType);
  if (ownerType === stockOwnerTypes.BRANCH_OWNED) return null;
  let quantity = 0;
  let value = 0;
  (db.inventoryTransactions || [])
    .filter((txn) => transactionMatchesPool(txn, { ...options, productId }))
    .slice()
    .sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)))
    .forEach((txn) => {
      const changed = Number(txn.quantityChanged || 0);
      const unitCost = Number(txn.unitCost ?? fallback);
      if (changed > 0) {
        quantity += changed;
        value += changed * unitCost;
      } else if (changed < 0) {
        const average = quantity > 0 ? value / quantity : unitCost;
        const issued = Math.min(quantity, Math.abs(changed));
        quantity -= issued;
        value = Math.max(0, value - issued * average);
      }
    });
  return roundMoney(quantity > 0 ? value / quantity : Number(fallback || 0));
}

function officePolicy(db, productId, ownerType, ownerBranchId) {
  const normalizedOwner = normalizeStockOwnerType(ownerType);
  const direct = (db.inventorySettings || []).find((setting) =>
    String(setting.warehouseId || "") === OFFICE_WAREHOUSE_ID
    && normalizeStockOwnerType(setting.stockOwnerType) === normalizedOwner
    && normalizeStockOwnerBranchId(setting.stockOwnerBranchId, normalizedOwner) === normalizeStockOwnerBranchId(ownerBranchId, normalizedOwner)
    && setting.productId === productId
  );
  if (direct) return direct;

  // Existing branch-scoped settings are retained as a safe migration bridge
  // for Grand-owned stock. Summing them gives the office a useful starting
  // point while the team replaces them with office-level thresholds.
  if (normalizedOwner === stockOwnerTypes.GRAND_SUPPLIED) {
    const legacy = (db.inventorySettings || []).filter((setting) => setting.productId === productId && !setting.warehouseId);
    if (legacy.length) {
      return {
        reorderPoint: legacy.reduce((sum, setting) => sum + Number(setting.reorderPoint || 0), 0),
        targetStock: legacy.reduce((sum, setting) => sum + Number(setting.targetStock ?? setting.reserveTarget ?? 0), 0),
        reserveTarget: legacy.reduce((sum, setting) => sum + Number(setting.targetStock ?? setting.reserveTarget ?? 0), 0),
        eoq: Math.max(...legacy.map((setting) => Number(setting.eoq || 0)), 0)
      };
    }
  }
  return { reorderPoint: 0, targetStock: 0, reserveTarget: 0, eoq: 0 };
}

export function getOfficeInventorySnapshot(db) {
  const ownerPools = [
    { stockOwnerType: stockOwnerTypes.GRAND_SUPPLIED, stockOwnerBranchId: "" },
    ...getOfficeStockOwners(db)
      .filter((owner) => owner.type === stockOwnerTypes.BRANCH_OWNED)
      .map((owner) => ({ stockOwnerType: stockOwnerTypes.BRANCH_OWNED, stockOwnerBranchId: owner.id })),
    ...[...(db.inventoryTransactions || []), ...(db.inventorySettings || [])]
      .filter((record) => normalizeStockOwnerType(record.stockOwnerType) === stockOwnerTypes.BRANCH_OWNED)
      .map((record) => ({ stockOwnerType: stockOwnerTypes.BRANCH_OWNED, stockOwnerBranchId: normalizeStockOwnerBranchId(record.stockOwnerBranchId, stockOwnerTypes.BRANCH_OWNED, record.branchId) }))
  ];
  const uniquePools = [...new Map(ownerPools.map((pool) => [`${pool.stockOwnerType}:${pool.stockOwnerBranchId}`, pool])).values()];
  return uniquePools.flatMap((pool) => db.materialProducts.map((product) => {
    const quantity = getStockPoolBalance(db, product.id, { warehouseId: OFFICE_WAREHOUSE_ID, ...pool });
    const ownerProfile = pool.stockOwnerBranchId ? getOfficeStockOwner(db, pool.stockOwnerBranchId) : getOfficeStockOwner(db, "grand");
    const ownerBranch = pool.stockOwnerBranchId ? db.branches.find((branch) => branch.id === pool.stockOwnerBranchId) : null;
    const policy = officePolicy(db, product.id, pool.stockOwnerType, pool.stockOwnerBranchId);
    const averageCost = getPoolAverageCost(db, product.id, { warehouseId: OFFICE_WAREHOUSE_ID, ...pool }, product.standardCost);
    const hasBranchOwnedActivity = pool.stockOwnerType === stockOwnerTypes.BRANCH_OWNED
      && (db.inventoryTransactions || []).some((txn) => transactionMatchesPool(txn, { warehouseId: OFFICE_WAREHOUSE_ID, ...pool, productId: product.id }));
    return {
      brandId: product.brandId || "grand-house",
      warehouseId: OFFICE_WAREHOUSE_ID,
      warehouseName: "คลังออฟฟิศ",
      branchId: ownerBranch?.id || ownerProfile?.id || "office",
      branchName: ownerProfile?.name || ownerBranch?.name || "แกรนด์",
      stockOwnerType: pool.stockOwnerType,
      stockOwnerBranchId: pool.stockOwnerBranchId,
      stockOwnerLabel: ownerProfile?.label || (ownerBranch ? `ของ${ownerBranch.name}ฝากเก็บ` : "ของแกรนด์"),
      productId: product.id,
      productName: product.name,
      category: product.category || "",
      unit: product.unit,
      standardCost: averageCost,
      averageCost,
      quantity,
      reorderPoint: Number(policy.reorderPoint || 0),
      targetStock: Number(policy.targetStock ?? policy.reserveTarget ?? 0),
      // Keep the legacy field in the snapshot for existing branch/report
      // consumers while the warehouse UI speaks in target-stock terms.
      reserveTarget: Number(policy.targetStock ?? policy.reserveTarget ?? 0),
      eoq: Number(policy.eoq || 0),
      inventoryValue: pool.stockOwnerType === stockOwnerTypes.BRANCH_OWNED || averageCost == null ? null : roundMoney(quantity * averageCost),
      isLow: Number(policy.reorderPoint || 0) > 0 && quantity <= Number(policy.reorderPoint || 0),
      isBelowReserve: Number(policy.targetStock ?? policy.reserveTarget ?? 0) > 0 && quantity < Number(policy.targetStock ?? policy.reserveTarget ?? 0),
      needsRestock: Number(policy.reorderPoint || 0) > 0
        && quantity <= Number(policy.reorderPoint || 0)
        && Number(policy.targetStock ?? policy.reserveTarget ?? 0) > quantity,
      suggestedPurchaseQty: quantity <= Number(policy.reorderPoint || 0)
        ? Math.max(Number(policy.eoq || 0), Math.max(0, Number(policy.targetStock ?? policy.reserveTarget ?? 0) - quantity))
        : Math.max(0, Number(policy.targetStock ?? policy.reserveTarget ?? 0) - quantity),
      hasBranchOwnedActivity
    };
  })).filter((item) => item.stockOwnerType === stockOwnerTypes.GRAND_SUPPLIED || item.hasBranchOwnedActivity || item.quantity !== 0);
}

export function getInventorySnapshot(db) {
  return db.branches.flatMap((branch) =>
    db.materialProducts.map((product) => {
      const quantity = getBalance(db, branch.id, product.id);
      const setting = db.inventorySettings.find(
        (item) => item.branchId === branch.id && item.productId === product.id
      );
      const reorderPoint = setting?.reorderPoint ?? 0;
      const targetStock = setting?.targetStock ?? setting?.reserveTarget ?? 0;
      const eoq = Number(setting?.eoq || 0);
      const averageCost = getAverageCost(db, branch.id, product.id, product.standardCost);
      return {
        brandId: branch.brandId || product.brandId || "grand-house",
        branchId: branch.id,
        branchName: branch.name,
        warehouseName: branch.warehouseName,
        productId: product.id,
        productName: product.name,
        category: product.category || "",
        unit: product.unit,
        standardCost: averageCost,
        averageCost,
        quantity,
        reorderPoint,
        targetStock,
        eoq,
        reserveTarget: targetStock,
        inventoryValue: roundMoney(quantity * averageCost),
        isLow: reorderPoint > 0 && quantity <= reorderPoint,
        isBelowReserve: targetStock > 0 && quantity < targetStock,
        needsRestock: reorderPoint > 0 && quantity <= reorderPoint && targetStock > quantity,
        suggestedPurchaseQty: quantity <= Number(reorderPoint || 0)
          ? Math.max(eoq, Math.max(0, Number(targetStock) - quantity))
          : Math.max(0, Number(targetStock) - quantity)
      };
    })
  );
}

export function createInventoryTransaction(db, input) {
  const product = getProduct(db, input.productId);
  const warehouseId = input.warehouseId ? String(input.warehouseId) : "";
  const ownerType = normalizeStockOwnerType(input.stockOwnerType);
  const ownerBranchId = normalizeStockOwnerBranchId(input.stockOwnerBranchId, ownerType, ownerType === stockOwnerTypes.BRANCH_OWNED ? input.branchId : "");
  const branch = input.branchId ? db.branches.find((item) => item.id === input.branchId) || null : null;
  const ownerProfile = ownerType === stockOwnerTypes.BRANCH_OWNED ? getOfficeStockOwner(db, ownerBranchId) : null;
  if (!branch && !warehouseId) throw new Error("กรุณาระบุสาขาหรือคลังสินค้า");
  if (!validTransactionTypes.has(input.type)) throw new Error("ประเภทการเคลื่อนไหวไม่ถูกต้อง");
  if (ownerType === stockOwnerTypes.BRANCH_OWNED && !ownerBranchId) {
    throw new Error("กรุณาระบุสาขาเจ้าของสินค้าที่ฝากเก็บ");
  }
  if (ownerType === stockOwnerTypes.BRANCH_OWNED && !ownerProfile) {
    throw new Error("ไม่พบเจ้าของสต็อกที่ฝากเก็บ");
  }

  const quantityChanged = Number(input.quantityChanged);
  if (!Number.isFinite(quantityChanged) || quantityChanged === 0) {
    throw new Error("จำนวนเคลื่อนไหวต้องไม่เป็นศูนย์");
  }
  if (["PURCHASE", "BRANCH_DEPOSIT"].includes(input.type) && quantityChanged < 0) {
    throw new Error("รายการรับเข้าต้องมีจำนวนเป็นบวก");
  }

  const previousQuantity = warehouseId
    ? getStockPoolBalance(db, input.productId, { warehouseId, stockOwnerType: ownerType, stockOwnerBranchId: ownerBranchId })
    : getBalance(db, input.branchId, input.productId);
  const currentQuantity = previousQuantity + quantityChanged;
  if (currentQuantity < 0) {
    throw new Error(`${product.name} มีสต็อกไม่พอสำหรับรายการนี้`);
  }

  const poolCost = warehouseId
    ? getPoolAverageCost(db, product.id, { warehouseId, stockOwnerType: ownerType, stockOwnerBranchId: ownerBranchId }, product.standardCost)
    : product.standardCost;
  const unitCost = ownerType === stockOwnerTypes.BRANCH_OWNED ? null : Number(input.unitCost ?? poolCost);
  if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
    throw new Error("ต้นทุนต้องเป็นตัวเลขที่ไม่ติดลบ");
  }
  const transaction = {
    id: makeId("TXN", db.inventoryTransactions),
    dateTime: input.dateTime || nowIso(),
    warehouseId: warehouseId || undefined,
    stockOwnerType: ownerType,
    stockOwnerBranchId: ownerBranchId || undefined,
    destinationBranchId: input.destinationBranchId || undefined,
    brandId: input.brandId || branch?.brandId || product.brandId || "grand-house",
    branchId: input.branchId || undefined,
    productId: input.productId,
    type: input.type,
    referenceNumber: input.referenceNumber || makeId(referencePrefix(input.type), db.inventoryTransactions),
    previousQuantity,
    quantityChanged,
    currentQuantity,
    unitCost,
    totalValue: unitCost === null ? null : roundMoney(quantityChanged * unitCost),
    createdBy: input.createdBy || "ออฟฟิศ",
    remarks: input.remarks || ""
  };

  db.inventoryTransactions.push(transaction);
  return transaction;
}

export function setReorderPoint(db, branchId, productId, reorderPoint, targetStock = 0, options = {}) {
  const branch = db.branches.find((item) => item.id === branchId) || null;
  const product = getProduct(db, productId);
  const warehouseId = options.warehouseId ? String(options.warehouseId) : "";
  const ownerType = normalizeStockOwnerType(options.stockOwnerType);
  const ownerBranchId = normalizeStockOwnerBranchId(options.stockOwnerBranchId, ownerType, ownerType === stockOwnerTypes.BRANCH_OWNED ? branchId : "");
  const ownerProfile = ownerType === stockOwnerTypes.BRANCH_OWNED ? getOfficeStockOwner(db, ownerBranchId) : getOfficeStockOwner(db, "grand");
  if (!branch && !ownerProfile) throw new Error("ไม่พบสาขาหรือเจ้าของสต็อก");
  const nextPoint = Number(reorderPoint);
  if (!Number.isFinite(nextPoint) || nextPoint < 0) throw new Error("จุดสั่งซื้อขั้นต่ำต้องไม่ต่ำกว่าศูนย์");
  const nextTarget = Number(targetStock || 0);
  if (!Number.isFinite(nextTarget) || nextTarget < 0) throw new Error("สต็อกเป้าหมายต้องไม่ต่ำกว่าศูนย์");
  if (nextTarget > 0 && nextTarget < nextPoint) throw new Error("สต็อกเป้าหมายต้องไม่น้อยกว่าจุดสั่งซื้อขั้นต่ำ");
  const hasEoq = Object.prototype.hasOwnProperty.call(options, "eoq");
  const nextEoq = hasEoq ? Number(options.eoq || 0) : null;
  if (hasEoq && (!Number.isFinite(nextEoq) || nextEoq < 0)) throw new Error("EOQ ต้องเป็นตัวเลขที่ไม่ติดลบ");

  let setting = db.inventorySettings.find((item) => item.productId === productId
    && (warehouseId ? String(item.warehouseId || "") === warehouseId
      && normalizeStockOwnerType(item.stockOwnerType) === ownerType
      && normalizeStockOwnerBranchId(item.stockOwnerBranchId, ownerType) === ownerBranchId
      : item.branchId === branchId));
  if (!setting) {
    setting = {
      brandId: branch?.brandId || product.brandId || "grand-house",
      ...(warehouseId ? { warehouseId, stockOwnerType: ownerType, stockOwnerBranchId: ownerBranchId || undefined } : { branchId }),
      productId,
      reorderPoint: nextPoint,
      targetStock: nextTarget,
      reserveTarget: nextTarget,
      eoq: hasEoq ? nextEoq : 0
    };
    db.inventorySettings.push(setting);
  } else {
    setting.brandId ||= branch?.brandId || product.brandId || "grand-house";
    setting.reorderPoint = nextPoint;
    setting.targetStock = nextTarget;
    setting.reserveTarget = nextTarget;
    if (hasEoq) setting.eoq = nextEoq;
  }
  return setting;
}

export function createMaterialRequest(db, input) {
  const branch = getBranch(db, input.branchId);
  const items = cleanRequestItems(db, input.items);
  const sourceType = input.sourceType === "BRANCH_OWNED" ? "BRANCH_OWNED" : "GRAND_SUPPLIED";
  if (sourceType === stockOwnerTypes.BRANCH_OWNED && branch.id !== "br-phu-doi") {
    throw new Error("สต็อกที่สาขาซื้อเองและฝากเก็บ รองรับเฉพาะสาขาภูดอย");
  }
  const request = {
    id: makeDateSequenceId("OF", db.materialRequests),
    brandId: input.brandId || branch.brandId || "grand-house",
    branchId: input.branchId,
    sourceType,
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
  const branch = getBranch(db, input.branchId);
  const items = input.items
    .map((item) => {
      const product = getFoodProduct(db, item.productId);
      const requestedQty = positiveNumber(item.requestedQty, "จำนวนที่ขอเบิก");
      return {
        productId: product.id,
        requestedQty,
        // A request is not dispatched yet. Production quantity is entered by
        // the kitchen and becomes visible only after the team records it.
        deliveredQty: 0,
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
    brandId: input.brandId || branch.brandId || "grand-house",
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

export function updateFoodRequestProduction(db, requestId, input = {}) {
  const request = db.foodRequests.find((item) => item.id === requestId);
  if (!request) throw new Error("ไม่พบรายการเบิกอาหาร");
  if (request.status !== "CREATED") throw new Error("รายการนี้ส่งออกแล้ว ไม่สามารถแก้จำนวนผลิตแยกห้องได้");

  const productionRoom = String(input.productionRoom || "").trim();
  if (!productionRoom) throw new Error("กรุณาระบุห้องผลิต");
  const updates = Array.isArray(input.items) ? input.items : [];

  request.items = request.items.map((item) => {
    const product = db.foodProducts.find((food) => food.id === item.productId);
    const itemRoom = item.productionRoom || product?.productionRoom || defaultProductionRoom(product || {});
    if (itemRoom !== productionRoom) return item;

    const next = updates.find((candidate) => candidate.productId === item.productId);
    if (!next) return item;
    const deliveredQty = Number(next.deliveredQty);
    if (!Number.isFinite(deliveredQty) || deliveredQty < 0) throw new Error("จำนวนผลิตต้องไม่ต่ำกว่าศูนย์");
    return { ...item, productionRoom: itemRoom, deliveredQty };
  });

  request.timeline ||= [];
  request.timeline.push({ at: nowIso(), label: `ห้อง${productionRoom}บันทึกจำนวนผลิต` });
  return enrichFoodRequest(db, request);
}

export function createKitchenDispatch(db, input) {
  const branch = getBranch(db, input.branchId);
  const product = getFoodProduct(db, input.productId);
  const actualQty = positiveNumber(input.actualQty ?? input.quantity ?? input.plannedQty, "จำนวนที่ส่งเพิ่ม");

  const dispatch = {
    id: makeDateSequenceId("KC", db.kitchenDispatches || []),
    brandId: input.brandId || branch.brandId || product.brandId || "grand-house",
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

export function createKitchenDispatchBatch(db, input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) throw new Error("กรุณาเลือกเมนูส่งเพิ่มอย่างน้อยหนึ่งรายการ");
  return items.map((item) => createKitchenDispatch(db, {
    ...input,
    productId: item.productId,
    actualQty: item.actualQty
  }));
}

export function updateKitchenDispatch(db, dispatchId, updates = {}) {
  const dispatch = (db.kitchenDispatches || []).find((item) => item.id === dispatchId);
  if (!dispatch) throw new Error("ไม่พบรายการส่งเพิ่ม");

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

  const name = input.name == null ? String(product.name || "").trim() : String(input.name).trim();
  const category = input.category == null ? String(product.category || "").trim() : String(input.category).trim();
  const unit = input.unit == null ? String(product.unit || "").trim() : String(input.unit).trim();
  if (!name) throw new Error("กรุณาระบุชื่อสินค้า");
  if (!category) throw new Error("กรุณาระบุหมวดหมู่");
  if (!unit) throw new Error("กรุณาระบุหน่วย");
  const normalizedName = name.toLocaleLowerCase("th");
  const duplicate = collection.find((item) => item.id !== productId
    && String(item.brandId || "grand-house") === String(product.brandId || "grand-house")
    && String(item.name || "").trim().toLocaleLowerCase("th") === normalizedName);
  if (duplicate) throw new Error("มีชื่อสินค้านี้อยู่แล้ว");

  const standardCost = input.standardCost == null || input.standardCost === "" ? Number(product.standardCost || 0) : Number(input.standardCost);
  const sellingPrice = kind === "food" ? Number(input.sellingPrice) : 0;
  const productionRoom = kind === "food" ? String(input.productionRoom ?? product.productionRoom ?? "").trim() : "";
  if (!Number.isFinite(standardCost) || standardCost < 0) throw new Error("ต้นทุนต้องไม่ต่ำกว่าศูนย์");
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error("ราคาขายต้องไม่ต่ำกว่าศูนย์");
  if (kind === "food" && !validProductionRooms.includes(productionRoom)) throw new Error("กรุณาเลือกห้องผลิตให้ถูกต้อง");

  ensureProductCostHistory(product);
  const costChanged = Number(product.standardCost || 0) !== roundMoney(standardCost)
    || (kind === "food" && Number(product.sellingPrice || 0) !== roundMoney(sellingPrice))
    || (kind === "food" && String(product.productionRoom || "") !== productionRoom);
  product.standardCost = roundMoney(standardCost);
  product.sellingPrice = roundMoney(sellingPrice);
  product.name = name;
  product.category = category;
  product.unit = unit;
  if (kind === "food") product.productionRoom = productionRoom;
  if (input.imageData != null) product.imageData = String(input.imageData || "");
  if (costChanged) product.costHistory.push({ effectiveAt: nowIso(), unitCost: product.standardCost, sellingPrice: product.sellingPrice, productionRoom: product.productionRoom || "" });
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
  const productionRoom = kind === "food" ? String(input.productionRoom || "").trim() : "";

  if (!name) throw new Error("กรุณากรอกชื่อสินค้า");
  if (!category) throw new Error("กรุณากรอกหมวดหมู่");
  if (!unit) throw new Error("กรุณากรอกหน่วย");
  if (!Number.isFinite(standardCost) || standardCost < 0) throw new Error("ต้นทุนต้องไม่ต่ำกว่าศูนย์");
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error("ราคาขายต้องไม่ต่ำกว่าศูนย์");
  if (kind === "food" && !validProductionRooms.includes(productionRoom)) throw new Error("กรุณาเลือกห้องผลิต");

  const product = {
    id: makeProductId(kind === "food" ? "food" : "mat", collection),
    brandId: input.brandId || "grand-house",
    name,
    category,
    unit,
    standardCost: roundMoney(standardCost),
    sellingPrice: kind === "food" ? roundMoney(sellingPrice) : 0,
    imageData: String(input.imageData || ""),
    costHistory: [{ effectiveAt: nowIso(), unitCost: roundMoney(standardCost), sellingPrice: kind === "food" ? roundMoney(sellingPrice) : 0, productionRoom }],
    ...(kind === "food" ? { productionRoom } : {})
  };
  collection.push(product);
  return product;
}

export function upsertDailySales(db, input) {
  const branch = getBranch(db, input.branchId);
  const salesDate = String(input.salesDate || "").slice(0, 10);
  if (!salesDate) throw new Error("กรุณาเลือกวันที่ขาย");

  const cashSales = nonNegativeMoney(input.cashSales, "ยอดเงินสด");
  const transferSales = nonNegativeMoney(input.transferSales, "ยอดสแกน/โอน");
  db.dailySales ||= [];

  let record = db.dailySales.find((item) => item.branchId === input.branchId && item.salesDate === salesDate);
  if (!record) {
    record = {
      id: makeDateSequenceId("SALE", db.dailySales),
      brandId: branch.brandId || "grand-house",
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

export function upsertBranchDailyClosing(db, input) {
  const branch = getBranch(db, input.branchId);
  const closingDate = String(input.closingDate || input.date || "").slice(0, 10);
  if (!closingDate) throw new Error("กรุณาเลือกวันที่ปิดวัน");
  const inputEntries = Array.isArray(input.entries) ? input.entries : [];

  const entries = inputEntries.map((entry) => {
    const sourceType = ["KITCHEN", "CENTRAL_WAREHOUSE", "BRANCH_MADE"].includes(entry.sourceType) ? entry.sourceType : "KITCHEN";
    const product = entry.productId
      ? db.foodProducts.find((item) => item.id === entry.productId) || db.materialProducts.find((item) => item.id === entry.productId)
      : null;
    const itemName = String(entry.itemName || product?.name || "").trim();
    if (!itemName) throw new Error("กรุณาระบุชื่อเมนู");
    const endingQty = nonNegativeNumber(entry.endingQty, "ยอดเหลือปลายวัน");
    const hasLegacyFlow = ["openingQty", "receivedQty", "producedQty", "wasteQty"].some((field) => Object.prototype.hasOwnProperty.call(entry, field));
    const openingQty = hasLegacyFlow ? nonNegativeNumber(entry.openingQty, "ยอดเหลือเดิม") : null;
    const receivedQty = hasLegacyFlow ? nonNegativeNumber(entry.receivedQty, "จำนวนรับเข้า") : null;
    const producedQty = hasLegacyFlow ? nonNegativeNumber(entry.producedQty, "จำนวนทำเอง") : null;
    const wasteQty = hasLegacyFlow ? nonNegativeNumber(entry.wasteQty, "จำนวนเสีย/หมดอายุ") : 0;
    const availableQty = Number(openingQty || 0) + Number(receivedQty || 0) + Number(producedQty || 0);
    if (hasLegacyFlow && endingQty + wasteQty > availableQty) throw new Error(`${itemName}: เหลือและเสียรวมกันมากกว่าจำนวนที่มี`);
    return {
      sourceType,
      productId: product?.id || null,
      itemName,
      unit: String(entry.unit || product?.unit || "").trim(),
      entryMode: hasLegacyFlow ? "FLOW" : "ENDING_ONLY",
      openingQty,
      receivedQty,
      producedQty,
      endingQty,
      wasteQty,
      estimatedUsedQty: hasLegacyFlow ? roundMoney(Math.max(0, availableQty - endingQty - wasteQty)) : null,
      wasteReason: String(entry.wasteReason || "").trim(),
      remarks: String(entry.remarks || "").trim()
    };
  });

  db.branchDailyClosings ||= [];
  let closing = db.branchDailyClosings.find((item) => item.branchId === branch.id && item.closingDate === closingDate);
  if (!closing) {
    closing = {
      id: makeDateSequenceId("CLOSE", db.branchDailyClosings),
      brandId: branch.brandId || "grand-house",
      branchId: branch.id,
      closingDate,
      createdAt: nowIso(),
      createdBy: input.createdBy || "สาขา"
    };
    db.branchDailyClosings.unshift(closing);
  }
  closing.entries = entries;
  closing.updatedAt = nowIso();
  closing.status = entries.some((entry) => Number(entry.wasteQty || 0) > 0)
    ? "HAS_WASTE"
    : entries.length === 0 || entries.some((entry) => entry.entryMode === "ENDING_ONLY") ? "RECORDED" : "NO_WASTE_CONFIRMED";
  closing.remarks = String(input.remarks || "");
  return enrichBranchDailyClosing(db, closing);
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

  const normalizedStatus = request.status === "PREPARING" ? "OFFICE_RECEIVED" : request.status === "READY" ? "SHIPPED" : request.status;
  const nextStatus = materialTransitions[normalizedStatus];
  if (!nextStatus) return enrichMaterialRequest(db, request);

  if (nextStatus === "SHIPPED" && !request.issueTransactionIds?.length) {
    request.issueTransactionIds = request.items
      .filter((item) => Number(item.actualIssuedQty) > 0)
      .map((item) => {
        const txn = createInventoryTransaction(db, {
          warehouseId: OFFICE_WAREHOUSE_ID,
          branchId: request.branchId,
          destinationBranchId: request.branchId,
          stockOwnerType: request.sourceType === stockOwnerTypes.BRANCH_OWNED ? stockOwnerTypes.BRANCH_OWNED : stockOwnerTypes.GRAND_SUPPLIED,
          stockOwnerBranchId: request.sourceType === stockOwnerTypes.BRANCH_OWNED ? request.branchId : undefined,
          productId: item.productId,
          type: "MATERIAL_REQUEST",
          referenceNumber: request.id,
          quantityChanged: -Number(item.actualIssuedQty),
          unitCost: request.sourceType === stockOwnerTypes.BRANCH_OWNED ? null : undefined,
          createdBy: "ออฟฟิศ",
          remarks: request.sourceType === "BRANCH_OWNED"
            ? "ตัดสต็อกสินค้าที่สาขาซื้อเองและฝากไว้ที่แกรนด์"
            : "ตัดสต็อกจากรายการเบิกวัตถุดิบ"
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
      const materialRequestIds = new Set(db.materialRequests.filter((request) => request.branchId === branch.id).map((request) => request.id));
      const materialCost = db.inventoryTransactions
        .filter((txn) => materialRequestIds.has(txn.referenceNumber) && txn.type === "MATERIAL_REQUEST" && txn.dateTime.slice(0, 10) === today)
        .reduce((sum, txn) => sum + Math.abs(Number(txn.totalValue || 0)), 0);
      const foodCost = db.foodRequests
        .filter((request) => request.branchId === branch.id && ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(request.status) && latestTimelineDate(request, "จัดส่งแล้ว") === today)
        .reduce((sum, request) => sum + enrichFoodRequest(db, request).totalCost, 0);
      const foodSelling = db.foodRequests
        .filter((request) => request.branchId === branch.id && ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(request.status) && latestTimelineDate(request, "จัดส่งแล้ว") === today)
        .reduce((sum, request) => sum + enrichFoodRequest(db, request).totalSellingValue, 0);
      const extraDispatchCost = (db.kitchenDispatches || [])
        .filter((dispatch) => dispatch.branchId === branch.id && ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(dispatch.status) && dispatch.dispatchDate === today)
        .reduce((sum, dispatch) => sum + enrichKitchenDispatch(db, dispatch).totalCost, 0);
      const extraDispatchSelling = (db.kitchenDispatches || [])
        .filter((dispatch) => dispatch.branchId === branch.id && ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(dispatch.status) && dispatch.dispatchDate === today)
        .reduce((sum, dispatch) => sum + enrichKitchenDispatch(db, dispatch).totalSellingValue, 0);
      const sales = (db.dailySales || [])
        .filter((sale) => sale.branchId === branch.id && sale.salesDate === today)
        .reduce((sum, sale) => sum + Number(sale.cashSales || 0) + Number(sale.transferSales || 0), 0);
      return {
        brandId: branch.brandId || "grand-house",
        branchId: branch.id,
        branchName: branch.name,
        sales: roundMoney(sales),
        materialCost: roundMoney(materialCost),
        foodCost: roundMoney(foodCost + extraDispatchCost),
        foodSellingValue: roundMoney(foodSelling + extraDispatchSelling),
        totalCost: roundMoney(materialCost + foodCost + extraDispatchCost),
        grossProfit: roundMoney(sales - materialCost - foodCost - extraDispatchCost)
      };
    }),
    inventoryValueByBranch: db.branches.map((branch) => ({
      brandId: branch.brandId || "grand-house",
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
    dailySalesHistory: (db.dailySales || []).map((sale) => enrichDailySale(db, sale)),
    branchDailyClosingHistory: (db.branchDailyClosings || []).map((closing) => enrichBranchDailyClosing(db, closing))
  };
}

export function enrichAll(db) {
  return {
    ...db,
    materialProducts: db.materialProducts.map((product) => ({
      ...product,
      costHistory: product.costHistory || [{ effectiveAt: product.createdAt || "", unitCost: Number(product.standardCost || 0), sellingPrice: 0, productionRoom: "" }]
    })),
    foodProducts: db.foodProducts.map((product) => ({
      ...product,
      productionRoom: product.productionRoom || defaultProductionRoom(product),
      costHistory: product.costHistory || [{ effectiveAt: product.createdAt || "", unitCost: Number(product.standardCost || 0), sellingPrice: Number(product.sellingPrice || 0), productionRoom: product.productionRoom || defaultProductionRoom(product) }]
    })),
    inventorySnapshot: getInventorySnapshot(db),
    officeInventorySnapshot: getOfficeInventorySnapshot(db),
    foodRequests: db.foodRequests.map((request) => enrichFoodRequest(db, request)),
    materialRequests: db.materialRequests.map((request) => enrichMaterialRequest(db, request)),
    kitchenDispatches: (db.kitchenDispatches || []).map((dispatch) => enrichKitchenDispatch(db, dispatch)),
    dailySales: (db.dailySales || []).map((sale) => enrichDailySale(db, sale)),
    branchDailyClosings: (db.branchDailyClosings || []).map((closing) => enrichBranchDailyClosing(db, closing)),
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

function enrichBranchDailyClosing(db, closing) {
  return {
    ...closing,
    branchName: db.branches.find((branch) => branch.id === closing.branchId)?.name || closing.branchId,
    entries: (closing.entries || []).map((entry) => ({
      ...entry,
      status: Number(entry.wasteQty || 0) > 0 ? "HAS_WASTE" : entry.entryMode === "ENDING_ONLY" ? "RECORDED" : "NO_WASTE_CONFIRMED"
    }))
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
  const sourceType = request.sourceType === "BRANCH_OWNED" ? "BRANCH_OWNED" : "GRAND_SUPPLIED";
  const branchOwned = sourceType === "BRANCH_OWNED";
  return {
    ...request,
    sourceType,
    branchName: db.branches.find((branch) => branch.id === request.branchId)?.name || request.branchId,
    totalCost: branchOwned ? null : roundMoney(
      request.items.reduce((sum, item) => {
        const product = db.materialProducts.find((material) => material.id === item.productId);
        const txn = db.inventoryTransactions.find((entry) => request.issueTransactionIds?.includes(entry.id) && entry.productId === item.productId);
        const unitCost = Number(txn?.unitCost ?? product?.standardCost ?? 0);
        return sum + Number(item.actualIssuedQty || 0) * unitCost;
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
        unitCost: branchOwned ? null : Number(txn?.unitCost ?? product?.standardCost ?? 0),
        sellingPrice: product?.sellingPrice || 0,
        totalCost: branchOwned ? null : roundMoney(actualIssuedQty * Number(txn?.unitCost ?? product?.standardCost ?? 0)),
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
    sourceLabel: (dispatch.sourceType || "KITCHEN_EXTRA") === "BRANCH_REQUEST" ? "สาขาเบิกเพิ่ม" : "ส่งเพิ่ม",
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

function nonNegativeNumber(value, label) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label}ต้องไม่ต่ำกว่าศูนย์`);
  return number;
}

function latestTimelineDate(request, label) {
  const event = [...(request.timeline || [])].reverse().find((item) => item.label === label);
  return String(event?.at || "").slice(0, 10);
}

function getAverageCost(db, branchId, productId, fallback = 0) {
  let quantity = 0;
  let value = 0;
  const transactions = db.inventoryTransactions
    .filter((txn) => txn.branchId === branchId && txn.productId === productId)
    .slice()
    .sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)));
  transactions.forEach((txn) => {
    const changed = Number(txn.quantityChanged || 0);
    const unitCost = Number(txn.unitCost ?? fallback);
    if (changed > 0) {
      quantity += changed;
      value += changed * unitCost;
    } else if (changed < 0) {
      const average = quantity > 0 ? value / quantity : unitCost;
      const issued = Math.min(quantity, Math.abs(changed));
      quantity -= issued;
      value = Math.max(0, value - issued * average);
    }
  });
  return roundMoney(quantity > 0 ? value / quantity : Number(fallback || 0));
}

function nonNegativeMoney(value, label) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label}ต้องไม่ต่ำกว่าศูนย์`);
  return number;
}

function ensureProductCostHistory(product) {
  product.costHistory ||= [{
    effectiveAt: product.createdAt || nowIso(),
    unitCost: Number(product.standardCost || 0),
    sellingPrice: Number(product.sellingPrice || 0),
    productionRoom: product.productionRoom || ""
  }];
  return product.costHistory;
}

export function recordProductCostVersion(product, next = {}) {
  if (!product) return product;
  ensureProductCostHistory(product);
  const unitCost = Number(next.unitCost ?? product.standardCost ?? 0);
  if (!Number.isFinite(unitCost) || unitCost < 0) throw new Error("ต้นทุนต้องไม่ต่ำกว่าศูนย์");
  if (Number(product.standardCost || 0) !== roundMoney(unitCost)) {
    product.costHistory.push({
      effectiveAt: next.effectiveAt || nowIso(),
      unitCost: roundMoney(unitCost),
      sellingPrice: Number(product.sellingPrice || 0),
      productionRoom: product.productionRoom || ""
    });
  }
  return product;
}

function referencePrefix(type) {
  return {
    PURCHASE: "PO",
    BRANCH_DEPOSIT: "DEP",
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
