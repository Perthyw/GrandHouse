import http from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  advanceFoodRequest,
  advanceMaterialRequest,
  createFoodRequest,
  createInventoryTransaction,
  createKitchenDispatch,
  createKitchenDispatchBatch,
  createMaterialRequest,
  createProduct,
  enrichAll,
  getProduct,
  getStockPoolBalance,
  recordProductCostVersion,
  stockOwnerTypes,
  setReorderPoint,
  updateKitchenDispatch,
  updateFoodRequestProduction,
  updateProductPricing,
  upsertBranchDailyClosing,
  upsertDailySales
} from "./domain.js";
import { mutateDb, readDb } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 4173);

// Office users choose one isolated brand workspace after login. The Grands keeps
// its server-side access code, while Grand House is the default operational
// workspace and can be entered directly.
const officeBrandWorkspaces = new Map([
  ["the-grands", { id: "the-grands", name: "The Grands" }],
  ["grand-house", { id: "grand-house", name: "Grand House" }]
]);
const officeBrandAccessCodes = new Map([
  ["the-grands", "thegrands"]
]);
const officeBrandSessions = new Map();
const officeBrandSessionTtlMs = 8 * 60 * 60 * 1000;

const routes = [
  route("GET", "/api/login-options", async () => {
    const db = await readDb();
    return {
      company: db.company,
      users: (db.users || []).map((user) => publicUser(db, user))
    };
  }),
  route("POST", "/api/login", async (request) => {
    const body = await readJson(request);
    const db = await readDb();
    const user = body.userId
      ? (db.users || []).find((item) => item.id === body.userId && (!body.password || item.password === body.password))
      : (db.users || []).find((item) => item.username === body.username && item.password === body.password);
    if (!user) throw httpError("ไม่พบผู้ใช้งาน", 401);
    return publicUser(db, user);
  }),
  route("POST", "/api/office-brand-access", async (request) => {
    const body = await readJson(request);
    const db = await readDb();
    const user = requireUser(db, request);
    if (user.role !== "OFFICE") throw httpError("เฉพาะออฟฟิศเท่านั้น", 403);

    const brand = officeBrandWorkspaces.get(String(body.brandId || ""));
    if (!brand) throw httpError("ไม่พบแบรนด์", 400);
    if (brand.id !== "grand-house" && String(body.code || "") !== officeBrandAccessCodes.get(brand.id)) {
      throw httpError("รหัสแบรนด์ไม่ถูกต้อง", 403);
    }

    const token = randomUUID();
    officeBrandSessions.set(token, {
      userId: user.id,
      brandId: brand.id,
      expiresAt: Date.now() + officeBrandSessionTtlMs
    });
    return { token, brandId: brand.id, brandName: brand.name };
  }),
  route("GET", "/api/bootstrap", async (request) => {
    const db = await readDb();
    const user = requireUser(db, request);
    const brand = user.role === "OFFICE" ? requireOfficeBrand(db, request) : null;
    return filterForUser(enrichAll(db), user, brand?.id);
  }),
  route("POST", "/api/stock-in", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const officeBrand = user.role === "OFFICE" ? requireOfficeBrand(db, request) : null;
      const branch = db.branches.find((item) => item.id === body.branchId) || null;
      const stockOwnerType = stockOwnerTypes.GRAND_SUPPLIED;
      const stockOwnerBranchId = "";
      if (officeBrand && branch && branch.brandId !== officeBrand.id) throw httpError("สาขานี้อยู่นอกแบรนด์ที่เลือก", 403);
      const quantity = Number(body.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw httpError("จำนวนรับเข้าต้องมากกว่าศูนย์", 400);
      const typedName = String(body.productName || "").trim();
      let product = body.productId ? db.materialProducts.find((item) => item.id === body.productId) : null;
      if (officeBrand && product && product.brandId !== officeBrand.id) throw httpError("สินค้านี้อยู่นอกแบรนด์ที่เลือก", 403);
      if (!product && typedName) {
        product = db.materialProducts.find((item) => item.name.trim().toLocaleLowerCase("th") === typedName.toLocaleLowerCase("th"));
      }
      if (!product) {
        product = createProduct(db, "material", {
          name: typedName,
          category: body.category,
          unit: body.unit,
          standardCost: body.unitCost,
          sellingPrice: 0,
          imageData: body.imageData,
          brandId: officeBrand?.id
        });
      } else {
        if (body.category) product.category = String(body.category);
        if (body.unit) product.unit = String(body.unit);
        if (stockOwnerType === stockOwnerTypes.GRAND_SUPPLIED && Number.isFinite(Number(body.unitCost))) {
          recordProductCostVersion(product, { unitCost: Number(body.unitCost) });
          product.standardCost = Number(body.unitCost);
        }
        if (body.imageData) product.imageData = String(body.imageData);
      }
      const receiveUnitCost = body.unitCost === "" || body.unitCost == null ? Number(product.standardCost || 0) : Number(body.unitCost);
      if (stockOwnerType === stockOwnerTypes.GRAND_SUPPLIED && (!Number.isFinite(receiveUnitCost) || receiveUnitCost < 0)) {
        throw httpError("กรุณาระบุต้นทุนรับเข้าที่ถูกต้อง", 400);
      }
      const transaction = createInventoryTransaction(db, {
        type: "PURCHASE",
        warehouseId: "office",
        stockOwnerType,
        stockOwnerBranchId: stockOwnerType === stockOwnerTypes.BRANCH_OWNED ? stockOwnerBranchId : undefined,
        branchId: body.branchId,
        productId: product.id,
        quantityChanged: quantity,
        unitCost: receiveUnitCost,
        referenceNumber: body.referenceNumber,
        brandId: officeBrand?.id,
        dateTime: body.receiveDate ? localDateTime(body.receiveDate, body.receiveTime) : undefined,
        createdBy: user.name,
        remarks: body.remarks || `ผู้ขาย: ${body.supplierName || body.supplierId || "-"}`
      });
      const hasReorderPolicy = body.reorderPoint !== undefined && body.reorderPoint !== null && body.reorderPoint !== ""
        || body.targetStock !== undefined && body.targetStock !== null && body.targetStock !== ""
        || body.reserveTarget !== undefined && body.reserveTarget !== null && body.reserveTarget !== ""
        || body.eoq !== undefined && body.eoq !== null && body.eoq !== "";
      if (hasReorderPolicy) {
        const existingPolicy = (db.inventorySettings || []).find((item) => item.productId === product.id
          && String(item.warehouseId || "") === "office"
          && item.stockOwnerType !== stockOwnerTypes.BRANCH_OWNED);
        const reorderPoint = body.reorderPoint === "" || body.reorderPoint == null
          ? existingPolicy?.reorderPoint || 0
          : body.reorderPoint;
        const targetStock = body.targetStock === "" || body.targetStock == null
          ? body.reserveTarget === "" || body.reserveTarget == null
            ? existingPolicy?.targetStock ?? existingPolicy?.reserveTarget ?? 0
            : body.reserveTarget
          : body.targetStock;
        setReorderPoint(db, body.branchId, product.id, reorderPoint, targetStock, {
          warehouseId: "office",
          stockOwnerType: stockOwnerTypes.GRAND_SUPPLIED,
          stockOwnerBranchId: "",
          ...(body.eoq !== undefined && body.eoq !== "" ? { eoq: body.eoq } : {})
        });
      }
      return transaction;
    });
  }),
  route("POST", "/api/stock-issue", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const product = getProduct(db, body.productId);
      const branch = db.branches.find((item) => item.id === body.branchId);
      const officeBrand = user.role === "OFFICE" ? requireOfficeBrand(db, request) : null;
      if (!branch) throw httpError("ไม่พบสาขา", 404);
      if (officeBrand && (branch.brandId !== officeBrand.id || product.brandId !== officeBrand.id)) {
        throw httpError("รายการนี้อยู่นอกแบรนด์ที่เลือก", 403);
      }
      const stockOwnerType = stockOwnerTypes.GRAND_SUPPLIED;
      const stockOwnerBranchId = "";
      const quantity = Number(body.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) throw httpError("จำนวนเบิกออกต้องมากกว่าศูนย์", 400);
      return createInventoryTransaction(db, {
        type: body.type || "MANUAL_ISSUE",
        warehouseId: "office",
        stockOwnerType,
        stockOwnerBranchId: undefined,
        destinationBranchId: branch.id,
        branchId: body.branchId,
        productId: body.productId,
        quantityChanged: -quantity,
        unitCost: undefined,
        brandId: officeBrand?.id,
        createdBy: user.name,
        remarks: body.remarks || ""
      });
    });
  }),
  route("POST", "/api/stock-adjustment", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const officeBrand = user.role === "OFFICE" ? requireOfficeBrand(db, request) : null;
      const branch = db.branches.find((item) => item.id === body.branchId);
      const product = getProduct(db, body.productId);
      if (officeBrand && (branch && branch.brandId !== officeBrand.id || product.brandId !== officeBrand.id)) {
        throw httpError("รายการนี้อยู่นอกแบรนด์ที่เลือก", 403);
      }
      const stockOwnerType = stockOwnerTypes.GRAND_SUPPLIED;
      const stockOwnerBranchId = "";
      const countedQty = Number(body.countedQty);
      if (!Number.isFinite(countedQty) || countedQty < 0) throw httpError("ยอดนับจริงต้องเป็นศูนย์หรือมากกว่า", 400);
      const current = getStockPoolBalance(db, product.id, {
        warehouseId: "office",
        stockOwnerType,
        stockOwnerBranchId
      });
      return createInventoryTransaction(db, {
        type: "ADJUSTMENT",
        warehouseId: "office",
        stockOwnerType,
        stockOwnerBranchId: undefined,
        branchId: body.branchId,
        productId: body.productId,
        quantityChanged: countedQty - current,
        unitCost: undefined,
        brandId: officeBrand?.id,
        createdBy: user.name,
        remarks: body.remarks || "ปรับยอดจากการนับจริง"
      });
    });
  }),
  route("POST", "/api/inventory-options", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const officeBrand = user.role === "OFFICE" ? requireOfficeBrand(db, request) : null;
      const kind = String(body.kind || "").trim();
      const action = String(body.action || "add").trim();
      const value = String(body.value || "").trim().replace(/\s+/g, " ");
      if (!["supplier", "category", "unit"].includes(kind)) throw httpError("ไม่พบประเภทรายการที่ต้องการตั้งค่า", 400);
      if (!["add", "rename"].includes(action)) throw httpError("ไม่พบการทำรายการที่ต้องการ", 400);
      if (!value || value.length > 80) throw httpError("กรุณาระบุชื่อรายการไม่เกิน 80 ตัวอักษร", 400);

      if (kind === "supplier") {
        const fromId = String(body.id || "");
        const current = action === "rename" ? db.suppliers.find((item) => item.id === fromId) : null;
        if (action === "rename" && !current) throw httpError("ไม่พบแหล่งซื้อที่ต้องการแก้ไข", 404);
        if (current && officeBrand && current.brandId && current.brandId !== officeBrand.id) {
          throw httpError("รายการนี้อยู่นอกแบรนด์ที่เลือก", 403);
        }
        const brandId = officeBrand?.id || current?.brandId || "grand-house";
        const duplicate = db.suppliers.find((item) => item.id !== current?.id && item.brandId === brandId && item.name.trim().toLocaleLowerCase("th") === value.toLocaleLowerCase("th"));
        if (duplicate) throw httpError("มีแหล่งซื้อนี้อยู่แล้ว", 400);
        if (current) {
          current.name = value;
          return current;
        }
        const supplier = { id: `sup-custom-${randomUUID().slice(0, 8)}`, name: value, brandId };
        db.suppliers.push(supplier);
        return supplier;
      }

      db.inventoryOptions ||= { materialCategories: [], units: [] };
      const listKey = kind === "category" ? "materialCategories" : "units";
      const options = Array.isArray(db.inventoryOptions[listKey]) ? db.inventoryOptions[listKey] : [];
      const from = String(body.from || "").trim();
      const currentIndex = action === "rename"
        ? options.findIndex((item) => String(item).trim() === from)
        : -1;
      if (action === "rename" && currentIndex < 0) throw httpError("ไม่พบรายการที่ต้องการแก้ไข", 404);
      const duplicateIndex = options.findIndex((item, index) => index !== currentIndex && String(item).trim().toLocaleLowerCase("th") === value.toLocaleLowerCase("th"));
      if (duplicateIndex >= 0) throw httpError("มีรายการนี้อยู่แล้ว", 400);
      if (action === "rename") {
        options[currentIndex] = value;
        if (kind === "category") {
          db.inventoryOptions.categoryAliases ||= {};
          const canonical = Object.entries(db.inventoryOptions.categoryAliases).find(([, label]) => String(label).trim() === from)?.[0] || from;
          db.inventoryOptions.categoryAliases[canonical] = value;
        }
        const products = kind === "category" ? db.materialProducts : [...(db.materialProducts || []), ...(db.foodProducts || [])];
        products.forEach((product) => {
          if (kind === "category" && product.category === from) product.category = value;
          if (kind === "unit" && product.unit === from) product.unit = value;
        });
      } else {
        options.push(value);
      }
      db.inventoryOptions[listKey] = [...new Set(options.map((item) => String(item).trim()).filter(Boolean))];
      return { kind, options: db.inventoryOptions[listKey], value };
    });
  }),
  route("PATCH", "/api/reorder-point", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const officeBrand = user.role === "OFFICE" ? requireOfficeBrand(db, request) : null;
      const branch = db.branches.find((item) => item.id === body.branchId);
      const product = getProduct(db, body.productId);
      if (officeBrand && ((branch && branch.brandId !== officeBrand.id) || product.brandId !== officeBrand.id)) {
        throw httpError("รายการนี้อยู่นอกแบรนด์ที่เลือก", 403);
      }
      const stockOwnerType = stockOwnerTypes.GRAND_SUPPLIED;
      const stockOwnerBranchId = "";
      return setReorderPoint(db, body.branchId, body.productId, body.reorderPoint, body.targetStock ?? body.reserveTarget, {
        warehouseId: "office",
        stockOwnerType: stockOwnerTypes.GRAND_SUPPLIED,
        stockOwnerBranchId: "",
        ...(body.eoq !== undefined ? { eoq: body.eoq } : {})
      });
    });
  }),
  route("POST", "/api/material-requests", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["BRANCH", "OWNER"]);
      requireBranchScope(user, body.branchId);
      return createMaterialRequest(db, { ...body, sourceType: stockOwnerTypes.GRAND_SUPPLIED });
    });
  }),
  route("PATCH", /^\/api\/material-requests\/([^/]+)\/advance$/, async (request, match) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireUser(db, request);
      const materialRequest = db.materialRequests.find((item) => item.id === match[1]);
      if (!materialRequest) throw httpError("ไม่พบรายการเบิกวัตถุดิบ", 404);
      if (user.role === "BRANCH") {
        requireBranchScope(user, materialRequest.branchId);
        if (materialRequest.status !== "SHIPPED") throw httpError("สาขากดรับของได้หลังออฟฟิศจัดส่งแล้วเท่านั้น", 403);
      } else {
        requireRole(db, request, ["OFFICE", "OWNER"]);
        requireOfficeBrandEntity(db, request, materialRequest);
      }
      return advanceMaterialRequest(db, match[1], body);
    });
  }),
  route("POST", "/api/food-requests", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["BRANCH", "OWNER"]);
      requireBranchScope(user, body.branchId);
      return createFoodRequest(db, body);
    });
  }),
  route("PATCH", /^\/api\/food-requests\/([^/]+)\/production$/, async (request, match) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      requireRole(db, request, ["KITCHEN", "OWNER"]);
      return updateFoodRequestProduction(db, match[1], body);
    });
  }),
  route("PATCH", /^\/api\/food-requests\/([^/]+)\/advance$/, async (request, match) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireUser(db, request);
      const foodRequest = db.foodRequests.find((item) => item.id === match[1]);
      if (!foodRequest) throw httpError("ไม่พบรายการเบิกอาหาร", 404);
      if (user.role === "BRANCH") {
        requireBranchScope(user, foodRequest.branchId);
        if (foodRequest.status !== "SHIPPED") throw httpError("สาขากดรับของได้หลังห้องผลิตจัดส่งแล้วเท่านั้น", 403);
      } else {
        requireRole(db, request, ["KITCHEN", "OWNER"]);
      }
      return advanceFoodRequest(db, match[1], body);
    });
  }),
  route("POST", "/api/kitchen-dispatches", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      requireRole(db, request, ["KITCHEN", "OWNER"]);
      return Array.isArray(body.items) ? createKitchenDispatchBatch(db, body) : createKitchenDispatch(db, body);
    });
  }),
  route("PATCH", /^\/api\/kitchen-dispatches\/([^/]+)$/, async (request, match) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireUser(db, request);
      const dispatch = (db.kitchenDispatches || []).find((item) => item.id === match[1]);
      if (!dispatch) throw httpError("ไม่พบรายการส่งจากครัวกลาง", 404);
      if (user.role === "BRANCH") {
        requireBranchScope(user, dispatch.branchId);
        if (dispatch.status !== "SHIPPED" || body.status !== "BRANCH_RECEIVED") {
          throw httpError("สาขากดรับได้เฉพาะรายการที่ห้องผลิตส่งแล้ว", 403);
        }
      } else {
        requireRole(db, request, ["KITCHEN", "OWNER"]);
      }
      return updateKitchenDispatch(db, match[1], body);
    });
  }),
  route("PATCH", /^\/api\/products\/(food|material)\/([^/]+)\/pricing$/, async (request, match) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      requireRole(db, request, ["OFFICE", "OWNER"]);
      const user = requireUser(db, request);
      const product = (match[1] === "food" ? db.foodProducts : db.materialProducts).find((item) => item.id === match[2]);
      if (!product) throw httpError("ไม่พบสินค้า", 404);
      if (user.role === "OFFICE") requireOfficeBrandEntity(db, request, product);
      return updateProductPricing(db, match[1], match[2], body);
    });
  }),
  route("POST", /^\/api\/products\/(food|material)$/, async (request, match) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const officeBrand = user.role === "OFFICE" ? requireOfficeBrand(db, request) : null;
      return createProduct(db, match[1], { ...body, brandId: officeBrand?.id || body.brandId });
    });
  }),
  route("POST", "/api/daily-sales", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireUser(db, request);
      if (user.role !== "OFFICE") throw httpError("ให้ออฟฟิศเป็นผู้บันทึกยอดขายรายวัน", 403);
      const officeBrand = requireOfficeBrand(db, request);
      const branch = db.branches.find((item) => item.id === body.branchId);
      if (!branch || branch.brandId !== officeBrand.id) throw httpError("สาขานี้อยู่นอกแบรนด์ที่เลือก", 403);
      return upsertDailySales(db, body);
    });
  }),
  route("POST", "/api/branch-daily-closings", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["BRANCH", "OWNER"]);
      requireBranchScope(user, body.branchId);
      return upsertBranchDailyClosing(db, { ...body, createdBy: user.name });
    });
  })
];

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const matchedRoute = routes.find((candidate) => candidate.matches(request.method, url.pathname));
    if (matchedRoute) {
      const result = await matchedRoute.handler(request, matchedRoute.match(url.pathname));
      sendJson(response, 200, { ok: true, data: result });
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, error.statusCode || 400, { ok: false, error: error.message || "ทำรายการไม่สำเร็จ" });
  }
});

