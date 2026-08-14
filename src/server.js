import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  advanceFoodRequest,
  advanceMaterialRequest,
  createFoodRequest,
  createInventoryTransaction,
  createKitchenDispatch,
  createMaterialRequest,
  createProduct,
  enrichAll,
  getProduct,
  setReorderPoint,
  updateKitchenDispatch,
  updateProductPricing,
  upsertDailySales
} from "./domain.js";
import { mutateDb, readDb } from "./store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const port = Number(process.env.PORT || 4173);

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
  route("GET", "/api/bootstrap", async (request) => {
    const db = await readDb();
    const user = requireUser(db, request);
    return filterForUser(enrichAll(db), user);
  }),
  route("POST", "/api/stock-in", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const typedName = String(body.productName || "").trim();
      let product = body.productId ? db.materialProducts.find((item) => item.id === body.productId) : null;
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
          imageData: body.imageData
        });
      } else {
        if (body.category) product.category = String(body.category);
        if (body.unit) product.unit = String(body.unit);
        if (Number.isFinite(Number(body.unitCost))) product.standardCost = Number(body.unitCost);
        if (body.imageData) product.imageData = String(body.imageData);
      }
      return createInventoryTransaction(db, {
        type: "PURCHASE",
        branchId: body.branchId,
        productId: product.id,
        quantityChanged: Number(body.quantity),
        unitCost: Number(body.unitCost || product.standardCost),
        referenceNumber: body.referenceNumber,
        dateTime: body.receiveDate ? localDateTime(body.receiveDate, body.receiveTime) : undefined,
        createdBy: user.name,
        remarks: body.remarks || `ผู้ขาย: ${body.supplierName || body.supplierId || "-"}`
      });
    });
  }),
  route("POST", "/api/stock-issue", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const product = getProduct(db, body.productId);
      return createInventoryTransaction(db, {
        type: body.type,
        branchId: body.branchId,
        productId: body.productId,
        quantityChanged: -Math.abs(Number(body.quantity)),
        unitCost: product.standardCost,
        createdBy: user.name,
        remarks: body.remarks || ""
      });
    });
  }),
  route("POST", "/api/stock-adjustment", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["OFFICE", "OWNER"]);
      const current = db.inventoryTransactions
        .filter((txn) => txn.branchId === body.branchId && txn.productId === body.productId)
        .reduce((sum, txn) => sum + Number(txn.quantityChanged), 0);
      const countedQty = Number(body.countedQty);
      const product = getProduct(db, body.productId);
      return createInventoryTransaction(db, {
        type: "ADJUSTMENT",
        branchId: body.branchId,
        productId: body.productId,
        quantityChanged: countedQty - current,
        unitCost: product.standardCost,
        createdBy: user.name,
        remarks: body.remarks || "ปรับยอดจากการนับจริง"
      });
    });
  }),
  route("PATCH", "/api/reorder-point", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      requireRole(db, request, ["OFFICE", "OWNER"]);
      return setReorderPoint(db, body.branchId, body.productId, body.reorderPoint);
    });
  }),
  route("POST", "/api/material-requests", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireRole(db, request, ["BRANCH", "OWNER"]);
      requireBranchScope(user, body.branchId);
      return createMaterialRequest(db, body);
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
  route("PATCH", /^\/api\/food-requests\/([^/]+)\/advance$/, async (request, match) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireUser(db, request);
      const foodRequest = db.foodRequests.find((item) => item.id === match[1]);
      if (!foodRequest) throw httpError("ไม่พบรายการเบิกอาหาร", 404);
      if (user.role === "BRANCH") {
        requireBranchScope(user, foodRequest.branchId);
        if (foodRequest.status !== "SHIPPED") throw httpError("สาขากดรับของได้หลังครัวกลางจัดส่งแล้วเท่านั้น", 403);
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
      return createKitchenDispatch(db, body);
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
          throw httpError("สาขากดรับได้เฉพาะรายการที่ครัวกลางส่งแล้ว", 403);
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
      return updateProductPricing(db, match[1], match[2], body);
    });
  }),
  route("POST", /^\/api\/products\/(food|material)$/, async (request, match) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      requireRole(db, request, ["OFFICE", "OWNER"]);
      return createProduct(db, match[1], body);
    });
  }),
  route("POST", "/api/daily-sales", async (request) => {
    const body = await readJson(request);
    return mutateDb((db) => {
      const user = requireUser(db, request);
      if (user.role !== "OFFICE") throw httpError("ให้ออฟฟิศเป็นผู้บันทึกยอดขายรายวัน", 403);
      return upsertDailySales(db, body);
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

function requireUser(db, request) {
  const userId = request.headers["x-user-id"];
  const user = (db.users || []).find((item) => item.id === userId);
  if (!user) throw httpError("กรุณาเลือกผู้ใช้งาน", 401);
  return user;
}

function requireRole(db, request, roles) {
  const user = requireUser(db, request);
  if (user.role === "OWNER" || roles.includes(user.role)) return user;
  throw httpError("บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้", 403);
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
    allowedViews: allowedViews(user)
  };
}

function allowedViews(user) {
  if (user.role === "OWNER") return ["owner", "kitchen", "branches", "warehouses", "office", "pricing"];
  if (user.role === "OFFICE") return ["office", "warehouses", "pricing"];
  if (user.role === "KITCHEN") return ["kitchen"];
  if (user.role === "BRANCH") return ["branches"];
  return [];
}

function filterForUser(data, user) {
  const filtered = structuredClone(data);
  filtered.currentUser = publicUser(data, user);
  filtered.users = (data.users || []).map((item) => publicUser(data, item));

  if (user.role === "BRANCH") {
    const branchId = user.branchId;
    filtered.branches = filtered.branches.filter((branch) => branch.id === branchId);
    filtered.inventorySnapshot = filtered.inventorySnapshot.filter((item) => item.branchId === branchId);
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
    filtered.dailySales = filtered.dailySales.filter((item) => item.branchId === branchId);
    filtered.reports.dailySalesHistory = filtered.reports.dailySalesHistory.filter((item) => item.branchId === branchId);
  }

  if (user.role === "KITCHEN") {
    filtered.materialRequests = [];
    filtered.inventorySnapshot = [];
    filtered.inventoryTransactions = [];
    filtered.reports.lowInventory = [];
    filtered.reports.purchaseHistory = [];
    filtered.reports.inventoryTransactionHistory = [];
    filtered.reports.materialRequestHistory = [];
  }

  if (user.role === "OFFICE") {
    filtered.foodRequests = [];
    filtered.kitchenDispatches = [];
    filtered.reports.foodRequestHistory = [];
    filtered.reports.kitchenDispatchHistory = [];
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
    response.writeHead(200, { "content-type": contentType(filePath) });
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
