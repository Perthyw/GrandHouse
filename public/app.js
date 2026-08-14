const state = {
  view: "",
  selectedBranchId: "",
  filters: {
    kitchenBranch: "all",
    kitchenDate: "",
    warehouseBranch: "all",
    warehouseDate: "",
    officeBranch: "all",
    officeDate: "",
    ownerBranch: "all",
    ownerDate: "",
    ownerStartDate: "",
    ownerEndDate: "",
    ownerExportMonth: "",
    pricingFoodSearch: "",
    pricingMaterialSearch: "",
    kitchenTab: "queue",
    branchTab: "request",
    branchRequestType: "food-ready",
    branchTrackingType: "kitchen",
    managementTab: "products",
    officeTab: "requests",
    ownerTab: "dashboard"
  },
  data: null,
  loginOptions: null,
  currentUser: readStoredUser(),
  sidebarOpen: false,
  contextMenuGroups: []
};

const viewMeta = {
  kitchen: ["ครัวกลาง", "ครัวกลาง"],
  branches: ["สาขาย่อย", "5 สาขา"],
  warehouses: ["ออฟฟิศ", "คลังสาขา"],
  office: ["ออฟฟิศ", "รายการเบิกวัตถุดิบ"],
  pricing: ["ออฟฟิศ", "ตั้งราคาขาย"],
  owner: ["Dashboard", "Dashboard"]
};

const viewLabels = {
  kitchen: "ครัวกลาง",
  branches: "5 สาขา",
  warehouses: "คลังสาขา",
  office: "ออฟฟิศ",
  pricing: "ตั้งราคาขาย",
  owner: "Dashboard"
};

const issueTypes = [
  ["MANUAL_ISSUE", "เบิกออกเอง"],
  ["DAMAGE", "ของเสีย"],
  ["EXPIRED", "หมดอายุ"]
];

const productionRooms = [
  { name: "ห้องอาหาร", tone: "food-one" },
  { name: "ครัวกลาง", tone: "food-two" },
  { name: "ห้องสลัด", tone: "salad" },
  { name: "ห้องผลไม้", tone: "fruit" },
  { name: "ห้องของหวาน", tone: "dessert" }
];

document.getElementById("refreshButton").addEventListener("click", () => loadData("รีเฟรชข้อมูลแล้ว"));
document.getElementById("mainMenuButton")?.addEventListener("click", () => setSidebarOpen(!state.sidebarOpen));
document.getElementById("sidebarBackdrop")?.addEventListener("click", () => setSidebarOpen(false));
document.getElementById("sidebarToggle")?.addEventListener("click", () => setSidebarOpen(false));

loadData();

async function loadData(message) {
  if (!state.currentUser) {
    await loadLoginOptions();
    renderLogin();
    return;
  }

  const response = await fetch("/api/bootstrap", { headers: authHeaders() });
  const payload = await response.json();
  if (!payload.ok) {
    clearSession();
    toast(payload.error);
    await loadLoginOptions();
    renderLogin();
    return;
  }

  state.data = payload.data;
  state.currentUser = payload.data.currentUser;
  localStorage.setItem("warehouseUser", JSON.stringify(state.currentUser));

  const allowed = allowedViews();
  if (!allowed.includes(state.view)) state.view = allowed[0] || "";
  if (state.currentUser.role === "BRANCH") state.selectedBranchId = state.currentUser.branchId;
  state.selectedBranchId ||= state.data.branches[0]?.id || "";
  render();
  if (message) toast(message);
}

async function loadLoginOptions() {
  const response = await fetch("/api/login-options");
  const payload = await response.json();
  if (!payload.ok) return toast(payload.error);
  state.loginOptions = payload.data;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...authHeaders(), ...(options.headers || {}) }
  });
  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error);
  await loadData();
  return payload.data;
}

function renderLogin() {
  document.body.classList.add("login-mode");
  document.body.classList.remove("app-mode");
  document.body.classList.remove("branch-mode");
  setSidebarOpen(false);
  document.getElementById("viewEyebrow").textContent = "เข้าใช้งาน";
  document.getElementById("viewTitle").textContent = "เลือกผู้ใช้งาน";
  document.getElementById("mainNav").innerHTML = "";
  document.getElementById("contextNav").innerHTML = "";
  document.getElementById("userPanel").innerHTML = "";

  const users = state.loginOptions?.users || [];
  document.getElementById("viewRoot").innerHTML = `
    <section class="login-screen">
      <div class="bakery-login-card">
        <div class="login-brand">
          <svg class="login-g-logo" viewBox="0 0 72 72" aria-hidden="true"><path d="M50 21a24 24 0 1 0 4 30"/><path d="M51 35H36l15 10V28"/></svg>
          <strong>GRAND HOUSE</strong><span>INTERNAL SYSTEM</span>
        </div>
        <div class="login-heading">
          <h2>เข้าสู่ระบบ</h2>
          <p class="muted">กรุณาเลือกบทบาท และกรอกรหัสประจำตัว</p>
        </div>
        <form id="loginForm" class="role-login-form">
          <label class="login-pill-field">
            <span class="login-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5c.9-3.1 3.1-4.7 6.5-4.7s5.6 1.6 6.5 4.7"/></svg></span>
            <select name="userId" aria-label="เลือกบทบาท">
              ${users.map((user) => `<option value="${user.id}">${roleLoginLabel(user)}</option>`).join("")}
            </select>
          </label>
          <label class="login-pill-field">
            <span class="login-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5.5" y="10" width="13" height="10" rx="2"/><path d="M8.5 10V7.8a3.5 3.5 0 0 1 7 0V10M12 14v2.2"/></svg></span>
            <input name="password" type="password" autocomplete="current-password" placeholder="กรอกรหัสผ่าน">
            <button class="password-toggle" type="button" aria-label="แสดงรหัสผ่าน"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 12s3.2-5 9.2-5 9.2 5 9.2 5-3.2 5-9.2 5-9.2-5-9.2-5Z"/><circle cx="12" cy="12" r="2.6"/></svg></button>
          </label>
          <button class="login-submit-button">เข้าสู่ระบบ</button>
        </form>
        <p class="login-note">ระบบคลังและเบิกภายใน</p>
      </div>
    </section>
  `;

  document.getElementById("loginForm").addEventListener("submit", loginWithCode);
  document.querySelector(".password-toggle")?.addEventListener("click", (event) => {
    const input = event.currentTarget.closest(".login-pill-field").querySelector("input");
    input.type = input.type === "password" ? "text" : "password";
  });
}

async function loginWithCode(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: formData.get("userId"),
        password: formData.get("password")
      })
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error);
    state.currentUser = result.data;
    state.view = result.data.allowedViews[0] || "";
    localStorage.setItem("warehouseUser", JSON.stringify(result.data));
    await loadData(`เข้าใช้งานในชื่อ ${result.data.name}`);
  } catch (error) {
    toast(error.message);
  }
}

function render() {
  if (!state.data) return;
  document.body.classList.add("app-mode");
  document.body.classList.remove("login-mode");
  document.body.classList.toggle("branch-mode", state.currentUser.role === "BRANCH" && state.view === "branches");
  document.body.classList.toggle("sidebar-open", state.sidebarOpen);
  const [eyebrow, title] = viewMeta[state.view] || ["", ""];
  document.getElementById("viewEyebrow").textContent = eyebrow;
  document.getElementById("viewTitle").textContent = title;
  state.contextMenuGroups = [];

  renderNav();
  renderUserPanel();

  const root = document.getElementById("viewRoot");
  root.innerHTML = {
    kitchen: renderKitchen,
    branches: renderBranches,
    warehouses: renderWarehouses,
    office: renderOffice,
    pricing: renderPricing,
    owner: renderOwner
  }[state.view]?.() || empty("ไม่มีสิทธิ์เข้าถึง");

  renderContextMenu();
  bindViewEvents(root);
}

function renderNav() {
  const nav = document.getElementById("mainNav");
  nav.innerHTML = allowedViews().map((view) => `<button class="nav-link ${state.view === view ? "active" : ""}" data-view="${view}">${viewLabels[view]}</button>`).join("");
  nav.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      setSidebarOpen(false);
      render();
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  });
}

function renderContextMenu() {
  const context = document.getElementById("contextNav");
  const groups = state.contextMenuGroups || [];
  context.innerHTML = groups.length ? `
    <div class="context-nav-divider"></div>
    ${groups.map((group) => roleMenuGroup(group)).join("")}
  ` : "";
  bindTabButtons(context, true);
}

function setSidebarOpen(open) {
  state.sidebarOpen = open;
  document.body.classList.toggle("sidebar-open", open);
  document.getElementById("sidebarToggle")?.setAttribute("aria-pressed", open ? "true" : "false");
}

function renderUserPanel() {
  const user = state.currentUser;
  document.getElementById("userPanel").innerHTML = `
    <span>ผู้ใช้งาน</span>
    <div class="user-chip">
      <strong>${user.name}</strong>
      <small>${roleLabel(user)}${user.branchName ? ` · ${user.branchName}` : ""}</small>
    </div>
    <button class="secondary logout-button" id="logoutButton">เปลี่ยนผู้ใช้งาน</button>
  `;
  document.getElementById("logoutButton").addEventListener("click", async () => {
    clearSession();
    if (!state.loginOptions) await loadLoginOptions();
    renderLogin();
  });
}

