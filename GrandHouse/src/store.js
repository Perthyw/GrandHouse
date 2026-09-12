import { access, copyFile, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { seedData } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Keep the local file store configurable so development runners and deployed
// instances can place writable data outside the source checkout when needed.
// The normal default remains the app's data/ directory.
const configuredDataDir = String(process.env.GRANDHOUSE_DATA_DIR || "").trim();
const defaultDataDir = path.join(__dirname, "..", "data");
const fallbackDataDir = path.join(os.tmpdir(), "grandhouse-data");
let dataDir = configuredDataDir
  ? path.resolve(configuredDataDir)
  : defaultDataDir;
let dbPath = path.join(dataDir, "db.json");
let fallbackSwitchPromise = null;
const DEFAULT_BRAND_ID = "grand-house";
const brandCollections = [
  "branches",
  "suppliers",
  "materialProducts",
  "foodProducts",
  "inventorySettings",
  "inventoryTransactions",
  "kitchenDispatches",
  "foodRequests",
  "materialRequests",
  "branchDailyClosings",
  "dailySales"
];

let writeQueue = Promise.resolve();
let writeSequence = 0;

const retryableWriteErrors = new Set(["EPERM", "EACCES", "EBUSY"]);

export async function readDb() {
  try {
    await mkdir(dataDir, { recursive: true });
    try {
      const raw = await readFile(dbPath, "utf8");
      const db = JSON.parse(raw);
      if (db.schemaVersion !== seedData.schemaVersion) {
        const initialDb = structuredClone(seedData);
        ensureBrandAssignments(initialDb);
        await writeDb(initialDb);
        return structuredClone(initialDb);
      }
      if (migrateProductionRoomNames(db)) await writeDb(db);
      if (migrateFoodWorkflow(db)) await writeDb(db);
      if (migrateBranchNames(db)) await writeDb(db);
      if (ensureWorkflowCollections(db)) await writeDb(db);
      if (migrateSingleCentralWarehouse(db)) await writeDb(db);
      if (ensureBrandAssignments(db)) await writeDb(db);
      return db;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const initialDb = structuredClone(seedData);
      ensureBrandAssignments(initialDb);
      await writeDb(initialDb);
      return structuredClone(initialDb);
    }
  } catch (error) {
    if (!isFallbackEligible(error)) throw error;
    await switchToFallbackDataDir();
    return readDb();
  }
}

function isFallbackEligible(error) {
  return !configuredDataDir
    && dataDir === defaultDataDir
    && retryableWriteErrors.has(error?.code);
}

async function switchToFallbackDataDir() {
  if (dataDir === fallbackDataDir) return;
  if (!fallbackSwitchPromise) {
    fallbackSwitchPromise = (async () => {
      const sourcePath = dbPath;
      const nextDbPath = path.join(fallbackDataDir, "db.json");
      await mkdir(fallbackDataDir, { recursive: true });
      try {
        await access(nextDbPath);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        try {
          await copyFile(sourcePath, nextDbPath);
        } catch (copyError) {
          if (copyError.code !== "ENOENT") throw copyError;
        }
      }
      dataDir = fallbackDataDir;
      dbPath = nextDbPath;
      console.warn(`Data directory is not writable; using ${dataDir}`);
    })();
  }
  try {
    await fallbackSwitchPromise;
  } finally {
    fallbackSwitchPromise = null;
  }
}

function ensureBrandAssignments(db) {
  let changed = false;
  brandCollections.forEach((collectionName) => {
    (db[collectionName] || []).forEach((record) => {
      if (record && !record.brandId) {
        record.brandId = DEFAULT_BRAND_ID;
        changed = true;
      }
    });
  });
  return changed;
}

function migrateProductionRoomNames(db) {
  const renamedRooms = {
    "ห้องอาหาร1": "ห้องอาหาร",
    "ห้องอาหาร2": "ครัวกลาง"
  };
  let changed = false;
  const rename = (record) => {
    if (record?.productionRoom && renamedRooms[record.productionRoom]) {
      record.productionRoom = renamedRooms[record.productionRoom];
      changed = true;
    }
  };

  (db.foodProducts || []).forEach(rename);
  (db.kitchenDispatches || []).forEach(rename);
  (db.foodRequests || []).forEach((request) => (request.items || []).forEach(rename));
  return changed;
}

function migrateBranchNames(db) {
  const renamedBranches = {
    "br-tha-rua-1": { name: "ท่ารั้ว", warehouseName: "การเบิกสาขาท่ารั้ว", userName: "สาขาท่ารั้ว" },
    "br-tha-rua-2": { name: "แกรนด์ปาร์ค", warehouseName: "การเบิกสาขาแกรนด์ปาร์ค", userName: "สาขาแกรนด์ปาร์ค" }
  };
  let changed = false;

  (db.branches || []).forEach((branch) => {
    const renamed = renamedBranches[branch.id];
    if (!renamed) return;
    if (branch.name !== renamed.name || branch.warehouseName !== renamed.warehouseName) {
      branch.name = renamed.name;
      branch.warehouseName = renamed.warehouseName;
      changed = true;
    }
  });
  (db.users || []).forEach((user) => {
    const renamed = renamedBranches[user.branchId];
    if (renamed && user.name !== renamed.userName) {
      user.name = renamed.userName;
      changed = true;
    }
  });
  (db.branches || []).forEach((branch) => {
    if (String(branch.warehouseName || "").startsWith("คลังสาขา")) {
      branch.warehouseName = branch.warehouseName.replace(/^คลังสาขา/, "การเบิกสาขา");
      changed = true;
    }
  });
  const kitchenUser = (db.users || []).find((user) => user.id === "user-kitchen");
  if (kitchenUser && kitchenUser.name === "ครัวกลาง") {
    kitchenUser.name = "ห้องผลิต";
    changed = true;
  }
  return changed;
}

function ensureWorkflowCollections(db) {
  let changed = false;
  if (!Array.isArray(db.stockOwners)) {
    db.stockOwners = structuredClone(seedData.stockOwners || [
      { id: "grand", type: "GRAND_SUPPLIED", name: "แกรนด์", label: "ของแกรนด์", hasCost: true },
      { id: "br-phu-doi", type: "BRANCH_OWNED", name: "ภูดอย", label: "ของภูดอยฝากเก็บ", hasCost: false },
      { id: "owner-phela", type: "BRANCH_OWNED", name: "เพลา", label: "ของเพลาฝากเก็บ", hasCost: false }
    ]);
    changed = true;
  }
  if (!Array.isArray(db.branchDailyClosings)) {
    db.branchDailyClosings = [];
    changed = true;
  }
  const defaultInventoryOptions = structuredClone(seedData.inventoryOptions || {
    materialCategories: ["วัตถุดิบ", "บรรจุภัณฑ์", "เครื่องปรุง", "ของแห้ง"],
    units: ["กล่อง", "ขวด", "แก้ว", "จาน", "ถ้วย", "ชุด", "ชิ้น", "แผ่น", "แถว", "ใบ", "ม้วน", "แพ็ก", "ถุง", "กก.", "กิโลกรัม", "ขีด", "กรัม", "ลิตร"],
    categoryAliases: { "วัตถุดิบ": "วัตถุดิบ", "บรรจุภัณฑ์": "บรรจุภัณฑ์", "เครื่องปรุง": "เครื่องปรุง", "ของแห้ง": "ของแห้ง" }
  });
  if (!db.inventoryOptions || typeof db.inventoryOptions !== "object") {
    db.inventoryOptions = defaultInventoryOptions;
    changed = true;
  } else {
    if (!Array.isArray(db.inventoryOptions.materialCategories) || !db.inventoryOptions.materialCategories.length) {
      db.inventoryOptions.materialCategories = defaultInventoryOptions.materialCategories;
      changed = true;
    }
    if (!Array.isArray(db.inventoryOptions.units) || !db.inventoryOptions.units.length) {
      db.inventoryOptions.units = defaultInventoryOptions.units;
      changed = true;
    }
    if (!db.inventoryOptions.categoryAliases || typeof db.inventoryOptions.categoryAliases !== "object") {
      db.inventoryOptions.categoryAliases = defaultInventoryOptions.categoryAliases;
      changed = true;
    }
  }
  (db.inventorySettings || []).forEach((setting) => {
    if (setting.targetStock == null) {
      setting.targetStock = Number(setting.reserveTarget || 0);
      changed = true;
    }
    if (setting.reserveTarget == null) {
      setting.reserveTarget = Number(setting.targetStock || 0);
      changed = true;
    }
    if (setting.eoq == null) {
      setting.eoq = 0;
      changed = true;
    }
  });
  (db.materialRequests || []).forEach((request) => {
    if (request.status === "PREPARING") {
      request.status = "OFFICE_RECEIVED";
      changed = true;
    } else if (request.status === "READY") {
      request.status = "SHIPPED";
      changed = true;
    }
  });
  return changed;
}

// The current product workflow uses one costed central warehouse. Keep this
// migration idempotent so existing local data is folded into that warehouse
// exactly once while legacy branch pages can still read their old records.
function migrateSingleCentralWarehouse(db) {
  if (db.singleWarehouseMode === true && Number(db.singleWarehouseModeVersion || 0) >= 5) return false;
  let changed = false;
  db.singleWarehouseMode = true;
  db.singleWarehouseModeVersion = 5;
  changed = true;

  db.stockOwners = [{
    id: "grand",
    type: "GRAND_SUPPLIED",
    name: "แกรนด์",
    label: "คลังกลาง Grand House",
    hasCost: true
  }];

  const products = new Map((db.materialProducts || []).map((product) => [product.id, product]));
  const runningByProduct = new Map();
  (db.inventoryTransactions || [])
    .slice()
    .sort((a, b) => String(a.dateTime || "").localeCompare(String(b.dateTime || "")))
    .forEach((transaction) => {
      const product = products.get(transaction.productId);
      const fallbackCost = Number(product?.standardCost || 0);
      const parsedCost = transaction.unitCost == null || transaction.unitCost === "" ? Number.NaN : Number(transaction.unitCost);
      const unitCost = Number.isFinite(parsedCost) && parsedCost > 0 ? parsedCost : fallbackCost;
      const ownerWasBranch = transaction.stockOwnerType === "BRANCH_OWNED";
      if (!transaction.warehouseId) {
        transaction.warehouseId = "office";
        changed = true;
      }
      if (transaction.stockOwnerType !== "GRAND_SUPPLIED" || transaction.stockOwnerBranchId) {
        transaction.stockOwnerType = "GRAND_SUPPLIED";
        delete transaction.stockOwnerBranchId;
        changed = true;
      }
      if (transaction.type === "BRANCH_DEPOSIT") {
        transaction.type = "PURCHASE";
        changed = true;
      }
      if (ownerWasBranch || transaction.unitCost == null || !Number.isFinite(parsedCost) || (parsedCost === 0 && fallbackCost > 0)) {
        transaction.unitCost = unitCost;
        transaction.totalValue = Math.round(Number(transaction.quantityChanged || 0) * unitCost * 100) / 100;
        changed = true;
      }
      const current = Number(runningByProduct.get(transaction.productId) || 0);
      transaction.previousQuantity = current;
      transaction.currentQuantity = current + Number(transaction.quantityChanged || 0);
      runningByProduct.set(transaction.productId, transaction.currentQuantity);
    });

  // Build one central policy per product from any existing branch/office
  // policies. Existing branch policies remain available to legacy views, but
  // the central warehouse always reads this consolidated policy.
  const policyByProduct = new Map();
  (db.inventorySettings || []).filter((setting) => !setting?.warehouseId).forEach((setting) => {
    if (!setting?.productId) return;
    const current = policyByProduct.get(setting.productId) || { reorderPoint: 0, targetStock: 0, eoq: 0 };
    current.reorderPoint += Number(setting.reorderPoint || 0);
    current.targetStock += Number(setting.targetStock ?? setting.reserveTarget ?? 0);
    current.eoq = Math.max(current.eoq, Number(setting.eoq || 0));
    policyByProduct.set(setting.productId, current);
  });
  const existingCentral = new Map();
  (db.inventorySettings || []).forEach((setting) => {
    if (String(setting.warehouseId || "") !== "office") return;
    const previous = existingCentral.get(setting.productId);
    if (previous) {
      previous.reorderPoint = Math.max(Number(previous.reorderPoint || 0), Number(setting.reorderPoint || 0));
      previous.targetStock = Math.max(Number(previous.targetStock || 0), Number(setting.targetStock ?? setting.reserveTarget ?? 0));
      previous.reserveTarget = previous.targetStock;
      previous.eoq = Math.max(Number(previous.eoq || 0), Number(setting.eoq || 0));
      return;
    }
    setting.stockOwnerType = "GRAND_SUPPLIED";
    delete setting.stockOwnerBranchId;
    delete setting.branchId;
    const policy = policyByProduct.get(setting.productId) || { reorderPoint: 0, targetStock: 0, eoq: 0 };
    setting.reorderPoint = policy.reorderPoint;
    setting.targetStock = policy.targetStock;
    setting.reserveTarget = policy.targetStock;
    setting.eoq = policy.eoq;
    existingCentral.set(setting.productId, setting);
    changed = true;
  });
  policyByProduct.forEach((policy, productId) => {
    if (existingCentral.has(productId)) return;
    const product = products.get(productId);
    db.inventorySettings.push({
      brandId: product?.brandId || "grand-house",
      warehouseId: "office",
      stockOwnerType: "GRAND_SUPPLIED",
      productId,
      reorderPoint: policy.reorderPoint,
      targetStock: policy.targetStock,
      reserveTarget: policy.targetStock,
      eoq: policy.eoq
    });
    changed = true;
  });

  (db.materialRequests || []).forEach((request) => {
    if (request.sourceType !== "GRAND_SUPPLIED") {
      request.sourceType = "GRAND_SUPPLIED";
      changed = true;
    }
    (request.items || []).forEach((item) => {
      if (item.unitCost == null) {
        const cost = Number(products.get(item.productId)?.standardCost || 0);
        item.unitCost = cost;
        item.totalCost = Math.round(Number(item.actualIssuedQty ?? item.requestedQty ?? 0) * cost * 100) / 100;
        changed = true;
      }
    });
  });
  return changed;
}

function migrateFoodWorkflow(db) {
  const legacyQueueStatuses = new Set(["ACCEPTED", "START_PRODUCTION", "READY_TO_DELIVER"]);
  let changed = false;
  if (db.company?.centralKitchenName === "ครัวกลางแกรนด์ เฮาส์") {
    db.company.centralKitchenName = "ห้องผลิตแกรนด์ เฮาส์";
    changed = true;
  }
  (db.foodRequests || []).forEach((request) => {
    (request.timeline || []).forEach((event) => {
      if (event.label === "ครัวกลางรับเรื่อง") {
        event.label = "ห้องผลิตรับเรื่อง";
        changed = true;
      }
    });
    if (legacyQueueStatuses.has(request.status)) {
      request.status = "CREATED";
      request.timeline ||= [];
      request.timeline.push({ at: new Date().toISOString(), label: "ย้ายเข้าคิวรอจัดส่ง" });
      changed = true;
    }
  });
  return changed;
}

export async function writeDb(data) {
  try {
    await mkdir(dataDir, { recursive: true });
    const queuedWrite = writeQueue
      .catch(() => undefined)
      .then(() => persistDb(data));

    // Keep the queue usable after a transient filesystem failure. Without this,
    // one rejected write permanently poisoned every later save until restart.
    writeQueue = queuedWrite.catch(() => undefined);
    await queuedWrite;
  } catch (error) {
    if (!isFallbackEligible(error)) throw error;
    await switchToFallbackDataDir();
    return writeDb(data);
  }
}

async function persistDb(data) {
  const serialized = JSON.stringify(data, null, 2);
  const tempPath = `${dbPath}.${process.pid}.${++writeSequence}.tmp`;

  try {
    // Write the complete snapshot beside the live file first, then replace it
    // in one rename so a failed save never leaves a half-written db.json.
    await writeFile(tempPath, serialized, "utf8");

    let lastError;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        await rename(tempPath, dbPath);
        return;
      } catch (error) {
        lastError = error;
        if (!retryableWriteErrors.has(error.code) || attempt === 3) throw error;
        await delay(75 * (attempt + 1));
      }
    }
    throw lastError;
  } finally {
    // rename removes the temp file; unlink is only needed when an attempt
    // failed before replacement.
    await unlink(tempPath).catch(() => undefined);
  }
}

export async function mutateDb(mutator) {
  const db = await readDb();
  const result = await mutator(db);
  await writeDb(db);
  return result;
}