server.listen(port, () => {
  console.log(`ระบบคลังและเบิกของพร้อมใช้งานที่ http://localhost:${port}`);
});

function route(method, pathMatcher, handler) {
  return {
    method,
    pathMatcher,
    handler,
    matches(requestMethod, pathname) {
      return requestMethod === method && Boolean(this.match(pathname));
    },
    match(pathname) {
      if (typeof pathMatcher === "string") return pathname === pathMatcher ? [pathname] : null;
      return pathname.match(pathMatcher);
    }
  };
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, status, payload) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function localDateTime(date, time = "00:00") {
  return `${date}T${time || "00:00"}:00.000+07:00`;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function requireUser(db, request) {
  const userId = request.headers["x-user-id"];
  const user = (db.users || []).find((item) => item.id === userId);
  if (!user) throw httpError("กรุณาเลือกผู้ใช้งาน", 401);
  return user;
}

function requireRole(db, request, roles) {
  const user = requireUser(db, request);
  if (user.role === "OFFICE" && roles.includes("OFFICE")) requireOfficeBrand(db, request);
  if (user.role === "OWNER" || roles.includes(user.role)) return user;
  throw httpError("บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้", 403);
}

function requireOfficeBrand(db, request) {
  const user = requireUser(db, request);
  if (user.role !== "OFFICE") throw httpError("บัญชีนี้ไม่มีสิทธิ์เลือกแบรนด์", 403);
  const token = String(request.headers["x-office-brand-token"] || "");
  const session = officeBrandSessions.get(token);
  if (!session || session.userId !== user.id || session.expiresAt < Date.now()) {
    if (token) officeBrandSessions.delete(token);
    throw httpError("กรุณาเลือกแบรนด์ก่อนใช้งาน", 401);
  }
  return officeBrandWorkspaces.get(session.brandId);
}

function requireOfficeBrandEntity(db, request, entity) {
  const user = requireUser(db, request);
  if (user.role !== "OFFICE") return null;
  const brand = requireOfficeBrand(db, request);
  if (entity?.brandId && entity.brandId !== brand.id) {
    throw httpError("รายการนี้อยู่นอกแบรนด์ที่เลือก", 403);
  }
  return brand;
}

function requireBranchScope(user, branchId) {
  if (user.role === "OWNER") return;
  if (user.role === "BRANCH" && user.branchId === branchId) return;
  throw httpError("บัญชีสาขาทำรายการได้เฉพาะสาขาของตัวเอง", 403);
}

function publicUser(db, user) {
  const branch = user.branchId ? db.branches.find((item) => item.id === user.branchId) : null;
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    branchId: user.branchId,
    branchName: branch?.name,
    brandId: branch?.brandId,
    allowedViews: allowedViews(user)
  };
}