function renderKitchen() {
  const foodRequests = applyRecordFilters(state.data.foodRequests, "kitchen", (request) => request.branchId, (request) => request.createdAt);
  const dispatches = applyRecordFilters(state.data.kitchenDispatches, "kitchen", (dispatch) => dispatch.branchId, (dispatch) => dispatch.dispatchDate);
  const openFood = foodRequests
    .filter((request) => !["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(request.status))
    .sort((a, b) => kitchenPriority(a.status) - kitchenPriority(b.status) || new Date(a.createdAt) - new Date(b.createdAt));
  const waitingReceive = [
    ...foodRequests.filter((request) => ["SHIPPED", "BRANCH_RECEIVED"].includes(request.status)),
    ...dispatches.filter((dispatch) => ["SHIPPED", "BRANCH_RECEIVED"].includes(dispatch.status))
  ];
  const shippedToday = dispatches.filter((dispatch) => dispatch.dispatchDate === today() && ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(dispatch.status));
  const tab = state.filters.kitchenTab === "daily" ? "extra" : (state.filters.kitchenTab || "queue");
  const historyRows = [
    ...foodRequests.filter((request) => ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(request.status)),
    ...dispatches
  ].sort((a, b) => new Date(b.updatedAt || b.createdAt || b.dispatchDate) - new Date(a.updatedAt || a.createdAt || a.dispatchDate));
  const kitchenMenu = [
    { title: "ครัวกลาง", items: [
      ["kitchenTab", "queue", "รายการผลิต", "", "", openFood.length],
      ["kitchenTab", "extra", "ครัวกลางส่งเพิ่ม"],
      ["kitchenTab", "history", "ประวัติการส่ง", "", "", historyRows.length]
    ] }
  ];
  const roomSummary = kitchenRoomSummary(openFood);

  return roleLayout("kitchen", kitchenMenu, `
    <div class="grid three">
      ${metric("รายการจากสาขา", openFood.length)}
      ${metric("ครัวส่งเพิ่มวันนี้", shippedToday.length)}
      ${metric("รอสาขากดรับ", waitingReceive.filter((item) => item.status === "SHIPPED").length)}
    </div>
    ${tab === "queue" ? `
      <section class="panel section-panel">
        ${sectionTitle("งานแยกตามห้องผลิต", "สีประจำห้องช่วยให้แต่ละทีมเห็นเฉพาะเมนูและจำนวนที่ต้องเตรียม")}
        <div class="kitchen-priority-strip">
          <strong>คิวถัดไป</strong>
          <span>${openFood[0] ? `${openFood[0].branchName} · ${openFood[0].items.map((item) => `${item.productName} ${qty(item.requestedQty, item.unit)}`).join(" · ")}` : "ยังไม่มีคิวใหม่"}</span>
        </div>
        <div class="production-room-grid">${roomSummary.map(kitchenRoomBoard).join("")}</div>
      </section>
      <section class="panel section-panel kitchen-request-detail-panel">
        ${sectionTitle("รอบจัดส่งตามสาขา", "ครัวกดส่งออกครั้งเดียวต่อสาขาเมื่อของขึ้นรถแล้ว รายการจะย้ายไปประวัติการส่งทันที")}
        <div class="stack">${kitchenDispatchBatches(openFood) || empty("ยังไม่มีคิวผลิต")}</div>
      </section>
    ` : ""}
    ${tab === "extra" ? `
      <section class="panel section-panel">
        ${sectionTitle("ครัวกลางส่งเพิ่ม", "ใช้เมื่อครัวกลางต้องการส่งเมนูให้สาขาเอง แม้สาขาไม่ได้ส่งคำขอ")}
        <form id="dispatchForm" class="stack">
          <input type="hidden" name="status" value="SHIPPED">
          <input type="hidden" name="sourceType" value="KITCHEN_EXTRA">
          <div class="form-grid">
            <label class="field"><span>สาขา</span>${branchSelect("branchId")}</label>
            <label class="field"><span>เมนู</span>${foodSelect("productId")}</label>
            <label class="field"><span>จำนวนที่ส่งเพิ่ม</span><input name="actualQty" type="number" min="0.01" step="0.01" required></label>
            <label class="field"><span>วันที่ส่ง</span><input name="dispatchDate" type="date" value="${today()}"></label>
            <label class="field"><span>เวลาส่ง</span><input name="dispatchTime" type="time" value="${currentTime()}"></label>
            <label class="field wide"><span>เหตุผลที่ส่งเพิ่ม</span><input name="remarks" placeholder="เช่น ครัวทำเพิ่มและต้องการส่งให้สาขา"></label>
          </div>
          <div class="form-actions"><button class="primary">ยืนยันส่งเพิ่ม</button></div>
        </form>
      </section>
    ` : ""}
    ${tab === "history" ? `
      <section class="panel section-panel">
        ${sectionTitle("ประวัติการส่ง", "รวมรายการที่สาขาเบิกและรายการที่ครัวกลางส่งเพิ่ม")}
        ${kitchenHistoryTable(historyRows)}
      </section>
    ` : ""}
  `);
}

function kitchenDispatchBatches(requests) {
  const byBranch = new Map();
  requests.forEach((request) => {
    const batch = byBranch.get(request.branchId) || { branchName: request.branchName, requests: [] };
    batch.requests.push(request);
    byBranch.set(request.branchId, batch);
  });
  return [...byBranch.values()].map((batch) => `
    <section class="branch-request-group kitchen-dispatch-batch">
      <div class="branch-group-title">
        <div><strong>${batch.branchName}</strong><span>${batch.requests.length} รายการในรอบนี้</span></div>
      </div>
      <div class="stack">${batch.requests.map((request, index) => foodRequestCard(request, index + 1, true)).join("")}</div>
      <div class="batch-actions"><button class="primary success" data-ship-food-batch>ส่งออก</button></div>
    </section>
  `).join("");
}

function kitchenRoomSummary(requests) {
  return productionRooms.map((room) => {
    const products = new Map();
    requests.forEach((request) => request.items
      .filter((item) => item.productionRoom === room.name)
      .forEach((item) => {
        const current = products.get(item.productId) || {
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          requestedQty: 0,
          actualQty: 0,
          branches: []
        };
        current.requestedQty += Number(item.requestedQty || 0);
        current.actualQty += Number(item.deliveredQty || 0);
        current.branches.push(`${request.branchName} ${qty(item.deliveredQty, item.unit)}`);
        products.set(item.productId, current);
      }));
    return { room, rows: [...products.values()] };
  });
}

function kitchenRoomBoard({ room, rows }) {
  return `
    <article class="production-room-panel room-${room.tone}">
      <header>
        <div><span class="room-color-dot"></span><strong>${room.name}</strong></div>
        <em>${rows.length} เมนู</em>
      </header>
      <div class="production-room-list">
        ${rows.map((row) => `
          <div class="production-room-item">
            <div><strong>${row.productName}</strong><small>${row.branches.join(" · ")}</small></div>
            <span>${qty(row.actualQty, row.unit)}</span>
          </div>
        `).join("") || `<p class="room-empty">ยังไม่มีรายการ</p>`}
      </div>
    </article>
  `;
}

function renderBranches() {
  const branch = selectedBranch();
  const foodRequests = state.data.foodRequests.filter((request) => request.branchId === branch.id);
  const materialRequests = state.data.materialRequests.filter((request) => request.branchId === branch.id);
  const dispatches = state.data.kitchenDispatches.filter((dispatch) => dispatch.branchId === branch.id);
  const canSwitchBranch = state.currentUser.role === "OWNER";
  const tab = state.filters.branchTab || "request";
  const requestType = state.filters.branchRequestType || "food-ready";
  const trackingType = state.filters.branchTrackingType || "kitchen";
  const branchMenu = [
    {
      title: "ทำรายการเบิก",
      items: [
        ["branchRequestType", "food-ready", "อาหารสำเร็จรูป", "branchTab", "request"],
        ["branchRequestType", "drink", "น้ำ", "branchTab", "request"],
        ["branchRequestType", "raw", "วัตถุดิบ", "branchTab", "request"],
        ["branchRequestType", "packaging", "บรรจุภัณฑ์", "branchTab", "request"],
        ["branchRequestType", "seasoning", "เครื่องปรุง", "branchTab", "request"],
        ["branchRequestType", "dry", "อาหารแห้ง", "branchTab", "request"]
      ]
    },
    {
      title: "ติดตามสถานะ",
      items: [
        ["branchTrackingType", "kitchen", "จากครัวกลาง", "branchTab", "tracking"],
        ["branchTrackingType", "office", "จากออฟฟิศ", "branchTab", "tracking"]
      ]
    },
    {
      title: "ประวัติการเบิก",
      items: [["branchTab", "history", "รายละเอียดทั้งหมด"]]
    }
  ];

  return roleLayout("branch", branchMenu, `
    <div class="branch-phone-shell">
      <section class="branch-phone-card branch-phone-hero">
        <div>
          <p class="eyebrow">สาขา</p>
          <h2>${branch.name}</h2>
          <p class="muted">${branch.warehouseName}</p>
        </div>
        ${canSwitchBranch ? `<label class="field"><span>เลือกสาขา</span>${branchSelect("selectedBranch", branch.id)}</label>` : `<span class="pill">เครื่องสาขา</span>`}
      </section>

      ${tab === "request" ? branchRequestPanel(branch, requestType) : ""}
      ${tab === "tracking" ? branchTrackingPanel(trackingType, foodRequests, dispatches, materialRequests) : ""}
      ${tab === "history" ? branchHistoryPanel(foodRequests, dispatches, materialRequests) : ""}
    </div>
  `);
}

function branchRequestPanel(branch, requestType) {
  const meta = requestTypeMeta(requestType);
  const isFood = ["food-ready", "drink"].includes(requestType);
  const formId = isFood ? "foodRequestForm" : "materialRequestForm";
  const lineId = isFood ? "foodLines" : "materialLines";
  const addAttr = isFood ? "data-add-food-line" : "data-add-material-line";
  const firstLine = isFood ? foodLine(0, requestType) : materialLine(0, requestType);
  return `
    <section class="branch-phone-card product-list-panel">
      ${sectionTitle(meta.title, meta.subtitle)}
      <form id="${formId}">
        <input type="hidden" name="branchId" value="${branch.id}">
        <div class="line-items product-list" id="${lineId}">${firstLine}</div>
        <button type="button" class="floating-add-button" ${addAttr} data-line-group="${requestType}">+</button>
        <div class="form-actions branch-actions">
          <button class="primary red">ส่งคำขอ</button>
        </div>
      </form>
    </section>
  `;
}

function branchTrackingPanel(trackingType, foodRequests, dispatches, materialRequests) {
  const isKitchen = trackingType === "kitchen";
  return `
    <section class="branch-phone-card">
      ${sectionTitle(isKitchen ? "ติดตามจากครัวกลาง" : "ติดตามจากออฟฟิศ", isKitchen ? "อาหารรายวันและอาหารที่เบิกเพิ่ม" : "วัตถุดิบ บรรจุภัณฑ์ เครื่องปรุง และของแห้ง")}
      <div class="stack">
        ${isKitchen ? `
          ${foodRequests.map(branchFoodRequestStatusCard).join("")}
          ${dispatches.map(dispatchStatusCard).join("")}
          ${foodRequests.length + dispatches.length ? "" : empty("ยังไม่มีรายการจากครัวกลาง")}
        ` : `
          ${materialRequests.map(branchOfficeStatusCard).join("") || empty("ยังไม่มีรายการจากออฟฟิศ")}
        `}
      </div>
    </section>
  `;
}

function branchHistoryPanel(foodRequests, dispatches, materialRequests) {
  const rows = [
    ...foodRequests.map((request) => ({
      id: request.id,
      type: "อาหารสำเร็จรูป",
      detail: request.items.map((item) => `${item.productName} ${qty(item.deliveredQty, item.unit)}`).join(" · "),
      value: request.totalSellingValue,
      status: request.status,
      date: request.createdAt
    })),
    ...dispatches.map((dispatch) => ({
      id: dispatch.id,
      type: dispatch.sourceLabel,
      detail: `${dispatch.productName} ${qty(dispatch.actualQty, dispatch.unit)}`,
      value: dispatch.totalSellingValue,
      status: dispatch.status,
      date: dispatch.updatedAt || dispatch.createdAt
    })),
    ...materialRequests.map((request) => ({
      id: request.id,
      type: request.items.some((item) => item.category === "บรรจุภัณฑ์") ? "บรรจุภัณฑ์/ของใช้" : "วัตถุดิบ",
      detail: request.items.map((item) => `${item.productName} ${qty(item.actualIssuedQty, item.unit)}`).join(" · "),
      value: request.totalCost,
      status: request.status,
      date: request.createdAt
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return `
    <section class="branch-phone-card">
      ${sectionTitle("ประวัติการเบิก", "รหัส ประเภท รายการ จำนวน มูลค่า และสถานะ")}
      <div class="branch-history-list">
        ${rows.map((row) => `
          <article class="branch-history-item">
            <div class="row-between"><strong>${row.id}</strong><span class="pill">${status(row.status)}</span></div>
            <small>${row.type} · ${dateTime(row.date)}</small>
            <p>${row.detail}</p>
            <strong>มูลค่า ${money(row.value)}</strong>
          </article>
        `).join("") || empty("ยังไม่มีประวัติการเบิก")}
      </div>
    </section>
  `;
}

function renderWarehouses() {
  const warehouseBranch = state.filters.warehouseBranch;
  const entryBranch = warehouseBranch === "all" ? state.data.branches[0]?.id : warehouseBranch;
  const tab = state.filters.managementTab || "products";
  const warehouseRows = warehouseBranch === "all" ? state.data.inventorySnapshot : state.data.inventorySnapshot.filter((item) => item.branchId === warehouseBranch);
  const lowRows = warehouseRows.filter((item) => item.isLow);
  const movementRows = applyRecordFilters(state.data.inventoryTransactions, "warehouse", (txn) => txn.branchId, (txn) => txn.dateTime);
  const totalValue = warehouseRows.reduce((sum, item) => sum + item.inventoryValue, 0);
  const totalQty = warehouseRows.reduce((sum, item) => sum + item.quantity, 0);
  const warehouseMenu = [
    { title: "สินค้า", items: [
      ["managementTab", "products", "รายการสินค้า"],
      ["managementTab", "stock-alerts", "แจ้งเตือนเติมสต็อก", "", "", lowRows.length || ""]
    ] },
    { title: "จัดการสินค้า", items: [
      ["managementTab", "food-ready", "อาหารสำเร็จรูป"],
      ["managementTab", "drink", "น้ำ"],
      ["managementTab", "raw", "วัตถุดิบ"],
      ["managementTab", "packaging", "บรรจุภัณฑ์"],
      ["managementTab", "seasoning", "เครื่องปรุง"],
      ["managementTab", "dry", "อาหารแห้ง"]
    ] }
  ];
  const productsContent = `
    <section class="warehouse-hero">
      <div>
        <p class="eyebrow">ภาพรวมคลังสาขา</p>
        <h2>${warehouseBranch === "all" ? "ทุกสาขา" : state.data.branches.find((branch) => branch.id === warehouseBranch)?.name}</h2>
        <label class="field warehouse-branch-picker"><span>เลือกสาขา</span>${branchFilterSelect("warehouseBranch", warehouseBranch)}</label>
      </div>
      <div class="warehouse-stats">
        ${metric("มูลค่ารวม", money(totalValue))}
        ${metric("จำนวนคงเหลือรวม", qty(totalQty))}
        ${metric("จำนวนรายการ", warehouseRows.length)}
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="row-between"><h2>รายการสินค้าทั้งหมด</h2><span class="pill">${warehouseRows.length} รายการ</span></div>
      ${warehouseBranch === "all"
        ? state.data.branches.map((branch) => `
          <section class="inventory-branch-section">
            <div class="inventory-branch-heading"><strong>${branch.name}</strong><span>${branch.warehouseName}</span></div>
            ${inventoryTable(warehouseRows.filter((row) => row.branchId === branch.id))}
          </section>
        `).join("")
        : inventoryTable(warehouseRows)}
    </section>
    <section class="panel section-panel reorder-setup-panel" style="margin-top:16px">
      ${sectionTitle("กำหนดจุดเตือนเติมสต็อก", "เลือกสาขาและสินค้า แล้วกำหนดจำนวนคงเหลือขั้นต่ำ ระบบจะแจ้งเตือนทันทีเมื่อยอดต่ำกว่าค่านี้")}
      <form id="reorderPointForm" class="form-grid">
        <label class="field"><span>สาขา</span>${branchSelect("branchId", entryBranch)}</label>
        <label class="field"><span>สินค้า</span>${materialSelect("productId")}</label>
        <label class="field"><span>เตือนเมื่อเหลือไม่เกิน</span><input name="reorderPoint" type="number" min="0" step="0.01" required></label>
        <div class="form-actions"><button class="primary">บันทึกจุดเตือน</button></div>
      </form>
    </section>
    <div class="warehouse-actions">
      <section class="panel">
        <h2>รับสินค้าเข้าคลัง</h2>
        <form id="stockInForm" class="stack">
          <div class="form-grid">
            <label class="field"><span>ผู้ขาย / แหล่งซื้อ</span>${supplierSelect("supplierId")}</label>
            <label class="field"><span>คลังสาขา</span>${branchSelect("branchId", entryBranch)}</label>
            <label class="field wide"><span>ชื่อสินค้า</span><input name="productName" data-stock-product-name list="materialProductNames" placeholder="พิมพ์ชื่อสินค้าเดิมหรือชื่อสินค้าใหม่" required></label>
            <input type="hidden" name="productId" data-stock-product-id>
            <datalist id="materialProductNames">${state.data.materialProducts.map((item) => `<option value="${escapeAttr(item.name)}"></option>`).join("")}</datalist>
            <label class="field"><span>หมวดหมู่</span>${select("category", [["วัตถุดิบ", "วัตถุดิบ"], ["บรรจุภัณฑ์", "บรรจุภัณฑ์"], ["เครื่องปรุง", "เครื่องปรุง"], ["ของแห้ง", "อาหารแห้ง"]], "วัตถุดิบ")}</label>
            <label class="field"><span>หน่วย</span>${unitSelect("unit", "ชิ้น")}</label>
            <label class="field"><span>รูปสินค้า</span><input name="imageFile" type="file" accept="image/*"></label>
            <label class="field"><span>จำนวน</span><input name="quantity" type="number" min="0.01" step="0.01" required></label>
            <label class="field"><span>ต้นทุนต่อหน่วย</span><input name="unitCost" type="number" min="0.01" step="0.01" required></label>
            <label class="field"><span>วันที่รับเข้า</span><input name="receiveDate" type="date" value="${today()}"></label>
            <label class="field"><span>เวลารับเข้า</span><input name="receiveTime" type="time" value="${currentTime()}"></label>
            <label class="field wide"><span>เลขอ้างอิง</span><input name="referenceNumber" placeholder="เลขเอกสาร"></label>
            <label class="field wide"><span>หมายเหตุ</span><input name="remarks"></label>
          </div>
          <div class="form-actions"><button class="primary">ยืนยันรับเข้า</button></div>
        </form>
      </section>
      <section class="panel">
        <h2>เคลื่อนไหว / นับสต็อก</h2>
        <form id="issueForm" class="stack">
          <div class="form-grid">
            <label class="field"><span>ประเภท</span>${select("type", issueTypes)}</label>
            <label class="field"><span>สาขา</span>${branchSelect("branchId")}</label>
            <label class="field"><span>สินค้า</span>${materialSelect("productId")}</label>
            <label class="field"><span>จำนวน</span><input name="quantity" type="number" min="0.01" step="0.01" required></label>
            <label class="field wide"><span>หมายเหตุ</span><input name="remarks"></label>
          </div>
          <div class="form-actions"><button class="danger">ยืนยันเคลื่อนไหว</button></div>
        </form>
        <form id="adjustForm" class="stack" style="margin-top:16px">
          <div class="form-grid">
            <label class="field"><span>สาขา</span>${branchSelect("branchId", entryBranch)}</label>
            <label class="field"><span>สินค้า</span>${materialSelect("productId")}</label>
            <label class="field"><span>ยอดนับจริง</span><input name="countedQty" type="number" min="0" step="0.01" required></label>
            <label class="field wide"><span>หมายเหตุ</span><input name="remarks"></label>
          </div>
          <div class="form-actions">
            <button class="primary">ยืนยันยอดนับ</button>
          </div>
        </form>
      </section>
    </div>
    <section class="panel" style="margin-top:16px">
      <h2>ประวัติการเคลื่อนไหวสินค้า</h2>
      ${transactionTable(movementRows.slice().reverse())}
    </section>
  `;
  const alertContent = `
    <section class="warehouse-hero">
      <div>
        <p class="eyebrow">แจ้งเตือนเติมสต็อก</p>
        <h2>${warehouseBranch === "all" ? "ทุกสาขา" : state.data.branches.find((branch) => branch.id === warehouseBranch)?.name}</h2>
        <label class="field warehouse-branch-picker"><span>เลือกสาขา</span>${branchFilterSelect("warehouseBranch", warehouseBranch)}</label>
      </div>
      <div class="warehouse-stats">
        ${metric("ต้องซื้อเพิ่ม", lowRows.length)}
        ${metric("มูลค่าคงเหลือ", money(lowRows.reduce((sum, item) => sum + item.inventoryValue, 0)))}
        ${metric("จำนวนสินค้า", lowRows.length ? lowRows.map((item) => item.productId).filter((id, index, all) => all.indexOf(id) === index).length : 0)}
      </div>
    </section>
    <section class="low-stock-panel ${lowRows.length ? "has-alert" : ""}">
      <div class="row-between">
        <div>
          <p class="eyebrow">ต่ำกว่าจุดสั่งซื้อ</p>
          <h2>รายการที่ต้องเติมสต็อก</h2>
        </div>
        <span class="pill ${lowRows.length ? "warning" : ""}">${lowRows.length} รายการ</span>
      </div>
      ${lowRows.length ? `<div class="low-stock-grid">${lowRows.map(lowStockCard).join("")}</div>` : empty("ยังไม่มีรายการต่ำกว่าจุดสั่งซื้อ")}
    </section>
  `;
  return roleLayout("warehouse", warehouseMenu, `
    ${tab === "products" ? productsContent : tab === "stock-alerts" ? alertContent : warehouseManagementPanel(tab, warehouseRows)}
  `);
}

function warehouseManagementPanel(tab, warehouseRows) {
  const foodCategory = tab === "drink" ? "น้ำ" : tab === "food-ready" ? "อาหารสำเร็จรูป" : "";
  if (foodCategory) {
    const rows = state.data.foodProducts.filter((product) => product.category === foodCategory);
    return `
      <section class="panel section-panel">
        ${sectionTitle(`ข้อมูลสินค้า: ${foodCategory}`, "อาหารและน้ำไม่มีสต็อกค้างสาขา หน้านี้ใช้ดูหน่วย ห้องผลิต และราคาขายปัจจุบัน")}
        ${simpleTable(["รูป", "สินค้า", "หน่วย", "ห้องผลิต", "ราคาขาย"], rows.map((product) => [
          productThumbnail(product),
          product.name,
          product.unit,
          productionRoomBadge(product.productionRoom),
          money(product.sellingPrice)
        ]))}
      </section>
    `;
  }

  const category = materialCategoryFromTab(tab);
  const products = state.data.materialProducts.filter((product) => product.category === category);
  const productIds = new Set(products.map((product) => product.id));
  const rows = warehouseRows.filter((row) => productIds.has(row.productId));
  const totalValue = rows.reduce((sum, row) => sum + row.inventoryValue, 0);
  const lowRows = rows.filter((row) => row.isLow);
  return `
    <section class="warehouse-hero">
      <div>
        <p class="eyebrow">จัดการสินค้า</p>
        <h2>${category}</h2>
        <label class="field warehouse-branch-picker"><span>เลือกสาขา</span>${branchFilterSelect("warehouseBranch", state.filters.warehouseBranch)}</label>
      </div>
      <div class="warehouse-stats">
        ${metric("จำนวนรายการ", products.length)}
        ${metric("มูลค่าคลัง", money(totalValue))}
        ${metric("ต้องซื้อเพิ่ม", lowRows.length)}
      </div>
    </section>
    <section class="panel" style="margin-top:16px">
      <div class="row-between"><h2>สินค้าในหมวด ${category}</h2><span class="pill ${lowRows.length ? "warning" : ""}">${lowRows.length} ต่ำกว่า ROP</span></div>
      ${inventoryTable(rows)}
    </section>
  `;
}

function materialCategoryFromTab(tab) {
  return {
    raw: "วัตถุดิบ",
    packaging: "บรรจุภัณฑ์",
    seasoning: "เครื่องปรุง",
    dry: "ของแห้ง"
  }[tab] || "วัตถุดิบ";
}

function renderOffice() {
  const requests = applyRecordFilters(state.data.materialRequests, "office", (request) => request.branchId, (request) => request.createdAt);
  const open = requests.filter((request) => request.status !== "COMPLETED");
  const canRecordSales = state.currentUser.role === "OFFICE";
  const tab = canRecordSales ? (state.filters.officeTab || "requests") : (state.filters.officeTab === "sales" ? "requests" : state.filters.officeTab || "requests");
  const officeBranch = state.filters.officeBranch || "all";
  const officeDate = state.filters.officeDate || today();
  const officeStage = {
    requests: { title: "คำขอใหม่", subtitle: "รายการที่สาขาส่งเข้ามา รอออฟฟิศกดรับเรื่อง", statuses: ["CREATED"] },
    packing: { title: "กำลังจัดสินค้า", subtitle: "รายการที่ออฟฟิศกำลังหยิบและตรวจจำนวน", statuses: ["OFFICE_RECEIVED", "PREPARING"] },
    ready: { title: "พร้อมส่ง", subtitle: "จัดสินค้าและตัดสต็อกแล้ว รอส่งออกให้สาขา", statuses: ["READY", "SHIPPED"] }
  };
  const selectedStage = officeStage[tab];
  const visibleRequests = selectedStage ? requests.filter((request) => selectedStage.statuses.includes(request.status)) : requests;
  const branches = state.data.branches
    .map((branch) => ({ ...branch, requests: visibleRequests.filter((request) => request.branchId === branch.id) }))
    .filter((branch) => branch.requests.length);
  const salesRows = state.data.dailySales.filter((sale) => (officeBranch === "all" || sale.branchId === officeBranch) && (!state.filters.officeDate || sale.salesDate === state.filters.officeDate));
  const officeMenu = [
    { title: "งานเบิกของ", open: true, items: [
      ["officeTab", "requests", "คำขอใหม่", "", "", requests.filter((request) => request.status === "CREATED").length],
      ["officeTab", "packing", "กำลังจัดสินค้า", "", "", requests.filter((request) => ["OFFICE_RECEIVED", "PREPARING"].includes(request.status)).length],
      ["officeTab", "ready", "พร้อมส่ง", "", "", requests.filter((request) => ["READY", "SHIPPED"].includes(request.status)).length]
    ] },
    { title: "ประวัติ", items: [["officeTab", "history", "ประวัติการจัดของ", "", "", requests.filter((request) => request.status === "COMPLETED").length]] },
    ...(canRecordSales ? [{ title: "ยอดขาย", items: [["officeTab", "sales", "กรอกยอดขาย", "", "", salesRows.length || ""]] }] : [])
  ];
  return roleLayout("office", officeMenu, `
    ${selectedStage ? `
      <div class="grid three">
        ${metric("คิววัตถุดิบ", open.length)}
        ${metric("พร้อมจัดของ", open.filter((request) => ["CREATED", "OFFICE_RECEIVED"].includes(request.status)).length)}
        ${metric("มูลค่าจัดของ", money(open.reduce((sum, request) => sum + request.totalCost, 0)))}
      </div>
      <section class="panel" style="margin-top:16px">
        ${sectionTitle(selectedStage.title, selectedStage.subtitle)}
        <div class="stack">${branches.map((branch) => `
          <section class="branch-request-group">
            <div class="branch-group-title">
              <strong>${branch.name}</strong>
              <span>${branch.requests.length} รายการ</span>
            </div>
            <div class="stack">${branch.requests.map(materialRequestCard).join("")}</div>
          </section>
        `).join("") || empty("ยังไม่มีรายการเบิกจากสาขา")}</div>
      </section>
    ` : ""}
    ${tab === "sales" && canRecordSales ? `
      <section class="panel sales-entry-panel">
        ${sectionTitle("กรอกยอดขายรวมรายวัน", "ออฟฟิศกรอกยอดเงินสดและยอดสแกน/โอน เพื่อให้เจ้าของใช้ดู Dashboard")}
        ${dailySalesForm(officeDate, officeBranch)}
      </section>
      <section class="panel" style="margin-top:16px">
        ${sectionTitle("ยอดขายที่บันทึกแล้ว", "ใช้ตัวกรองสาขาและวันที่ด้านบนเพื่อดูหรือกลับมาแก้ยอดของวันนั้น")}
        ${dailySalesTable(state.filters.officeDate || "", state.filters.officeDate || "", officeBranch)}
      </section>
    ` : ""}
    ${tab === "history" ? `
      <section class="panel">
        ${sectionTitle("ประวัติการจัดของ", "รายการเบิกจากสาขาที่ออฟฟิศรับเรื่องและจัดของ")}
        <div class="stack">${requests.map(materialRequestCard).join("") || empty("ยังไม่มีประวัติการจัดของ")}</div>
      </section>
    ` : ""}
  `);
}

function renderOwner() {
  const reports = state.data.reports;
  const branchId = state.filters.ownerBranch;
  const range = ownerDateRange();
  const dashboardDate = range.end;
  const ownerTab = state.filters.ownerTab || "dashboard";
  const inventoryValues = branchId === "all" ? reports.inventoryValueByBranch : reports.inventoryValueByBranch.filter((item) => item.branchId === branchId);
  const lowInventory = branchId === "all" ? reports.lowInventory : reports.lowInventory.filter((item) => item.branchId === branchId);
  const usageRows = ownerUsageRows();
  const dailyUsageRows = ownerUsageRowsForRange(range.start, range.end, branchId);
  const previousUsageRows = ownerUsageRowsForRange(range.previousStart, range.previousEnd, branchId);
  const anomalyRows = branchAnomalyRows(dailyUsageRows, previousUsageRows);
  const materialRanking = productUsageRanking("material", range.start, range.end, branchId);
  const kitchenRanking = productUsageRanking("food", range.start, range.end, branchId);
  const topBranch = dailyUsageRows.slice().sort((a, b) => b.totalCost - a.totalCost)[0];
  const lowestMarginBranch = dailyUsageRows.filter((row) => row.sales > 0).slice().sort((a, b) => a.grossMargin - b.grossMargin)[0];
  const totalSales = dailyUsageRows.reduce((sum, item) => sum + item.sales, 0);
  const totalDailyCost = dailyUsageRows.reduce((sum, item) => sum + item.totalCost, 0);
  const grossProfit = totalSales - totalDailyCost;
  const costEntries = movementEntries(range.start, range.end, branchId);
  const exportMonth = state.filters.ownerExportMonth || range.end.slice(0, 7);
  const inventoryValue = inventoryValues.reduce((sum, item) => sum + item.value, 0);
  const openKitchen = state.data.foodRequests.filter((request) => (branchId === "all" || request.branchId === branchId) && !["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(request.status));
  const openOffice = state.data.materialRequests.filter((request) => (branchId === "all" || request.branchId === branchId) && !["BRANCH_RECEIVED", "COMPLETED"].includes(request.status));
  const waitingReceive = [
    ...state.data.foodRequests.filter((request) => (branchId === "all" || request.branchId === branchId) && request.status === "SHIPPED"),
    ...state.data.materialRequests.filter((request) => (branchId === "all" || request.branchId === branchId) && request.status === "SHIPPED"),
    ...state.data.kitchenDispatches.filter((dispatch) => (branchId === "all" || dispatch.branchId === branchId) && dispatch.status === "SHIPPED")
  ];
  const missingPricing = state.data.foodProducts.filter((product) => Number(product.sellingPrice || 0) <= 0);
  const ownerMenu = [
    { title: "Dashboard", items: [
      ["ownerTab", "dashboard", "ภาพรวมตามช่วง"],
      ["ownerTab", "branches", "วิเคราะห์ตามสาขา"],
      ["ownerTab", "inventory", "คลังและมูลค่า", "", "", lowInventory.length],
      ["ownerTab", "history", "ประวัติทั้งหมด"]
    ] }
  ];

  const dashboardContent = `
    ${filterPanel("owner")}
    ${monthlyExportPanel(branchId, exportMonth)}
    <section class="action-summary">
      ${actionCard("ต้องซื้อด่วน", lowInventory.length, "รายการต่ำกว่า ROP", "warning")}
      ${actionCard("คิวครัวกลาง", openKitchen.length, "รายการรอผลิต/รอส่ง", "red")}
      ${actionCard("คิวออฟฟิศ", openOffice.length, "รายการรอจัดของ", "red")}
      ${actionCard("รอสาขากดรับ", waitingReceive.length, "ส่งแล้วแต่ยังไม่รับ", "warning")}
      ${actionCard("ราคาขายยังไม่ครบ", missingPricing.length, "อาหารหรือน้ำที่ยังไม่มีราคาขาย", "neutral")}
    </section>
    <section class="dashboard-hero">
      <div>
        <p class="eyebrow">Dashboard ${range.label}</p>
        <h2>ภาพรวมยอดขาย ต้นทุน และงานค้างตามช่วงวันที่</h2>
        <p class="muted">เลือก 7 วันหรือช่วงรายเดือนได้ ระบบจะเทียบกับช่วงก่อนหน้าเพื่อดูสาขาที่ผิดปกติ</p>
      </div>
      <div class="dashboard-pie" style="--p:${piePercent(grossProfit, totalSales)}">
        <div class="dashboard-pie-inner">
          <strong>${percent(totalSales ? (grossProfit / totalSales) * 100 : 0)}</strong>
          <span>ส่วนต่างเบื้องต้น</span>
        </div>
      </div>
    </section>
    <div class="kpi-grid">
      ${metric("ยอดขายรวม", money(totalSales))}
      ${costMetric(totalDailyCost, costEntries)}
      ${metric("ส่วนต่างเบื้องต้น", money(grossProfit))}
      ${metric("ต้นทุนต่อยอดขาย", totalSales ? percent((totalDailyCost / totalSales) * 100) : "-")}
      ${metric("มูลค่าคลังรวม", money(inventoryValue))}
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="panel">
        ${sectionTitle("ยอดขายเทียบต้นทุนตามสาขา", "ดูทันทีว่าสาขาไหนขายคุ้มต้นทุนหรือเริ่มผิดปกติ")}
        ${comparisonBarChart(dailyUsageRows)}
      </section>
      <section class="panel">
        ${sectionTitle("วิเคราะห์เร็ว", "จุดที่ควรมองก่อน")}
        <div class="insight-list">
          <article><strong>สาขาที่ใช้ต้นทุนสูงสุด</strong><span>${topBranch ? `${topBranch.branchName} · ${money(topBranch.totalCost)}` : "ยังไม่มีข้อมูลในช่วงนี้"}</span></article>
          <article><strong>สาขากำไรบางสุด</strong><span>${lowestMarginBranch ? `${lowestMarginBranch.branchName} · ${percent(lowestMarginBranch.grossMargin)}` : "รอยอดขายรายวัน"}</span></article>
          <article><strong>สาขาที่ต้นทุนพุ่งขึ้น</strong><span>${anomalyRows[0] ? `${anomalyRows[0].branchName} · ${signedPercent(anomalyRows[0].costChangePercent)} เทียบช่วงก่อนหน้า` : "ยังไม่มีช่วงก่อนหน้าให้เทียบ"}</span></article>
          <article><strong>ของที่สาขาเบิกเยอะสุด</strong><span>${materialRanking[0] ? `${materialRanking[0].name} · ${qty(materialRanking[0].qty, materialRanking[0].unit)}` : "ยังไม่มีข้อมูลในช่วงนี้"}</span></article>
          <article><strong>ครัวกลางส่งเยอะสุด</strong><span>${kitchenRanking[0] ? `${kitchenRanking[0].name} · ${qty(kitchenRanking[0].qty, kitchenRanking[0].unit)}` : "ยังไม่มีข้อมูลในช่วงนี้"}</span></article>
        </div>
      </section>
    </div>
    <section class="panel" style="margin-top:16px">
      ${sectionTitle("เทียบช่วงก่อนหน้า", `ช่วงก่อนหน้า: ${displayDate(range.previousStart)} - ${displayDate(range.previousEnd)}`)}
      ${anomalyTable(anomalyRows)}
    </section>
    <div class="grid two" style="margin-top:16px">
      <section class="panel">
        ${sectionTitle("สินค้าใช้เยอะสุด", "Top 8 วัตถุดิบ บรรจุภัณฑ์ เครื่องปรุง ของแห้ง")}
        ${rankingTable(materialRanking, "ต้นทุน")}
      </section>
      <section class="panel">
        ${sectionTitle("ครัวกลางส่งเยอะสุด", "Top 8 รวมครัวกลางส่งเพิ่มและสาขาเบิกเพิ่ม")}
        ${rankingTable(kitchenRanking, "มูลค่าขาย")}
      </section>
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="panel">
        ${sectionTitle("Performance ตามสาขา", "ยอดขาย ต้นทุน และส่วนต่างเบื้องต้น")}
        ${performanceTable(dailyUsageRows)}
      </section>
      <section class="panel">
        ${sectionTitle("ต้องซื้อด่วน Top 5", "รายการต่ำกว่าจุดสั่งซื้อที่ควรจัดก่อน")}
        ${inventoryTable(lowInventory.slice(0, 5))}
      </section>
    </div>
  `;

  const branchContent = `
    ${filterPanel("owner")}
    <section class="panel">
      ${sectionTitle("วิเคราะห์ตามสาขา", "ยอดขาย ต้นทุน กำไรขั้นต้น และสัดส่วนต้นทุน")}
      ${performanceTable(dailyUsageRows)}
    </section>
    <section class="panel" style="margin-top:16px">
      ${sectionTitle("ดูความผิดปกติเทียบช่วงก่อนหน้า", `ช่วงปัจจุบัน ${range.label}`)}
      ${anomalyTable(anomalyRows)}
    </section>
    <section class="panel" style="margin-top:16px">
      ${sectionTitle("ต้นทุนเบิกตามสาขา", "เปรียบเทียบตามช่วงวันที่เลือก")}
      ${barChart(dailyUsageRows.map((row) => ({ label: row.branchName, value: row.totalCost, display: money(row.totalCost) })))}
    </section>
  `;

  const inventoryContent = `
    ${filterPanel("owner")}
    <div class="grid three">
      ${metric("มูลค่าคลัง", money(inventoryValue))}
      ${metric("ต้องซื้อเพิ่ม", lowInventory.length)}
      ${metric("ต้นทุนเบิกออกทั้งหมด", money(usageRows.reduce((sum, item) => sum + item.totalCost, 0)))}
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="panel">
        <h2>มูลค่าคลังแต่ละสาขา</h2>
        ${simpleTable(["สาขา", "มูลค่าคลัง"], inventoryValues.map((item) => [item.branchName, money(item.value)]))}
      </section>
      <section class="panel">
        <h2>แต่ละสาขาเบิกไปเท่าไหร่</h2>
        ${simpleTable(["สาขา", "ต้นทุนวัตถุดิบ", "ต้นทุนอาหาร", "มูลค่าขายอาหาร", "ต้นทุนรวม"], usageRows.map((item) => [
          item.branchName,
          money(item.materialCost),
          money(item.foodCost),
          money(item.foodSellingValue),
          money(item.totalCost)
        ]))}
      </section>
    </div>
    <section class="panel" style="margin-top:16px">
      <h2>ต้องซื้ออะไรเข้าสาขาไหน</h2>
      ${inventoryTable(lowInventory)}
    </section>
  `;

  const historyContent = `
    ${filterPanel("owner")}
    <section class="panel">
      ${sectionTitle("ยอดขายที่กรอกไว้", "เงินสด สแกน/โอน และยอดรวมต่อสาขา")}
      ${dailySalesTable(range.start, range.end, branchId)}
    </section>
    <section class="panel" style="margin-top:16px">
      ${sectionTitle("ประวัติรายการเบิก", "รวมรายการเบิกของสาขาและครัวกลาง")}
      ${simpleTable(["ประเภท", "เลขรายการ", "สาขา", "วันเวลา", "มูลค่า"], [
        ...state.data.materialRequests.filter((item) => branchId === "all" || item.branchId === branchId).map((item) => ["ออฟฟิศ", item.id, item.branchName, dateTime(item.createdAt), money(item.totalCost)]),
        ...state.data.foodRequests.filter((item) => branchId === "all" || item.branchId === branchId).map((item) => ["ครัวกลาง", item.id, item.branchName, dateTime(item.createdAt), money(item.totalSellingValue)]),
        ...state.data.kitchenDispatches.filter((item) => branchId === "all" || item.branchId === branchId).map((item) => [item.sourceLabel, item.id, item.branchName, `${item.dispatchDate} ${item.dispatchTime || ""}`, money(item.totalSellingValue)])
      ])}
    </section>
  `;

  return roleLayout("owner", ownerMenu, {
    dashboard: dashboardContent,
    branches: branchContent,
    inventory: inventoryContent,
    history: historyContent
  }[ownerTab] || dashboardContent);
}

function renderPricing() {
  const foodProducts = searchProducts(state.data.foodProducts, state.filters.pricingFoodSearch);
  const readyFoods = foodProducts.filter((product) => product.category === "อาหารสำเร็จรูป");
  const drinks = foodProducts.filter((product) => product.category === "น้ำ");
  return `
    <section class="panel pricing-search-panel">
      ${sectionTitle("ตั้งราคาขายอาหารและน้ำ", "วัตถุดิบ บรรจุภัณฑ์ เครื่องปรุง และของแห้ง ใช้ต้นทุนจากการรับเข้าคลัง จึงไม่ต้องตั้งราคาขายในหน้านี้")}
      <label class="field"><span>ค้นหาเมนู</span><input data-search-scope="pricingFoodSearch" value="${escapeAttr(state.filters.pricingFoodSearch)}" placeholder="พิมพ์ชื่ออาหาร น้ำ ห้องผลิต หรือหน่วย"></label>
    </section>
    <section class="panel pricing-add-card">
      <h2>เพิ่มเมนูอาหาร / น้ำ</h2>
      <form id="addFoodProductForm" class="form-grid product-form">
        <input type="hidden" name="standardCost" value="0">
        <label class="field"><span>ชื่อเมนู</span><input name="name" required></label>
        <label class="field"><span>หมวดหมู่</span>${select("category", [["อาหารสำเร็จรูป", "อาหารสำเร็จรูป"], ["น้ำ", "น้ำ"]], "อาหารสำเร็จรูป")}</label>
        <label class="field"><span>หน่วยสินค้า</span>${unitSelect("unit", "ชิ้น")}</label>
        <label class="field"><span>ห้องผลิต</span>${productionRoomSelect("productionRoom")}</label>
        <label class="field"><span>ราคาขายจริงต่อหน่วย</span><input name="sellingPrice" type="number" min="0" step="0.01" required></label>
        <label class="field"><span>รูปเมนู</span><input name="imageFile" type="file" accept="image/*"></label>
        <div class="form-actions"><button class="primary">เพิ่มเมนู</button></div>
      </form>
    </section>
    <div class="grid two">
      <section class="panel">
        <div class="row-between"><h2>อาหารสำเร็จรูป</h2><span class="pill">${readyFoods.length} รายการ</span></div>
        ${priceTable("food", readyFoods)}
      </section>
      <section class="panel">
        <div class="row-between"><h2>น้ำ</h2><span class="pill">${drinks.length} รายการ</span></div>
        ${priceTable("food", drinks)}
      </section>
    </div>
  `;
}

function bindViewEvents(root) {
  root.querySelectorAll("[data-filter-scope]").forEach((input) => {
    input.addEventListener("change", () => {
      state.filters[input.dataset.filterScope] = input.value;
      render();
    });
  });
  root.querySelectorAll("[data-clear-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters[button.dataset.clearFilter] = "";
      render();
    });
  });
  root.querySelectorAll("[data-range-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = button.dataset.rangePreset;
      const end = today();
      state.filters.ownerEndDate = end;
      state.filters.ownerStartDate = preset === "month" ? startOfMonth(end) : addDays(end, -6);
      state.filters.ownerDate = state.filters.ownerEndDate;
      render();
    });
  });
  root.querySelector("[data-owner-range-preset]")?.addEventListener("change", (event) => {
    const preset = event.currentTarget.value;
    if (!preset) return;
    const end = today();
    state.filters.ownerEndDate = end;
    state.filters.ownerStartDate = preset === "month" ? startOfMonth(end) : preset === "today" ? end : addDays(end, -6);
    state.filters.ownerDate = state.filters.ownerEndDate;
    render();
  });
  root.querySelector("[data-clear-owner-range]")?.addEventListener("click", () => {
    state.filters.ownerStartDate = "";
    state.filters.ownerEndDate = "";
    state.filters.ownerDate = "";
    render();
  });
  root.querySelector("[data-monthly-export-month]")?.addEventListener("change", (event) => {
    state.filters.ownerExportMonth = event.currentTarget.value;
  });
  root.querySelector("[data-export-monthly]")?.addEventListener("click", (event) => {
    exportMonthlyExcel(event.currentTarget);
  });
  root.querySelectorAll("[data-search-scope]").forEach((input) => {
    input.addEventListener("input", () => {
      const cursor = input.selectionStart || 0;
      state.filters[input.dataset.searchScope] = input.value;
      render();
      const nextInput = document.querySelector(`[data-search-scope="${input.dataset.searchScope}"]`);
      nextInput?.focus();
      nextInput?.setSelectionRange(cursor, cursor);
    });
  });

  root.querySelector("[name='selectedBranch']")?.addEventListener("change", (event) => {
    state.selectedBranchId = event.target.value;
    render();
  });

  const bindNewLine = (list) => {
    const line = list.lastElementChild;
    line?.querySelectorAll(".request-product-select").forEach((selectEl) => {
      selectEl.addEventListener("change", () => updateLineUnit(selectEl));
      updateLineUnit(selectEl);
    });
  };

  root.querySelectorAll("[data-add-material-line]").forEach((button) => button.addEventListener("click", (event) => {
    const list = event.currentTarget.closest("form").querySelector("#materialLines");
    list.insertAdjacentHTML("beforeend", materialLine(list.children.length, event.currentTarget.dataset.lineGroup || "materials"));
    bindNewLine(list);
  }));

  root.querySelectorAll("[data-add-packaging-line]").forEach((button) => button.addEventListener("click", (event) => {
    const list = event.currentTarget.closest("form").querySelector("#packagingLines");
    list.insertAdjacentHTML("beforeend", materialLine(list.children.length, event.currentTarget.dataset.lineGroup || "packaging"));
    bindNewLine(list);
  }));

  root.querySelectorAll("[data-add-food-line]").forEach((button) => button.addEventListener("click", (event) => {
    const list = event.currentTarget.closest("form").querySelector("#foodLines");
    list.insertAdjacentHTML("beforeend", foodLine(list.children.length, event.currentTarget.dataset.lineGroup || "food-ready"));
    bindNewLine(list);
  }));

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-line]");
    if (!button || !root.contains(button)) return;
    button.closest(".line-item")?.remove();
  });

  root.querySelector("#materialRequestForm")?.addEventListener("submit", handleMaterialCreate);
  root.querySelector("#packagingRequestForm")?.addEventListener("submit", handleMaterialCreate);
  root.querySelector("#foodRequestForm")?.addEventListener("submit", handleFoodCreate);
  root.querySelector("#stockInForm")?.addEventListener("submit", handleStockIn);
  root.querySelector("#reorderPointForm")?.addEventListener("submit", handleReorderPoint);
  root.querySelector("#issueForm")?.addEventListener("submit", handleIssue);
  root.querySelector("#adjustForm")?.addEventListener("submit", handleAdjust);
  root.querySelector("#dispatchForm")?.addEventListener("submit", handleDispatchCreate);
  root.querySelector("#addFoodProductForm")?.addEventListener("submit", (event) => handleProductCreate(event, "food"));
  root.querySelector("#addMaterialProductForm")?.addEventListener("submit", (event) => handleProductCreate(event, "material"));
  root.querySelector("#dailySalesForm")?.addEventListener("submit", handleDailySalesSave);

  root.querySelectorAll("[data-advance-material]").forEach((button) => button.addEventListener("click", () => advanceMaterial(button.dataset.advanceMaterial)));
  root.querySelectorAll("[data-advance-food]").forEach((button) => button.addEventListener("click", () => advanceFood(button.dataset.advanceFood)));
  root.querySelectorAll("[data-ship-food-batch]").forEach((button) => button.addEventListener("click", () => shipFoodBatch(button)));
  root.querySelectorAll("[data-confirm-food-received]").forEach((button) => button.addEventListener("click", () => confirmFoodReceived(button.dataset.confirmFoodReceived)));
  root.querySelectorAll("[data-confirm-dispatch-received]").forEach((button) => button.addEventListener("click", () => confirmDispatchReceived(button.dataset.confirmDispatchReceived)));
  root.querySelectorAll("[data-dispatch-status]").forEach((button) => button.addEventListener("click", () => updateDispatch(button.dataset.dispatchStatus, button.dataset.dispatchNext)));
  root.querySelectorAll("[data-price-kind]").forEach((button) => button.addEventListener("click", () => updatePrice(button)));
  bindTabButtons(root);
  root.querySelectorAll(".request-product-select").forEach((selectEl) => {
    selectEl.addEventListener("change", () => updateLineUnit(selectEl));
    updateLineUnit(selectEl);
  });

  const stockProductName = root.querySelector("[data-stock-product-name]");
  stockProductName?.addEventListener("input", () => {
    const form = stockProductName.closest("form");
    const product = state.data.materialProducts.find((item) => item.name.trim().toLocaleLowerCase("th") === stockProductName.value.trim().toLocaleLowerCase("th"));
    form.querySelector("[data-stock-product-id]").value = product?.id || "";
    if (!product) return;
    form.querySelector("[name='category']").value = product.category || "วัตถุดิบ";
    form.querySelector("[name='unit']").value = product.unit || "ชิ้น";
    form.querySelector("[name='unitCost']").value = product.standardCost || "";
  });
}

function bindTabButtons(container, closeSidebar = false) {
  container.querySelectorAll("[data-tab-scope]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.forceTabScope) state.filters[button.dataset.forceTabScope] = button.dataset.forceTabValue;
    state.filters[button.dataset.tabScope] = button.dataset.tabValue;
    if (closeSidebar) setSidebarOpen(false);
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  }));
}

async function handleMaterialCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const items = readLines(form);
  const label = form.id === "packagingRequestForm" ? "บรรจุภัณฑ์" : "วัตถุดิบ";
  await run(() => api("/api/material-requests", { method: "POST", body: JSON.stringify({ branchId: formData.get("branchId"), items }) }), `ส่งรายการเบิก${label}ให้ออฟฟิศแล้ว`);
}

async function handleFoodCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const items = readLines(form);
  await run(() => api("/api/food-requests", { method: "POST", body: JSON.stringify({ branchId: formData.get("branchId"), items }) }), "ส่งรายการเบิกอาหารให้ครัวกลางแล้ว");
}

async function handleDispatchCreate(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  await run(() => api("/api/kitchen-dispatches", { method: "POST", body: JSON.stringify(payload) }), "บันทึกของที่ครัวกลางส่งแล้ว");
}

async function handleStockIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.imageData = await readImageFile(form.elements.imageFile?.files?.[0]);
  delete payload.imageFile;
  const supplier = state.data.suppliers.find((item) => item.id === payload.supplierId);
  payload.supplierName = supplier?.name;
  await run(() => api("/api/stock-in", { method: "POST", body: JSON.stringify(payload) }), "รับสินค้าเข้าคลังแล้ว");
}