function allowedViews(user) {
  if (user.role === "OWNER") return ["owner", "kitchen", "branches", "warehouses", "office", "reports"];
  if (user.role === "OFFICE") return ["office", "warehouses", "reports"];
  if (user.role === "KITCHEN") return ["kitchen"];
  if (user.role === "BRANCH") return ["branches"];
  return [];
}

function filterForUser(data, user, brandId) {
  const filtered = structuredClone(data);
  filtered.currentUser = publicUser(data, user);
  filtered.users = (data.users || []).map((item) => publicUser(data, item));

  if (user.role === "BRANCH") {
    const branchId = user.branchId;
    filtered.branches = filtered.branches.filter((branch) => branch.id === branchId);
    filtered.inventorySnapshot = filtered.inventorySnapshot.filter((item) => item.branchId === branchId);
    filtered.officeInventorySnapshot = filtered.officeInventorySnapshot.filter((item) => item.stockOwnerBranchId === branchId || item.stockOwnerType === stockOwnerTypes.GRAND_SUPPLIED);
    filtered.inventoryTransactions = filtered.inventoryTransactions.filter((item) => item.branchId === branchId);
    filtered.foodRequests = filtered.foodRequests.filter((item) => item.branchId === branchId);
    filtered.materialRequests = filtered.materialRequests.filter((item) => item.branchId === branchId);
    filtered.kitchenDispatches = filtered.kitchenDispatches.filter((item) => item.branchId === branchId);
    filtered.reports.todayBranchUsage = filtered.reports.todayBranchUsage.filter((item) => item.branchId === branchId);
    filtered.reports.inventoryValueByBranch = filtered.reports.inventoryValueByBranch.filter((item) => item.branchId === branchId);
    filtered.reports.lowInventory = filtered.reports.lowInventory.filter((item) => item.branchId === branchId);
    filtered.reports.purchaseHistory = filtered.reports.purchaseHistory.filter((item) => item.branchId === branchId);
    filtered.reports.inventoryTransactionHistory = filtered.reports.inventoryTransactionHistory.filter((item) => item.branchId === branchId);
    filtered.reports.materialRequestHistory = filtered.reports.materialRequestHistory.filter((item) => item.branchId === branchId);
    filtered.reports.foodRequestHistory = filtered.reports.foodRequestHistory.filter((item) => item.branchId === branchId);
    filtered.reports.kitchenDispatchHistory = filtered.reports.kitchenDispatchHistory.filter((item) => item.branchId === branchId);
    filtered.branchDailyClosings = filtered.branchDailyClosings.filter((item) => item.branchId === branchId);
    filtered.reports.branchDailyClosingHistory = filtered.reports.branchDailyClosingHistory.filter((item) => item.branchId === branchId);
    filtered.dailySales = filtered.dailySales.filter((item) => item.branchId === branchId);
    filtered.reports.dailySalesHistory = filtered.reports.dailySalesHistory.filter((item) => item.branchId === branchId);
  }

  if (user.role === "KITCHEN") {
    filtered.materialRequests = [];
    filtered.inventorySnapshot = [];
    filtered.officeInventorySnapshot = [];
    filtered.inventoryTransactions = [];
    filtered.reports.lowInventory = [];
    filtered.reports.purchaseHistory = [];
    filtered.reports.inventoryTransactionHistory = [];
    filtered.reports.materialRequestHistory = [];
  }

  if (user.role === "OFFICE") {
    // Office sees kitchen requests and dispatch history read-only for overall follow-up.
    if (brandId) {
      const brandCollections = [
        "branches",
        "suppliers",
        "materialProducts",
        "foodProducts",
        "inventorySettings",
        "inventoryTransactions",
        "inventorySnapshot",
        "officeInventorySnapshot",
        "foodRequests",
        "materialRequests",
        "kitchenDispatches",
        "branchDailyClosings",
        "dailySales"
      ];
      brandCollections.forEach((name) => {
        if (Array.isArray(filtered[name])) filtered[name] = filtered[name].filter((item) => item.brandId === brandId);
      });

      const reportCollections = [
        "todayBranchUsage",
        "inventoryValueByBranch",
        "lowInventory",
        "purchaseHistory",
        "inventoryTransactionHistory",
        "materialRequestHistory",
        "foodRequestHistory",
        "kitchenDispatchHistory",
        "dailySalesHistory",
        "branchDailyClosingHistory"
      ];
      reportCollections.forEach((name) => {
        if (Array.isArray(filtered.reports?.[name])) {
          filtered.reports[name] = filtered.reports[name].filter((item) => item.brandId === brandId);
        }
      });
      const issueTypes = new Set(["MATERIAL_REQUEST", "MANUAL_ISSUE", "DAMAGE", "EXPIRED"]);
      const today = new Date().toISOString().slice(0, 10);
      filtered.reports.dailyIssuedCost = roundMoney(
        filtered.reports.inventoryTransactionHistory
          .filter((txn) => txn.dateTime?.slice(0, 10) === today && issueTypes.has(txn.type))
          .reduce((sum, txn) => sum + Math.abs(Number(txn.totalValue || 0)), 0)
      );
    }
  }

  return filtered;
}

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));
  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("ไม่มีสิทธิ์เข้าถึง");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "content-type": contentType(filePath),
      "cache-control": "no-store, no-cache, must-revalidate"
    });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("ไม่พบหน้า");
  }
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