async function handleIssue(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  await run(() => api("/api/stock-issue", { method: "POST", body: JSON.stringify(payload) }), "บันทึกการเคลื่อนไหวแล้ว");
}

async function handleAdjust(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  await run(() => api("/api/stock-adjustment", { method: "POST", body: JSON.stringify(payload) }), "ยืนยันยอดนับแล้ว");
}

async function handleReorderPoint(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  await run(() => api("/api/reorder-point", { method: "PATCH", body: JSON.stringify(payload) }), "บันทึกจุดเตือนเติมสต็อกแล้ว");
}

async function advanceMaterial(id) {
  const card = document.querySelector(`[data-card="${id}"]`);
  const items = [...card.querySelectorAll("[data-actual-product]")].map((input) => ({ productId: input.dataset.actualProduct, actualIssuedQty: Number(input.value) }));
  await run(() => api(`/api/material-requests/${id}/advance`, { method: "PATCH", body: JSON.stringify({ items }) }), `อัปเดต ${id} แล้ว`);
}

async function advanceFood(id) {
  const card = document.querySelector(`[data-card="${id}"]`);
  const items = [...card.querySelectorAll("[data-delivered-product]")].map((input) => ({ productId: input.dataset.deliveredProduct, deliveredQty: Number(input.value) }));
  await run(() => api(`/api/food-requests/${id}/advance`, { method: "PATCH", body: JSON.stringify({ items }) }), `อัปเดต ${id} แล้ว`);
}

async function shipFoodBatch(button) {
  const batch = button.closest(".kitchen-dispatch-batch");
  const requests = [...batch.querySelectorAll("[data-card]")].map((card) => ({
    id: card.dataset.card,
    items: [...card.querySelectorAll("[data-delivered-product]")].map((input) => ({ productId: input.dataset.deliveredProduct, deliveredQty: Number(input.value) }))
  }));
  await run(
    () => Promise.all(requests.map((request) => api(`/api/food-requests/${request.id}/advance`, { method: "PATCH", body: JSON.stringify({ items: request.items }) }))),
    `บันทึกส่งออกแล้ว ${requests.length} รายการ`
  );
}

async function confirmFoodReceived(id) {
  await run(() => api(`/api/food-requests/${id}/advance`, { method: "PATCH", body: JSON.stringify({}) }), "ยืนยันได้รับของแล้ว");
}

async function confirmDispatchReceived(id) {
  await run(() => api(`/api/kitchen-dispatches/${id}`, { method: "PATCH", body: JSON.stringify({ status: "BRANCH_RECEIVED", dispatchTime: currentTime() }) }), "ยืนยันรับของจากครัวกลางแล้ว");
}

async function updateDispatch(id, statusValue) {
  const input = document.querySelector(`[data-dispatch-actual="${id}"]`);
  await run(() => api(`/api/kitchen-dispatches/${id}`, { method: "PATCH", body: JSON.stringify({ actualQty: Number(input.value), status: statusValue, dispatchTime: currentTime() }) }), `อัปเดต ${id} แล้ว`);
}

async function updatePrice(button) {
  const row = button.closest("tr");
  const kind = button.dataset.priceKind;
  const productId = button.dataset.priceProduct;
  const payload = {
    sellingPrice: Number(row.querySelector("[data-price-selling]")?.value || 0),
    productionRoom: row.querySelector("[data-price-room]")?.value
  };
  const imageFile = row.querySelector("[data-product-image]")?.files?.[0];
  if (imageFile) payload.imageData = await readImageFile(imageFile);
  await run(() => api(`/api/products/${kind}/${productId}/pricing`, { method: "PATCH", body: JSON.stringify(payload) }), "บันทึกราคาแล้ว");
}

async function handleProductCreate(event, kind) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  payload.imageData = await readImageFile(form.elements.imageFile?.files?.[0]);
  delete payload.imageFile;
  if (kind === "material") payload.sellingPrice = 0;
  await run(() => api(`/api/products/${kind}`, { method: "POST", body: JSON.stringify(payload) }), kind === "food" ? "เพิ่มเมนูแล้ว" : "เพิ่มสินค้าแล้ว");
}

async function readImageFile(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("กรุณาเลือกรูปภาพเท่านั้น");
  if (file.size > 900000) throw new Error("รูปภาพต้องมีขนาดไม่เกิน 900 KB");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

async function handleDailySalesSave(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  await run(() => api("/api/daily-sales", { method: "POST", body: JSON.stringify(payload) }), "บันทึกยอดขายรายวันแล้ว");
}

async function run(action, successMessage) {
  try {
    await action();
    toast(successMessage);
  } catch (error) {
    toast(error.message);
  }
}

function materialRequestCard(request) {
  const canEdit = canOffice() && ["CREATED", "OFFICE_RECEIVED", "PREPARING"].includes(request.status);
  const canAdvance = canOffice() && ["CREATED", "OFFICE_RECEIVED", "PREPARING", "READY"].includes(request.status);
  const notEnoughItems = request.items.filter((item) => {
    const stock = stockFor(request.branchId, item.productId);
    return stock && Number(item.actualIssuedQty) > Number(stock.quantity);
  });
  return `
    <article class="request-card" data-card="${request.id}">
      <div class="card-head">
        <div>
          <p class="eyebrow">รายการเบิกจากสาขา</p>
          <h3>${request.branchName} · ${requestDateCode(request.createdAt)}</h3>
          <p class="muted">เลขรายการ ${request.id} · ส่งคำขอ ${dateTime(request.createdAt)}</p>
        </div>
        <span class="pill ${notEnoughItems.length ? "warning" : ""}">${notEnoughItems.length ? `${notEnoughItems.length} รายการไม่พอ` : status(request.status)}</span>
      </div>
      ${notEnoughItems.length ? `<div class="stock-shortage-list">${notEnoughItems.map((item) => {
        const stock = stockFor(request.branchId, item.productId);
        return `<span>${item.productName}: ขอ ${qty(item.actualIssuedQty, item.unit)} · เหลือ ${qty(stock.quantity, item.unit)}</span>`;
      }).join("")}</div>` : ""}
      ${simpleTable(["สินค้า", "ขอเบิก", "จัดจริง", "คงเหลือสาขา", "ต้นทุน"], request.items.map((item) => {
        const stock = stockFor(request.branchId, item.productId);
        const shortage = stock && Number(item.actualIssuedQty) > Number(stock.quantity);
        return [
        `${item.productName}<br><span class="muted">${item.category}</span>`,
        qty(item.requestedQty, item.unit),
        canEdit ? `<input data-actual-product="${item.productId}" type="number" min="0" step="0.01" value="${item.actualIssuedQty}">` : qty(item.actualIssuedQty, item.unit),
        `<span class="${shortage ? "text-warning" : ""}">${stock ? qty(stock.quantity, item.unit) : "-"}</span>`,
        money(item.totalCost)
      ];
      }))}
      <div class="row-between" style="margin-top:12px"><strong>${money(request.totalCost)}</strong>${canAdvance ? `<button class="primary" data-advance-material="${request.id}">${nextMaterialAction(request.status)}</button>` : `<span class="pill">${request.status === "COMPLETED" ? "เสร็จสิ้น" : "ดูข้อมูล"}</span>`}</div>
    </article>
  `;
}

function foodRequestCard(request, priority = 0, inBatch = false) {
  const canEdit = canKitchen() && request.status === "CREATED";
  const canConfirmReceived = canBranchFor(request.branchId) && request.status === "SHIPPED";
  return `
    <article class="request-card" data-card="${request.id}">
      <div class="card-head">
        <div>
          <p class="eyebrow">${priority ? `คิวที่ ${priority}` : "คิวผลิต"}</p>
          <h3>${request.branchName} · ${requestDateCode(request.createdAt)}</h3>
          <p class="muted">${request.id} · ${dateTime(request.createdAt)}</p>
        </div>
        <span class="pill">${status(request.status)}</span>
      </div>
      ${foodStepper(request.status)}
      ${simpleTable(["เมนู", "ขอเบิก", "ผลิต / ส่งจริง", "ต้นทุน", "ราคาขาย"], request.items.map((item) => [
        `${item.productName}<br>${productionRoomBadge(item.productionRoom)}`,
        qty(item.requestedQty, item.unit),
        canEdit ? `<input data-delivered-product="${item.productId}" type="number" min="0" step="0.01" value="${item.deliveredQty}">` : qty(item.deliveredQty, item.unit),
        money(item.totalCost),
        money(item.totalSellingValue)
      ]))}
      <div class="row-between" style="margin-top:12px"><strong>${money(request.totalSellingValue)}</strong>${inBatch ? `<span class="pill neutral">อยู่ในรอบจัดส่ง</span>` : foodActionButton(request, canEdit, canConfirmReceived)}</div>
    </article>
  `;
}

function branchFoodRequestStatusCard(request) {
  const canConfirmReceived = canBranchFor(request.branchId) && request.status === "SHIPPED";
  return `
    <article class="status-card" data-card="${request.id}">
      <div class="row-between">
        <div>
          <h3>${request.id}</h3>
          <p class="muted">${request.items.map((item) => `${item.productName} ${qty(item.deliveredQty, item.unit)}`).join(" · ")}</p>
        </div>
        <span class="pill ${request.status === "SHIPPED" ? "warning" : ""}">${status(request.status)}</span>
      </div>
      ${foodStepper(request.status)}
      <div class="row-between">
        <span class="muted">${request.timeline?.length ? `อัปเดตล่าสุด ${dateTime(request.timeline.at(-1).at)}` : ""}</span>
        ${canConfirmReceived ? `<button class="primary red" data-confirm-food-received="${request.id}">ได้รับของแล้ว</button>` : ""}
      </div>
    </article>
  `;
}

function branchOfficeStatusCard(request) {
  const canConfirmReceived = canBranchFor(request.branchId) && request.status === "SHIPPED";
  return `
    <article class="status-card" data-card="${request.id}">
      <div class="row-between">
        <div>
          <h3>${request.id}</h3>
          <p class="muted">${request.items.map((item) => `${item.productName} ${qty(item.actualIssuedQty, item.unit)}`).join(" · ")}</p>
        </div>
        <span class="pill ${request.status === "SHIPPED" ? "warning" : ""}">${status(request.status)}</span>
      </div>
      ${materialStepper(request.status)}
      <div class="row-between">
        <span class="muted">${request.timeline?.length ? `อัปเดตล่าสุด ${dateTime(request.timeline.at(-1).at)}` : ""}</span>
        ${canConfirmReceived ? `<button class="primary red" data-advance-material="${request.id}">ได้รับของแล้ว</button>` : ""}
      </div>
    </article>
  `;
}

function dispatchStatusCard(dispatch) {
  const canConfirmReceived = canBranchFor(dispatch.branchId) && dispatch.status === "SHIPPED";
  return `
    <article class="status-card">
      <div class="row-between">
        <div>
          <h3>${dispatch.id}</h3>
          <p class="muted">${dispatch.sourceLabel} · ${dispatch.productName} ${qty(dispatch.actualQty, dispatch.unit)} · ${dispatch.dispatchDate} ${dispatch.dispatchTime || ""} · ${money(dispatch.totalSellingValue)}</p>
        </div>
        <span class="pill">${status(dispatch.status)}</span>
      </div>
      <div class="mini-route">
        <span class="${dispatch.status === "SHIPPED" ? "done" : "active"}">${dispatch.status === "SHIPPED" ? "ส่งแล้ว" : "รอส่ง"}</span>
        <span class="${dispatch.status === "SHIPPED" ? "active" : ""}">สาขารอกดรับ</span>
      </div>
      ${canConfirmReceived ? `<div class="form-actions"><button class="primary red" data-confirm-dispatch-received="${dispatch.id}">ได้รับของแล้ว</button></div>` : ""}
    </article>
  `;
}

function lowStockCard(item) {
  return `
    <article class="low-stock-card">
      <span class="warning-icon">!</span>
      <div>
        <strong>${item.productName}</strong>
        <small>${item.branchName} · คงเหลือ ${qty(item.quantity, item.unit)} / ${reorderLabel(item)}</small>
      </div>
    </article>
  `;
}

function productionRoomBadge(roomName) {
  const room = productionRooms.find((item) => item.name === roomName) || productionRooms[0];
  return `<span class="production-room-badge room-${room.tone}"><i></i>${room.name}</span>`;
}

function branchStockRow(item) {
  return `
    <article class="branch-stock-item ${item.isLow ? "is-low" : ""}">
      <div>
        <strong>${item.productName}</strong>
        <small>${item.category} · ${reorderLabel(item)}</small>
      </div>
      <div>
        <span>${qty(item.quantity, item.unit)}</span>
        ${item.isLow ? `<em>!</em>` : ""}
      </div>
    </article>
  `;
}

function foodActionButton(request, canEdit, canConfirmReceived) {
  if (canEdit) return `<button class="primary red" data-advance-food="${request.id}">${nextFoodAction(request.status)}</button>`;
  if (canConfirmReceived) return `<button class="primary red" data-confirm-food-received="${request.id}">ได้รับของแล้ว</button>`;
  return `<span class="pill">${request.status === "COMPLETED" ? "เสร็จสิ้น" : "ดูข้อมูล"}</span>`;
}

function foodStepper(currentStatus) {
  const steps = [
    ["CREATED", "รอจัดส่ง"],
    ["SHIPPED", "ส่งออกแล้ว"],
    ["BRANCH_RECEIVED", "สาขารับแล้ว"]
  ];
  const currentIndex = Math.max(0, steps.findIndex(([statusValue]) => statusValue === currentStatus));
  const normalizedIndex = currentStatus === "COMPLETED" ? steps.length - 1 : currentIndex;
  return `
    <div class="progress-line">
      ${steps.map(([statusValue, label], index) => `
        <div class="progress-step ${index < normalizedIndex ? "done" : ""} ${index === normalizedIndex ? "active" : ""}">
          <span>${index < normalizedIndex ? "✓" : index + 1}</span>
          <small>${label}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function materialStepper(currentStatus) {
  const steps = [
    ["CREATED", "ส่งคำขอ"],
    ["OFFICE_RECEIVED", "รับเรื่อง"],
    ["PREPARING", "จัดของ"],
    ["READY", "พร้อมส่ง"],
    ["SHIPPED", "ส่งแล้ว"],
    ["BRANCH_RECEIVED", "สาขารับแล้ว"]
  ];
  const currentIndex = Math.max(0, steps.findIndex(([statusValue]) => statusValue === currentStatus));
  const normalizedIndex = currentStatus === "COMPLETED" ? steps.length - 1 : currentIndex;
  return `
    <div class="progress-line">
      ${steps.map(([statusValue, label], index) => `
        <div class="progress-step ${index < normalizedIndex ? "done" : ""} ${index === normalizedIndex ? "active" : ""}">
          <span>${index < normalizedIndex ? "✓" : index + 1}</span>
          <small>${label}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function inventoryTable(rows) {
  return simpleTable(
    ["รูป", "รายการ", "คงเหลือ", "จุดสั่งซื้อ", "ต้นทุน", "มูลค่า", "สถานะ"],
    rows.map((item) => [
      productThumbnail(state.data.materialProducts.find((product) => product.id === item.productId), item.productName),
      `<div class="inventory-item-details"><strong>${item.productName}</strong><small>หมวดหมู่: ${item.category || "-"}</small><small>หน่วย: ${item.unit || "-"}</small></div>`,
      qty(item.quantity, item.unit),
      reorderLabel(item),
      money(item.standardCost),
      money(item.inventoryValue),
      inventoryAvailability(item)
    ])
  );
}

function inventoryAvailability(item) {
  const reorderPoint = Number(item.reorderPoint || 0);
  const quantity = Number(item.quantity || 0);
  const isNearReorder = reorderPoint > 0 && quantity <= reorderPoint * 1.25;
  return isNearReorder
    ? `<span class="pill warning">เบิกได้ <small>(ของใกล้หมด)</small></span>`
    : `<span class="pill">เบิกได้</span>`;
}

function transactionTable(rows) {
  return simpleTable(
    ["วันเวลา", "สาขา", "สินค้า", "ประเภท", "อ้างอิง", "ก่อนหน้า", "เปลี่ยนแปลง", "คงเหลือ", "มูลค่า", "ผู้บันทึก"],
    rows.map((txn) => {
      const branch = state.data.branches.find((item) => item.id === txn.branchId);
      const product = state.data.materialProducts.find((item) => item.id === txn.productId);
      return [dateTime(txn.dateTime), branch?.name || txn.branchId, product?.name || txn.productId, status(txn.type), txn.referenceNumber, txn.previousQuantity, signed(txn.quantityChanged), txn.currentQuantity, money(txn.totalValue), txn.createdBy];
    })
  );
}

function dispatchTable(rows) {
  const canUpdate = canKitchen();
  return simpleTable(
    ["วันเวลา", "สาขา", "เมนู", "ห้องผลิต", "จำนวนส่ง", "ต้นทุน", "ราคาขาย", "สถานะ", "อัปเดต", ""],
    rows.map((dispatch) => [
      `${dispatch.dispatchDate}<br><span class="muted">${dispatch.dispatchTime || ""}</span>`,
      dispatch.branchName,
      dispatch.productName,
      productionRoomBadge(dispatch.productionRoom),
      canUpdate ? `<input data-dispatch-actual="${dispatch.id}" type="number" min="0" step="0.01" value="${dispatch.actualQty}">` : qty(dispatch.actualQty, dispatch.unit),
      money(dispatch.totalCost),
      money(dispatch.totalSellingValue),
      status(dispatch.status),
      dispatch.updatedAt ? dateTime(dispatch.updatedAt) : "",
      canUpdate ? `<button class="secondary" data-dispatch-status="${dispatch.id}" data-dispatch-next="SHIPPED">บันทึกว่าส่งแล้ว</button>` : ""
    ])
  );
}

function kitchenHistoryTable(rows) {
  if (!rows.length) return empty("ยังไม่มีประวัติการส่ง");
  return simpleTable(
    ["เลขรายการ", "ประเภท", "สาขา", "สินค้า", "จำนวน", "มูลค่า", "สถานะ", "อัปเดต"],
    rows.map((item) => {
      const isDispatch = Boolean(item.productId);
      const itemText = isDispatch
        ? item.productName
        : item.items.map((line) => `${line.productName} ${qty(line.deliveredQty, line.unit)}`).join("<br>");
      const quantityText = isDispatch
        ? qty(item.actualQty, item.unit)
        : item.items.map((line) => qty(line.deliveredQty, line.unit)).join("<br>");
      return [
        item.id,
        item.sourceLabel || (isDispatch ? "ครัวกลางส่งเพิ่ม" : "สาขาเบิกเพิ่ม"),
        item.branchName,
        itemText,
        quantityText,
        money(item.totalSellingValue),
        status(item.status),
        item.updatedAt ? dateTime(item.updatedAt) : item.timeline?.length ? dateTime(item.timeline.at(-1).at) : ""
      ];
    })
  );
}

function priceTable(kind, products) {
  if (kind === "material") {
    return simpleTable(
      ["รูป", "สินค้า", "หมวดหมู่", "หน่วย", "ต้นทุน", ""],
      products.map((product) => [
        productThumbnail(product),
        product.name,
        `<input data-price-category value="${escapeAttr(product.category || "")}">`,
        unitSelect("", product.unit || "ชิ้น", "data-price-unit"),
        `<input data-price-cost type="number" min="0" step="0.01" value="${product.standardCost}">`,
        `<button class="primary" data-price-kind="${kind}" data-price-product="${product.id}">บันทึก</button>`
      ])
    );
  }

  return simpleTable(
    ["รูป", "เมนู", "ประเภท", "หน่วย", "ห้องผลิต", "ราคาขายจริง", ""],
    products.map((product) => [
      productThumbnail(product, product.name, true),
      product.name,
      product.category,
      product.unit,
      productionRoomSelect("", product.productionRoom, "data-price-room"),
      `<input data-price-selling type="number" min="0" step="0.01" value="${product.sellingPrice || 0}">`,
      `<button class="primary" data-price-kind="${kind}" data-price-product="${product.id}">บันทึก</button>`
    ])
  );
}

function productThumbnail(product, fallbackName = "สินค้า", editable = false) {
  const image = product?.imageData
    ? `<img src="${escapeAttr(product.imageData)}" alt="${escapeAttr(fallbackName || product.name)}">`
    : `<span>${escapeAttr(String(fallbackName || product?.name || "ส").slice(0, 1))}</span>`;
  return `<div class="product-thumbnail">${image}${editable ? `<label class="product-image-upload" title="เปลี่ยนรูป"><input type="file" data-product-image accept="image/*"><span>เปลี่ยนรูป</span></label>` : ""}</div>`;
}

function simpleTable(headers, rows) {
  if (!rows.length) return empty("ยังไม่มีข้อมูล");
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function sectionTitle(title, subtitle = "") {
  return `
    <div class="section-title-bar">
      <div>
        <h2>${title}</h2>
        ${subtitle ? `<p>${subtitle}</p>` : ""}
      </div>
    </div>
  `;
}

function roleLayout(kind, groups, content) {
  state.contextMenuGroups = groups;
  return `
    <div class="role-layout ${kind}-role-layout">
      <div class="role-content">${content}</div>
    </div>
  `;
}

function roleMenuGroup(group) {
  const hasActive = group.items.some(([scope, value, , forceScope, forceValue]) => state.filters[scope] === value && (!forceScope || state.filters[forceScope] === forceValue));
  const isOpen = group.open === true || hasActive || group.items.length <= 1;
  return `
    <details class="role-menu-group" ${isOpen ? "open" : ""}>
      <summary>${group.title}</summary>
      <div class="role-menu-items">
        ${group.items.map(([scope, value, label, forceScope, forceValue, badge]) => {
          const isActive = state.filters[scope] === value && (!forceScope || state.filters[forceScope] === forceValue);
          return `
            <button type="button" class="${isActive ? "active" : ""}" data-tab-scope="${scope}" data-tab-value="${value}" ${forceScope ? `data-force-tab-scope="${forceScope}" data-force-tab-value="${forceValue}"` : ""}>
              <span>${label}</span>
              ${badge ? `<em>${badge}</em>` : ""}
            </button>
          `;
        }).join("")}
      </div>
    </details>
  `;
}

function tabMenu(scope, tabs, active) {
  return `
    <div class="tab-menu">
      ${tabs.map(([value, label]) => `<button type="button" class="${active === value ? "active" : ""}" data-tab-scope="${scope}" data-tab-value="${value}">${label}</button>`).join("")}
    </div>
  `;
}

function requestTypeMeta(type) {
  return {
    "food-ready": { title: "เบิกอาหารสำเร็จรูป", subtitle: "เลือกเมนูและใส่จำนวนตามหน่วยที่ตั้งไว้" },
    drink: { title: "เบิกน้ำ", subtitle: "เลือกเครื่องดื่มและใส่จำนวนตามหน่วยที่ตั้งไว้" },
    raw: { title: "เบิกวัตถุดิบ", subtitle: "หมู ไก่ หรือวัตถุดิบสด" },
    packaging: { title: "เบิกบรรจุภัณฑ์", subtitle: "กล่อง ถุง แก้ว สติ๊กเกอร์ และของใช้หน้าร้าน" },
    seasoning: { title: "เบิกเครื่องปรุง", subtitle: "ซอส ผงปรุงรส และเครื่องปรุงอื่น ๆ" },
    dry: { title: "เบิกอาหารแห้ง", subtitle: "ข้าวสาร เส้นแห้ง และของแห้ง" }
  }[type] || { title: "ทำรายการเบิก", subtitle: "เลือกสินค้าและใส่จำนวน" };
}

function updateLineUnit(selectEl) {
  const label = selectEl.closest(".line-item")?.querySelector("[data-unit-label]");
  if (!label) return;
  label.textContent = selectEl.selectedOptions[0]?.dataset.unit || "";
}

function materialLine(index, group = "all") {
  return `<div class="line-item product-line"><label class="field"><span>สินค้า</span>${materialSelect(`items[${index}][productId]`, group)}</label><label class="field qty-field"><span>จำนวน</span><div class="qty-input-wrap"><input name="items[${index}][requestedQty]" type="number" min="0.01" step="0.01" placeholder="0"><em data-unit-label></em></div></label>${removeLineButton(index)}</div>`;
}

function foodLine(index, group = "all") {
  return `<div class="line-item product-line"><label class="field"><span>เมนู</span>${foodSelect(`items[${index}][productId]`, group)}</label><label class="field qty-field"><span>จำนวน</span><div class="qty-input-wrap"><input name="items[${index}][requestedQty]" type="number" min="0.01" step="0.01" placeholder="0"><em data-unit-label></em></div></label>${removeLineButton(index)}</div>`;
}

function removeLineButton(index) {
  return index > 0
    ? `<div class="line-actions"><button type="button" class="remove-line-button" data-remove-line title="ลบรายการนี้" aria-label="ลบรายการนี้">×</button></div>`
    : "";
}

function readLines(form) {
  return [...form.querySelectorAll(".line-item")]
    .map((line) => {
      const productId = line.querySelector("select").value;
      const requestedQty = line.querySelector("input").value;
      return requestedQty ? { productId, requestedQty: Number(requestedQty) } : null;
    })
    .filter(Boolean);
}

function filterPanel(view) {
  if (view === "owner") {
    const range = ownerDateRange();
    return `
      <section class="panel filter-panel owner-range-filter">
        <label class="field"><span>สาขา</span>${branchFilterSelect("ownerBranch", state.filters.ownerBranch)}</label>
        <label class="field"><span>วันที่เริ่ม</span><input data-filter-scope="ownerStartDate" type="date" value="${range.start}"></label>
        <label class="field"><span>วันที่สิ้นสุด</span><input data-filter-scope="ownerEndDate" type="date" value="${range.end}"></label>
        <label class="field"><span>ช่วงลัด</span><select data-owner-range-preset><option value="">เลือกช่วงเอง</option><option value="7days">7 วันล่าสุด</option><option value="month">เดือนนี้</option><option value="today">วันนี้</option></select></label>
      </section>
    `;
  }
  const branchKey = `${view}Branch`;
  const dateKey = `${view}Date`;
  return `
    <section class="panel filter-panel">
      <label class="field"><span>สาขา</span>${branchFilterSelect(branchKey, state.filters[branchKey])}</label>
      <label class="field"><span>วันที่</span><input data-filter-scope="${dateKey}" type="date" value="${state.filters[dateKey] || ""}"></label>
      <button type="button" class="secondary" data-clear-filter="${dateKey}">ทุกวันที่</button>
    </section>
  `;
}

function branchFilterSelect(scope, selected = "all") {
  const options = [["all", "ทุกสาขา"], ...state.data.branches.map((branch) => [branch.id, branch.name])];
  return `<select data-filter-scope="${scope}">${options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function applyRecordFilters(rows, view, getBranchId, getDateValue) {
  const branchValue = state.filters[`${view}Branch`];
  const dateValue = state.filters[`${view}Date`];
  return rows.filter((row) => {
    const branchOk = !branchValue || branchValue === "all" || getBranchId(row) === branchValue;
    const dateOk = !dateValue || normalizeDate(getDateValue(row)) === dateValue;
    return branchOk && dateOk;
  });
}

function ownerDateRange() {
  const fallback = state.filters.ownerDate || today();
  let start = state.filters.ownerStartDate || fallback;
  let end = state.filters.ownerEndDate || state.filters.ownerStartDate || fallback;
  if (start > end) [start, end] = [end, start];
  const days = daysBetween(start, end) + 1;
  return {
    start,
    end,
    days,
    previousStart: addDays(start, -days),
    previousEnd: addDays(start, -1),
    label: start === end ? displayDate(start) : `${displayDate(start)} - ${displayDate(end)}`
  };
}

function movementEntries(startDate = "", endDate = startDate, branchValue = "all") {
  const branchAllowed = (branchId) => branchValue === "all" || branchId === branchValue;
  const branchName = (branchId) => state.data.branches.find((branch) => branch.id === branchId)?.name || branchId;
  const materialSources = {
    MATERIAL_REQUEST: "เบิกจากออฟฟิศ",
    MANUAL_ISSUE: "เบิกออกเอง",
    DAMAGE: "ของเสีย",
    EXPIRED: "หมดอายุ",
    ADJUSTMENT: "ปรับลดสต็อก"
  };
  const entries = [];

  state.data.inventoryTransactions
    .filter((transaction) => Number(transaction.quantityChanged) < 0)
    .filter((transaction) => materialSources[transaction.type])
    .filter((transaction) => branchAllowed(transaction.branchId) && dateInRange(transaction.dateTime, startDate, endDate))
    .forEach((transaction) => {
      const product = state.data.materialProducts.find((item) => item.id === transaction.productId) || {};
      const quantity = Math.abs(Number(transaction.quantityChanged || 0));
      const unitCost = Number(transaction.unitCost ?? product.standardCost ?? 0);
      entries.push({
        date: normalizeDate(transaction.dateTime),
        dateTime: transaction.dateTime,
        branchId: transaction.branchId,
        branchName: branchName(transaction.branchId),
        kind: "material",
        source: materialSources[transaction.type],
        reference: transaction.referenceNumber || transaction.id,
        productId: transaction.productId,
        productName: product.name || transaction.productId,
        category: product.category || "",
        unit: product.unit || "",
        quantity,
        unitCost,
        sellingPrice: 0,
        totalCost: Math.abs(Number(transaction.totalValue ?? quantity * unitCost)),
        totalSellingValue: 0
      });
    });

  const shippedStatuses = new Set(["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"]);
  state.data.foodRequests
    .filter((request) => shippedStatuses.has(request.status) && branchAllowed(request.branchId))
    .forEach((request) => {
      const shippedEvent = [...(request.timeline || [])].reverse().find((event) => event.label === "จัดส่งแล้ว");
      const movementDate = normalizeDate(shippedEvent?.at || request.updatedAt || request.createdAt);
      if (!dateInRange(movementDate, startDate, endDate)) return;
      request.items.forEach((item) => {
        const quantity = Number(item.deliveredQty || 0);
        if (quantity <= 0) return;
        const unitCost = Number(item.standardCost ?? item.unitCost ?? 0);
        const sellingPrice = Number(item.sellingPrice || 0);
        entries.push({
          date: movementDate,
          dateTime: shippedEvent?.at || request.updatedAt || request.createdAt,
          branchId: request.branchId,
          branchName: request.branchName || branchName(request.branchId),
          kind: "food",
          source: "สาขาเบิกเพิ่ม",
          reference: request.id,
          productId: item.productId,
          productName: item.productName || item.productId,
          category: item.category || "อาหารสำเร็จรูป",
          unit: item.unit || "",
          quantity,
          unitCost,
          sellingPrice,
          totalCost: Number(item.totalCost ?? quantity * unitCost),
          totalSellingValue: Number(item.totalSellingValue ?? quantity * sellingPrice)
        });
      });
    });

  state.data.kitchenDispatches
    .filter((dispatch) => shippedStatuses.has(dispatch.status) && branchAllowed(dispatch.branchId))
    .filter((dispatch) => dateInRange(dispatch.dispatchDate, startDate, endDate))
    .forEach((dispatch) => {
      const quantity = Number(dispatch.actualQty || 0);
      if (quantity <= 0) return;
      const unitCost = Number(dispatch.standardCost ?? dispatch.unitCost ?? 0);
      const sellingPrice = Number(dispatch.sellingPrice || 0);
      entries.push({
        date: normalizeDate(dispatch.dispatchDate),
        dateTime: `${dispatch.dispatchDate}T${dispatch.dispatchTime || "00:00"}:00`,
        branchId: dispatch.branchId,
        branchName: dispatch.branchName || branchName(dispatch.branchId),
        kind: "food",
        source: "ครัวกลางส่งเพิ่ม",
        reference: dispatch.id,
        productId: dispatch.productId,
        productName: dispatch.productName || dispatch.productId,
        category: dispatch.category || "อาหารสำเร็จรูป",
        unit: dispatch.unit || "",
        quantity,
        unitCost,
        sellingPrice,
        totalCost: Number(dispatch.totalCost ?? quantity * unitCost),
        totalSellingValue: Number(dispatch.totalSellingValue ?? quantity * sellingPrice)
      });
    });

  return entries.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}

function monthlyExportPanel(branchId, month) {
  const branchLabel = branchId === "all"
    ? "ทุกสาขา"
    : state.data.branches.find((branch) => branch.id === branchId)?.name || branchId;
  return `
    <section class="panel monthly-export-panel">
      <div>
        <p class="eyebrow">รายงานสำหรับบัญชี</p>
        <h2>ส่งออกยอดเบิกและต้นทุนรายเดือน</h2>
        <p class="muted">ไฟล์ Excel แสดงยอดรวม ต้นทุน ราคาขายจริง และจำนวนที่เบิกแยกทุกวันของ ${branchLabel}</p>
      </div>
      <label class="field"><span>เดือน</span><input data-monthly-export-month type="month" value="${month}"></label>
      <button type="button" class="primary export-excel-button" data-export-monthly>ส่งออก Excel</button>
    </section>
  `;
}

function costMetric(total, entries) {
  const bySource = new Map();
  entries.forEach((entry) => bySource.set(entry.source, (bySource.get(entry.source) || 0) + Number(entry.totalCost || 0)));
  return `
    <details class="metric metric-drilldown">
      <summary>
        <span>ต้นทุนรวม</span>
        <strong>${money(total)}</strong>
        <small>กดดูว่าเกิดจากอะไรบ้าง</small>
      </summary>
      <div class="cost-breakdown">
        <div>
          <h3>สรุปตามที่มา</h3>
          ${simpleTable(["ที่มา", "ต้นทุน"], [...bySource.entries()].map(([source, value]) => [source, money(value)]))}
        </div>
        <div>
          <h3>รายละเอียดที่ฝ่ายบัญชีตรวจสอบได้</h3>
          ${simpleTable(
            ["วันที่", "สาขา", "ที่มา", "เลขอ้างอิง", "สินค้า", "จำนวน", "ต้นทุน/หน่วย", "ต้นทุนรวม"],
            entries.map((entry) => [
              displayDate(entry.date),
              entry.branchName,
              entry.source,
              entry.reference,
              entry.productName,
              qty(entry.quantity, entry.unit),
              money(entry.unitCost),
              money(entry.totalCost)
            ])
          )}
        </div>
      </div>
    </details>
  `;
}

function exportMonthlyExcel(button) {
  const month = button.closest(".monthly-export-panel")?.querySelector("[data-monthly-export-month]")?.value;
  if (!month) return toast("กรุณาเลือกเดือนที่ต้องการส่งออก");
  const branchValue = state.filters.ownerBranch || "all";
  const startDate = `${month}-01`;
  const endDate = endOfMonth(startDate);
  const dates = Array.from({ length: daysBetween(startDate, endDate) + 1 }, (_, index) => addDays(startDate, index));
  const entries = movementEntries(startDate, endDate, branchValue);
  const grouped = new Map();

  entries.forEach((entry) => {
    const key = `${entry.branchId}|${entry.kind}|${entry.productId}`;
    const row = grouped.get(key) || {
      branchName: entry.branchName,
      kind: entry.kind === "food" ? "อาหาร/น้ำ" : entry.category || "สินค้าในคลัง",
      productName: entry.productName,
      unit: entry.unit,
      sources: new Set(),
      quantity: 0,
      totalCost: 0,
      totalSellingValue: 0,
      daily: new Map()
    };
    row.sources.add(entry.source);
    row.quantity += Number(entry.quantity || 0);
    row.totalCost += Number(entry.totalCost || 0);
    row.totalSellingValue += Number(entry.totalSellingValue || 0);
    row.daily.set(entry.date, (row.daily.get(entry.date) || 0) + Number(entry.quantity || 0));
    grouped.set(key, row);
  });

  const rows = [...grouped.values()].sort((a, b) => a.branchName.localeCompare(b.branchName, "th") || a.productName.localeCompare(b.productName, "th"));
  const summaryHeaders = [
    "สาขา", "ประเภท / ที่มา", "สินค้า / เมนู", "หน่วย", "ต้นทุนต่อหน่วยเฉลี่ย", "ราคาขายจริงต่อหน่วย",
    "จำนวนรวม", "ต้นทุนรวม", "มูลค่าขายรวม", ...dates.map((date) => displayDate(date))
  ];
  const summaryRows = rows.map((row) => [
    row.branchName,
    `${row.kind} · ${[...row.sources].join(", ")}`,
    row.productName,
    row.unit,
    row.quantity ? row.totalCost / row.quantity : 0,
    row.quantity ? row.totalSellingValue / row.quantity : 0,
    row.quantity,
    row.totalCost,
    row.totalSellingValue,
    ...dates.map((date) => row.daily.get(date) || 0)
  ]);
  const detailHeaders = ["วันที่", "เวลา", "สาขา", "ที่มา", "เลขอ้างอิง", "สินค้า / เมนู", "ประเภท", "หน่วย", "จำนวน", "ต้นทุนต่อหน่วย", "ต้นทุนรวม", "ราคาขายจริงต่อหน่วย", "มูลค่าขายรวม"];
  const detailRows = entries.slice().reverse().map((entry) => [
    displayDate(entry.date),
    entry.dateTime?.slice(11, 16) || "",
    entry.branchName,
    entry.source,
    entry.reference,
    entry.productName,
    entry.category,
    entry.unit,
    entry.quantity,
    entry.unitCost,
    entry.totalCost,
    entry.sellingPrice,
    entry.totalSellingValue
  ]);
  const purchaseHeaders = ["วันที่", "เวลา", "สาขา", "สินค้า", "หมวดหมู่", "จำนวนรับเข้า", "หน่วย", "ต้นทุนต่อหน่วย", "ต้นทุนรวม", "เลขอ้างอิง", "ผู้บันทึก", "หมายเหตุ"];
  const purchaseRows = state.data.inventoryTransactions
    .filter((txn) => txn.type === "PURCHASE" && txn.dateTime.slice(0, 7) === month && (branchValue === "all" || txn.branchId === branchValue))
    .map((txn) => {
      const product = state.data.materialProducts.find((item) => item.id === txn.productId);
      const branch = state.data.branches.find((item) => item.id === txn.branchId);
      return [displayDate(txn.dateTime.slice(0, 10)), txn.dateTime.slice(11, 16), branch?.name || txn.branchId, product?.name || txn.productId, product?.category || "", txn.quantityChanged, product?.unit || "", txn.unitCost, txn.totalValue, txn.referenceNumber, txn.createdBy, txn.remarks];
    });
  const workbook = spreadsheetWorkbook([
    ["สรุปรายวัน", summaryHeaders, summaryRows],
    ["รายละเอียดต้นทุน", detailHeaders, detailRows],
    ["ประวัติซื้อเข้า", purchaseHeaders, purchaseRows]
  ]);
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const branchLabel = branchValue === "all" ? "ทุกสาขา" : state.data.branches.find((branch) => branch.id === branchValue)?.name || branchValue;
  link.href = url;
  link.download = `รายงานการเบิก_${branchLabel}_${month}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  toast(`ส่งออกรายงาน ${branchLabel} เดือน ${month} แล้ว`);
}

function spreadsheetWorkbook(sheets) {
  const sheetXml = sheets.map(([name, headers, rows]) => `
    <Worksheet ss:Name="${xmlText(name.slice(0, 31))}"><Table>
      <Row>${headers.map((header) => spreadsheetCell(header, "String", "Header")).join("")}</Row>
      ${rows.map((row) => `<Row>${row.map((value) => spreadsheetCell(value, typeof value === "number" ? "Number" : "String")).join("")}</Row>`).join("")}
    </Table></Worksheet>
  `).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
    <?mso-application progid="Excel.Sheet"?>
    <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
      <Styles>
        <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Tahoma" ss:Size="10"/></Style>
        <Style ss:ID="Header"><Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#16365F" ss:Pattern="Solid"/></Style>
      </Styles>
      ${sheetXml}
    </Workbook>`;
}

function spreadsheetCell(value, type, style = "") {
  const styleAttr = style ? ` ss:StyleID="${style}"` : "";
  const safeValue = type === "Number" ? Number(value || 0) : xmlText(value ?? "");
  return `<Cell${styleAttr}><Data ss:Type="${type}">${safeValue}</Data></Cell>`;
}

function xmlText(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function ownerUsageRows() {
  const branchValue = state.filters.ownerBranch;
  const range = ownerDateRange();
  return ownerUsageRowsForRange(range.start, range.end, branchValue);
}

function ownerUsageRowsForRange(startDate = "", endDate = startDate, branchValue = state.filters.ownerBranch) {
  const branches = state.data.branches.filter((branch) => branchValue === "all" || branch.id === branchValue);
  return branches.map((branch) => {
    const entries = movementEntries(startDate, endDate, branch.id);
    const materialCost = entries.filter((entry) => entry.kind === "material").reduce((sum, entry) => sum + entry.totalCost, 0);
    const foodRequestCost = entries.filter((entry) => entry.source === "สาขาเบิกเพิ่ม").reduce((sum, entry) => sum + entry.totalCost, 0);
    const kitchenDispatchCost = entries.filter((entry) => entry.source === "ครัวกลางส่งเพิ่ม").reduce((sum, entry) => sum + entry.totalCost, 0);
    const foodCost = foodRequestCost + kitchenDispatchCost;
    const foodSellingValue = entries.filter((entry) => entry.kind === "food").reduce((sum, entry) => sum + entry.totalSellingValue, 0);
    const sales = dailySalesTotal(branch.id, startDate, endDate);
    const totalCost = materialCost + foodCost;
    const grossProfit = sales - totalCost;
    return {
      branchId: branch.id,
      branchName: branch.name,
      sales,
      materialCost,
      foodCost,
      foodRequestCost,
      kitchenDispatchCost,
      foodSellingValue,
      totalCost,
      grossProfit,
      costRatio: sales ? (totalCost / sales) * 100 : 0,
      grossMargin: sales ? (grossProfit / sales) * 100 : 0
    };
  });
}

function ownerUsageRowsForDate(dateValue = "", branchValue = state.filters.ownerBranch) {
  return ownerUsageRowsForRange(dateValue, dateValue, branchValue);
}

function dailySalesTotal(branchId, startDate = "", endDate = startDate) {
  return state.data.dailySales
    .filter((sale) => sale.branchId === branchId && dateInRange(sale.salesDate, startDate, endDate))
    .reduce((sum, sale) => sum + Number(sale.totalSales || 0), 0);
}

function dailySaleRecord(branchId, dateValue = "") {
  return state.data.dailySales.find((sale) => sale.branchId === branchId && sale.salesDate === dateValue);
}

function branchAnomalyRows(currentRows, previousRows) {
  return currentRows.map((row) => {
    const previous = previousRows.find((item) => item.branchId === row.branchId) || {};
    return {
      ...row,
      previousSales: previous.sales || 0,
      previousCost: previous.totalCost || 0,
      previousGrossProfit: previous.grossProfit || 0,
      salesChangePercent: changePercent(row.sales, previous.sales || 0),
      costChangePercent: changePercent(row.totalCost, previous.totalCost || 0),
      profitChangePercent: changePercent(row.grossProfit, previous.grossProfit || 0)
    };
  }).sort((a, b) => b.costChangePercent - a.costChangePercent);
}

function actionCard(title, value, subtitle, tone = "neutral") {
  return `
    <article class="action-card ${tone}">
      <span>${title}</span>
      <strong>${value}</strong>
      <small>${subtitle}</small>
    </article>
  `;
}

function dailySalesForm(dateValue, branchValue = "all") {
  const defaultBranchId = branchValue === "all" ? state.data.branches[0]?.id : branchValue;
  const sale = dailySaleRecord(defaultBranchId, dateValue) || {};
  return `
    <form id="dailySalesForm" class="form-grid">
      <label class="field"><span>สาขา</span>${branchSelect("branchId", defaultBranchId)}</label>
      <label class="field"><span>วันที่ขาย</span><input name="salesDate" type="date" value="${dateValue || today()}" required></label>
      <label class="field"><span>เงินสด</span><input name="cashSales" type="number" min="0" step="0.01" value="${sale.cashSales ?? 0}" required></label>
      <label class="field"><span>สแกน / โอน</span><input name="transferSales" type="number" min="0" step="0.01" value="${sale.transferSales ?? 0}" required></label>
      <label class="field wide"><span>หมายเหตุ</span><input name="remarks" value="${escapeAttr(sale.remarks || "")}" placeholder="เช่น ยอดปิดร้านจากเงินสดและสแกน"></label>
      <div class="form-actions"><button class="primary">บันทึกยอดขาย</button></div>
    </form>
  `;
}

function performanceTable(rows) {
  return simpleTable(
    ["สาขา", "ยอดขาย", "ต้นทุนรวม", "กำไรขั้นต้น", "ต้นทุน/ยอดขาย"],
    rows.map((row) => [
      row.branchName,
      money(row.sales),
      money(row.totalCost),
      `<span class="${row.grossProfit < 0 ? "text-danger" : "text-ok"}">${money(row.grossProfit)}</span>`,
      row.sales ? percent(row.costRatio) : "-"
    ])
  );
}

function anomalyTable(rows) {
  return simpleTable(
    ["สาขา", "ยอดขายเทียบก่อนหน้า", "ต้นทุนเทียบก่อนหน้า", "กำไรเทียบก่อนหน้า", "หมายเหตุ"],
    rows.map((row) => [
      row.branchName,
      `${money(row.sales)} <span class="${toneForChange(row.salesChangePercent)}">${signedPercent(row.salesChangePercent)}</span>`,
      `${money(row.totalCost)} <span class="${toneForCostChange(row.costChangePercent)}">${signedPercent(row.costChangePercent)}</span>`,
      `${money(row.grossProfit)} <span class="${toneForChange(row.profitChangePercent)}">${signedPercent(row.profitChangePercent)}</span>`,
      anomalyNote(row)
    ])
  );
}

function dailySalesTable(startDate = "", endDate = startDate, branchValue = "all") {
  const rows = state.data.dailySales
    .filter((sale) => (branchValue === "all" || sale.branchId === branchValue) && dateInRange(sale.salesDate, startDate, endDate))
    .sort((a, b) => a.salesDate.localeCompare(b.salesDate) || a.branchName.localeCompare(b.branchName, "th"));
  return simpleTable(
    ["วันที่", "สาขา", "เงินสด", "สแกน/โอน", "ยอดขายรวม", "หมายเหตุ"],
    rows.map((sale) => [displayDate(sale.salesDate), sale.branchName, money(sale.cashSales), money(sale.transferSales), money(sale.totalSales), sale.remarks || "-"])
  );
}

function comparisonBarChart(rows) {
  const max = Math.max(...rows.flatMap((row) => [row.sales, row.totalCost]), 1);
  return `
    <div class="compare-chart">
      ${rows.map((row) => `
        <article class="compare-row">
          <div>
            <strong>${row.branchName}</strong>
            <small>${row.sales ? `กำไรขั้นต้น ${percent(row.grossMargin)}` : "รอยอดขาย"}</small>
          </div>
          <div class="compare-bars">
            <span><i style="width:${Math.max(4, (row.sales / max) * 100)}%"></i></span>
            <span><b style="width:${Math.max(4, (row.totalCost / max) * 100)}%"></b></span>
          </div>
          <em>${money(row.sales)} / ${money(row.totalCost)}</em>
        </article>
      `).join("")}
      <div class="chart-legend"><span class="sales">ยอดขาย</span><span class="cost">ต้นทุน</span></div>
    </div>
  `;
}

function productUsageRanking(kind, startDate = "", endDate = startDate, branchValue = "all") {
  const totals = new Map();
  const add = (key, name, unit, qtyValue, costValue, sellingValue = 0) => {
    const current = totals.get(key) || { name, unit, qty: 0, cost: 0, sellingValue: 0 };
    current.qty += Number(qtyValue || 0);
    current.cost += Number(costValue || 0);
    current.sellingValue += Number(sellingValue || 0);
    totals.set(key, current);
  };

  movementEntries(startDate, endDate, branchValue)
    .filter((entry) => entry.kind === kind)
    .forEach((entry) => add(entry.productId, entry.productName, entry.unit, entry.quantity, entry.totalCost, entry.totalSellingValue));

  return [...totals.values()].sort((a, b) => (b.cost + b.sellingValue) - (a.cost + a.sellingValue));
}

function barChart(rows) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return `
    <div class="bar-chart">
      ${rows.map((row) => `
        <div class="bar-row">
          <span>${row.label}</span>
          <div><i style="width:${Math.max(4, (row.value / max) * 100)}%"></i></div>
          <strong>${row.display}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function rankingTable(rows, valueLabel) {
  return simpleTable(
    ["สินค้า", "จำนวน", valueLabel],
    rows.slice(0, 8).map((item) => [
      item.name,
      qty(item.qty, item.unit),
      money(valueLabel === "มูลค่าขาย" ? item.sellingValue : item.cost)
    ])
  );
}

function piePercent(value, total) {
  if (!total) return 0;
  return Math.max(4, Math.min(100, Math.round((value / total) * 100)));
}

function normalizeDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function dateInRange(value, startDate = "", endDate = startDate) {
  const date = normalizeDate(value);
  if (!date) return false;
  const start = startDate || date;
  const end = endDate || start;
  return date >= start && date <= end;
}

function addDays(value, amount) {
  const date = dateFromYmd(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return ymdFromDate(date);
}

function daysBetween(startDate, endDate) {
  const start = dateFromYmd(startDate);
  const end = dateFromYmd(endDate);
  return Math.max(0, Math.round((end - start) / 86400000));
}

function dateFromYmd(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function ymdFromDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function startOfMonth(value) {
  return `${value.slice(0, 8)}01`;
}

function endOfMonth(value) {
  const date = dateFromYmd(startOfMonth(value));
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return ymdFromDate(date);
}

function changePercent(current, previous) {
  if (!previous && !current) return 0;
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function signedPercent(value) {
  const number = Number(value || 0);
  const prefix = number > 0 ? "+" : "";
  return `${prefix}${percent(number)}`;
}

function toneForChange(value) {
  if (value >= 10) return "text-ok";
  if (value <= -10) return "text-danger";
  return "text-warning";
}

function toneForCostChange(value) {
  if (value >= 15) return "text-danger";
  if (value >= 5) return "text-warning";
  if (value <= -5) return "text-ok";
  return "";
}

function anomalyNote(row) {
  if (row.costChangePercent >= 15 && row.salesChangePercent < row.costChangePercent) return `<span class="pill danger">ต้นทุนขึ้นเร็วกว่ายอดขาย</span>`;
  if (row.grossMargin < 20 && row.sales > 0) return `<span class="pill warning">กำไรบาง</span>`;
  if (!row.sales && row.totalCost > 0) return `<span class="pill warning">มีต้นทุนแต่ยังไม่มียอดขาย</span>`;
  return `<span class="pill">ปกติ</span>`;
}

function kitchenPriority(statusValue) {
  return {
    CREATED: 1
  }[statusValue] || 9;
}

function stockFor(branchId, productId) {
  return state.data.inventorySnapshot.find((item) => item.branchId === branchId && item.productId === productId);
}

function requestDateCode(value) {
  return new Intl.DateTimeFormat("th-TH", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function searchProducts(products, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return products;
  return products.filter((product) => [product.name, product.category, product.unit, product.productionRoom]
    .some((value) => String(value || "").toLowerCase().includes(needle)));
}

function reorderLabel(item) {
  return Number(item.reorderPoint || 0) > 0 ? `ขั้นต่ำ ${qty(item.reorderPoint, item.unit)}` : "ยังไม่ตั้งขั้นต่ำ";
}

function selectedBranch() {
  return state.data.branches.find((branch) => branch.id === state.selectedBranchId) || state.data.branches[0];
}

function branchSelect(name, selected = "") {
  return select(name, state.data.branches.map((item) => [item.id, item.name]), selected);
}

function supplierSelect(name) {
  return select(name, state.data.suppliers.map((item) => [item.id, item.name]));
}

function materialSelect(name, group = "all") {
  return productSelect(name, materialProductsForGroup(group));
}

function foodSelect(name, group = "all") {
  return productSelect(name, foodProductsForGroup(group));
}

function productSelect(name, products) {
  return `<select class="request-product-select" name="${name}">${products.map((item) => `<option value="${item.id}" data-unit="${escapeAttr(item.unit || "")}">${item.name} (${item.unit})</option>`).join("")}</select>`;
}

function materialProductsForGroup(group = "all") {
  return state.data.materialProducts.filter((item) => {
    if (group === "packaging") return item.category === "บรรจุภัณฑ์";
    if (group === "raw") return item.category === "วัตถุดิบ";
    if (group === "seasoning") return item.category === "เครื่องปรุง";
    if (group === "dry") return item.category === "ของแห้ง";
    if (group === "materials") return item.category !== "บรรจุภัณฑ์";
    return true;
  });
}

function foodProductsForGroup(group = "all") {
  return state.data.foodProducts.filter((item) => {
    if (group === "food-ready") return item.category === "อาหารสำเร็จรูป";
    if (group === "drink") return item.category === "น้ำ";
    return true;
  });
}

function unitSelect(name, selected = "ชิ้น", extraAttr = "") {
  const units = ["กล่อง", "ขวด", "แก้ว", "จาน", "ถ้วย", "ชุด", "ชิ้น", "แผ่น", "แถว", "ใบ", "ม้วน", "แพ็ก", "ถุง", "กก.", "กิโลกรัม", "ขีด", "กรัม", "ลิตร"];
  const nameAttr = name ? `name="${name}"` : "";
  return `<select ${nameAttr} ${extraAttr}>${units.map((unit) => `<option value="${unit}" ${selected === unit ? "selected" : ""}>${unit}</option>`).join("")}</select>`;
}

function productionRoomSelect(name, selected = "ห้องอาหาร", extraAttr = "") {
  const nameAttr = name ? `name="${name}"` : "";
  return `<select ${nameAttr} ${extraAttr}>${productionRooms.map((room) => `<option value="${room.name}" ${selected === room.name ? "selected" : ""}>${room.name}</option>`).join("")}</select>`;
}

function select(name, options, selected = "") {
  return `<select name="${name}">${options.map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function allowedViews() {
  return state.currentUser?.allowedViews || [];
}

function canOffice() {
  return ["OFFICE", "OWNER"].includes(state.currentUser?.role);
}

function canKitchen() {
  return ["KITCHEN", "OWNER"].includes(state.currentUser?.role);
}

function canBranchFor(branchId) {
  if (state.currentUser?.role === "OWNER") return true;
  return state.currentUser?.role === "BRANCH" && state.currentUser.branchId === branchId;
}

function roleLabel(user) {
  return {
    OWNER: "เจ้าของ",
    OFFICE: "ออฟฟิศ",
    KITCHEN: "ครัวกลาง",
    BRANCH: "พนักงานสาขา"
  }[user.role] || user.role;
}

function roleInitial(user) {
  return {
    OWNER: "จ",
    OFFICE: "อ",
    KITCHEN: "ค",
    BRANCH: "ส"
  }[user.role] || "ผ";
}

function roleLoginLabel(user) {
  if (user.role === "BRANCH") return `สาขา ${user.branchName}`;
  return roleLabel(user);
}

function userAccessText(user) {
  if (user.role === "OWNER") return "เข้าได้ทุกส่วน";
  if (user.role === "OFFICE") return "ออฟฟิศ / คลังสาขา / ตั้งราคา";
  if (user.role === "KITCHEN") return "ครัวกลาง";
  return `เฉพาะสาขา ${user.branchName}`;
}

function authHeaders() {
  return state.currentUser?.id ? { "x-user-id": state.currentUser.id } : {};
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("warehouseUser"));
  } catch {
    return null;
  }
}

function clearSession() {
  state.currentUser = null;
  state.data = null;
  state.view = "";
  state.selectedBranchId = "";
  localStorage.removeItem("warehouseUser");
}

function empty(text) {
  return `<div class="empty">${text}</div>`;
}

function money(value) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function percent(value) {
  return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(Number(value || 0))}%`;
}

function qty(value, unit = "") {
  return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(Number(value || 0))} ${unit}`.trim();
}

function signed(value) {
  return Number(value) > 0 ? `+${qty(value)}` : qty(value);
}

function status(value) {
  return {
    CREATED: "ส่งคำขอแล้ว",
    ACCEPTED: "รับเรื่องแล้ว",
    START_PRODUCTION: "กำลังเตรียม",
    READY_TO_DELIVER: "พร้อมส่ง",
    SHIPPED: "จัดส่งแล้ว",
    BRANCH_RECEIVED: "สาขารับของแล้ว",
    COMPLETED: "เสร็จสิ้น",
    OFFICE_RECEIVED: "ออฟฟิศรับเรื่อง",
    PREPARING: "กำลังจัดของ",
    READY: "พร้อมส่ง",
    PURCHASE: "ซื้อเข้า",
    MATERIAL_REQUEST: "เบิกวัตถุดิบ",
    MANUAL_ISSUE: "เบิกออกเอง",
    ADJUSTMENT: "ปรับยอด",
    DAMAGE: "ของเสีย",
    EXPIRED: "หมดอายุ",
    PLANNED: "รอส่ง",
    REQUESTED: "รอดำเนินการ",
    IN_PRODUCTION: "กำลังผลิต"
  }[value] || String(value);
}

function dateTime(value) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function displayDate(value) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function nextMaterialAction(statusValue) {
  return {
    CREATED: "ออฟฟิศรับเรื่อง",
    OFFICE_RECEIVED: "เริ่มจัดของ",
    PREPARING: "จัดของเสร็จสิ้น / ตัดสต็อก",
    READY: "จัดส่ง",
    SHIPPED: "สาขารับของ",
    BRANCH_RECEIVED: "เสร็จสิ้น"
  }[statusValue] || "อัปเดต";
}

function nextFoodAction(statusValue) {
  return {
    CREATED: "ส่งออกแล้ว",
    SHIPPED: "สาขารับแล้ว",
    BRANCH_RECEIVED: "เสร็จสิ้น"
  }[statusValue] || "อัปเดต";
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove("show"), 3000);
}
