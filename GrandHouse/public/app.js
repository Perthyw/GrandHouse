const state = {
  view: "",
  selectedBranchId: "",
  filters: {
    kitchenBranch: "all",
    kitchenDate: "",
    kitchenRoom: "all",
    kitchenHistoryDate: "",
    kitchenHistoryRoom: "all",
    warehouseBranch: "all",
    warehouseOwner: "all",
    warehouseFocus: false,
    warehouseCategory: "all",
    warehouseDate: "",
    warehouseDateStart: "",
    warehouseDateEnd: "",
    warehouseHistoryType: "all",
    warehouseHistoryQuery: "",
    officeBranch: "all",
    officeDate: "",
    officeCostBranch: "all",
    officeCostPreset: "today",
    officeCostStartDate: "",
    officeCostEndDate: "",
    branchClosingDate: "",
    ownerBranch: "all",
    ownerDate: "",
    ownerStartDate: "",
    ownerEndDate: "",
    ownerExportMonth: "",
    reportBranch: "all",
    reportMonth: "",
    pricingFoodSearch: "",
    pricingMaterialSearch: "",
    kitchenTab: "queue",
    kitchenRoomAccess: "",
    kitchenRoomGateTarget: "",
    kitchenRoomGateError: "",
    branchTab: "home",
    branchRequestType: "food-ready",
    branchTrackingType: "kitchen",
    branchHistoryType: "requests",
    officeHistoryType: "kitchen",
    officeHistoryPreset: "all",
    officeHistoryStartDate: "",
    officeHistoryEndDate: "",
    officeParentModule: "overview",
    managementTab: "overview",
    officeTab: "requests",
    ownerTab: "dashboard"
  },
  data: null,
  loginOptions: null,
  currentUser: readStoredUser(),
  officeBrandId: "",
  officeBrandToken: "",
  officeBrandGateTarget: "",
  officeBrandGateError: "",
  sidebarOpen: false,
  contextMenuGroups: []
};

let liveRefreshTimer = null;
let liveRefreshInFlight = false;

const viewMeta = {
  kitchen: ["ห้องผลิต", "ห้องผลิต"],
  branches: ["สาขาย่อย", "5 สาขา"],
  warehouses: ["ออฟฟิศ", "คลังสินค้า"],
  office: ["ออฟฟิศ", "รายการเบิก"],
  reports: ["ออฟฟิศ", "รายงาน"],
  owner: ["Dashboard", "Dashboard"]
};

const viewLabels = {
  kitchen: "ห้องผลิต",
  branches: "5 สาขา",
  warehouses: "คลังสินค้า",
  office: "ออฟฟิศ",
  reports: "รายงาน",
  owner: "Dashboard"
};

const issueTypes = [
  ["MANUAL_ISSUE", "เบิกออกเอง"],
  ["DAMAGE", "ของเสีย"],
  ["EXPIRED", "หมดอายุ"]
];

const productionRooms = [
  { name: "ห้องอาหาร", tone: "food-one", icon: "🍛" },
  { name: "ครัวกลาง", tone: "food-two", icon: "🍳" },
  { name: "ห้องสลัด", tone: "salad", icon: "🥗" },
  { name: "ห้องผลไม้", tone: "fruit", icon: "🍓" },
  { name: "ห้องของหวาน", tone: "dessert", icon: "🍰" }
];

// Temporary shared PIN for the production-room gate. Keep this in one place so
// it can be replaced by per-room, server-verified PINs when those are provided.
const productionRoomAccessCode = "kitchen";

const officeBrands = [
  { id: "the-grands", name: "The Grands", icon: "✦", symbol: "sparkle", tone: "the-grands" },
  { id: "grand-house", name: "Grand House", icon: "♡", symbol: "heart", tone: "grand-house" }
];

const parentCompanyModules = [
  { id: "overview", title: "ภาพรวมบริษัท", kicker: "ศูนย์กลางการบริหาร", description: "ดูภาพรวมสิ่งที่ต้องติดตามในระดับบริษัท", icon: "◈", tone: "overview", ready: true },
  { id: "people", title: "HR & บุคลากร", kicker: "ทะเบียนและดูแลทีม", description: "ประวัติพนักงาน แผนก ตำแหน่ง และเอกสารบุคลากร", icon: "◎", tone: "people", ready: false },
  { id: "central-stock", title: "คลังกลาง", kicker: "สินค้าและวัสดุส่วนกลาง", description: "ดูแลสต็อกกลางและการจ่ายให้แต่ละแบรนด์", icon: "▦", tone: "stock", ready: false },
  { id: "procurement", title: "จัดซื้อและผู้ขาย", kicker: "วงจรการจัดซื้อ", description: "ผู้ขาย ใบสั่งซื้อ และประวัติการรับสินค้า", icon: "↗", tone: "procurement", ready: false },
  { id: "finance", title: "การเงินและบัญชี", kicker: "งบประมาณและค่าใช้จ่าย", description: "งบประมาณ รายรับรายจ่าย และเอกสารทางการเงิน", icon: "฿", tone: "finance", ready: false },
  { id: "assets", title: "ทรัพย์สินและเอกสาร", kicker: "สิ่งที่บริษัทต้องดูแล", description: "ทรัพย์สิน สัญญา ประกัน และเอกสารสำคัญ", icon: "▣", tone: "assets", ready: false }
];

const parentCompanyPlans = {
  people: ["ทะเบียนพนักงานและประวัติการทำงาน", "แผนก ตำแหน่ง และสายบังคับบัญชา", "วันลา เวลาเข้างาน และเอกสารบุคลากร"],
  "central-stock": ["รายการสินค้าและวัสดุส่วนกลาง", "รับเข้า จ่ายออก และยอดคงเหลือแยกพื้นที่", "แจ้งเตือนจุดสั่งซื้อและประวัติการเคลื่อนไหว"],
  procurement: ["ทะเบียนผู้ขายและเงื่อนไขการซื้อ", "ใบขอซื้อและใบสั่งซื้อ", "ติดตามการรับสินค้าและเอกสารประกอบ"],
  finance: ["ตั้งงบประมาณตามแผนกหรือแบรนด์", "บันทึกรายรับ รายจ่าย และเจ้าหนี้", "รายงานสรุปสำหรับผู้บริหารและบัญชี"],
  assets: ["ทะเบียนทรัพย์สินและผู้รับผิดชอบ", "ประกัน วันหมดอายุ และประวัติซ่อม", "คลังเอกสารและสัญญาที่ค้นหาได้"]
};

document.getElementById("refreshButton").addEventListener("click", () => loadData("รีเฟรชข้อมูลแล้ว"));
document.getElementById("productionBackButton")?.addEventListener("click", () => {
  state.filters.kitchenRoomAccess = "";
  state.filters.kitchenRoom = "all";
  state.filters.kitchenBranch = "all";
  state.filters.kitchenTab = "queue";
  state.filters.kitchenRoomGateTarget = "";
  state.filters.kitchenRoomGateError = "";
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
});
document.getElementById("warehouseTopbarBackButton")?.addEventListener("click", () => {
  state.filters.managementTab = "products";
  state.filters.warehouseFocus = false;
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
});
document.getElementById("mainMenuButton")?.addEventListener("click", () => setSidebarOpen(!state.sidebarOpen));
document.getElementById("sidebarBackdrop")?.addEventListener("click", () => setSidebarOpen(false));
document.getElementById("sidebarToggle")?.addEventListener("click", () => setSidebarOpen(false));
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshLiveData();
});

loadData();

async function loadData(message) {
  if (!state.currentUser) {
    await loadLoginOptions();
    renderLogin();
    return;
  }

  if (state.currentUser.role === "OFFICE" && !state.officeBrandToken) {
    renderOfficeBrandGate();
    return;
  }

  const response = await fetch("/api/bootstrap", { headers: authHeaders() });
  const payload = await response.json();
  if (!payload.ok) {
    if (state.currentUser.role === "OFFICE" && response.status === 401) {
      state.officeBrandId = "";
      state.officeBrandToken = "";
      state.officeBrandGateTarget = "";
      state.officeBrandGateError = payload.error;
      renderOfficeBrandGate();
      return;
    }
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
  startLiveRefresh();
  if (message) toast(message);
}

function startLiveRefresh() {
  if (liveRefreshTimer) return;
  liveRefreshTimer = window.setInterval(refreshLiveData, 15000);
}

function stopLiveRefresh() {
  if (!liveRefreshTimer) return;
  window.clearInterval(liveRefreshTimer);
  liveRefreshTimer = null;
}

async function refreshLiveData() {
  if (liveRefreshInFlight || document.hidden || !state.currentUser || !state.data) return;
  if (!["kitchen", "office", "branches"].includes(state.view)) return;
  const active = document.activeElement;
  if (active && ["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName)) return;
  liveRefreshInFlight = true;
  try {
    await loadData();
  } catch {
    // Keep the current screen intact; the next interval will retry.
  } finally {
    liveRefreshInFlight = false;
  }
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
  if (!payload.ok) {
    if (response.status === 401 && state.currentUser?.role === "OFFICE") {
      state.officeBrandId = "";
      state.officeBrandToken = "";
      state.officeBrandGateTarget = "";
      state.officeBrandGateError = payload.error;
      state.data = null;
      renderOfficeBrandGate();
    }
    throw new Error(payload.error);
  }
  await loadData();
  return payload.data;
}

function renderLogin() {
  document.body.classList.add("login-mode");
  document.body.classList.remove("app-mode");
  document.body.classList.remove("branch-mode");
  document.body.classList.remove("production-mode");
  document.body.classList.remove("office-brand-mode");
  document.body.classList.remove("office-brand-modal-open");
  document.body.classList.remove("parent-company-mode");
  document.body.classList.remove("grand-house-mode");
  document.body.classList.remove("warehouse-focus-mode");
  setSidebarOpen(false);
  document.getElementById("viewEyebrow").textContent = "เข้าใช้งาน";
  document.getElementById("viewTitle").textContent = "เลือกผู้ใช้งาน";
  document.getElementById("productionBackButton")?.setAttribute("hidden", "");
  document.getElementById("warehouseTopbarBackButton")?.setAttribute("hidden", "");
  document.getElementById("mainNav").innerHTML = "";
  document.getElementById("contextNav").innerHTML = "";
  document.getElementById("userPanel").innerHTML = "";
  document.title = "เข้าสู่ระบบ · Grand House";

  const users = state.loginOptions?.users || [];
  document.getElementById("viewRoot").innerHTML = `
    <section class="login-screen">
      <aside class="login-art-panel" aria-labelledby="login-art-title">
        <div class="login-art-illustration">
          <img src="/assets/login-strawberry-garden-v2.png" alt="ภาพสวนสตรอว์เบอร์รีที่มีผลสตรอว์เบอร์รีสีแดงในหุบเขาโทนสีละมุน" loading="eager">
        </div>
        <div class="login-art-heading">
          <span class="login-art-kicker">SINCE 2019</span>
          <h2 id="login-art-title">THE GRAND'S</h2>
          <p class="login-art-slogan">you are doing better than you think</p>
        </div>
      </aside>
      <div class="bakery-login-card">
        <div class="login-heading">
          <h2>เข้าสู่ระบบ</h2>
          <p class="muted">เลือกห้องเพื่อเริ่มใช้งาน</p>
        </div>
        <form id="loginForm" class="role-login-form" autocomplete="off" novalidate>
          <label class="login-pill-field login-pill-field--select">
            <span class="login-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.5c.9-3.1 3.1-4.7 6.5-4.7s5.6 1.6 6.5 4.7"/></svg></span>
            <select name="userId" aria-label="เลือกห้อง">
              ${users.map((user) => `<option value="${user.id}">${roleLoginLabel(user)}</option>`).join("")}
            </select>
          </label>
          <label class="login-pill-field login-pill-field--password">
            <span class="login-field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5.5" y="10" width="13" height="9.5" rx="2"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/><path d="M12 14v2.5"/></svg></span>
            <input id="loginPasswordInput" name="password" type="password" autocomplete="new-password" placeholder="รหัสผ่าน (โหมดทดลอง)" aria-label="รหัสผ่าน (ไม่บังคับในโหมดทดลอง)">
            <button class="password-toggle" id="loginPasswordToggle" type="button" aria-label="แสดงรหัสผ่าน" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.25-5 9-5 9 5 9 5-3.25 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/></svg></button>
          </label>
          <button class="login-submit-button" type="submit">เข้าสู่ระบบ</button>
        </form>
        <p class="login-note"><span aria-hidden="true">✦</span> โหมดทดลอง · ช่องรหัสผ่านยังไม่บังคับกรอก</p>
      </div>
    </section>
  `;

  document.getElementById("loginForm").addEventListener("submit", loginWithCode);
  const passwordInput = document.getElementById("loginPasswordInput");
  const passwordToggle = document.getElementById("loginPasswordToggle");
  passwordToggle?.addEventListener("click", () => {
    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    passwordToggle.setAttribute("aria-label", isVisible ? "แสดงรหัสผ่าน" : "ซ่อนรหัสผ่าน");
    passwordToggle.setAttribute("aria-pressed", String(!isVisible));
  });
}

function renderOfficeBrandGate() {
  document.body.classList.add("app-mode", "office-brand-mode");
  document.body.classList.remove("login-mode", "branch-mode", "production-mode", "parent-company-mode", "grand-house-mode");
  document.body.classList.remove("warehouse-focus-mode");
  setSidebarOpen(false);
  const target = officeBrands.find((brand) => brand.id === state.officeBrandGateTarget);
  document.body.classList.toggle("office-brand-modal-open", Boolean(target));
  document.getElementById("viewEyebrow").textContent = "ออฟฟิศ";
  document.getElementById("viewTitle").textContent = target ? `ยืนยันการเข้าใช้งาน ${target.name}` : "เข้าสู่พื้นที่ทำงาน";
  document.getElementById("productionBackButton")?.setAttribute("hidden", "");
  document.getElementById("warehouseTopbarBackButton")?.setAttribute("hidden", "");
  const refreshButton = document.getElementById("refreshButton");
  if (refreshButton) refreshButton.hidden = true;
  document.title = target ? `ยืนยันการเข้าใช้งาน ${target.name} · ออฟฟิศ` : "เข้าสู่พื้นที่ทำงาน · ออฟฟิศ";
  setBrandIdentity(target);
  renderUserPanel();
  document.getElementById("mainNav").innerHTML = "";
  document.getElementById("contextNav").innerHTML = "";

  const root = document.getElementById("viewRoot");
  root.innerHTML = `
    <section class="office-brand-gate" aria-labelledby="office-brand-gate-title">
      <div class="office-brand-gate-heading">
        <span class="office-brand-kicker">ระบบสำนักงาน</span>
        <h2 id="office-brand-gate-title">เข้าสู่พื้นที่ทำงาน</h2>
      </div>
      <div class="office-brand-grid" aria-label="พื้นที่ทำงานที่เลือกได้">
        ${officeBrands.map((brand) => `
          <button type="button" class="office-brand-card office-brand-card--${brand.tone} ${target?.id === brand.id ? "selected" : ""}" data-office-brand="${brand.id}" aria-pressed="${target?.id === brand.id}">
            <span class="office-brand-card-mark office-brand-card-mark--${brand.symbol}" aria-hidden="true"><span class="office-brand-card-symbol">${brand.icon}</span></span>
            <span class="office-brand-card-copy"><strong>${brand.name}</strong></span>
            <span class="office-brand-card-arrow" aria-hidden="true">→</span>
          </button>
        `).join("")}
      </div>
      ${target ? `
        <div class="office-brand-code-modal-layer" data-office-brand-modal-backdrop>
          <section class="office-brand-code-panel office-brand-code-modal" role="dialog" aria-modal="true" aria-labelledby="office-brand-code-title" tabindex="-1">
            <button type="button" class="office-brand-modal-close" data-office-brand-cancel aria-label="ปิดหน้าต่าง">×</button>
            <div>
              <span class="office-brand-kicker">ยืนยันการเข้าใช้งาน</span>
              <h3 id="office-brand-code-title">เข้าสู่พื้นที่ ${target.name}</h3>
            </div>
            <form data-office-brand-form novalidate>
              <label class="field"><span>รหัสเข้าใช้งาน</span><input name="brandCode" type="password" autocomplete="new-password" placeholder="กรอกรหัสเข้าใช้งาน" aria-describedby="office-brand-code-help" /></label>
              <p id="office-brand-code-help" class="office-brand-code-error" role="alert">${escapeHtml(state.officeBrandGateError || "")}</p>
              <div class="form-actions"><button type="button" class="secondary" data-office-brand-cancel>กลับ</button><button type="submit" class="primary red">เข้าสู่ระบบ</button></div>
            </form>
          </section>
        </div>
      ` : ""}
    </section>
  `;

  root.querySelectorAll("[data-office-brand]").forEach((button) => button.addEventListener("click", () => {
    const brandId = button.dataset.officeBrand;
    if (brandId === "grand-house") {
      state.officeBrandGateTarget = "";
      state.officeBrandGateError = "";
      enterOfficeBrand(brandId);
      return;
    }
    state.officeBrandGateTarget = brandId;
    state.officeBrandGateError = "";
    renderOfficeBrandGate();
  }));
  const closeOfficeBrandModal = () => {
    state.officeBrandGateTarget = "";
    state.officeBrandGateError = "";
    renderOfficeBrandGate();
  };
  root.querySelectorAll("[data-office-brand-cancel]").forEach((button) => button.addEventListener("click", closeOfficeBrandModal));
  root.querySelector("[data-office-brand-modal-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeOfficeBrandModal();
  });
  root.querySelector("[data-office-brand-modal-backdrop]")?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOfficeBrandModal();
  });
  root.querySelector("[data-office-brand-form]")?.addEventListener("submit", verifyOfficeBrand);
  root.querySelector("[name='brandCode']")?.focus();
}

async function verifyOfficeBrand(event) {
  event.preventDefault();
  const brandId = state.officeBrandGateTarget;
  const code = String(new FormData(event.currentTarget).get("brandCode") || "").trim();
  if (!brandId || !code) {
    state.officeBrandGateError = "กรุณากรอกรหัสเข้าใช้งาน";
    renderOfficeBrandGate();
    return;
  }
  try {
    await enterOfficeBrand(brandId, code);
  } catch (error) {
    state.officeBrandGateError = error.message || "รหัสเข้าใช้งานไม่ถูกต้อง";
    renderOfficeBrandGate();
  }
}

async function enterOfficeBrand(brandId, code = "") {
  try {
    const response = await fetch("/api/office-brand-access", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders() },
      body: JSON.stringify({ brandId, code })
    });
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error);
    state.officeBrandId = payload.data.brandId;
    state.officeBrandToken = payload.data.token;
    state.officeBrandGateTarget = "";
    state.officeBrandGateError = "";
    await loadData(`เข้าใช้งาน ${payload.data.brandName} แล้ว`);
  } catch (error) {
    state.officeBrandGateError = error.message || "เข้าใช้งานพื้นที่ไม่สำเร็จ";
    state.officeBrandGateTarget = brandId;
    renderOfficeBrandGate();
  }
}

async function loginWithCode(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: formData.get("userId")
      })
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error);
    state.currentUser = result.data;
    state.view = result.data.allowedViews[0] || "";
    if (result.data.role === "BRANCH") {
      state.filters.branchTab = "home";
      state.filters.branchHistoryType = "requests";
    }
    if (result.data.role === "KITCHEN") {
      state.filters.kitchenRoom = "all";
      state.filters.kitchenTab = "queue";
      state.filters.kitchenRoomAccess = "";
      state.filters.kitchenRoomGateTarget = "";
      state.filters.kitchenRoomGateError = "";
    }
    localStorage.setItem("warehouseUser", JSON.stringify(result.data));
    if (result.data.role === "OFFICE") {
      state.officeBrandId = "";
      state.officeBrandToken = "";
      state.officeBrandGateTarget = "";
      state.officeBrandGateError = "";
      state.data = null;
      state.view = "office";
      renderOfficeBrandGate();
      return;
    }
    await loadData(`เข้าใช้งานในชื่อ ${result.data.name}`);
  } catch (error) {
    toast(error.message);
  }
}

function render() {
  if (!state.data) {
    if (state.currentUser?.role === "OFFICE") renderOfficeBrandGate();
    return;
  }
  document.body.classList.add("app-mode");
  document.body.classList.remove("login-mode");
  const parentWorkspace = isTheGrandsWorkspace() && state.view === "office";
  const grandHouseWorkspace = state.currentUser?.role !== "OFFICE" || state.officeBrandId === "grand-house";
  document.body.classList.toggle("branch-mode", state.currentUser.role === "BRANCH" && state.view === "branches");
  document.body.classList.toggle("production-mode", state.currentUser.role === "KITCHEN" && state.view === "kitchen");
  document.body.classList.remove("office-brand-mode");
  document.body.classList.remove("office-brand-modal-open");
  document.body.classList.toggle("parent-company-mode", parentWorkspace);
  document.body.classList.toggle("grand-house-mode", grandHouseWorkspace);
  document.body.classList.toggle("warehouse-focus-mode", state.view === "warehouses" && state.filters.warehouseFocus === true);
  document.body.classList.toggle("sidebar-open", state.sidebarOpen);
  const [eyebrow, title] = viewMeta[state.view] || ["", ""];
  const activeKitchenRoom = state.view === "kitchen" && state.currentUser.role === "KITCHEN"
    ? productionRooms.find((room) => room.name === state.filters.kitchenRoomAccess)
    : null;
  const activeOfficeBrand = state.currentUser.role === "OFFICE"
    ? officeBrands.find((brand) => brand.id === state.officeBrandId)
    : null;
  const warehouseTopTitles = {
    overview: "ภาพรวมคลัง",
    products: "สต็อกปัจจุบัน",
    receive: "รับเข้า / ส่งออก",
    pricing: "สินค้าสำเร็จรูป",
    reference: "ตั้งค่ารายการอ้างอิง",
    history: "ประวัติคลัง",
    settings: "ตั้งค่า ROP",
    "stock-alerts": "สินค้าที่ต้องซื้อเพิ่ม"
  };
  setBrandIdentity(activeOfficeBrand);
  const displayEyebrow = activeKitchenRoom ? "ห้องผลิต" : activeOfficeBrand ? `ออฟฟิศ · ${activeOfficeBrand.name}` : eyebrow;
  const displayTitle = activeKitchenRoom?.name || (parentWorkspace ? "บริษัทแม่" : state.view === "office" && state.filters.officeTab === "cost-summary" ? "สรุปการส่งสินค้าและต้นทุน" : state.view === "warehouses" ? warehouseTopTitles[state.filters.managementTab] || title : title);
  document.getElementById("viewEyebrow").textContent = displayEyebrow;
  document.getElementById("viewTitle").textContent = displayTitle;
  const productionBackButton = document.getElementById("productionBackButton");
  if (productionBackButton) productionBackButton.hidden = !activeKitchenRoom;
  const warehouseTopbarBackButton = document.getElementById("warehouseTopbarBackButton");
  if (warehouseTopbarBackButton) {
    warehouseTopbarBackButton.hidden = !(state.view === "warehouses" && state.filters.managementTab === "settings");
  }
  const refreshButton = document.getElementById("refreshButton");
  if (refreshButton) refreshButton.hidden = false;
  const appBrandName = activeOfficeBrand?.name || "Grand House";
  document.title = state.view === "branches" && state.data
    ? `${selectedBranch().name} · ${appBrandName}`
    : `${displayTitle || "ระบบคลัง"} · ${appBrandName}`;
  state.contextMenuGroups = [];

  renderUserPanel();

  const root = document.getElementById("viewRoot");
  root.innerHTML = {
    kitchen: renderKitchen,
    branches: renderBranches,
    warehouses: renderWarehouses,
    office: renderOffice,
    reports: renderReports,
    owner: renderOwner
  }[state.view]?.() || empty("ไม่มีสิทธิ์เข้าถึง");

  // roleLayout() supplies the contextual groups while the view is rendered.
  // Render navigation afterwards so the active major heading owns its submenu.
  renderNav();
  renderContextMenu();
  bindViewEvents(root);
}

function renderNav() {
  const nav = document.getElementById("mainNav");
  if (state.view === "warehouses" && state.filters.warehouseFocus === true) {
    nav.innerHTML = "";
    return;
  }
  if (!state.data || (state.currentUser?.role === "OFFICE" && !state.officeBrandId)) {
    nav.innerHTML = "";
    return;
  }
  const groups = state.contextMenuGroups || [];
  const isBranchMode = document.body.classList.contains("branch-mode");
  const parentWorkspace = isTheGrandsWorkspace() && state.view === "office";
  // Grand House Office uses one stable primary navigation for both the
  // request workspace and the warehouse workspace. Without this, clicking a
  // warehouse submenu item replaces the whole sidebar and hides “รายการเบิก”.
  const grandHouseOffice = state.currentUser?.role === "OFFICE"
    && state.officeBrandId === "grand-house";
  if (grandHouseOffice) {
    nav.innerHTML = `
      <div class="office-primary-nav" aria-label="เมนูออฟฟิศ Grand House">
        ${officeNavigationGroups().map(officePrimaryNavGroup).join("")}
      </div>
    `;
    bindTabButtons(nav, true);
    return;
  }
  const visibleViews = parentWorkspace ? ["office"] : allowedViews();
  nav.innerHTML = visibleViews.map((view) => {
    const isActive = state.view === view;
    const navLabel = parentWorkspace && view === "office" ? "บริษัทแม่" : viewLabels[view];
    const submenu = isActive && !isBranchMode && groups.length
      ? `<div class="nav-submenu" aria-label="เมนูย่อย${navLabel}">${groups.map((group) => roleMenuGroup(group)).join("")}</div>`
      : "";
    return `
      <div class="nav-view-block ${isActive ? "expanded" : ""}">
        <button class="nav-link ${isActive ? "active" : ""}" data-view="${view}">${navLabel}</button>
        ${submenu}
      </div>
    `;
  }).join("");
  nav.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      if (state.view === "kitchen") {
        state.filters.kitchenRoom = "all";
        state.filters.kitchenTab = "queue";
        state.filters.kitchenBranch = "all";
        if (state.currentUser.role === "KITCHEN") {
          state.filters.kitchenRoomAccess = "";
          state.filters.kitchenRoomGateTarget = "";
          state.filters.kitchenRoomGateError = "";
        }
      }
      if (state.view === "warehouses") {
        state.filters.managementTab = "overview";
        state.filters.warehouseBranch = "all";
        state.filters.warehouseOwner = "all";
        state.filters.warehouseFocus = false;
        state.filters.warehouseCategory = "all";
        state.filters.warehouseDate = "";
        state.filters.warehouseDateStart = "";
        state.filters.warehouseDateEnd = "";
        state.filters.warehouseHistoryType = "all";
        state.filters.warehouseHistoryQuery = "";
      }
      if (state.view === "office") {
        state.filters.officeTab = "requests";
        state.filters.officeBranch = "all";
        state.filters.officeDate = "";
        if (isTheGrandsWorkspace()) state.filters.officeParentModule = "overview";
      }
      if (state.view === "reports") {
        state.filters.reportBranch = "all";
        state.filters.reportMonth = today().slice(0, 7);
      }
      render();
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  });
  bindTabButtons(nav, true);
}

function renderContextMenu() {
  const context = document.getElementById("contextNav");
  if (state.view === "warehouses" && state.filters.warehouseFocus === true) {
    context.innerHTML = "";
    return;
  }
  if (!state.data || (state.currentUser?.role === "OFFICE" && !state.officeBrandId)) {
    context.innerHTML = "";
    return;
  }
  const groups = state.contextMenuGroups || [];
  const isBranchMode = document.body.classList.contains("branch-mode");
  context.innerHTML = isBranchMode && groups.length ? `
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
  const switchUserLabel = user.role === "BRANCH" ? "เลือกผู้ใช้งาน" : "เปลี่ยนผู้ใช้งาน";
  const officeBrand = user.role === "OFFICE" ? officeBrands.find((brand) => brand.id === state.officeBrandId) : null;
  document.getElementById("userPanel").innerHTML = `
    <span>ผู้ใช้งาน</span>
    <div class="user-chip">
      <strong>${userDisplayName(user)}</strong>
      <small>${roleLabel(user)}${user.branchName ? ` · ${user.branchName}` : ""}${officeBrand ? ` · ${officeBrand.name}` : ""}</small>
    </div>
    ${officeBrand ? `<button class="secondary office-brand-switch-button" id="officeBrandSwitchButton" type="button">เปลี่ยนพื้นที่ทำงาน</button>` : ""}
    <button class="secondary logout-button" id="logoutButton">${switchUserLabel}</button>
  `;
  document.getElementById("officeBrandSwitchButton")?.addEventListener("click", () => {
    resetOfficeBrandSelection();
  });
  document.getElementById("logoutButton").addEventListener("click", async () => {
    clearSession();
    if (!state.loginOptions) await loadLoginOptions();
    renderLogin();
  });
}

function kitchenWorkflowTabs(activeTab) {
  const tabs = [["queue", "ส่งตามคำขอ", "รายการที่สาขาส่งคำขอมา"], ["extra", "ส่งเพิ่ม", "รายการที่ห้องผลิตส่งเพิ่ม"]];
  return `
    <nav class="kitchen-workflow-tabs" role="tablist" aria-label="ประเภทการส่ง">
      ${tabs.map(([value, label, description]) => `<button type="button" role="tab" aria-selected="${activeTab === value}" class="${activeTab === value ? "active" : ""}" data-tab-scope="kitchenTab" data-tab-value="${value}" title="${description}">${label}</button>`).join("")}
    </nav>
  `;
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
  const isKitchenUser = state.currentUser?.role === "KITCHEN";
  const kitchenRoom = isKitchenUser ? state.filters.kitchenRoomAccess : (state.filters.kitchenRoom || "all");
  const selectedRoom = productionRooms.find((room) => room.name === kitchenRoom);
  const requestedKitchenBranch = state.filters.kitchenBranch || "all";
  const kitchenBranch = selectedRoom && requestedKitchenBranch === "all"
    ? state.data.branches[0]?.id || "all"
    : requestedKitchenBranch;
  if (selectedRoom && state.filters.kitchenBranch !== kitchenBranch) state.filters.kitchenBranch = kitchenBranch;
  const branchScopedOpenFood = kitchenBranch === "all"
    ? openFood
    : openFood.filter((request) => request.branchId === kitchenBranch);
  const branchScopedFoodRequests = kitchenBranch === "all"
    ? foodRequests
    : foodRequests.filter((request) => request.branchId === kitchenBranch);
  const branchScopedDispatches = kitchenBranch === "all"
    ? dispatches
    : dispatches.filter((dispatch) => dispatch.branchId === kitchenBranch);
  const roomRequests = kitchenRoom === "all" ? branchScopedOpenFood : kitchenRoomRequests(branchScopedOpenFood, kitchenRoom);
  const extraProducts = selectedRoom
    ? foodProductsForGroup(selectedRoom.name).sort((a, b) => a.name.localeCompare(b.name, "th"))
    : [];
  const roomItemCount = (roomName) => kitchenRoomRequests(branchScopedOpenFood, roomName).reduce((total, request) => total + request.items.length, 0);
  const isKitchenDemo = new URLSearchParams(window.location.search).get("demo") === "1";
  if (isKitchenUser && !selectedRoom) return roleLayout("kitchen", [], kitchenRoomLandingPanel(openFood));
  const scopedWaitingReceive = selectedRoom
    ? [
      ...kitchenRoomRequests(branchScopedFoodRequests, selectedRoom.name).filter((request) => ["SHIPPED", "BRANCH_RECEIVED"].includes(request.status)),
      ...branchScopedDispatches.filter((dispatch) => dispatch.productionRoom === selectedRoom.name && ["SHIPPED", "BRANCH_RECEIVED"].includes(dispatch.status))
    ]
    : waitingReceive;
  const scopedShippedToday = selectedRoom
    ? branchScopedDispatches.filter((dispatch) => dispatch.productionRoom === selectedRoom.name && dispatch.dispatchDate === today() && ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(dispatch.status))
    : shippedToday;
  const roomHistoryRows = selectedRoom
    ? [
      ...branchScopedFoodRequests.filter((request) => ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(request.status)).flatMap((request) => kitchenRoomRequests([request], selectedRoom.name)),
      ...branchScopedDispatches.filter((dispatch) => dispatch.productionRoom === selectedRoom.name)
    ].sort((a, b) => new Date(b.updatedAt || b.createdAt || b.dispatchDate) - new Date(a.updatedAt || a.createdAt || a.dispatchDate))
    : historyRows;
  const kitchenMenu = isKitchenUser ? [{
    title: selectedRoom.name,
    items: [
      ["kitchenTab", "history", "ประวัติการส่ง", "kitchenRoom", selectedRoom.name, roomHistoryRows.length || ""]
    ]
  }] : [
    ...productionRooms.map((room) => ({
      title: room.name,
      items: [
        ["kitchenTab", "queue", "เปิดห้องผลิต", "kitchenRoom", room.name, roomItemCount(room.name) || ""]
      ]
    })),
    { title: "ประวัติการส่ง", items: [
      ["kitchenTab", "history", "ประวัติการส่ง", "kitchenRoom", "all", historyRows.length]
    ] }
  ];
  const roomSummary = kitchenRoomSummary(openFood);

  return roleLayout("kitchen", kitchenMenu, `
    ${selectedRoom ? kitchenWorkflowTabs(tab) : ""}
    ${selectedRoom ? kitchenBranchPicker(kitchenBranch, { includeAll: false }) : ""}
    ${!isKitchenUser ? `
      <div class="grid three">
        ${metric("รายการจากสาขา", isKitchenDemo ? (kitchenBranch === "all" ? 5 : 1) : roomRequests.length)}
        ${metric("ครัวส่งเพิ่มวันนี้", isKitchenDemo ? 0 : scopedShippedToday.length)}
        ${metric("รอสาขากดรับ", isKitchenDemo ? 0 : scopedWaitingReceive.filter((item) => item.status === "SHIPPED").length)}
      </div>
    ` : ""}
    ${tab === "queue" ? (isKitchenDemo ? kitchenDemoPreview(kitchenBranch, kitchenRoom) : kitchenRoom === "all" ? `
      <section class="panel section-panel">
        ${sectionTitle("งานแยกตามห้องผลิต", "สีประจำห้องช่วยให้แต่ละทีมเห็นเฉพาะเมนูและจำนวนที่ต้องเตรียม")}
        <div class="kitchen-priority-strip">
          <strong>คิวถัดไป</strong>
          <span>${openFood[0] ? `${openFood[0].branchName} · ${openFood[0].items.map((item) => `${item.productName} ${qty(item.requestedQty, item.unit)}`).join(" · ")}` : "ยังไม่มีคิวใหม่"}</span>
        </div>
        <div class="production-room-grid">${roomSummary.map(kitchenRoomBoard).join("")}</div>
      </section>
    ` : `
      <section class="panel section-panel kitchen-request-detail-panel">
        ${sectionTitle(isKitchenUser ? "รายการผลิต" : `รายการผลิต · ${selectedRoom?.name || kitchenRoom}`)}
        <div class="stack">${kitchenDispatchBatches(roomRequests) || empty(`ยังไม่มีรายการเบิกของ${selectedRoom?.name || kitchenRoom}`)}</div>
      </section>
    `) : ""}
    ${tab === "extra" ? `
      <section class="panel section-panel dispatch-extra-panel">
        ${sectionTitle(selectedRoom ? `ส่งเพิ่ม · ${selectedRoom.name}` : "ครัวกลางส่งเพิ่ม")}
        <form id="dispatchForm" class="stack dispatch-extra-form">
          <input type="hidden" name="status" value="SHIPPED">
          <input type="hidden" name="sourceType" value="KITCHEN_EXTRA">
          <section class="dispatch-extra-block">
            <div class="dispatch-extra-block-head"><strong>รายละเอียดการส่ง</strong><span>เลือกสาขาและกำหนดวันเวลาที่ส่งเมนู</span></div>
            <div class="dispatch-extra-controls">
              <label class="field dispatch-extra-branch"><span>สาขาปลายทาง</span>${branchSelect("branchId")}</label>
              <label class="field"><span>วันที่ส่ง</span><input name="dispatchDate" type="date" value="${today()}"></label>
              <label class="field"><span>เวลาส่ง</span><input name="dispatchTime" type="time" value="${currentTime()}"></label>
            </div>
          </section>
          <section class="dispatch-menu-picker">
            <div class="dispatch-menu-picker-head">
              <div><strong>${selectedRoom?.name || "ห้องนี้"}</strong><span>กรอกเฉพาะรายการที่จะส่งเพิ่ม ช่องว่างหมายถึงไม่ส่ง</span></div>
              <span class="pill neutral">${extraProducts.length} เมนู</span>
            </div>
            <div class="dispatch-menu-list">
              ${extraProducts.length ? `<div class="dispatch-menu-category">${extraProducts.map(kitchenExtraProductRow).join("")}</div>` : empty("ยังไม่มีเมนูในห้องนี้")}
            </div>
          </section>
          <section class="dispatch-extra-block dispatch-extra-notes">
            <div class="dispatch-extra-block-head"><strong>หมายเหตุ</strong><span>ระบุเหตุผลเมื่อมีการส่งนอกเหนือจากคำขอปกติ</span></div>
            <label class="field dispatch-extra-remarks"><span>เหตุผลที่ส่งเพิ่ม <small>(ถ้ามี)</small></span><input name="remarks" placeholder="เช่น ครัวทำเพิ่มและต้องการส่งให้สาขา"></label>
          </section>
          <div class="dispatch-extra-summary" aria-live="polite">
            <span><strong data-dispatch-count>0</strong> รายการที่จะส่ง</span>
            <span>ต้นทุนประมาณ <strong data-dispatch-total>${money(0)}</strong></span>
          </div>
          <div class="form-actions"><button class="primary">ยืนยันส่งเพิ่ม</button></div>
        </form>
      </section>
    ` : ""}
    ${tab === "history" ? `
      <section class="panel section-panel">
        ${sectionTitle("ประวัติการส่ง")}
        ${kitchenHistoryTable(roomHistoryRows)}
      </section>
    ` : ""}
  `);
}

function kitchenBranchPicker(selected = "all", { includeAll = true } = {}) {
  const branchOptions = state.data.branches.map((branch) => [branch.id, branch.name]);
  const options = includeAll ? [["all", "ทุกสาขา"], ...branchOptions] : branchOptions;
  const selectedLabel = options.find(([value]) => value === selected)?.[1] || "เลือกสาขา";
  return `
    <section class="kitchen-branch-picker" aria-label="เลือกสาขาที่ต้องการดู">
      <div class="kitchen-branch-picker-head">
        <div><strong>เลือกสาขา</strong><span>แสดงรายการเบิกเฉพาะสาขาที่เลือก</span></div>
        <span class="pill neutral">${selectedLabel}</span>
      </div>
      <div class="kitchen-branch-buttons">
        ${options.map(([value, label]) => `<button type="button" class="kitchen-branch-button ${selected === value ? "active" : ""}" data-kitchen-branch="${escapeAttr(value)}">${label}</button>`).join("")}
      </div>
    </section>
  `;
}

function officeNavigationGroups() {
  const data = state.data || {};
  const closings = data.branchDailyClosings || [];
  const officeBranch = state.filters.officeBranch || "all";
  const officeDate = state.filters.officeDate || "";
  const inScope = (row, dateValue) => (officeBranch === "all" || row.branchId === officeBranch)
    && (!officeDate || normalizeDate(dateValue) === officeDate);
  const salesCount = (data.dailySales || []).filter((sale) => inScope(sale, sale.salesDate)).length;
  const missingClosingCount = (data.branches || []).filter((branch) => !closings.some((closing) => closing.branchId === branch.id && closing.closingDate === (officeDate || today()))).length;
  return [
    { title: "รายการเบิก", items: [
      ["officeTab", "requests", "รายการเบิก", "", "", "", "office"],
      ["officeTab", "kitchen-requests", "ติดตามห้องผลิต", "", "", "", "office"],
      ["officeTab", "history", "ประวัติ", "", "", "", "office"]
    ] },
    { title: "คลังสินค้า", items: [
      ["managementTab", "overview", "ภาพรวมคลัง", "", "", "", "warehouses"],
      ["managementTab", "products", "สต็อกปัจจุบัน", "", "", "", "warehouses"],
      ["managementTab", "receive", "รับเข้า / ส่งออก", "", "", "", "warehouses"],
      ["managementTab", "pricing", "สินค้าสำเร็จรูป", "", "", "", "warehouses"],
      ["managementTab", "reference", "ตั้งค่ารายการอ้างอิง", "", "", "", "warehouses"],
      ["managementTab", "history", "ประวัติคลัง", "", "", "", "warehouses"]
    ] },
    { title: "สรุปภาพรวม", items: [
      ["officeTab", "cost-summary", "การส่งสินค้าและต้นทุน", "", "", "", "office"]
    ] }
  ];
}

function officePrimaryNavGroup(group) {
  const hasActive = group.items.some((item) => menuItemIsActive(item));
  return `
    <details class="office-primary-nav-group ${hasActive ? "active" : ""}" ${hasActive ? "open" : ""}>
      <summary class="office-primary-nav-heading">${group.title}</summary>
      <div class="nav-submenu office-primary-nav-submenu" aria-label="เมนูย่อย${group.title}">
        <div class="role-menu-group office-primary-menu-group">
          ${roleMenuItems(group.items)}
        </div>
      </div>
    </details>
  `;
}

function setBrandIdentity(brand) {
  const brandLabel = document.querySelector(".sidebar .brand strong");
  if (brandLabel) brandLabel.textContent = brand?.name || "แกรนด์ เฮาส์";
}

function isTheGrandsWorkspace() {
  return state.currentUser?.role === "OFFICE" && state.officeBrandId === "the-grands";
}

function resetOfficeBrandSelection() {
  state.officeBrandId = "";
  state.officeBrandToken = "";
  state.officeBrandGateTarget = "";
  state.officeBrandGateError = "";
  state.data = null;
  state.view = "office";
  state.filters.officeParentModule = "overview";
  renderOfficeBrandGate();
}

function kitchenRoomLandingPanel(openFood) {
  const roomStats = productionRooms.map((room) => {
    const requests = kitchenRoomRequests(openFood, room.name);
    return {
      ...room,
      requestCount: requests.length,
      itemCount: requests.reduce((total, request) => total + request.items.length, 0)
    };
  });
  const gateTarget = state.filters.kitchenRoomGateTarget;
  return `
    <section class="kitchen-room-landing" aria-labelledby="kitchen-room-landing-title">
      <div class="kitchen-room-hero panel">
        <div class="kitchen-room-hero-copy">
          <h1 id="kitchen-room-landing-title">ห้องผลิตอาหาร</h1>
          <div class="kitchen-room-hero-note"><span>🔒</span><span>ต้องยืนยันรหัสก่อนเข้าใช้งาน</span></div>
          <div class="kitchen-room-hero-meta" aria-label="ข้อมูลการทำงาน">
            <span><i aria-hidden="true">↳</i> แยกคิวตามสาขา</span>
            <span><i aria-hidden="true">✦</i> เมนูเข้าห้องตามการตั้งค่า</span>
          </div>
        </div>
        <div class="kitchen-food-visual">
          <div class="kitchen-food-image-frame">
            <img src="/assets/production-food-plate.png" alt="จานอาหารไก่และผักสด" loading="eager">
          </div>
        </div>
      </div>
      <div class="kitchen-room-picker-head">
        <h2>เลือกห้องผลิต</h2>
      </div>
      <div class="kitchen-room-card-grid">
        ${roomStats.map((room) => `
          <button type="button" class="kitchen-room-card kitchen-room-card--${room.tone}" data-kitchen-room-card="${escapeAttr(room.name)}" aria-label="เข้า${escapeAttr(room.name)}">
            <span class="kitchen-room-card-icon" aria-hidden="true">${room.icon}</span>
            <span class="kitchen-room-card-copy"><strong>${room.name}</strong><small>${room.requestCount ? `${room.requestCount} คิว · ${room.itemCount} รายการ` : "ยังไม่มีคิวใหม่"}</small></span>
            <span class="kitchen-room-card-arrow" aria-hidden="true">→</span>
          </button>
        `).join("")}
      </div>
    </section>
    ${gateTarget ? kitchenRoomAccessGate(gateTarget) : ""}
  `;
}

function kitchenRoomAccessGate(roomName) {
  const error = state.filters.kitchenRoomGateError || "";
  return `
    <div class="kitchen-room-gate-backdrop" data-kitchen-room-gate-backdrop>
      <section class="kitchen-room-gate" role="dialog" aria-modal="true" aria-labelledby="kitchen-room-gate-title" aria-describedby="kitchen-room-gate-description">
        <button type="button" class="kitchen-room-gate-close" data-kitchen-room-gate-cancel aria-label="ปิดหน้าต่าง">×</button>
        <div class="kitchen-room-gate-icon" aria-hidden="true">🔒</div>
        <span class="kitchen-room-kicker">ยืนยันสิทธิ์การเข้าใช้งาน</span>
        <h2 id="kitchen-room-gate-title">เข้า${roomName}</h2>
        <p id="kitchen-room-gate-description">กรอกรหัสห้องผลิตก่อนดูรายการเบิกของห้องนี้</p>
        <form id="kitchenRoomGateForm" novalidate>
          <label class="field"><span>รหัสห้องผลิต</span><input id="kitchenRoomCodeInput" name="roomCode" type="password" inputmode="text" autocomplete="off" placeholder="กรอกรหัส" required></label>
          ${error ? `<p class="kitchen-room-gate-error" role="alert">${error}</p>` : ""}
          <div class="kitchen-room-gate-actions"><button type="button" class="secondary" data-kitchen-room-gate-cancel>ยกเลิก</button><button type="submit" class="primary">ยืนยันเข้าใช้งาน</button></div>
        </form>
      </section>
    </div>
  `;
}

function kitchenExtraProductRow(product) {
  return `
    <label class="dispatch-menu-row">
      <span class="dispatch-menu-info">
        <strong>${product.name}</strong>
        <small>${product.category || "เมนู"} · หน่วย ${product.unit || "-"} · ต้นทุน ${money(product.standardCost || 0)}/${product.unit || "หน่วย"}</small>
      </span>
      <span class="dispatch-menu-quantity">
        <input type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0" aria-label="จำนวนส่งเพิ่ม ${escapeAttr(product.name)}" data-dispatch-qty data-dispatch-product="${escapeAttr(product.id)}" data-dispatch-cost="${Number(product.standardCost || 0)}">
        <em>${product.unit || "หน่วย"}</em>
      </span>
    </label>
  `;
}

function kitchenDemoPreview(selectedBranchId = "all", selectedRoom = "all") {
  const branches = ["บ้านโจ้", "เกษตรใหม่", "ภูดอย", "ท่ารั้ว", "แกรนด์ปาร์ค"];
  const selectedBranchName = state.data.branches.find((branch) => branch.id === selectedBranchId)?.name;
  const visibleBranches = selectedBranchName ? branches.filter((branch) => branch === selectedBranchName) : branches;
  const products = [
    ["หมูหมักพร้อมขาย", "ห้องอาหาร", "กก.", 50, 210, 320],
    ["ไก่หมักพร้อมขาย", "ห้องอาหาร", "กก.", 30, 130, 220],
    ["ข้าวสาร", "ห้องของหวาน", "กก.", 20, 38, 60],
    ["น้ำสมุนไพร", "ห้องผลไม้", "ขวด", 25, 70, 120],
    ["ชุดเนื้อ", "ครัวกลาง", "ชุด", 15, 145, 260],
    ["ชานม", "ห้องของหวาน", "แก้ว", 40, 70, 130],
    ["แก้วน้ำ", "ห้องอาหาร", "ใบ", 80, 15, 30],
    ["ข้าวเหนียว", "ห้องอาหาร", "กก.", 18, 30, 50],
    ["เส้นแห้ง", "ห้องอาหาร", "แพ็ก", 12, 40, 80],
    ["ถุงหิ้ว", "ครัวกลาง", "แพ็ก", 10, 35, 70]
  ].sort((a, b) => a[0].localeCompare(b[0], "th"));
  const visibleProducts = selectedRoom === "all" ? products : products.filter(([, room]) => room === selectedRoom);
  const demoMoney = (value) => `฿${Number(value).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
  const rows = visibleProducts.map(([name, room, unit, requestedQty, unitCost]) => `
    <tr>
      <td><strong>${name}</strong><br><span class="production-room-badge"><i></i>${room}</span></td>
      <td>${requestedQty} ${unit}</td>
      <td><input type="number" value="${requestedQty}" disabled></td>
      <td>${demoMoney(requestedQty * unitCost)}</td>
    </tr>
  `).join("");
  const total = visibleProducts.reduce((sum, [, , , requestedQty, unitCost]) => sum + requestedQty * unitCost, 0);
  const previewTitle = selectedRoom === "all" ? "ตัวอย่างจำลองรายการเบิก" : `ตัวอย่างจำลอง · ${selectedRoom}`;
  const previewDescription = selectedRoom === "all"
    ? "5 สาขา · สาขาละ 1 คำขอ · คำขอละ 10 เมนู เพื่อดูความยาวของหน้าจอ"
    : `ตัวอย่างเฉพาะ${selectedRoom} · ${visibleProducts.length} เมนู`;
  return `
    <section class="panel section-panel kitchen-request-detail-panel">
      ${sectionTitle(previewTitle, previewDescription)}
      <div class="demo-preview-note"><strong>โหมดตัวอย่างชั่วคราว</strong><span>ข้อมูลชุดนี้ไม่ได้บันทึกลงระบบจริง</span></div>
      <div class="stack demo-branch-stack">${visibleBranches.map((branch, index) => `
        <section class="branch-request-group kitchen-dispatch-batch">
          <div class="branch-group-title"><div><strong>${branch}</strong><span>1 รายการจำลอง · ${visibleProducts.length} เมนู</span></div></div>
          <article class="request-card demo-request-card">
            <div class="card-head">
              <div><p class="eyebrow">คิวที่ 1</p><h3>${branch} · 24 ส.ค. 2569</h3><p class="muted">DEMO-${String(index + 1).padStart(3, "0")} · ตัวอย่างสำหรับดูความยาว</p></div>
              <span class="pill">ส่งคำขอแล้ว</span>
            </div>
            <div class="progress-line">
              <div class="progress-step progress-step--warning active"><span>1</span><small>รอจัดส่ง</small></div>
              <div class="progress-step progress-step--info"><span>2</span><small>ส่งออกแล้ว</small></div>
              <div class="progress-step progress-step--success"><span>3</span><small>สาขารับแล้ว</small></div>
            </div>
            <div class="table-wrap"><table><thead><tr><th>เมนู</th><th>ขอเบิก</th><th>จัดเตรียมแล้ว</th><th>ต้นทุน</th></tr></thead><tbody>${rows}</tbody></table></div>
            <div class="row-between" style="margin-top:12px"><strong>ต้นทุนรวม ${demoMoney(total)}</strong><span class="pill neutral">ตัวอย่างจำลอง</span></div>
          </article>
        </section>
      `).join("")}</div>
    </section>
  `;
}

function kitchenRoomRequests(requests, roomName) {
  return requests.map((request) => {
    const items = request.items.filter((item) => item.productionRoom === roomName);
    if (!items.length) return null;
    return {
      ...request,
      items,
      totalCost: items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0),
      totalSellingValue: items.reduce((sum, item) => sum + Number(item.totalSellingValue || 0), 0)
    };
  }).filter(Boolean);
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
      <div class="stack">${batch.requests.map((request, index) => foodRequestCard(request, index + 1, true, { individualSend: true })).join("")}</div>
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
  const tab = state.filters.branchTab || "home";
  const requestType = String(state.filters.branchRequestType || "finished").replace(/-own$/, "-grand");
  const trackingType = state.filters.branchTrackingType || "kitchen";
  const historyType = state.filters.branchHistoryType || "requests";
  const closingDate = state.filters.branchClosingDate || today();

  return roleLayout("branch", [], `
    <div class="branch-phone-shell">
      <section class="branch-phone-card branch-phone-hero">
        <div>
          <h2>สาขา${branch.name}</h2>
        </div>
        ${canSwitchBranch ? `<label class="field"><span>เลือกสาขา</span>${branchSelect("selectedBranch", branch.id)}</label>` : ""}
        ${tab !== "home" ? `<button type="button" class="branch-back-button" data-tab-scope="branchTab" data-tab-value="home" aria-label="ย้อนกลับหน้าหลักสาขา">← กลับหน้าหลัก</button>` : ""}
      </section>

      ${tab === "home" ? branchHomePanel() : ""}
      ${tab === "request" ? branchRequestPanel(branch, requestType) : ""}
      ${tab === "tracking" ? branchTrackingPanel(trackingType, foodRequests, dispatches, materialRequests) : ""}
      ${tab === "history" ? branchHistoryPanel(branch, foodRequests, dispatches, materialRequests, historyType) : ""}
      ${tab === "closing" ? branchClosingPanel(branch, foodRequests, dispatches, closingDate, materialRequests) : ""}
      ${tab === "stock" ? branchStockPanel(branch) : ""}
    </div>
  `);
}

function branchHomePanel() {
  const actionCards = [
    ["🚚", "ติดตามสถานะ", "tracking", "branchTrackingType", "kitchen", "branch-home-action-card--tracking"],
    ["📦", "เบิกของ", "request", "", "", "branch-home-action-card--request"],
    ["🔒", "ปิดวัน", "closing", "", "", "branch-home-action-card--closing"],
    ["🗂️", "ประวัติ", "history", "branchHistoryType", "requests", "branch-home-action-card--history"]
  ];

  return `
    <section class="branch-phone-card branch-home-panel" aria-label="เมนูสาขา">
      <div class="branch-home-action-grid">
        ${actionCards.map(([icon, label, tabValue, forceScope, forceValue, tone]) => `
          <button type="button" class="branch-home-action-card ${tone}" data-tab-scope="branchTab" data-tab-value="${tabValue}" ${forceScope ? `data-force-tab-scope="${forceScope}" data-force-tab-value="${forceValue}"` : ""}>
            <span class="branch-home-action-icon" aria-hidden="true">${icon}</span>
            <span class="branch-home-action-copy"><strong>${label}</strong></span>
            <span class="branch-home-action-arrow" aria-hidden="true">›</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function latestActivityDate(record) {
  const timelineDate = Array.isArray(record?.timeline) ? record.timeline.at(-1)?.at : "";
  return record?.updatedAt || timelineDate || record?.createdAt || record?.dispatchDate || new Date().toISOString();
}

function branchRequestPanel(branch, requestType) {
  const meta = requestTypeMeta(requestType);
  const isFood = ["finished", "food-ready", "drink"].includes(requestType);
  const isPackaging = ["packaging", "packaging-own", "packaging-grand"].includes(requestType);
  const requestCategory = requestType.startsWith("raw") ? "raw" : requestType.startsWith("packaging") ? "packaging" : "finished";
  const materialGroup = isPackaging ? "packaging" : "materials";
  const sourceType = "GRAND_SUPPLIED";
  const showCostSummary = true;
  const formId = isFood ? "foodRequestForm" : "materialRequestForm";
  const lineId = isFood ? "foodLines" : "materialLines";
  const addAttr = isFood ? "data-add-food-line" : "data-add-material-line";
  const firstLine = isFood ? foodLine(0, requestType) : materialLine(0, materialGroup);
  const categoryTabs = [
    ["finished", "finished", "สินค้าสำเร็จรูป"],
    ["raw", "raw-grand", inventoryCategoryLabel("วัตถุดิบ")],
    ["packaging", "packaging-grand", inventoryCategoryLabel("บรรจุภัณฑ์")]
  ];
  return `
    <section class="branch-phone-card product-list-panel">
      <nav class="branch-request-tabs" aria-label="หมวดหมู่การเบิก" role="tablist">
        ${categoryTabs.map(([value, tabValue, label]) => `<button type="button" role="tab" aria-selected="${requestCategory === value}" class="${requestCategory === value ? "active" : ""}" data-tab-scope="branchRequestType" data-tab-value="${tabValue}">${label}</button>`).join("")}
      </nav>
      ${sectionTitle(meta.title, meta.subtitle)}
      <form id="${formId}" novalidate>
        <input type="hidden" name="branchId" value="${branch.id}">
        ${isFood ? "" : `<input type="hidden" name="sourceType" value="${sourceType}"><input type="hidden" name="materialGroup" value="${materialGroup}">`}
        <div class="line-items product-list" id="${lineId}">${firstLine}</div>
        ${showCostSummary ? `<div class="branch-request-cost-summary" data-request-cost-summary data-request-type="${escapeAttr(requestType)}" data-request-source-type="${sourceType}" aria-live="polite">
          <span>ต้นทุนโดยประมาณ</span>
          <strong data-request-total-cost>—</strong>
        </div>` : ""}
        <button type="button" class="floating-add-button" ${addAttr} data-line-group="${isFood ? requestType : materialGroup}">+</button>
        <div class="form-actions branch-actions">
          <button class="primary red">ส่งคำขอ</button>
        </div>
      </form>
    </section>
  `;
}

function branchTrackingPanel(trackingType, foodRequests, dispatches, materialRequests) {
  const isAll = trackingType === "all";
  const isKitchen = trackingType === "kitchen";
  const kitchenContent = `
    ${foodRequests.map(branchFoodRequestStatusCard).join("")}
    ${dispatches.map(dispatchStatusCard).join("")}
    ${foodRequests.length + dispatches.length ? "" : empty("ยังไม่มีรายการจากห้องผลิต")}
  `;
  const officeContent = materialRequests.map(branchOfficeStatusCard).join("") || empty("ยังไม่มีรายการจากออฟฟิศ");
  return `
    <section class="branch-phone-card branch-tracking-panel">
      <nav class="branch-tracking-tabs" role="tablist" aria-label="เลือกห้องที่ต้องการติดตาม">
        ${[["kitchen", "ห้องผลิต"], ["office", "ออฟฟิศ"], ["all", "ทั้งหมด"]].map(([value, label]) => `<button type="button" role="tab" aria-selected="${trackingType === value}" class="${trackingType === value ? "active" : ""}" data-tab-scope="branchTrackingType" data-tab-value="${value}">${label}</button>`).join("")}
      </nav>
      ${sectionTitle(isAll ? "ติดตามสถานะทั้งหมด" : isKitchen ? "ติดตามจากห้องผลิต" : "ติดตามจากออฟฟิศ", isAll ? "รวมคำขอจากทุกห้อง" : isKitchen ? "อาหารรายวันและอาหารที่เบิกเพิ่ม" : "วัตถุดิบและบรรจุภัณฑ์")}
      ${isAll ? `<div class="branch-tracking-columns"><section class="branch-tracking-column"><h3>ห้องผลิต</h3><div class="stack">${kitchenContent}</div></section><section class="branch-tracking-column"><h3>ออฟฟิศ</h3><div class="stack">${officeContent}</div></section></div>` : `<div class="stack">${isKitchen ? kitchenContent : officeContent}</div>`}
    </section>
  `;
}

function branchHistoryPanel(branch, foodRequests, dispatches, materialRequests, historyType = "requests") {
  const rows = [
    ...foodRequests.filter((request) => ["BRANCH_RECEIVED", "COMPLETED"].includes(request.status)).map((request) => ({
      id: request.id,
      type: "อาหารสำเร็จรูป",
      detail: request.items.map((item) => `${item.productName} ${qty(item.deliveredQty, item.unit)}`).join(" · "),
      value: request.totalSellingValue,
      status: request.status,
      date: latestActivityDate(request)
    })),
    ...dispatches.filter((dispatch) => ["BRANCH_RECEIVED", "COMPLETED"].includes(dispatch.status)).map((dispatch) => ({
      id: dispatch.id,
      type: displaySourceLabel(dispatch.sourceLabel),
      detail: `${dispatch.productName} ${qty(dispatch.actualQty, dispatch.unit)}`,
      value: dispatch.totalSellingValue,
      status: dispatch.status,
      date: dispatch.updatedAt || dispatch.createdAt
    })),
    ...materialRequests.filter((request) => ["BRANCH_RECEIVED", "COMPLETED"].includes(request.status)).map((request) => ({
      id: request.id,
      type: `${requestSourceLabel(request.sourceType)} · ${request.items.some((item) => item.category === "บรรจุภัณฑ์") ? "บรรจุภัณฑ์/ของใช้" : "วัตถุดิบ"}`,
      detail: request.items.map((item) => `${item.productName} ${qty(item.actualIssuedQty, item.unit)}`).join(" · "),
      value: request.totalCost,
      status: request.status,
      date: latestActivityDate(request)
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const historyTabs = `
    <div class="branch-history-tabs" role="tablist" aria-label="ประเภทประวัติ">
      <button type="button" role="tab" aria-selected="${historyType === "requests"}" class="${historyType === "requests" ? "active" : ""}" data-tab-scope="branchHistoryType" data-tab-value="requests" data-force-tab-scope="branchTab" data-force-tab-value="history">ประวัติการเบิก</button>
      <button type="button" role="tab" aria-selected="${historyType === "closing"}" class="${historyType === "closing" ? "active" : ""}" data-tab-scope="branchHistoryType" data-tab-value="closing" data-force-tab-scope="branchTab" data-force-tab-value="history">ประวัติการปิดวัน</button>
    </div>
  `;
  return `
    <section class="branch-phone-card">
      ${sectionTitle("ประวัติ", historyType === "requests" ? "รายการที่สาขารับของแล้ว พร้อมเวลาและมูลค่า" : "สรุปการปิดวันของสาขาแต่ละวันที่บันทึก")}
      ${historyTabs}
      ${historyType === "requests" ? `<div class="branch-history-list">${rows.map((row) => `
        <article class="branch-history-item">
          <div class="row-between"><strong>${row.id}</strong><span class="pill">${status(row.status)}</span></div>
          <small>${row.type} · ${dateTime(row.date)}</small>
          <p>${row.detail}</p>
          <strong>มูลค่า ${money(row.value)}</strong>
        </article>
      `).join("") || empty("ยังไม่มีประวัติการเบิก")}</div>` : branchClosingHistoryPanel(branch)}
    </section>
  `;
}

function branchClosingHistoryPanel(branch) {
  const closings = (state.data.branchDailyClosings || [])
    .filter((closing) => closing.branchId === branch.id)
    .sort((a, b) => String(b.closingDate).localeCompare(String(a.closingDate)));
  if (!closings.length) return empty("ยังไม่มีประวัติการปิดวัน");
  return `<div class="branch-history-list">${closings.map((closing) => {
    const entries = closing.entries || [];
    const wasteRows = entries.filter((entry) => Number(entry.wasteQty || 0) > 0).length;
    const savedAt = closing.updatedAt || closing.createdAt || `${closing.closingDate}T00:00:00`;
    return `
      <article class="branch-history-item branch-closing-history-item">
        <div class="row-between"><strong>ปิดวัน ${displayDate(closing.closingDate)}</strong><span class="pill ${closing.status === "HAS_WASTE" ? "warning" : ""}">${closing.status === "HAS_WASTE" ? "มีของเสีย" : "บันทึกแล้ว"}</span></div>
        <small>บันทึกเมื่อ ${dateTime(savedAt)}</small>
        <p>${entries.length} รายการ · บันทึกยอดเหลือ${wasteRows ? ` · ของเสีย ${wasteRows} รายการ` : ""}</p>
        ${closing.remarks ? `<small>หมายเหตุ: ${escapeAttr(closing.remarks)}</small>` : ""}
      </article>
    `;
  }).join("")}</div>`;
}

function branchClosingPanel(branch, foodRequests, dispatches, closingDate, materialRequests = []) {
  const existing = (state.data.branchDailyClosings || []).find((closing) => closing.branchId === branch.id && closing.closingDate === closingDate);
  const rows = existing?.entries?.length ? existing.entries : branchClosingSourceRows(foodRequests, dispatches, closingDate, materialRequests);
  const entries = rows.length ? rows : [{ sourceType: "BRANCH_MADE", itemName: "", unit: "", endingQty: 0, entryMode: "ENDING_ONLY" }];
  return `
    <section class="branch-phone-card branch-closing-card">
      ${sectionTitle("ปิดวันสาขา", "กรอกยอดเหลือปลายวันของรายการที่เบิกจากคลังกลาง เพิ่มรายการอื่นหรือเมนูทำเองได้")}
      <form id="branchDailyClosingForm" class="stack" novalidate>
        <input type="hidden" name="branchId" value="${branch.id}">
        <label class="field"><span>วันที่ปิดวัน</span><input name="closingDate" type="date" value="${closingDate}" required></label>
        <p class="muted closing-entry-instruction">รายการที่เบิกในวันนั้นจะแสดงให้อัตโนมัติ กรอกเฉพาะจำนวนที่เหลือจริงตอนปิดวัน</p>
        <div class="closing-entry-list">${entries.map((entry, index) => closingEntryLine(entry, index)).join("")}</div>
        <button type="button" class="secondary" data-add-closing-line>+ เพิ่มรายการอื่น / ทำเอง</button>
        <label class="field"><span>หมายเหตุรวม</span><input name="remarks" value="${escapeAttr(existing?.remarks || "")}" placeholder="เช่น รายการที่เพิ่มเองหรือเหตุการณ์ระหว่างวัน"></label>
        <div class="form-actions"><button class="primary red">บันทึกยอดเหลือ</button></div>
      </form>
    </section>
  `;
}

function branchStockPanel(branch) {
  const rows = state.data.inventorySnapshot.filter((item) => item.branchId === branch.id);
  const movements = state.data.inventoryTransactions.filter((item) => item.branchId === branch.id).slice().reverse();
  const value = rows.reduce((sum, item) => sum + Number(item.inventoryValue || 0), 0);
  return `
    <section class="branch-phone-card"><div class="grid three">${metric("มูลค่าคลัง", money(value))}${metric("รายการสินค้า", rows.length)}${metric("ใกล้หมด", rows.filter((item) => item.isLow || item.needsRestock || item.isBelowReserve).length)}</div>${sectionTitle("คลังสาขา", "ดูจำนวนคงเหลือ จุดเตือน และมูลค่าปัจจุบันของสาขาตัวเอง")}${rows.map(branchStockRow).join("") || empty("ยังไม่มีข้อมูลคลัง")}</section>
    <section class="branch-phone-card">${sectionTitle("ความเคลื่อนไหวล่าสุด", "รับเข้า เบิกออก ของเสีย และปรับสต็อก")}${transactionTable(movements.slice(0, 20))}</section>
  `;
}

function recordTouchesDate(record, date) {
  const dates = [record?.createdAt, record?.updatedAt, record?.dispatchDate, ...(record?.timeline || []).map((event) => event?.at)];
  return dates.some((value) => normalizeDate(value) === date);
}

function branchClosingSourceRows(foodRequests, dispatches, closingDate, materialRequests = []) {
  const rows = new Map();
  const addRow = (sourceType, item, quantity) => {
    const productId = item.productId || "";
    const itemName = String(item.productName || item.itemName || "").trim();
    if (!itemName && !productId) return;
    const key = `${sourceType}:${productId || itemName}`;
    const row = rows.get(key) || {
      sourceType,
      productId: productId || null,
      itemName,
      unit: item.unit || "",
      endingQty: 0,
      entryMode: "ENDING_ONLY"
    };
    row.receivedQty = Number(row.receivedQty || 0) + Number(quantity || 0);
    rows.set(key, row);
  };
  foodRequests
    .filter((request) => recordTouchesDate(request, closingDate))
    .forEach((request) => request.items.forEach((item) => addRow("KITCHEN", item, item.deliveredQty || item.requestedQty)));
  dispatches
    .filter((dispatch) => recordTouchesDate(dispatch, closingDate) && dispatch.status !== "PLANNED")
    .forEach((dispatch) => addRow("KITCHEN", dispatch, dispatch.actualQty));
  materialRequests
    .filter((request) => recordTouchesDate(request, closingDate))
    .forEach((request) => request.items.forEach((item) => addRow("CENTRAL_WAREHOUSE", item, item.actualIssuedQty || item.requestedQty)));
  return [...rows.values()];
}

function closingEntryLine(entry, index) {
  const isBranchMade = entry.sourceType === "BRANCH_MADE";
  const sourceLabel = entry.sourceType === "CENTRAL_WAREHOUSE" ? "คลังกลาง" : entry.sourceType === "KITCHEN" ? "ห้องผลิต" : "เพิ่มเอง / ทำเอง";
  return `
    <div class="closing-entry-line ${isBranchMade ? "closing-entry-line-manual" : "closing-entry-line-issued"}" data-closing-entry>
      <input type="hidden" data-closing-field="sourceType" value="${escapeAttr(entry.sourceType || "KITCHEN")}">
      <input type="hidden" data-closing-field="productId" value="${escapeAttr(entry.productId || "")}">
      ${isBranchMade ? "" : `<input type="hidden" data-closing-field="unit" value="${escapeAttr(entry.unit || "")}">`}
      <div class="closing-entry-heading"><div><strong>${isBranchMade ? "รายการเพิ่มเอง / ทำเอง" : escapeHtml(entry.itemName || "รายการจากคลังกลาง")}</strong><small>${sourceLabel}${entry.unit ? ` · ${escapeHtml(entry.unit)}` : ""}</small></div>${isBranchMade ? `<button type="button" class="ghost-button closing-entry-remove" data-remove-closing-line>ลบ</button>` : ""}</div>
      ${isBranchMade ? `<div class="form-grid compact-form-grid"><label class="field"><span>ชื่อรายการ</span><input data-closing-field="itemName" value="${escapeAttr(entry.itemName || "")}" placeholder="เช่น น้ำจิ้มที่ทำเอง"></label><label class="field"><span>หน่วย</span><input data-closing-field="unit" value="${escapeAttr(entry.unit || "")}" placeholder="เช่น กก. / กล่อง"></label></div>` : `<input type="hidden" data-closing-field="itemName" value="${escapeAttr(entry.itemName || "")}">`}
      <label class="field closing-ending-field"><span>เหลือปลายวัน</span><input data-closing-field="endingQty" type="number" min="0" step="0.01" value="${Number(entry.endingQty || 0)}" required></label>
    </div>
  `;
}

function renderWarehouses() {
  const warehouseOwner = "grand";
  const warehouseBranch = "all";
  const tab = ["overview", "products", "receive", "history", "settings", "stock-alerts", "pricing", "reference"].includes(state.filters.managementTab) ? state.filters.managementTab : "overview";
  const selectedCategory = state.filters.warehouseCategory || "all";
  const category = selectedCategory === "all" ? "all" : inventoryCategoryLabel(selectedCategory);
  const warehouseHistoryType = ["all", "receive", "issue", "adjustment"].includes(state.filters.warehouseHistoryType)
    ? state.filters.warehouseHistoryType
    : "all";
  const warehouseHistoryQuery = String(state.filters.warehouseHistoryQuery || "").trim();
  const officeRows = state.data.officeInventorySnapshot || state.data.inventorySnapshot || [];
  const allRows = officeRows.filter((row) => (row.stockOwnerType || "GRAND_SUPPLIED") !== "BRANCH_OWNED");
  const warehouseRows = category === "all" ? allRows : allRows.filter((item) => item.category === category);
  const lowRows = warehouseRows.filter((item) => Number(item.quantity || 0) <= 0 || item.needsRestock || item.isLow);
  const reorderRows = warehouseRows.filter((item) => item.isLow);
  const dateStart = state.filters.warehouseDateStart || state.filters.warehouseDate || "";
  const dateEnd = state.filters.warehouseDateEnd || state.filters.warehouseDate || "";
  const movementRows = state.data.inventoryTransactions.filter((txn) => {
    const transactionDate = normalizeDate(txn.dateTime);
    const dateOk = (!dateStart || transactionDate >= dateStart) && (!dateEnd || transactionDate <= dateEnd);
    return (txn.stockOwnerType || "GRAND_SUPPLIED") !== "BRANCH_OWNED" && dateOk;
  });
  const warehouseHistoryTypeGroup = (type) => {
    if (["PURCHASE", "BRANCH_DEPOSIT"].includes(type)) return "receive";
    if (type === "ADJUSTMENT") return "adjustment";
    return "issue";
  };
  const warehouseHistorySearchMatches = (txn) => {
    if (!warehouseHistoryQuery) return true;
    const destination = state.data.branches.find((item) => item.id === (txn.destinationBranchId || txn.branchId));
    const product = state.data.materialProducts.find((item) => item.id === txn.productId);
    const haystack = [
      product?.name,
      txn.referenceNumber,
      destination?.name,
      status(txn.type),
      txn.remarks
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    return haystack.includes(warehouseHistoryQuery.toLocaleLowerCase());
  };
  const searchedMovementRows = movementRows.filter(warehouseHistorySearchMatches);
  const historyTypeCounts = {
    all: searchedMovementRows.length,
    receive: searchedMovementRows.filter((txn) => warehouseHistoryTypeGroup(txn.type) === "receive").length,
    issue: searchedMovementRows.filter((txn) => warehouseHistoryTypeGroup(txn.type) === "issue").length,
    adjustment: searchedMovementRows.filter((txn) => warehouseHistoryTypeGroup(txn.type) === "adjustment").length
  };
  const historyRows = searchedMovementRows.filter((txn) => warehouseHistoryType === "all" || warehouseHistoryTypeGroup(txn.type) === warehouseHistoryType);
  const totalWarehouseValue = warehouseRows.reduce((sum, item) => sum + Number(item.inventoryValue || 0), 0);
  const emptyRows = warehouseRows.filter((item) => item.quantity <= 0);
  const targetRows = warehouseRows.filter((item) => item.isBelowReserve && Number(item.targetStock ?? item.reserveTarget ?? 0) > 0);
  const missingCostRows = warehouseRows.filter((item) => Number(item.averageCost || item.standardCost || 0) <= 0);
  const missingReorderRows = warehouseRows.filter((item) => Number(item.reorderPoint || 0) <= 0);
  const missingTargetRows = warehouseRows.filter((item) => Number(item.targetStock ?? item.reserveTarget ?? 0) <= 0);
  const warehouseValue = warehouseRows.reduce((sum, item) => sum + Number(item.inventoryValue || 0), 0);
  const warehouseAlerts = warehouseRows.filter((item) => Number(item.quantity || 0) <= 0 || item.needsRestock || item.isLow).length;
  const ownerCards = `<article class="metric warehouse-branch-value-card ${warehouseAlerts ? "has-alert" : ""}"><span>คลังกลาง Grand House</span><strong>${money(warehouseValue)}</strong><small>ต้นทุนเฉลี่ยจากบิลรับเข้าทั้งหมด</small><em>${warehouseRows.length} รายการ${warehouseAlerts ? ` · ${warehouseAlerts} รายการต้องซื้อ` : ""}</em></article>`;
  const warehouseMenu = [{ title: "คลังสินค้า", open: true, items: [
    ["managementTab", "overview", "ภาพรวมคลัง"],
    ["managementTab", "products", "สต็อกปัจจุบัน"],
    ["managementTab", "receive", "รับเข้า / ส่งออก"],
    ["managementTab", "pricing", "สินค้าสำเร็จรูป"],
    ["managementTab", "reference", "ตั้งค่ารายการอ้างอิง"],
    ["managementTab", "history", "ประวัติคลัง"]
  ] }];
  // Keep the value summary only where it helps reconcile the full catalogue.
  // Alert, history and policy screens should stay focused on action/data, not money.
  const showWarehouseValue = tab === "products";
  const warehouseInlineFilterClass = tab === "history"
    ? "warehouse-inline-filters warehouse-inline-filters--history"
    : "warehouse-inline-filters";
  const warehouseCategoryFilterLabel = "";
  const warehouseCategoryFilterAria = "หมวดหมู่";
  const historyInlineFilters = tab === "history" ? `
          <label class="field"><input type="date" aria-label="ตั้งแต่วันที่" data-filter-scope="warehouseDateStart" value="${escapeAttr(dateStart)}"></label>
          <label class="field"><input type="date" aria-label="ถึงวันที่" data-filter-scope="warehouseDateEnd" value="${escapeAttr(dateEnd)}"></label>
          <button type="button" class="secondary warehouse-history-clear" data-clear-warehouse-history>ล้างช่วงเวลา</button>
        ` : "";
  // The global top bar already carries the page title. Keep this panel focused
  // on its controls so the same heading is not repeated and the filter area
  // does not create an oversized blank band above the content.
  const warehouseHeroHeading = `<div class="warehouse-hero-title"><p class="eyebrow">Grand House · สินค้าคงคลัง</p><h2>คลังกลาง Grand House</h2><p class="muted">รับเข้าเพียงจุดเดียว แล้วส่งต่อให้ทุกสาขา</p></div>`;
  const warehouseHeader = `
    <section class="warehouse-hero ${showWarehouseValue ? "warehouse-hero--catalog" : "warehouse-hero--compact"}">
      <div class="warehouse-hero-copy">
        ${warehouseHeroHeading}
        <div class="${warehouseInlineFilterClass}" aria-label="ตัวกรองคลัง">
          <label class="field">${warehouseCategoryFilterLabel}${selectWithFilter("warehouseCategory", [["all", "ทุกหมวดหมู่"], ...materialCategoryOptions()].map(([value, label]) => [value, value === "all" ? label : inventoryCategoryLabel(value)]), category, warehouseCategoryFilterAria)}</label>
          ${historyInlineFilters}
        </div>
      </div>
      ${showWarehouseValue ? `<div class="warehouse-hero-summary"><div class="warehouse-summary-row"><div class="warehouse-stats">${warehouseStatCard("มูลค่าคลังกลาง", money(totalWarehouseValue), "รวมต้นทุนสินค้าคงเหลือ", "฿", "value")}</div><div class="warehouse-hero-actions"><button type="button" class="secondary warehouse-rop-entry" data-warehouse-focus-rop>ตั้งค่า ROP / EOQ</button></div></div></div>` : ""}
    </section>`;
  const warehouseHeaderContent = ["receive", "pricing", "reference"].includes(tab) ? "" : warehouseHeader;
  const productsContent = `${warehouseHeader}<section class="panel" style="margin-top:16px"><div class="warehouse-products-toolbar"><div><h2>สต็อกปัจจุบัน</h2></div><div class="warehouse-products-actions"><span class="pill">${warehouseRows.length} รายการ</span></div></div>${warehouseRows.length ? `<section class="inventory-catalog-block">${inventoryTable(warehouseRows, { editable: true })}</section>` : empty("ไม่พบรายการตามตัวกรองที่เลือก")}${inventoryProductEditDialog()}</section>`;
  const receiveContent = `${warehouseHeaderContent}<div class="warehouse-actions" style="margin-top:16px"><section class="panel"><div class="row-between inventory-form-heading"><div><p class="eyebrow">คลังกลาง Grand House</p><h2>รับสินค้าเข้าคลังกลาง</h2><p class="muted">บันทึกบิลครั้งเดียว ระบบคำนวณต้นทุนเฉลี่ยให้ทุกสาขา</p></div><button type="button" class="secondary" data-open-inventory-options>ตั้งค่ารายการอ้างอิง</button></div><form id="stockInForm" class="stack"><input type="hidden" name="warehouseId" value="office"><input type="hidden" name="branchId" value="office"><div class="form-grid"><label class="field"><span>ผู้ขาย / แหล่งซื้อ</span>${supplierSelect("supplierId")}</label><label class="field wide"><span>ชื่อสินค้า</span><input name="productName" data-stock-product-name list="materialProductNames" required></label><input type="hidden" name="productId" data-stock-product-id><datalist id="materialProductNames">${state.data.materialProducts.map((item) => `<option value="${escapeAttr(item.name)}"></option>`).join("")}</datalist><label class="field"><span>หมวดหมู่</span>${select("category", materialCategoryOptions(), "วัตถุดิบ")}</label><label class="field"><span>หน่วย</span>${unitSelect("unit", "ชิ้น")}</label><label class="field"><span>จำนวน</span><input name="quantity" type="number" min="0.01" step="0.01" required></label><label class="field"><span>ต้นทุนต่อหน่วย</span><input name="unitCost" data-stock-cost type="number" min="0" step="0.01" required></label><label class="field"><span>วันที่รับเข้า</span><input name="receiveDate" type="date" value="${today()}"></label><label class="field"><span>เวลา</span><input name="receiveTime" type="time" value="${currentTime()}"></label><label class="field wide"><span>เลขอ้างอิง</span><input name="referenceNumber"></label><label class="field wide"><span>หมายเหตุ</span><input name="remarks"></label></div><div class="form-actions"><button class="primary">ยืนยันรับเข้าคลังกลาง</button></div></form></section><section class="panel"><div><p class="eyebrow">การจ่ายออก</p><h2>ส่งสินค้าออกจากคลังกลาง</h2><p class="muted">เลือกสาขาปลายทาง ระบบตัดยอดพร้อมต้นทุนเฉลี่ยอัตโนมัติ</p></div><form id="issueForm" class="stack"><div class="form-grid"><label class="field"><span>ประเภท</span>${select("type", issueTypes)}</label><label class="field"><span>สาขาปลายทาง</span>${branchSelect("branchId", state.data.branches[0]?.id || "")}</label><label class="field"><span>สินค้า</span>${materialSelect("productId")}</label><label class="field"><span>จำนวน</span><input name="quantity" type="number" min="0.01" step="0.01" required></label><label class="field wide"><span>หมายเหตุ</span><input name="remarks"></label></div><div class="form-actions"><button class="danger">ยืนยันส่งออกจากคลังกลาง</button></div></form></section><section class="panel"><div><p class="eyebrow">ตรวจนับ</p><h2>ปรับยอดคลังกลาง</h2><p class="muted">ใช้เมื่อยอดนับจริงต่างจากยอดในระบบ</p></div><form id="adjustForm" class="stack"><input type="hidden" name="branchId" value="office"><div class="form-grid"><label class="field"><span>สินค้า</span>${materialSelect("productId")}</label><label class="field"><span>ยอดนับจริง</span><input name="countedQty" type="number" min="0" step="0.01" required></label><label class="field wide"><span>เหตุผล</span><input name="remarks" required placeholder="เช่น นับสต็อกประจำสัปดาห์"></label></div><div class="form-actions"><button class="primary">บันทึกการปรับยอด</button></div></form></section></div>`;
  const historyTabs = [
    ["all", "ทั้งหมด"],
    ["receive", "รับเข้า"],
    ["issue", "เบิกออก"],
    ["adjustment", "ปรับยอด"]
  ].map(([value, label]) => `<button type="button" role="tab" aria-selected="${warehouseHistoryType === value}" class="${warehouseHistoryType === value ? "active" : ""}" data-tab-scope="warehouseHistoryType" data-tab-value="${value}"><span>${label}</span><em>${historyTypeCounts[value]}</em></button>`).join("");
  const historyQueryLabel = warehouseHistoryQuery ? ` · ค้นหา “${escapeHtml(warehouseHistoryQuery)}”` : "";
  const historyScopeLabel = dateStart || dateEnd ? "ตามช่วงวันที่ที่เลือก" : "จากประวัติทั้งหมด";
  const historyResultStatus = `${historyScopeLabel}: แสดง ${historyRows.length} รายการ จาก ${searchedMovementRows.length} รายการ${historyQueryLabel} · รับเข้า ${historyTypeCounts.receive} · เบิกออก ${historyTypeCounts.issue} · ปรับยอด ${historyTypeCounts.adjustment}`;
  const historyControls = `
    <section class="warehouse-history-toolbar" aria-label="ตัวเลือกการดูประวัติ">
      <div class="warehouse-history-toolbar-head">
        <nav class="warehouse-history-type-tabs" role="tablist" aria-label="ประเภทประวัติ">
          ${historyTabs}
        </nav>
        <label class="warehouse-history-search">
          <span class="warehouse-history-search-icon" aria-hidden="true">⌕</span>
          <span class="sr-only">ค้นหาประวัติคลัง</span>
          <input type="search" data-search-scope="warehouseHistoryQuery" value="${escapeAttr(warehouseHistoryQuery)}" placeholder="ค้นหาสินค้า เลขอ้างอิง หรือปลายทาง" autocomplete="off">
          ${warehouseHistoryQuery ? `<button type="button" class="warehouse-history-search-clear" data-clear-search-scope="warehouseHistoryQuery" aria-label="ล้างคำค้น">×</button>` : ""}
        </label>
      </div>
      <p class="warehouse-history-result-status" role="status">${historyResultStatus}</p>
    </section>
  `;
  const historyEmptyMessage = movementRows.length
    ? "ไม่พบรายการที่ตรงกับประเภทหรือคำค้นหาที่เลือก"
    : "ยังไม่มีรายการเคลื่อนไหวตามตัวกรองที่เลือก";
  const historyContent = `${warehouseHeader}${historyControls}<section class="panel warehouse-history-table" style="margin-top:16px">${historyRows.length ? transactionTable(historyRows.slice().sort((a, b) => String(b.dateTime).localeCompare(String(a.dateTime))), { historyMode: true }) : empty(historyEmptyMessage)}</section>`;
  const policyRows = warehouseRows.map((item) => {
    const targetStock = Number(item.targetStock ?? item.reserveTarget ?? 0);
    const suggested = Number(item.suggestedPurchaseQty ?? Math.max(0, targetStock - Number(item.quantity || 0)));
    return [item.productName, item.category || "—", qty(item.quantity, item.unit), Number(item.averageCost || item.standardCost || 0) > 0 ? money(item.averageCost || item.standardCost) : `<span class="pill warning">ยังไม่ตั้งต้นทุน</span>`, `<input class="policy-number-input" data-policy-reorder="${item.productId}" type="number" min="0" step="0.01" value="${Number(item.reorderPoint || 0)}">`, `<input class="policy-number-input" data-policy-target="${item.productId}" type="number" min="0" step="0.01" value="${targetStock}">`, `<input class="policy-number-input" data-policy-eoq="${item.productId}" type="number" min="0" step="0.01" value="${Number(item.eoq || 0)}">`, suggested > 0 ? qty(suggested, item.unit) : "—", `<button type="button" class="primary" data-save-warehouse-policy data-policy-branch="office" data-policy-owner="GRAND_SUPPLIED" data-policy-product="${escapeAttr(item.productId)}">บันทึก</button>`];
  });
  const settingsContent = `${warehouseHeader}<section class="panel warehouse-policy-summary" style="margin-top:16px">${sectionTitle("นโยบายเติมสต็อกของคลังกลาง", "กำหนด ROP, Target Stock และ EOQ ต่อสินค้า เพื่อให้ระบบแนะนำจำนวนรับเข้า") }<div class="warehouse-policy-metrics">${metric("ยังไม่มีต้นทุน", missingCostRows.length)}${metric("ยังไม่ตั้งจุดสั่งซื้อ", missingReorderRows.length)}${metric("ยังไม่ตั้งสต็อกเป้าหมาย", missingTargetRows.length)}${metric("ยังไม่ตั้ง EOQ", warehouseRows.filter((item) => Number(item.eoq || 0) <= 0).length)}</div></section><section class="panel" style="margin-top:16px">${simpleTable(["สินค้า", "หมวดหมู่", "คงเหลือ", "ต้นทุนเฉลี่ย", "จุดสั่งซื้อ (ROP)", "Target Stock", "EOQ", "ควรเติม", ""], policyRows)}</section>`;
  const alertContent = `${warehouseHeader}<section class="low-stock-panel ${lowRows.length ? "has-alert" : ""}" style="margin-top:16px"><div class="row-between"><h2>สินค้าที่ต้องซื้อเพิ่ม</h2><span class="pill ${lowRows.length ? "warning" : ""}">${lowRows.length} รายการ</span></div>${lowRows.length ? `<div class="low-stock-grid">${lowRows.map(lowStockCard).join("")}</div>` : empty("ยังไม่มีรายการที่ต้องซื้อเพิ่ม")}</section>`;
  const overviewContent = `${warehouseHeader}<section class="panel warehouse-branch-value-section warehouse-overview-block" style="margin-top:16px"><div class="warehouse-branch-values">${ownerCards}</div></section><section class="panel warehouse-category-value-section warehouse-overview-block" style="margin-top:16px">${warehouseCategoryPie(allRows)}</section><section class="panel warehouse-summary-section warehouse-overview-block" style="margin-top:16px"><div class="action-summary warehouse-summary-cards">${warehouseSummaryAlertCard("สินค้าหมด", emptyRows.length, "", emptyRows.length ? "red" : "neutral", emptyRows)}${warehouseSummaryAlertCard("ถึงจุดสั่งซื้อ (ROP)", reorderRows.length, "", reorderRows.length ? "warning" : "neutral", reorderRows)}${warehouseSummaryAlertCard("คงเหลือน้อยกว่าระดับเป้าหมาย", targetRows.length, "", targetRows.length ? "warning" : "neutral", targetRows)}</div></section>`;
  const pricingContent = `${warehouseHeaderContent}${renderPricing()}`;
  const referenceContent = inventoryOptionManager();
  return roleLayout("warehouse", warehouseMenu, tab === "overview" ? overviewContent : tab === "products" ? productsContent : tab === "receive" ? receiveContent : tab === "history" ? historyContent : tab === "settings" ? settingsContent : tab === "pricing" ? pricingContent : tab === "reference" ? referenceContent : alertContent);
}

function renderOffice() {
  if (isTheGrandsWorkspace()) return renderParentCompanyHub();
  const foodRequests = state.data.foodRequests || [];
  const dispatches = state.data.kitchenDispatches || [];
  const closings = state.data.branchDailyClosings || [];
  const canRecordSales = state.currentUser.role === "OFFICE";
  const officeTabs = ["requests", "packing", "kitchen-requests", "kitchen-history", "history", "sales", "closing-review", "cost-summary"];
  const rawTab = officeTabs.includes(state.filters.officeTab) ? state.filters.officeTab : "requests";
  const tab = rawTab === "packing" ? "requests" : rawTab === "kitchen-history" ? "kitchen-requests" : rawTab;
  const officeBranch = state.filters.officeBranch || "all";
  const officeDate = state.filters.officeDate || "";
  const officeRequestRecords = buildOfficeRequestRecords(officeBranch, officeDate);
  const actionableRecords = officeRequestRecords.filter((record) => record.kind === "material" && ["CREATED", "OFFICE_RECEIVED"].includes(record.status));
  const kitchenRecords = officeRequestRecords.filter((record) => ["food", "dispatch"].includes(record.kind) && !["BRANCH_RECEIVED", "COMPLETED"].includes(record.status));
  const officeHistoryWindow = officeHistoryRange();
  const historyEntries = movementEntries(officeHistoryWindow.start, officeHistoryWindow.end, officeBranch);
  const historyRecords = historyEntries.filter((entry) => entry.kind === "food" || (entry.kind === "material" && ["MATERIAL_REQUEST", "MANUAL_ISSUE"].includes(entry.movementType)));
  const historyCount = historyRecordCount(historyRecords);
  const officeMenu = officeNavigationGroups();
  const requestWorkspace = tab === "history"
    ? renderOfficeHistoryWorkspace({
      officeBranch,
      officeDate,
      counts: { actionable: actionableRecords.length, kitchen: kitchenRecords.length, all: historyCount }
    })
    : renderOfficeRequestWorkspace(tab, officeRequestRecords, actionableRecords, kitchenRecords, {
      officeBranch,
      officeDate,
      counts: { actionable: actionableRecords.length, kitchen: kitchenRecords.length, all: historyCount }
    });
  const isRequestTab = ["requests", "kitchen-requests", "history"].includes(tab);
  return roleLayout("office", officeMenu, `
    ${isRequestTab ? requestWorkspace : ""}
    ${tab === "sales" && canRecordSales ? `
      ${filterPanel("office")}
      <section class="panel sales-entry-panel">${sectionTitle("กรอกยอดขายรวมรายวัน", "ออฟฟิศกรอกยอดรวมจากหน้าร้าน ไม่ต้องจดยอดขายทีละเมนู")}${dailySalesForm(officeDate || today(), officeBranch)}</section>
      <section class="panel" style="margin-top:16px">${sectionTitle("ยอดขายที่บันทึกแล้ว", "ใช้เป็นยอดขายรวมเพื่อคำนวณส่วนต่างเบื้องต้น")}${dailySalesTable(state.filters.officeDate || "", state.filters.officeDate || "", officeBranch)}</section>
    ` : ""}
    ${tab === "closing-review" ? `
      ${filterPanel("office")}
      <section class="panel">${sectionTitle("ปิดวันสาขา", "สาขาเป็นคนกรอกยอดเหลือปลายวัน Office ใช้หน้านี้ตรวจข้อมูลเท่านั้น")}${simpleTable(["วันที่", "สาขา", "รายการ", "ของเสีย", "สถานะ"], closings.filter((closing) => officeBranch === "all" || closing.branchId === officeBranch).sort((a, b) => b.closingDate.localeCompare(a.closingDate)).map((closing) => [closing.closingDate, closing.branchName, closing.entries.length, qty(closing.entries.reduce((sum, entry) => sum + Number(entry.wasteQty || 0), 0)), closing.status === "HAS_WASTE" ? "มีของเสีย" : "บันทึกยอดเหลือ"])) || empty("ยังไม่มีข้อมูลปิดวัน")}</section>
    ` : ""}
    ${tab === "cost-summary" ? shipmentReportPanel() : ""}
  `);
}

function buildOfficeRequestRecords(branchValue = "all", dateValue = "") {
  const inScope = (row, dateSource) => {
    const branchOk = branchValue === "all" || row.branchId === branchValue;
    const dateOk = !dateValue || normalizeDate(dateSource) === dateValue;
    return branchOk && dateOk;
  };
  const records = [
    ...(state.data.materialRequests || [])
      .filter((request) => inScope(request, request.createdAt))
      .map((request) => ({ kind: "material", route: "office", row: request, status: request.status, branchName: request.branchName, dateValue: request.createdAt })),
    ...(state.data.foodRequests || [])
      .filter((request) => inScope(request, request.createdAt))
      .map((request) => ({ kind: "food", route: "kitchen", row: request, status: request.status, branchName: request.branchName, dateValue: request.createdAt })),
    ...(state.data.kitchenDispatches || [])
      .filter((dispatch) => inScope(dispatch, dispatch.dispatchDate || dispatch.createdAt))
      .map((dispatch) => ({ kind: "dispatch", route: "kitchen", row: dispatch, status: dispatch.status, branchName: dispatch.branchName, dateValue: dispatch.dispatchDate || dispatch.createdAt }))
  ];
  return records.sort((a, b) => new Date(b.dateValue || 0) - new Date(a.dateValue || 0));
}

function officeRequestRooms(request) {
  const rooms = request.productionRoom
    ? [request.productionRoom]
    : [...new Set((request.items || []).map((item) => item.productionRoom).filter(Boolean))];
  return rooms.length ? rooms : ["ห้องผลิต"];
}

function formatOfficeRequestDateTime(row) {
  const value = row.createdAt || row.dispatchDate;
  return value ? dateTime(value) : "ไม่ระบุวันเวลา";
}

function officeRequestTabs(activeTab, counts) {
  const tabs = [
    ["requests", "ต้องดำเนินการ", "ดำเนินการ", counts.actionable],
    ["kitchen-requests", "ติดตามห้องผลิต", "ติดตาม", counts.kitchen],
    ["history", "ประวัติ", "ประวัติ", counts.all]
  ];
  return `
    <div class="tab-menu office-request-tabs" role="tablist" aria-label="มุมมองรายการเบิก">
      ${tabs.map(([value, label, shortLabel, count]) => `<button type="button" role="tab" aria-label="${label} ${count}" aria-selected="${activeTab === value}" class="${activeTab === value ? "active" : ""}" data-tab-scope="officeTab" data-tab-value="${value}"><span class="office-tab-label-full">${label}</span><span class="office-tab-label-short">${shortLabel}</span><em>${count}</em></button>`).join("")}
    </div>
  `;
}

function officeRequestViewBar(activeTab, counts) {
  return `
    <nav class="office-request-view-bar" aria-label="มุมมองรายการเบิก">
      ${officeRequestTabs(activeTab, counts)}
    </nav>
  `;
}

function officeHistoryRange() {
  let start = state.filters.officeHistoryStartDate || "";
  let end = state.filters.officeHistoryEndDate || "";
  if (!start && !end && state.filters.officeDate) {
    start = state.filters.officeDate;
    end = state.filters.officeDate;
  }
  if (!start && end) start = end;
  if (start && !end) end = start;
  if (start && end && start > end) [start, end] = [end, start];
  const preset = state.filters.officeHistoryPreset === "all" && start && end
    ? (start === end ? "day" : "custom")
    : state.filters.officeHistoryPreset || (!start && !end ? "all" : start === end ? "day" : "custom");
  return { start, end, preset };
}

function officeHistoryTabs(activeType, counts) {
  const tabs = [
    ["kitchen", "ห้องผลิต", counts.kitchen],
    ["office", "ออฟฟิศ", counts.office]
  ];
  return `
    <div class="tab-menu office-history-tabs" role="tablist" aria-label="ปลายทางการส่งออกในประวัติ">
      ${tabs.map(([value, label, count]) => `<button type="button" role="tab" aria-selected="${activeType === value}" class="${activeType === value ? "active" : ""}" data-tab-scope="officeHistoryType" data-tab-value="${value}"><span>${label}</span><em>${count}</em></button>`).join("")}
    </div>
  `;
}

function officeHistoryRangePanel(range, branchValue) {
  const rangeLabel = range.start && range.end
    ? (range.start === range.end ? displayDate(range.start) : `${displayDate(range.start)} - ${displayDate(range.end)}`)
    : "ทุกวันที่มีการส่งออก";
  return `
    <aside class="panel office-request-controls office-request-sidebar office-history-sidebar" aria-label="ตัวกรองประวัติ">
      <div class="office-history-inline-controls" aria-label="ตัวกรองประวัติการส่งออก">
        <div class="form-grid office-history-filter-grid">
          <label class="field"><span>สาขา</span>${branchFilterSelect("officeBranch", branchValue)}</label>
          <label class="field"><span>วันที่เริ่ม</span><input data-office-history-date="officeHistoryStartDate" type="date" value="${escapeAttr(range.start)}"></label>
          <label class="field"><span>วันที่สิ้นสุด</span><input data-office-history-date="officeHistoryEndDate" type="date" value="${escapeAttr(range.end)}"></label>
        </div>
        ${(range.start || range.end) ? `<p class="muted office-history-range-note">ช่วงที่แสดง: ${rangeLabel}</p>` : ""}
      </div>
    </aside>
  `;
}

function historyRecordCount(entries) {
  return new Set(entries.map((entry) => `${entry.reference}|${entry.branchId}`)).size;
}

function officeHistoryRecords(entries) {
  const grouped = new Map();
  entries.forEach((entry) => {
    const key = `${entry.reference}|${entry.branchId}`;
    const group = grouped.get(key) || {
      reference: entry.reference,
      branchId: entry.branchId,
      branchName: entry.branchName,
      dateTime: entry.dateTime,
      entries: []
    };
    group.entries.push(entry);
    if (entry.dateTime > group.dateTime) group.dateTime = entry.dateTime;
    grouped.set(key, group);
  });
  const records = [...grouped.values()]
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime))
    .map((group) => {
      const totalCost = group.entries.reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0);
      const sources = [...new Set(group.entries.map((entry) => entry.source).filter(Boolean))].join(" · ") || "ออฟฟิศ / คลัง";
      return `
        <article class="office-history-record">
          <div class="office-history-record-head">
            <div>
              <h3>${escapeHtml(group.branchName)}</h3>
              <p class="muted">${escapeHtml(group.reference)} · ${dateTime(group.dateTime)}</p>
            </div>
            <span class="office-history-record-source">${escapeHtml(sources)}</span>
          </div>
          <div class="office-history-record-items">
            ${group.entries.map((entry) => `
              <div class="office-history-record-item">
                <div>
                  <strong>${escapeHtml(entry.productName)}</strong>
                  ${[entry.productionRoom, entry.category].filter(Boolean).length ? `<small>${escapeHtml([entry.productionRoom, entry.category].filter(Boolean).join(" · "))}</small>` : ""}
                </div>
                <span>${qty(entry.quantity, entry.unit)}</span>
                <b>${money(entry.totalCost)}</b>
              </div>
            `).join("")}
          </div>
          <div class="office-history-record-total"><span>รวมต้นทุน</span><strong>${money(totalCost)}</strong></div>
        </article>
      `;
    });
  return records.length ? `<div class="office-history-record-list">${records.join("")}</div>` : empty("ยังไม่มีรายการจัดของจากออฟฟิศในช่วงนี้");
}

function renderOfficeHistoryWorkspace(context) {
  const range = officeHistoryRange();
  const branchValue = context.officeBranch || "all";
  const entries = movementEntries(range.start, range.end, branchValue);
  const kitchenEntries = entries.filter((entry) => entry.kind === "food");
  const officeEntries = entries.filter((entry) => entry.kind === "material" && ["MATERIAL_REQUEST", "MANUAL_ISSUE"].includes(entry.movementType));
  const activeType = state.filters.officeHistoryType === "office" ? "office" : "kitchen";
  const counts = { kitchen: historyRecordCount(kitchenEntries), office: historyRecordCount(officeEntries) };
  return `
    <div class="office-request-page office-history-request-page">
      ${officeRequestViewBar("history", context.counts)}
      <div class="office-history-destination-filter" aria-label="เลือกปลายทางการส่งออก">
        ${officeHistoryTabs(activeType, counts)}
      </div>
      ${officeHistoryRangePanel(range, branchValue)}
      <section class="panel office-request-list-panel office-history-results-panel" aria-label="${escapeAttr(activeType === "kitchen" ? "ประวัติการส่งออกจากห้องผลิต" : "ประวัติการส่งออกจากออฟฟิศ")}">
        <div class="office-history-list-head office-history-results-head">
          <div>
            <h2>ประวัติรายการ</h2>
          </div>
        </div>
        <div class="office-history-data">
          ${officeHistoryRecords(activeType === "kitchen" ? kitchenEntries : officeEntries)}
        </div>
      </section>
    </div>
  `;
}

function officeRequestFilterPanel(officeBranch, officeDate) {
  return `
    <aside class="panel office-request-controls office-request-sidebar" aria-label="ตัวกรองรายการเบิก">
      <div class="office-request-filter-heading">
        <strong>ตัวกรอง</strong>
        <span class="muted">สาขาและวันที่</span>
      </div>
      <div class="form-grid office-request-filter-grid">
        <label class="field"><span>สาขา</span>${branchFilterSelect("officeBranch", officeBranch)}</label>
        <label class="field"><span>วันที่</span><input data-filter-scope="officeDate" type="date" value="${escapeAttr(officeDate)}"></label>
      </div>
    </aside>
  `;
}

function officeUnifiedRequestCard(record) {
  const row = record.row;
  const sourceLabel = record.kind === "material"
    ? `ออฟฟิศ · ${materialRequestSource(row.sourceType).label}`
    : record.kind === "food"
      ? `ห้องผลิต · ${officeRequestRooms(row).join(" / ")}`
      : "ห้องผลิต · ส่งเพิ่ม";
  const innerCard = record.kind === "material"
    ? materialRequestCard(row)
    : record.kind === "food"
      ? foodRequestCard(row, 0, false, { productionOnly: true })
      : dispatchStatusCard(row);
  return `
    <div class="office-unified-request-card office-unified-request-card--${record.route}">
      <div class="office-unified-request-meta">
        <div class="office-unified-request-meta-main">
          <span class="office-unified-request-source is-active">${sourceLabel}</span>
        </div>
      </div>
      ${innerCard}
    </div>
  `;
}

function renderOfficeRequestWorkspace(tab, records, actionableRecords, kitchenRecords, context) {
  const activeRecords = tab === "requests"
    ? actionableRecords
    : tab === "kitchen-requests"
      ? kitchenRecords
      : records;
  const title = tab === "requests" ? "ต้องดำเนินการ" : tab === "kitchen-requests" ? "ติดตามห้องผลิต" : "รายการทั้งหมด";
  return `
    <div class="office-request-page">
      ${officeRequestViewBar(tab, context.counts)}
      ${officeRequestFilterPanel(context.officeBranch, context.officeDate)}
      <section class="panel office-request-list-panel" aria-label="${escapeAttr(title)}">
        <div class="office-request-list-head office-request-list-head--compact">
          <div>
            <h2>${title}</h2>
          </div>
          <span class="pill neutral">${activeRecords.length} รายการ</span>
        </div>
        <div class="office-unified-request-list">${activeRecords.map(officeUnifiedRequestCard).join("") || empty(tab === "requests" ? "ยังไม่มีรายการที่ต้องดำเนินการ" : tab === "kitchen-requests" ? "ยังไม่มีรายการจากห้องผลิต" : "ไม่พบรายการตามตัวกรอง")}</div>
      </section>
    </div>
  `;
}

function renderParentCompanyHub() {
  const moduleId = parentCompanyModules.some((module) => module.id === state.filters.officeParentModule)
    ? state.filters.officeParentModule
    : "overview";
  const activeModule = parentCompanyModules.find((module) => module.id === moduleId) || parentCompanyModules[0];
  const parentMenu = [{
    title: "บริษัทแม่",
    open: true,
    items: parentCompanyModules.map((module) => ["officeParentModule", module.id, module.title, "", "", module.ready ? "" : "เตรียม"])
  }];
  const content = moduleId === "overview" ? renderParentCompanyOverview() : renderParentModuleDetail(activeModule);
  return roleLayout("parent-company", parentMenu, content);
}

function renderParentCompanyOverview() {
  return `
    <section class="parent-company-hero" aria-labelledby="parent-company-hero-title">
      <div class="parent-company-hero-copy">
        <span class="parent-company-kicker">ศูนย์กลางบริษัทแม่ · The Grands</span>
        <h2 id="parent-company-hero-title">บริหาร The Grands จากจุดเดียว</h2>
        <p>พื้นที่สำหรับดูแลบุคลากร งบประมาณ การจัดซื้อ ทรัพย์สิน และเอกสารของบริษัท โดยไม่ปะปนกับข้อมูลปฏิบัติการของ Grand House</p>
        <div class="parent-company-hero-tags"><span>Workspace: The Grands</span><span>ข้อมูลแยกจาก Grand House</span></div>
      </div>
      <div class="parent-company-hero-mark" aria-hidden="true"><span>G</span><small>THE<br>GRANDS</small></div>
    </section>

    <section class="parent-company-focus" aria-labelledby="parent-company-focus-title">
      <div class="parent-company-section-heading"><div><span class="parent-company-kicker">ภาพรวมวันนี้</span><h2 id="parent-company-focus-title">สิ่งที่ต้องติดตาม</h2></div><span class="parent-company-status"><i aria-hidden="true"></i> พื้นที่พร้อมใช้งาน</span></div>
      <div class="parent-company-metrics">
        ${parentMetric("แบรนด์ในบริษัท", "2", "The Grands · Grand House", "brand")}
        ${parentMetric("โมดูลศูนย์กลาง", "6", "เริ่มจัดการเป็นระบบเดียว", "modules")}
        ${parentMetric("งานรออนุมัติ", "0", "ยังไม่มี workflow ส่วนกลาง", "pending")}
        ${parentMetric("แจ้งเตือน", "0", "ยังไม่มีรายการที่ต้องเร่ง", "alerts")}
      </div>
    </section>

    <section class="parent-company-modules" aria-labelledby="parent-company-modules-title">
      <div class="parent-company-section-heading"><div><span class="parent-company-kicker">ศูนย์งานบริษัท</span><h2 id="parent-company-modules-title">เลือกสิ่งที่ต้องการจัดการ</h2></div><span class="parent-company-section-note">กดการ์ดเพื่อดูขอบเขตของโมดูล</span></div>
      <div class="parent-company-module-grid">${parentCompanyModules.map(parentModuleCard).join("")}</div>
    </section>

    <section class="parent-company-boundary" aria-labelledby="parent-company-boundary-title">
      <div><span class="parent-company-kicker">ขอบเขตข้อมูล</span><h2 id="parent-company-boundary-title">บริษัทแม่กับแบรนด์แยกกันชัดเจน</h2><p>หน้านี้ดูแลเฉพาะงานส่วนกลางของ The Grands รายการเบิก สาขา ห้องผลิต และคลังของ Grand House อยู่ใน workspace Grand House แยกต่างหาก</p></div>
      <button type="button" class="secondary" data-parent-switch-brand>เปลี่ยนไป Grand House</button>
    </section>
  `;
}

function renderParentModuleDetail(module) {
  const plans = parentCompanyPlans[module.id] || [];
  return `
    <section class="parent-module-detail" aria-labelledby="parent-module-detail-title">
      <div class="parent-module-detail-head"><div><button type="button" class="parent-back-link" data-tab-scope="officeParentModule" data-tab-value="overview">← กลับภาพรวมบริษัท</button><span class="parent-company-kicker">The Grands · แผนงานบริษัทแม่</span><h2 id="parent-module-detail-title">${module.title}</h2><p>${module.description}</p></div><span class="parent-module-status">กำลังเตรียมระบบ</span></div>
      <div class="parent-module-plan-grid">${plans.map((plan, index) => `<article class="parent-module-plan"><span>${String(index + 1).padStart(2, "0")}</span><strong>${plan}</strong><small>วางเป็นส่วนหนึ่งของ ${module.title}</small></article>`).join("")}</div>
      <section class="parent-module-empty"><span class="parent-empty-mark" aria-hidden="true">${module.icon}</span><div><h3>ยังไม่มีข้อมูลในโมดูลนี้</h3><p>โครงสร้างหน้านี้เตรียมไว้แล้ว เมื่อเริ่มใช้งานจริงจึงค่อยเพิ่มข้อมูลและสิทธิ์ของทีมที่เกี่ยวข้อง</p></div></section>
    </section>
  `;
}

function parentMetric(label, value, detail, tone) {
  return `<article class="parent-company-metric parent-company-metric--${tone}"><span>${label}</span><strong>${value}</strong><small>${detail}</small></article>`;
}

function parentModuleCard(module) {
  const active = state.filters.officeParentModule === module.id;
  return `<button type="button" class="parent-company-module-card parent-company-module-card--${module.tone} ${active ? "selected" : ""}" data-tab-scope="officeParentModule" data-tab-value="${module.id}" aria-pressed="${active}"><span class="parent-module-icon" aria-hidden="true">${module.icon}</span><span class="parent-module-card-copy"><strong>${module.title}</strong><small>${module.kicker}</small><em>${module.description}</em></span><span class="parent-module-card-status ${module.ready ? "ready" : "planned"}">${module.ready ? "กำลังใช้งาน" : "วางระบบต่อ"}</span><span class="parent-module-card-arrow" aria-hidden="true">→</span></button>`;
}

function officeCostSummaryPanel() {
  const range = officeCostRange();
  const branchValue = state.filters.officeCostBranch || "all";
  const entries = movementEntries(range.start, range.end, branchValue);
  const materialCost = entries.filter((entry) => entry.kind === "material").reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0);
  const kitchenCost = entries.filter((entry) => entry.kind === "food").reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0);
  const totalCost = materialCost + kitchenCost;
  const selectedBranches = state.data.branches.filter((branch) => branchValue === "all" || branch.id === branchValue);
  const sourceLabel = (entry) => entry.kind === "material" ? (entry.source || "ออฟฟิศ / คลัง") : (entry.productionRoom || "ไม่ระบุห้องผลิต");
  const byBranch = selectedBranches.map((branch) => {
    const branchEntries = entries.filter((entry) => entry.branchId === branch.id);
    const branchMaterialCost = branchEntries.filter((entry) => entry.kind === "material").reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0);
    const branchKitchenCost = branchEntries.filter((entry) => entry.kind === "food").reduce((sum, entry) => sum + Number(entry.totalCost || 0), 0);
    return [branch.name, money(branchMaterialCost), money(branchKitchenCost), money(branchMaterialCost + branchKitchenCost)];
  });
  const sourceTotals = new Map();
  entries.forEach((entry) => {
    const key = `${entry.branchId}|${sourceLabel(entry)}`;
    const current = sourceTotals.get(key) || { branchName: entry.branchName, source: sourceLabel(entry), count: 0, cost: 0 };
    current.count += 1;
    current.cost += Number(entry.totalCost || 0);
    sourceTotals.set(key, current);
  });
  const sourceRows = [...sourceTotals.values()]
    .sort((a, b) => a.branchName.localeCompare(b.branchName, "th") || a.source.localeCompare(b.source, "th"))
    .map((row) => [row.branchName, row.source, row.count, money(row.cost)]);
  const dailyTotals = new Map();
  entries.forEach((entry) => {
    const key = `${entry.date}|${entry.branchId}`;
    const current = dailyTotals.get(key) || { date: entry.date, branchName: entry.branchName, materialCost: 0, kitchenCost: 0 };
    if (entry.kind === "material") current.materialCost += Number(entry.totalCost || 0);
    else current.kitchenCost += Number(entry.totalCost || 0);
    dailyTotals.set(key, current);
  });
  const dailyRows = [...dailyTotals.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || a.branchName.localeCompare(b.branchName, "th"))
    .map((row) => [displayDate(row.date), row.branchName, money(row.materialCost), money(row.kitchenCost), money(row.materialCost + row.kitchenCost)]);
  const dailySourceTotals = new Map();
  entries.forEach((entry) => {
    const key = `${entry.date}|${entry.branchId}|${sourceLabel(entry)}`;
    const current = dailySourceTotals.get(key) || { date: entry.date, branchName: entry.branchName, source: sourceLabel(entry), cost: 0 };
    current.cost += Number(entry.totalCost || 0);
    dailySourceTotals.set(key, current);
  });
  const dailySourceRows = [...dailySourceTotals.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || a.branchName.localeCompare(b.branchName, "th") || a.source.localeCompare(b.source, "th"))
    .map((row) => [displayDate(row.date), row.branchName, row.source, money(row.cost)]);
  const dayCount = new Set(entries.map((entry) => entry.date)).size;
  const branchOptions = [["all", "ทุกสาขา"], ...state.data.branches.map((branch) => [branch.id, branch.name])];
  return `
    <section class="panel office-cost-filter-panel">
      ${sectionTitle("เลือกช่วงสรุปต้นทุน", "ดูวันนี้ เดือนนี้ หรือกำหนดวันที่เอง โดยนับเฉพาะรายการที่ส่งออกและตัดสต็อกแล้ว")}
      <div class="form-grid office-cost-filter-grid">
        <label class="field"><span>สาขา</span><select data-office-cost-branch>${branchOptions.map(([value, label]) => `<option value="${escapeAttr(value)}" ${branchValue === value ? "selected" : ""}>${label}</option>`).join("")}</select></label>
        <label class="field"><span>ช่วงข้อมูล</span><select data-office-cost-range-preset><option value="today" ${range.preset === "today" ? "selected" : ""}>วันนี้</option><option value="month" ${range.preset === "month" ? "selected" : ""}>เดือนนี้</option><option value="custom" ${range.preset === "custom" ? "selected" : ""}>กำหนดเอง</option></select></label>
        <label class="field"><span>วันที่เริ่ม</span><input data-office-cost-date="officeCostStartDate" type="date" value="${escapeAttr(range.start)}"></label>
        <label class="field"><span>วันที่สิ้นสุด</span><input data-office-cost-date="officeCostEndDate" type="date" value="${escapeAttr(range.end)}"></label>
      </div>
      <p class="muted office-cost-range-note">ช่วงที่แสดง: ${displayDate(range.start)} - ${displayDate(range.end)}</p>
    </section>
    <div class="grid three office-cost-metrics">
      ${metric("ต้นทุนรวมช่วงนี้", money(totalCost))}
      ${metric("เบิกจากออฟฟิศ / คลัง", money(materialCost))}
      ${metric("ส่งจากห้องผลิต", money(kitchenCost))}
      ${metric("วันที่มีรายการเบิก", dayCount)}
    </div>
    <section class="panel office-cost-section">
      ${sectionTitle("แต่ละสาขาเบิกไปเท่าไหร่", "แยกต้นทุนจากออฟฟิศ/คลังและห้องผลิตตามช่วงที่เลือก")}
      ${simpleTable(["สาขา", "ออฟฟิศ / คลัง", "ห้องผลิต", "ต้นทุนรวม"], byBranch)}
    </section>
    <section class="panel office-cost-section">
      ${sectionTitle("แยกตามห้องผลิตและสาขา", "ดูว่าต้นทุนของแต่ละสาขามาจากห้องผลิตใด หรือมาจากออฟฟิศ/คลัง")}
      ${simpleTable(["สาขา", "ห้อง / แหล่งส่ง", "จำนวนรายการ", "ต้นทุนรวม"], sourceRows)}
    </section>
    <section class="panel office-cost-section">
      ${sectionTitle("ต้นทุนรายวัน", "ยอดต้นทุนรวมของแต่ละสาขาในแต่ละวันที่มีการเบิก")}
      ${simpleTable(["วันที่", "สาขา", "ออฟฟิศ / คลัง", "ห้องผลิต", "ต้นทุนรวม"], dailyRows)}
    </section>
    <section class="panel office-cost-section">
      ${sectionTitle("ต้นทุนรายวันแยกห้องส่ง", "ใช้ตรวจสอบรายละเอียดว่าวันนั้นแต่ละห้องผลิตส่งให้สาขาใดเท่าไหร่")}
      ${simpleTable(["วันที่", "สาขา", "ห้อง / แหล่งส่ง", "ต้นทุน"], dailySourceRows)}
    </section>
  `;
}

function officeCostRange() {
  const end = state.filters.officeCostEndDate || today();
  const start = state.filters.officeCostStartDate || end;
  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = start <= end ? end : start;
  const preset = state.filters.officeCostPreset || (normalizedStart === normalizedEnd ? "today" : normalizedStart === startOfMonth(normalizedEnd) ? "month" : "custom");
  return { start: normalizedStart, end: normalizedEnd, preset };
}

function renderReports() {
  const reportBranch = state.filters.reportBranch || "all";
  const reportMonth = state.filters.reportMonth || today().slice(0, 7);
  const reportMenu = [{ title: "รายงาน", open: true, items: [["reportTab", "preview", "รายงานและส่งออก"]] }];
  const reportControls = `
    <section class="panel report-controls-panel">
      ${sectionTitle("เลือกขอบเขตรายงาน", "เลือกสาขาและเดือนก่อนตรวจสอบรายละเอียดหรือส่งออก")}
      <div class="form-grid report-controls-grid">
        <label class="field"><span>สาขา</span><select data-filter-scope="reportBranch"><option value="all" ${reportBranch === "all" ? "selected" : ""}>ทุกสาขา</option>${state.data.branches.map((branch) => `<option value="${escapeAttr(branch.id)}" ${reportBranch === branch.id ? "selected" : ""}>${branch.name}</option>`).join("")}</select></label>
        <label class="field"><span>เดือน</span><input data-filter-scope="reportMonth" type="month" value="${escapeAttr(reportMonth)}"></label>
      </div>
    </section>
  `;
  return roleLayout("reports", reportMenu, `${reportControls}${monthlyExportPanel(reportBranch, reportMonth)}${state.currentUser.role === "OFFICE" ? `<section class="panel">${sectionTitle("ตรวจสอบข้อมูลสาขา", "ยอดขายและการปิดวันของวันที่ปัจจุบัน")}${officeDataQualityTable(reportBranch, today())}</section>` : ""}`);
}

function productionRoomFilter(selected = "all") {
  const options = [["all", "ทุกห้อง"], ...productionRooms.map((room) => [room.name, room.name])];
  return `<label class="field inline-filter"><span>ห้องผลิต</span>${selectWithFilter("kitchenRoom", options, selected)}</label>`;
}

function selectWithFilter(scope, options, selected = "", ariaLabel = "") {
  const accessibleName = ariaLabel ? ` aria-label="${escapeAttr(ariaLabel)}"` : "";
  return `<select data-filter-scope="${escapeAttr(scope)}"${accessibleName}>${options.map(([value, label]) => `<option value="${escapeAttr(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>`;
}

function officeDataQualityTable(branchValue, dateValue) {
  const branchIds = branchValue === "all" ? state.data.branches.map((branch) => branch.id) : [branchValue];
  const rows = branchIds.map((branchId) => {
    const branch = state.data.branches.find((item) => item.id === branchId);
    const sale = dailySaleRecord(branchId, dateValue);
    const closing = (state.data.branchDailyClosings || []).find((item) => item.branchId === branchId && item.closingDate === dateValue);
    const missing = [];
    if (!sale) missing.push("ยังไม่กรอกยอดขาย");
    if (!closing) missing.push("ยังไม่ปิดวัน");
    return [branch?.name || branchId, sale ? "ครบ" : "ไม่มีข้อมูล", closing ? "ครบ" : "ไม่มีข้อมูล", missing.join(" · ") || "พร้อมตรวจสอบ"];
  });
  return simpleTable(["สาขา", "ยอดขาย", "ปิดวัน", "รายการติดตาม"], rows);
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
    <section class="action-summary">
      ${actionCard("ต้องซื้อด่วน", lowInventory.length, "รายการต่ำกว่า ROP", "warning")}
      ${actionCard("คิวห้องผลิต", openKitchen.length, "รายการรอผลิต/รอส่ง", "red")}
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
          <article><strong>ห้องผลิตส่งเยอะสุด</strong><span>${kitchenRanking[0] ? `${kitchenRanking[0].name} · ${qty(kitchenRanking[0].qty, kitchenRanking[0].unit)}` : "ยังไม่มีข้อมูลในช่วงนี้"}</span></article>
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
        ${sectionTitle("ห้องผลิตส่งเยอะสุด", "Top 8 รวมรายการส่งเพิ่มและสาขาเบิกเพิ่ม")}
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
      ${sectionTitle("ประวัติรายการเบิก", "รวมรายการเบิกของสาขาและห้องผลิต")}
      ${simpleTable(["ประเภท", "เลขรายการ", "สาขา", "วันเวลา", "มูลค่า"], [
        ...state.data.materialRequests.filter((item) => branchId === "all" || item.branchId === branchId).map((item) => [`${requestSourceLabel(item.sourceType)} · ออฟฟิศ`, item.id, item.branchName, dateTime(item.createdAt), money(item.totalCost)]),
        ...state.data.foodRequests.filter((item) => branchId === "all" || item.branchId === branchId).map((item) => ["ห้องผลิต", item.id, item.branchName, dateTime(item.createdAt), money(item.totalSellingValue)]),
        ...state.data.kitchenDispatches.filter((item) => branchId === "all" || item.branchId === branchId).map((item) => [displaySourceLabel(item.sourceLabel), item.id, item.branchName, `${item.dispatchDate} ${item.dispatchTime || ""}`, money(item.totalSellingValue)])
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
  const pricingSearch = String(state.filters.pricingFoodSearch || "");
  return `
    <section class="panel pricing-add-card">
      <h2>เพิ่มเมนูของแกรนด์เฮาส์</h2>
      <form id="addFoodProductForm" class="form-grid product-form">
        <label class="field"><span>ชื่อเมนู</span><input name="name" required></label>
        <label class="field"><span>หมวดหมู่</span>${select("category", [["อาหารสำเร็จรูป", "อาหารสำเร็จรูป"], ["น้ำ", "น้ำ"]], "อาหารสำเร็จรูป")}</label>
        <label class="field"><span>หน่วยสินค้า</span>${unitSelect("unit", "ชิ้น")}</label>
        <label class="field"><span>ห้องผลิต</span>${productionRoomSelect("productionRoom", "", "required")}</label>
        <label class="field"><span>ต้นทุนอาหารต่อหน่วย</span><input name="standardCost" type="number" min="0" step="0.01" required></label>
        <label class="field"><span>ราคาขายจริงต่อหน่วย</span><input name="sellingPrice" type="number" min="0" step="0.01" required></label>
        <div class="form-actions"><button class="primary">เพิ่มเมนู</button></div>
      </form>
    </section>
    <div class="pricing-search-panel pricing-search-panel--below" aria-label="ค้นหาเมนู">
      <label class="pricing-search-control">
        <span class="pricing-search-icon" aria-hidden="true">⌕</span>
        <span class="sr-only">ค้นหาเมนู</span>
        <input type="search" data-search-scope="pricingFoodSearch" value="${escapeAttr(pricingSearch)}" placeholder="ค้นหาเมนู" autocomplete="off">
        ${pricingSearch ? `<button type="button" class="pricing-search-clear" data-clear-search-scope="pricingFoodSearch" aria-label="ล้างคำค้น">×</button>` : ""}
      </label>
    </div>
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

function bindViewEvents(root) { bindShipmentReport(root);
  root.querySelector("[data-parent-switch-brand]")?.addEventListener("click", resetOfficeBrandSelection);
  root.querySelectorAll("[data-kitchen-room-card]").forEach((button) => button.addEventListener("click", () => {
    state.filters.kitchenRoomGateTarget = button.dataset.kitchenRoomCard;
    state.filters.kitchenRoomGateError = "";
    render();
    requestAnimationFrame(() => document.getElementById("kitchenRoomCodeInput")?.focus());
  }));
  root.querySelectorAll("[data-kitchen-room-gate-cancel]").forEach((button) => button.addEventListener("click", () => {
    state.filters.kitchenRoomGateTarget = "";
    state.filters.kitchenRoomGateError = "";
    render();
  }));
  root.querySelector("[data-kitchen-room-gate-backdrop]")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    state.filters.kitchenRoomGateTarget = "";
    state.filters.kitchenRoomGateError = "";
    render();
  });
  root.querySelector("[data-kitchen-room-gate-backdrop]")?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    state.filters.kitchenRoomGateTarget = "";
    state.filters.kitchenRoomGateError = "";
    render();
  });
  root.querySelector("#kitchenRoomGateForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const roomName = state.filters.kitchenRoomGateTarget;
    const code = String(new FormData(event.currentTarget).get("roomCode") || "").trim();
    if (!roomName || !productionRooms.some((room) => room.name === roomName)) {
      state.filters.kitchenRoomGateTarget = "";
      state.filters.kitchenRoomGateError = "ไม่พบห้องที่ต้องการเข้า";
      render();
      return;
    }
    if (code !== productionRoomAccessCode) {
      state.filters.kitchenRoomGateError = "รหัสไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่";
      render();
      requestAnimationFrame(() => document.getElementById("kitchenRoomCodeInput")?.focus());
      return;
    }
    state.filters.kitchenRoomAccess = roomName;
    state.filters.kitchenRoom = roomName;
    state.filters.kitchenBranch = state.data.branches[0]?.id || "all";
    state.filters.kitchenRoomGateTarget = "";
    state.filters.kitchenRoomGateError = "";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  });
  root.querySelector("[data-kitchen-room-select]")?.addEventListener("click", () => {
    state.filters.kitchenRoomAccess = "";
    state.filters.kitchenRoom = "all";
    state.filters.kitchenBranch = "all";
    state.filters.kitchenTab = "queue";
    state.filters.kitchenRoomGateTarget = "";
    state.filters.kitchenRoomGateError = "";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  });
  root.querySelectorAll("[data-kitchen-branch]").forEach((button) => button.addEventListener("click", () => {
    state.filters.kitchenBranch = button.dataset.kitchenBranch;
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  }));
  root.querySelectorAll("[data-filter-scope]").forEach((input) => {
    input.addEventListener("change", () => {
      const scope = input.dataset.filterScope;
      state.filters[scope] = input.value; if (scope.startsWith("shipment")) { state.filters.shipmentDetailRoom = ""; state.filters.shipmentDetailBranch = ""; }
      if (scope === "warehouseOwner") {
        const selectedStockOwner = (state.data.stockOwners || []).find((owner) => owner.id === input.value);
        // Grand's stock is a shared office pool, so selecting it must not
        // accidentally narrow the branch scope to the owner id "grand".
        state.filters.warehouseBranch = input.value === "all"
          || input.value === "grand"
          || selectedStockOwner?.type === "GRAND_SUPPLIED"
          ? "all"
          : input.value;
      }
      if (scope === "officeDate" && state.filters.officeTab === "history") {
        state.filters.officeHistoryPreset = input.value ? "day" : "all";
        state.filters.officeHistoryStartDate = input.value;
        state.filters.officeHistoryEndDate = input.value;
      }
      if (scope === "warehouseDateStart" || scope === "warehouseDateEnd") {
        state.filters.warehouseDate = "";
        if (state.filters.warehouseDateStart && state.filters.warehouseDateEnd && state.filters.warehouseDateStart > state.filters.warehouseDateEnd) {
          [state.filters.warehouseDateStart, state.filters.warehouseDateEnd] = [state.filters.warehouseDateEnd, state.filters.warehouseDateStart];
        }
      }
      render();
    });
  });
  root.querySelector("[data-clear-warehouse-history]")?.addEventListener("click", () => {
    state.filters.warehouseDate = "";
    state.filters.warehouseDateStart = "";
    state.filters.warehouseDateEnd = "";
    render();
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
    if (state.view === "reports") state.filters.reportMonth = event.currentTarget.value;
    else state.filters.ownerExportMonth = event.currentTarget.value;
    render();
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
  root.querySelectorAll("[data-clear-search-scope]").forEach((button) => button.addEventListener("click", () => {
    const scope = button.dataset.clearSearchScope;
    if (!scope) return;
    state.filters[scope] = "";
    render();
    requestAnimationFrame(() => document.querySelector(`[data-search-scope="${scope}"]`)?.focus());
  }));
  root.querySelector("[data-office-cost-branch]")?.addEventListener("change", (event) => {
    state.filters.officeCostBranch = event.currentTarget.value;
    render();
  });
  root.querySelector("[data-office-cost-range-preset]")?.addEventListener("change", (event) => {
    const preset = event.currentTarget.value;
    const end = today();
    state.filters.officeCostPreset = preset;
    if (preset === "month") {
      state.filters.officeCostStartDate = startOfMonth(end);
      state.filters.officeCostEndDate = end;
    } else if (preset === "today") {
      state.filters.officeCostStartDate = end;
      state.filters.officeCostEndDate = end;
    } else {
      const range = officeCostRange();
      state.filters.officeCostStartDate = range.start;
      state.filters.officeCostEndDate = range.end;
    }
    render();
  });
  root.querySelectorAll("[data-office-cost-date]").forEach((input) => input.addEventListener("change", (event) => {
    state.filters.officeCostPreset = "custom";
    state.filters[event.currentTarget.dataset.officeCostDate] = event.currentTarget.value;
    render();
  }));
  root.querySelectorAll("[data-office-history-date]").forEach((input) => input.addEventListener("change", (event) => {
    state.filters.officeHistoryPreset = "custom";
    state.filters.officeDate = "";
    state.filters[event.currentTarget.dataset.officeHistoryDate] = event.currentTarget.value;
    render();
  }));

  root.querySelector("[name='selectedBranch']")?.addEventListener("change", (event) => {
    state.selectedBranchId = event.target.value;
    render();
  });

  const bindNewLine = (list) => bindProductLine(list.lastElementChild);

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
  root.querySelectorAll(".line-item").forEach((line) => bindProductLine(line));

  root.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-line], [data-remove-closing-line]");
    if (!button || !root.contains(button)) return;
    button.closest(".line-item, [data-closing-entry]")?.remove();
  });

  root.querySelector("#materialRequestForm")?.addEventListener("submit", handleMaterialCreate);
  root.querySelector("#packagingRequestForm")?.addEventListener("submit", handleMaterialCreate);
  root.querySelector("#foodRequestForm")?.addEventListener("submit", handleFoodCreate);
  root.querySelector("#stockInForm")?.addEventListener("submit", handleStockIn);
  root.querySelector("#reorderPointForm")?.addEventListener("submit", handleReorderPoint);
  root.querySelector("#issueForm")?.addEventListener("submit", handleIssue);
  root.querySelector("#adjustForm")?.addEventListener("submit", handleAdjust);
  root.querySelector("#dispatchForm")?.addEventListener("submit", handleDispatchCreate);
  root.querySelectorAll("[data-dispatch-qty]").forEach((input) => input.addEventListener("input", () => updateDispatchSummary(root)));
  if (root.querySelector("#dispatchForm")) updateDispatchSummary(root);
  root.querySelector("#addFoodProductForm")?.addEventListener("submit", (event) => handleProductCreate(event, "food"));
  root.querySelector("#addMaterialProductForm")?.addEventListener("submit", (event) => handleProductCreate(event, "material"));
  root.querySelectorAll("[data-open-inventory-options]").forEach((button) => button.addEventListener("click", () => {
    state.filters.managementTab = "reference";
    state.filters.warehouseFocus = false;
    render();
    requestAnimationFrame(() => document.getElementById("inventoryOptionManager")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }));
  root.querySelectorAll("[data-add-inventory-option]").forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = String(new FormData(form).get("value") || "").trim();
    if (!value) {
      toast("กรุณาระบุชื่อรายการ");
      form.querySelector("input")?.focus();
      return;
    }
    await run(() => api("/api/inventory-options", { method: "POST", body: JSON.stringify({ kind: form.dataset.addInventoryOption, action: "add", value }) }), "เพิ่มรายการแล้ว");
  }));
  root.addEventListener("click", async (event) => {
    const editButton = event.target.closest("[data-edit-inventory-option]");
    if (editButton && root.contains(editButton)) {
      const row = editButton.closest("[data-inventory-option-row]");
      if (!row) return;
      const currentValue = row.dataset.optionValue || "";
      row.innerHTML = `<input class="inventory-option-edit-input" maxlength="80" value="${escapeAttr(currentValue)}" aria-label="แก้ไขรายการ"><div class="inventory-option-row-actions"><button type="button" class="primary" data-save-inventory-option>บันทึก</button><button type="button" class="secondary" data-cancel-inventory-option>ยกเลิก</button></div>`;
      row.querySelector("input")?.focus();
      return;
    }
    const cancelButton = event.target.closest("[data-cancel-inventory-option]");
    if (cancelButton && root.contains(cancelButton)) {
      const row = cancelButton.closest("[data-inventory-option-row]");
      if (row) row.outerHTML = inventoryOptionRow(row.dataset.optionKind, row.dataset.optionId, row.dataset.optionValue);
      return;
    }
    const saveButton = event.target.closest("[data-save-inventory-option]");
    if (saveButton && root.contains(saveButton)) {
      const row = saveButton.closest("[data-inventory-option-row]");
      if (!row) return;
      const value = String(row.querySelector("input")?.value || "").trim();
      if (!value) {
        toast("กรุณาระบุชื่อรายการ");
        row.querySelector("input")?.focus();
        return;
      }
      const body = { kind: row.dataset.optionKind, action: "rename", value };
      if (row.dataset.optionKind === "supplier") body.id = row.dataset.optionId;
      else body.from = row.dataset.optionValue;
      await run(() => api("/api/inventory-options", { method: "POST", body: JSON.stringify(body) }), "แก้ไขรายการแล้ว");
    }
  });
  root.querySelector("#dailySalesForm")?.addEventListener("submit", handleDailySalesSave);
  root.querySelector("#branchDailyClosingForm")?.addEventListener("submit", handleBranchDailyClosingSave);
  root.querySelector("#branchDailyClosingForm [name='closingDate']")?.addEventListener("change", (event) => {
    state.filters.branchClosingDate = event.currentTarget.value;
    render();
  });
  root.querySelector("[data-add-closing-line]")?.addEventListener("click", (event) => {
    const list = event.currentTarget.closest("form").querySelector(".closing-entry-list");
    list.insertAdjacentHTML("beforeend", closingEntryLine({ sourceType: "BRANCH_MADE", itemName: "", unit: "", endingQty: 0, entryMode: "ENDING_ONLY" }, list.children.length));
  });

  root.querySelectorAll("[data-advance-material]").forEach((button) => button.addEventListener("click", () => advanceMaterial(button.dataset.advanceMaterial)));
  root.querySelectorAll("[data-advance-food]").forEach((button) => button.addEventListener("click", () => advanceFood(button.dataset.advanceFood)));
  root.querySelectorAll("[data-save-food-production]").forEach((button) => button.addEventListener("click", () => saveFoodProduction(button)));
  root.querySelectorAll("[data-ship-food-request]").forEach((button) => button.addEventListener("click", () => shipFoodRequest(button)));
  root.querySelectorAll("[data-confirm-food-received]").forEach((button) => button.addEventListener("click", () => confirmFoodReceived(button.dataset.confirmFoodReceived)));
  root.querySelectorAll("[data-confirm-dispatch-received]").forEach((button) => button.addEventListener("click", () => confirmDispatchReceived(button.dataset.confirmDispatchReceived)));
  root.querySelectorAll("[data-dispatch-status]").forEach((button) => button.addEventListener("click", () => updateDispatch(button.dataset.dispatchStatus, button.dataset.dispatchNext)));
  root.querySelectorAll("[data-price-kind]").forEach((button) => button.addEventListener("click", () => updatePrice(button)));
  root.querySelectorAll("[data-edit-stock-product]").forEach((button) => button.addEventListener("click", () => openInventoryProductEditor(button, root)));
  root.querySelector("#inventoryProductEditForm")?.addEventListener("submit", handleInventoryProductEdit);
  root.querySelectorAll("[data-close-inventory-product-edit]").forEach((button) => button.addEventListener("click", () => button.closest("dialog")?.close()));
  root.querySelectorAll("[data-warehouse-branch-card]").forEach((button) => button.addEventListener("click", () => {
    state.filters.warehouseBranch = button.dataset.warehouseBranchCard;
    state.filters.warehouseCategory = "all";
    state.filters.managementTab = "overview";
    render();
    document.querySelector(".warehouse-category-value-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  root.querySelectorAll("[data-warehouse-owner-card]").forEach((button) => button.addEventListener("click", () => {
    state.filters.warehouseOwner = button.dataset.warehouseOwnerCard || "all";
    state.filters.warehouseBranch = button.dataset.warehouseOwnerBranch || "all";
    state.filters.warehouseCategory = "all";
    state.filters.managementTab = "overview";
    render();
    document.querySelector(".warehouse-category-value-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  const pieSegments = [...root.querySelectorAll("[data-category-pie-segment]")];
  const pieLegends = [...root.querySelectorAll("[data-category-pie-legend]")];
  const pieTooltip = root.querySelector("[data-category-pie-tooltip]");
  const setPieHighlight = (index, active) => {
    const segment = pieSegments.find((item) => item.dataset.categoryPieSegment === index);
    const legend = pieLegends.find((item) => item.dataset.categoryPieLegend === index);
    segment?.classList.toggle("is-active", active);
    legend?.classList.toggle("is-active", active);
    if (!pieTooltip) return;
    if (active && (segment || legend)) {
      const source = segment || legend;
      pieTooltip.querySelector("[data-category-pie-tooltip-name]").textContent = source.dataset.categoryPieName || "";
      pieTooltip.querySelector("[data-category-pie-tooltip-value]").textContent = source.dataset.categoryPieValue || "";
      pieTooltip.querySelector("[data-category-pie-tooltip-share]").textContent = `${source.dataset.categoryPieShare || ""} ของทั้งหมด`;
      pieTooltip.classList.add("is-visible");
      pieTooltip.setAttribute("aria-hidden", "false");
    } else {
      pieTooltip.classList.remove("is-visible");
      pieTooltip.setAttribute("aria-hidden", "true");
    }
  };
  pieSegments.forEach((segment) => {
    const index = segment.dataset.categoryPieSegment;
    segment.addEventListener("mouseenter", () => setPieHighlight(index, true));
    segment.addEventListener("mouseleave", () => setPieHighlight(index, false));
    segment.addEventListener("focus", () => setPieHighlight(index, true));
    segment.addEventListener("blur", () => setPieHighlight(index, false));
  });
  pieLegends.forEach((legend) => {
    const index = legend.dataset.categoryPieLegend;
    legend.addEventListener("mouseenter", () => setPieHighlight(index, true));
    legend.addEventListener("mouseleave", () => setPieHighlight(index, false));
    legend.addEventListener("focus", () => setPieHighlight(index, true));
    legend.addEventListener("blur", () => setPieHighlight(index, false));
  });
  root.querySelectorAll("[data-warehouse-alert-branch]").forEach((button) => button.addEventListener("click", () => {
    state.filters.warehouseBranch = button.dataset.warehouseAlertBranch;
    state.filters.warehouseCategory = "all";
    state.filters.managementTab = "stock-alerts";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  }));
  root.querySelectorAll("[data-warehouse-alert-tab]").forEach((button) => button.addEventListener("click", () => {
    state.filters.managementTab = "stock-alerts";
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  }));
  root.querySelectorAll("[data-save-warehouse-policy]").forEach((button) => button.addEventListener("click", () => saveWarehousePolicy(button)));
  root.querySelector("[data-warehouse-focus-rop]")?.addEventListener("click", () => {
    state.filters.managementTab = "settings";
    state.filters.warehouseFocus = true;
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  });
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
  const stockOwnerSelect = root.querySelector("#stockInForm [name='stockOwnerType']");
  const stockCostInput = root.querySelector("#stockInForm [data-stock-cost]");
  const duplicateAdjustOwnerFields = [...root.querySelectorAll("#adjustForm [name='stockOwnerBranchId']")];
  duplicateAdjustOwnerFields.slice(1).forEach((input) => input.closest("label")?.remove());
  const syncStockCostField = () => {
    if (!stockOwnerSelect || !stockCostInput) return;
    const branchOwned = stockOwnerSelect.value === "BRANCH_OWNED";
    stockCostInput.disabled = branchOwned;
    stockCostInput.required = !branchOwned;
    if (branchOwned) stockCostInput.value = "";
  };
  root.querySelectorAll("[data-office-stock-owner]").forEach((selectEl) => selectEl.addEventListener("change", () => {
    const typeInput = selectEl.closest("label, form")?.querySelector("[data-stock-owner-type]");
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    if (typeInput) typeInput.value = selectedOption?.dataset.ownerType || "GRAND_SUPPLIED";
    if (selectEl.closest("#stockInForm")) syncStockCostField();
  }));
  stockOwnerSelect?.addEventListener("change", syncStockCostField);
  syncStockCostField();
}

function bindTabButtons(container, closeSidebar = false) {
  container.querySelectorAll("[data-tab-scope]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.viewTarget) state.view = button.dataset.viewTarget;
    if (button.dataset.forceTabScope) state.filters[button.dataset.forceTabScope] = button.dataset.forceTabValue;
    state.filters[button.dataset.tabScope] = button.dataset.tabValue;
    if (button.dataset.warehouseFocusClear) state.filters.warehouseFocus = false;
    if (button.dataset.tabScope === "kitchenRoom") {
      state.filters.kitchenBranch = button.dataset.tabValue === "all"
        ? "all"
        : state.data?.branches?.[0]?.id || "all";
    }
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
  const label = formData.get("materialGroup") === "packaging" ? "บรรจุภัณฑ์" : "วัตถุดิบ";
  await run(() => api("/api/material-requests", { method: "POST", body: JSON.stringify({ branchId: formData.get("branchId"), sourceType: "GRAND_SUPPLIED", items }) }), `ส่งรายการ${label}เข้าคลังกลางแล้ว`);
}

async function handleFoodCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const items = readLines(form);
  await run(() => api("/api/food-requests", { method: "POST", body: JSON.stringify({ branchId: formData.get("branchId"), items }) }), "ส่งรายการเบิกอาหารให้ห้องผลิตแล้ว");
}

async function handleDispatchCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  const items = [...form.querySelectorAll("[data-dispatch-qty]")]
    .map((input) => ({ productId: input.dataset.dispatchProduct, actualQty: Number(input.value) }))
    .filter((item) => Number.isFinite(item.actualQty) && item.actualQty > 0);
  if (!items.length) {
    toast("กรุณากรอกจำนวนอย่างน้อย 1 รายการ");
    return;
  }
  payload.items = items;
  await run(() => api("/api/kitchen-dispatches", { method: "POST", body: JSON.stringify(payload) }), `บันทึกของที่ส่งเพิ่มแล้ว ${items.length} รายการ`);
}

function updateDispatchSummary(root) {
  const inputs = [...root.querySelectorAll("[data-dispatch-qty]")];
  const selected = inputs.filter((input) => Number(input.value) > 0);
  const totalCost = selected.reduce((sum, input) => sum + Number(input.value || 0) * Number(input.dataset.dispatchCost || 0), 0);
  const countNode = root.querySelector("[data-dispatch-count]");
  const totalNode = root.querySelector("[data-dispatch-total]");
  if (countNode) countNode.textContent = selected.length;
  if (totalNode) totalNode.textContent = money(totalCost);
}

async function handleStockIn(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
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
  await run(() => api("/api/reorder-point", { method: "PATCH", body: JSON.stringify(payload) }), "บันทึกจุดสั่งซื้อและสต็อกเป้าหมายแล้ว");
}

async function saveWarehousePolicy(button) {
  const row = button.closest("tr");
  const payload = {
    branchId: button.dataset.policyBranch,
    productId: button.dataset.policyProduct,
    stockOwnerType: "GRAND_SUPPLIED",
    reorderPoint: row?.querySelector("[data-policy-reorder]")?.value || 0,
    targetStock: row?.querySelector("[data-policy-target]")?.value || 0,
    eoq: row?.querySelector("[data-policy-eoq]")?.value || 0
  };
  await run(() => api("/api/reorder-point", { method: "PATCH", body: JSON.stringify(payload) }), "บันทึกจุดสั่งซื้อและสต็อกเป้าหมายแล้ว");
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

async function saveFoodProduction(button) {
  const card = button.closest("[data-card]");
  const items = [...card.querySelectorAll("[data-delivered-product]")].map((input) => ({
    productId: input.dataset.deliveredProduct,
    deliveredQty: Number(input.value)
  }));
  await run(
    () => api(`/api/food-requests/${button.dataset.saveFoodProduction}/production`, {
      method: "PATCH",
      body: JSON.stringify({ productionRoom: button.dataset.productionRoom, items })
    }),
    `บันทึกจำนวนผลิตห้อง${button.dataset.productionRoom}แล้ว`
  );
}

async function shipFoodRequest(button) {
  const card = button.closest("[data-card]");
  const items = [...card.querySelectorAll("[data-delivered-product]")].map((input) => ({
    productId: input.dataset.deliveredProduct,
    deliveredQty: Number(input.value)
  }));
  await run(
    () => api(`/api/food-requests/${button.dataset.shipFoodRequest}/advance`, { method: "PATCH", body: JSON.stringify({ items }) }),
    `บันทึกส่งออก ${button.dataset.shipFoodRequest} แล้ว`
  );
}

async function confirmFoodReceived(id) {
  await run(() => api(`/api/food-requests/${id}/advance`, { method: "PATCH", body: JSON.stringify({}) }), "ยืนยันได้รับของแล้ว");
}

async function confirmDispatchReceived(id) {
  await run(() => api(`/api/kitchen-dispatches/${id}`, { method: "PATCH", body: JSON.stringify({ status: "BRANCH_RECEIVED", dispatchTime: currentTime() }) }), "ยืนยันรับของจากห้องผลิตแล้ว");
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
    standardCost: Number(row.querySelector("[data-price-cost]")?.value || 0),
    sellingPrice: Number(row.querySelector("[data-price-selling]")?.value || 0)
  };
  await run(() => api(`/api/products/${kind}/${productId}/pricing`, { method: "PATCH", body: JSON.stringify(payload) }), "บันทึกราคาแล้ว");
}

function openInventoryProductEditor(button, root) {
  const dialog = root.querySelector("#inventoryProductEditDialog");
  const form = root.querySelector("#inventoryProductEditForm");
  if (!dialog || !form) return;
  form.dataset.productId = button.dataset.editStockProduct || "";
  form.elements.productName.value = button.dataset.stockProductName || "";
  form.elements.category.value = button.dataset.stockProductCategory || "";
  form.elements.unit.value = button.dataset.stockProductUnit || "";
  form.elements.standardCost.value = button.dataset.stockProductCost || "0";
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
  form.elements.productName.focus();
}

async function handleInventoryProductEdit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const productId = form.dataset.productId;
  if (!productId) return;
  const payload = Object.fromEntries(new FormData(form).entries());
  await run(
    () => api(`/api/products/material/${encodeURIComponent(productId)}/pricing`, { method: "PATCH", body: JSON.stringify(payload) }),
    "บันทึกข้อมูลสินค้าแล้ว"
  );
}

async function handleProductCreate(event, kind) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
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
    await loadData();
    toast(successMessage);
  } catch (error) {
    toast(error.message);
  }
}

function materialRequestCard(request) {
  const source = materialRequestSource(request.sourceType);
  const canEdit = canOffice() && ["CREATED", "OFFICE_RECEIVED"].includes(request.status);
  const canAdvance = canOffice() && ["CREATED", "OFFICE_RECEIVED"].includes(request.status);
  const notEnoughItems = request.items.filter((item) => {
    const stock = stockFor(request.branchId, item.productId, request.sourceType);
    return stock && Number(item.actualIssuedQty) > Number(stock.quantity);
  });
  return `
    <article class="request-card" data-card="${request.id}">
      <div class="card-head">
        <div>
          <h3>${request.branchName}</h3>
          <p class="muted">เลขรายการ ${request.id} · ส่งคำขอ ${dateTime(request.createdAt)}</p>
        </div>
        <div class="request-card-statuses">
          <span class="pill ${statusPillClass(request.status)}">${requestStatusLabel("office", request.status)}</span>
          ${notEnoughItems.length ? `<span class="pill warning">${notEnoughItems.length} รายการไม่พอ</span>` : ""}
        </div>
      </div>
      ${materialStepper(request.status)}
      ${simpleTable(["สินค้า", "ขอเบิก", "จัดจริง", "คงเหลือคลังกลาง", "ต้นทุน"], request.items.map((item) => {
        const stock = stockFor(request.branchId, item.productId, request.sourceType);
        const shortage = stock && Number(item.actualIssuedQty) > Number(stock.quantity);
        const row = [
        `${item.productName}<br><span class="muted">${item.category}</span>`,
        qty(item.requestedQty, item.unit),
        canEdit ? `<input data-actual-product="${item.productId}" type="number" min="0" step="0.01" value="${item.actualIssuedQty}">` : qty(item.actualIssuedQty, item.unit),
        `<span class="${shortage ? "text-warning" : ""}">${stock ? qty(stock.quantity, item.unit) : "-"}</span>`
        ];
        return [...row, money(item.totalCost)];
      }))}
      <div class="row-between" style="margin-top:12px"><div><strong>ต้นทุนสาขา ${money(request.totalCost)}</strong><small class="request-source-note">${source.detail}</small></div>${canAdvance ? `<button class="primary" data-advance-material="${request.id}">${nextMaterialAction(request.status)}</button>` : `<span class="pill">${request.status === "COMPLETED" ? "เสร็จสิ้น" : "ดูข้อมูล"}</span>`}</div>
    </article>
  `;
}

function foodRequestCard(request, priority = 0, inBatch = false, options = {}) {
  const canEdit = canKitchen() && request.status === "CREATED";
  const canConfirmReceived = canBranchFor(request.branchId) && request.status === "SHIPPED";
  const productionOnly = options.productionOnly === true;
  const quantityHeading = foodQuantityLabel(request.status);
  const action = productionOnly
    ? (canEdit
      ? `<button class="primary" data-save-food-production="${request.id}" data-production-room="${escapeAttr(options.productionRoom || "")}">บันทึกจำนวนผลิต</button>`
      : `<span class="pill">${request.status === "COMPLETED" ? "เสร็จสิ้น" : "ดูข้อมูล"}</span>`)
    : inBatch
      ? (options.individualSend
        ? `<button class="primary success" data-ship-food-request="${escapeAttr(request.id)}">ยืนยันส่งออก</button>`
        : `<span class="pill neutral">อยู่ในรอบจัดส่ง</span>`)
      : foodActionButton(request, canEdit, canConfirmReceived);
  return `
    <article class="request-card" data-card="${request.id}">
      <div class="card-head">
        <div>
          ${productionOnly ? "" : `<p class="eyebrow">${priority ? `คิวที่ ${priority}` : "คิวผลิต"}</p>`}
          <h3>${request.branchName}</h3>
          <p class="muted">${request.id} · ${dateTime(request.createdAt)}</p>
        </div>
        <span class="pill ${statusPillClass(request.status)}">${requestStatusLabel("kitchen", request.status)}</span>
      </div>
      ${foodStepper(request.status)}
      ${simpleTable(["เมนู", "ขอเบิก", quantityHeading, "ต้นทุน"], request.items.map((item) => [
        `${item.productName}${inBatch ? "" : `<br>${productionRoomBadge(item.productionRoom)}`}`,
        qty(item.requestedQty, item.unit),
        canEdit ? `<input data-delivered-product="${item.productId}" type="number" min="0" step="0.01" value="${item.deliveredQty}">` : qty(item.deliveredQty, item.unit),
        money(item.totalCost)
      ]))}
      <div class="row-between" style="margin-top:12px"><strong>ต้นทุนรวม ${money(request.totalCost)}</strong>${action}</div>
    </article>
  `;
}

function branchFoodRequestStatusCard(request) {
  const canConfirmReceived = canBranchFor(request.branchId) && request.status === "SHIPPED";
  return `
    <article class="status-card" data-card="${request.id}">
      <div class="card-head">
        <div>
          <p class="eyebrow">อาหารสำเร็จรูป</p>
          <h3>${request.id}</h3>
          <p class="muted">ส่งคำขอ ${dateTime(request.createdAt)}</p>
        </div>
        <span class="pill ${statusPillClass(request.status)}">${requestStatusLabel("kitchen", request.status)}</span>
      </div>
      ${foodStepper(request.status)}
      ${trackingItemList(request.items, "deliveredQty")}
      <div class="row-between">
        <span class="muted">${request.timeline?.length ? `อัปเดตล่าสุด ${dateTime(request.timeline.at(-1).at)}` : ""}</span>
        ${canConfirmReceived ? `<button class="primary red" data-confirm-food-received="${request.id}">ได้รับของแล้ว</button>` : ""}
      </div>
    </article>
  `;
}

function branchOfficeStatusCard(request) {
  const source = materialRequestSource(request.sourceType);
  const canConfirmReceived = canBranchFor(request.branchId) && request.status === "SHIPPED";
  return `
    <article class="status-card" data-card="${request.id}">
      <div class="card-head">
        <div>
          <p class="eyebrow">${source.label}</p>
          <h3>${request.id}</h3>
          <p class="muted">ส่งคำขอ ${dateTime(request.createdAt)}</p>
        </div>
        <span class="pill ${statusPillClass(request.status)}">${requestStatusLabel("office", request.status)}</span>
      </div>
      ${materialStepper(request.status)}
      ${trackingItemList(request.items, "actualIssuedQty")}
      <div class="row-between">
        <span class="muted">${request.timeline?.length ? `อัปเดตล่าสุด ${dateTime(request.timeline.at(-1).at)}` : `ต้นทุนตามยอดส่งจริง ${money(request.totalCost)}`}</span>
        ${canConfirmReceived ? `<button class="primary red" data-advance-material="${request.id}">ได้รับของแล้ว</button>` : ""}
      </div>
    </article>
  `;
}

function dispatchStatusCard(dispatch) {
  const canConfirmReceived = canBranchFor(dispatch.branchId) && dispatch.status === "SHIPPED";
  const officeContext = state.view === "office";
  return `
    <article class="status-card dispatch-status-card" data-card="${dispatch.id}">
      <div class="card-head">
        <div>
          ${officeContext ? "" : `<p class="eyebrow">ส่งเพิ่มจากห้องผลิต</p>`}
          <h3>${dispatch.branchName}</h3>
          <p class="muted">${dispatch.id} · ส่งเมื่อ ${dispatch.dispatchDate} ${dispatch.dispatchTime || ""}</p>
        </div>
        <span class="pill ${statusPillClass(dispatch.status)}">${requestStatusLabel("kitchen", dispatch.status)}</span>
      </div>
      ${foodStepper(dispatch.status)}
      ${trackingItemList([dispatch], "actualQty")}
      <div class="row-between">
        <span class="muted">ต้นทุน ${money(dispatch.totalCost)}</span>
        ${canConfirmReceived ? `<div class="form-actions"><button class="primary red" data-confirm-dispatch-received="${dispatch.id}">ได้รับของแล้ว</button></div>` : ""}
      </div>
    </article>
  `;
}

function inventoryOptionManager() {
  const options = state.data?.inventoryOptions || {};
  const groups = [
    { kind: "supplier", label: "แหล่งซื้อ", values: state.data?.suppliers || [], getId: (item) => item.id, getName: (item) => item.name },
    { kind: "category", label: "หมวดหมู่", values: options.materialCategories || [], getId: (item) => item, getName: (item) => item },
    { kind: "unit", label: "หน่วย", values: options.units || [], getId: (item) => item, getName: (item) => item }
  ];
  return `
    <section class="panel inventory-option-manager" id="inventoryOptionManager" aria-labelledby="inventory-option-manager-title">
      <div class="row-between inventory-option-manager-heading">
        <div>
          <p class="eyebrow">รายการอ้างอิง</p>
          <h2 id="inventory-option-manager-title">ตัวเลือกที่ใช้ในฟอร์มรับเข้า</h2>
        </div>
        <span class="pill">เพิ่มหรือแก้ไขได้</span>
      </div>
      <div class="inventory-option-grid">
        ${groups.map((group) => `
          <article class="inventory-option-card" data-inventory-option-kind="${group.kind}">
            <div class="row-between"><h3>${group.label}</h3><span class="pill">${group.values.length}</span></div>
            <div class="inventory-option-list">
              ${group.values.length ? group.values.map((item) => inventoryOptionRow(group.kind, group.getId(item), group.getName(item))).join("") : empty("ยังไม่มีรายการ")}
            </div>
            <form class="inventory-option-add" data-add-inventory-option="${group.kind}" novalidate>
              <input name="value" maxlength="80" placeholder="เพิ่ม${group.label}" aria-label="เพิ่ม${group.label}">
              <button class="secondary" type="submit">เพิ่ม</button>
            </form>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function inventoryOptionRow(kind, id, name) {
  return `<div class="inventory-option-row" data-inventory-option-row data-option-kind="${kind}" data-option-id="${escapeAttr(id)}" data-option-value="${escapeAttr(name)}"><span>${escapeHtml(name)}</span><button type="button" class="secondary" data-edit-inventory-option>แก้ไข</button></div>`;
}

function trackingItemList(items, quantityKey) {
  const visibleItems = (items || []).filter(Boolean);
  if (!visibleItems.length) return "";
  return `
    <div class="tracking-item-list" aria-label="รายการสินค้า">
      ${visibleItems.map((item) => `
        <div class="tracking-item-row">
          <div><strong>${item.productName}</strong>${item.category ? `<small>${item.category}</small>` : ""}</div>
          <span>${qty(item[quantityKey], item.unit)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function lowStockCard(item) {
  const currentQty = Number(item.quantity || 0);
  const targetStock = Number(item.targetStock ?? item.reserveTarget ?? 0);
  const reorderPoint = Number(item.reorderPoint || 0);
  // Use the configured target when available. If no target is configured,
  // show the minimum quantity needed to get back above ROP instead of hiding
  // the action behind a cost/value calculation.
  const eoq = Number(item.eoq || 0);
  const suggested = targetStock > 0
    ? Math.max(eoq, Math.max(0, targetStock - currentQty))
    : Math.max(eoq, Math.max(0, reorderPoint - currentQty));
  const purchaseLabel = suggested > 0 ? qty(suggested, item.unit) : "ตั้งเป้าหมายก่อน";
  const purchaseMode = eoq > 0 ? `จำนวนตาม EOQ ${qty(eoq, item.unit)}` : targetStock > 0 ? "จำนวนที่ควรเติม" : "เติมให้พ้น ROP";
  const reasons = [
    currentQty <= 0 ? "สินค้าหมด · เบิกไม่ได้" : "",
    item.isLow && reorderPoint > 0 ? `ถึง ROP ${qty(reorderPoint, item.unit)}` : "",
    targetStock > 0 ? `สต็อกเป้าหมาย ${qty(targetStock, item.unit)}` : ""
  ].filter(Boolean);
  return `
    <details class="low-stock-card ${currentQty <= 0 ? "is-out-of-stock" : ""}">
      <summary>
        <span class="warning-icon">!</span>
        <span class="low-stock-summary-text"><span class="low-stock-kicker">ต้องเติมคลังกลาง</span><strong>${item.productName}</strong><small>เหลือ ${qty(currentQty, item.unit)} · คลังกลาง Grand House</small><small class="low-stock-hint">แตะเพื่อดูรายละเอียด</small></span>
        <span class="low-stock-purchase"><b>${purchaseLabel}</b><small>${purchaseMode}</small></span>
      </summary>
      <div class="low-stock-details">
        <div class="low-stock-detail-grid"><div><span>คงเหลือปัจจุบัน</span><strong>${qty(currentQty, item.unit)}</strong></div>${targetStock > 0 ? `<div><span>Target Stock</span><strong>${qty(targetStock, item.unit)}</strong></div>` : ""}${reorderPoint > 0 ? `<div><span>ROP</span><strong>${qty(reorderPoint, item.unit)}</strong></div>` : ""}${eoq > 0 ? `<div><span>EOQ</span><strong>${qty(eoq, item.unit)}</strong></div>` : ""}</div>
        <p><strong>เหตุผล:</strong> ${reasons.join(" · ") || "ต่ำกว่าระดับที่กำหนด"}</p>
      </div>
    </details>
  `;
}

function productionRoomBadge(roomName) {
  const room = productionRooms.find((item) => item.name === roomName) || productionRooms[0];
  return `<span class="production-room-badge room-${room.tone}"><i></i>${room.name}</span>`;
}

function branchStockRow(item) {
  const targetStock = Number(item.targetStock ?? item.reserveTarget ?? 0);
  return `
    <article class="branch-stock-item ${item.isLow ? "is-low" : ""}">
      <div>
        <strong>${item.productName}</strong>
        <small>${item.category} · ${reorderLabel(item)}${targetStock ? ` · เป้าหมาย ${qty(targetStock, item.unit)}` : ""}</small>
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
  return requestStepper(currentStatus, "kitchen");
}

function foodQuantityLabel(statusValue) {
  return ["SHIPPED", "BRANCH_RECEIVED", "COMPLETED"].includes(statusValue) ? "ส่งจริง" : "จัดเตรียมแล้ว";
}

function materialStepper(currentStatus) {
  return requestStepper(currentStatus, "office");
}

function requestStepper(currentStatus, route) {
  const steps = [
    ["CREATED", route === "kitchen" ? "รอจัดส่ง" : "ส่งคำขอ"],
    ["SHIPPED", route === "kitchen" ? "ส่งออกแล้ว" : "จัดของเสร็จ"],
    ["BRANCH_RECEIVED", "สาขารับแล้ว"]
  ];
  const normalizedStatus = ["OFFICE_RECEIVED", "PREPARING", "READY"].includes(currentStatus) ? "CREATED" : currentStatus;
  const currentIndex = Math.max(0, steps.findIndex(([statusValue]) => statusValue === normalizedStatus));
  const normalizedIndex = ["COMPLETED", "BRANCH_RECEIVED"].includes(currentStatus) ? steps.length - 1 : currentIndex;
  return `
    <div class="progress-line progress-line--three" data-request-route="${route}">
      ${steps.map(([statusValue, label], index) => `
        <div class="progress-step progress-step--${progressStepTone(statusValue)} ${index < normalizedIndex ? "done" : ""} ${index === normalizedIndex ? "active" : ""}">
          <span>${index < normalizedIndex ? "✓" : index + 1}</span>
          <small>${label}</small>
        </div>
      `).join("")}
    </div>
  `;
}

function inventoryTable(rows, options = {}) {
  const editable = options.editable === true;
  return simpleTable(
    ["รายการ", "คงเหลือ", "จุดสั่งซื้อ", "สต็อกเป้าหมาย", "ต้นทุนเฉลี่ย", "มูลค่า", "สถานะ", ...(editable ? [""] : [])],
    rows.map((item) => {
      const product = state.data.materialProducts.find((entry) => entry.id === item.productId) || {};
      const editButton = editable
        ? `<button type="button" class="icon-button inventory-edit-button" data-edit-stock-product="${escapeAttr(item.productId)}" data-stock-product-name="${escapeAttr(item.productName || product.name || "")}" data-stock-product-category="${escapeAttr(item.category || product.category || "")}" data-stock-product-unit="${escapeAttr(item.unit || product.unit || "")}" data-stock-product-cost="${escapeAttr(String(product.standardCost ?? item.standardCost ?? 0))}" aria-label="แก้ไข ${escapeAttr(item.productName || product.name || "สินค้า")}" title="แก้ไขสินค้า">✎</button>`
        : "";
      return [
      `<div class="inventory-item-details"><strong>${item.productName}</strong><small>หมวดหมู่: ${item.category || "-"}</small><small>หน่วย: ${item.unit || "-"}</small></div>`,
      qty(item.quantity, item.unit),
      reorderLabel(item),
      Number(item.targetStock ?? item.reserveTarget ?? 0) > 0 ? qty(item.targetStock ?? item.reserveTarget, item.unit) : "ยังไม่ตั้ง",
      money(item.averageCost ?? item.standardCost),
      money(item.inventoryValue),
      inventoryAvailability(item),
      ...(editable ? [editButton] : [])
      ];
    })
  );
}

function inventoryProductEditDialog() {
  return `
    <dialog class="inventory-product-edit-dialog" id="inventoryProductEditDialog" aria-labelledby="inventory-product-edit-title" aria-describedby="inventory-product-edit-description">
      <form id="inventoryProductEditForm" class="inventory-product-edit-form" method="dialog" novalidate>
        <div class="row-between inventory-product-edit-heading">
          <div>
            <p class="eyebrow">สต็อกปัจจุบัน</p>
            <h2 id="inventory-product-edit-title">แก้ไขข้อมูลสินค้า</h2>
          </div>
          <button type="button" class="icon-button" data-close-inventory-product-edit aria-label="ปิดหน้าต่าง">×</button>
        </div>
        <p class="muted" id="inventory-product-edit-description">แก้ไขชื่อ หน่วย หรือต้นทุนมาตรฐานของสินค้านี้</p>
        <input type="hidden" name="category">
        <label class="field"><span>ชื่อสินค้า</span><input name="productName" required autocomplete="off"></label>
        <div class="form-grid two">
          <label class="field"><span>หน่วย</span>${unitSelect("unit", "ชิ้น")}</label>
          <label class="field"><span>ต้นทุนมาตรฐาน</span><input name="standardCost" type="number" min="0" step="0.01" required></label>
        </div>
        <div class="form-actions">
          <button type="button" class="secondary" data-close-inventory-product-edit>ยกเลิก</button>
          <button type="submit" class="primary">บันทึกการแก้ไข</button>
        </div>
      </form>
    </dialog>
  `;
}

function foodCatalogTable(rows) {
  return simpleTable(
    ["เมนู", "หมวดหมู่", "ห้องผลิต", "หน่วย", "ต้นทุนต่อหน่วย", "ราคาขาย", "ส่วนต่างเบื้องต้น"],
    rows.slice().sort((a, b) => a.name.localeCompare(b.name, "th")).map((item) => [
      `<div class="inventory-item-details"><strong>${item.name}</strong><small>อาหารสำเร็จรูป</small></div>`,
      item.category || "-",
      item.productionRoom || "ยังไม่กำหนด",
      item.unit || "-",
      money(item.standardCost),
      money(item.sellingPrice),
      money(Number(item.sellingPrice || 0) - Number(item.standardCost || 0))
    ])
  );
}

function inventoryAvailability(item) {
  const reorderPoint = Number(item.reorderPoint || 0);
  const quantity = Number(item.quantity || 0);
  if (quantity <= 0) {
    return `<span class="pill danger">เบิกไม่ได้ <small>(สินค้าหมด)</small></span>`;
  }
  if (item.needsRestock) {
    const targetStock = Number(item.targetStock ?? item.reserveTarget ?? 0);
    const suggested = Number(item.suggestedPurchaseQty ?? Math.max(0, targetStock - quantity));
    return `<span class="pill warning">เบิกได้ <small>· ต้องซื้อเพิ่ม${suggested > 0 ? ` ${qty(suggested, item.unit)}` : ""}</small></span>`;
  }
  const isNearReorder = reorderPoint > 0 && quantity <= reorderPoint * 1.25;
  return isNearReorder
    ? `<span class="pill warning">เบิกได้ <small>· ต้องซื้อเพิ่ม</small></span>`
    : `<span class="pill">เบิกได้</span>`;
}

function transactionTable(rows, options = {}) {
  if (options.historyMode) {
    return simpleTable(
      ["วันเวลา", "ประเภท", "สินค้า", "ปลายทาง", "คงเหลือก่อนรายการ", "จำนวนรับเข้า / เบิกออก", "คงเหลือหลังรายการ", "เลขอ้างอิง", "รายละเอียด"],
      rows.map((txn) => warehouseHistoryTableRow(txn))
    );
  }
  return simpleTable(
    ["วันเวลา", "เจ้าของ", "ปลายทาง", "สินค้า", "ประเภท", "อ้างอิง", "ก่อนหน้า", "เปลี่ยนแปลง", "คงเหลือ", "มูลค่า", "ผู้บันทึก"],
    rows.map((txn) => {
      const ownerBranch = state.data.branches.find((item) => item.id === txn.stockOwnerBranchId);
      const destination = state.data.branches.find((item) => item.id === (txn.destinationBranchId || txn.branchId));
      const product = state.data.materialProducts.find((item) => item.id === txn.productId);
      const ownerProfile = (state.data.stockOwners || []).find((owner) => owner.id === txn.stockOwnerBranchId);
      const ownerLabel = txn.stockOwnerType === "BRANCH_OWNED"
        ? stockOwnerShortLabel(ownerProfile || { id: txn.stockOwnerBranchId, name: ownerBranch?.name })
        : "แกรนด์";
      return [dateTime(txn.dateTime), ownerLabel, destination?.name || "คลังออฟฟิศ", product?.name || txn.productId, status(txn.type), txn.referenceNumber, txn.previousQuantity, signed(txn.quantityChanged), txn.currentQuantity, txn.totalValue == null ? "—" : money(txn.totalValue), txn.createdBy];
    })
  );
}

function warehouseHistoryTypeMeta(type) {
  if (["PURCHASE", "BRANCH_DEPOSIT"].includes(type)) {
    return { group: "receive", label: "รับเข้า", detail: status(type), icon: "↑" };
  }
  if (type === "ADJUSTMENT") {
    return { group: "adjustment", label: "ปรับยอด", detail: status(type), icon: "↕" };
  }
  return { group: "issue", label: "เบิกออก", detail: status(type), icon: "↓" };
}

function signedQuantity(value, unit = "") {
  const amount = Number(value || 0);
  if (amount > 0) return `+${qty(amount, unit)}`;
  if (amount < 0) return `−${qty(Math.abs(amount), unit)}`;
  return qty(0, unit);
}

function warehouseHistoryTableRow(txn) {
  const destination = state.data.branches.find((item) => item.id === (txn.destinationBranchId || txn.branchId));
  const product = state.data.materialProducts.find((item) => item.id === txn.productId);
  const unit = product?.unit || "หน่วย";
  const typeMeta = warehouseHistoryTypeMeta(txn.type);
  const changed = Number(txn.quantityChanged || 0);
  const quantityTone = changed > 0 ? "is-in" : changed < 0 ? "is-out" : "is-neutral";
  const typeCell = `<span class="warehouse-history-kind ${quantityTone === "is-neutral" ? "is-adjustment" : `is-${typeMeta.group === "receive" ? "in" : typeMeta.group === "issue" ? "out" : "adjustment"}`}" aria-label="${escapeAttr(`${typeMeta.label} ${typeMeta.detail}`)}"><span class="warehouse-history-kind-icon" aria-hidden="true">${typeMeta.icon}</span><span><strong>${escapeHtml(typeMeta.label)}</strong><small>${escapeHtml(typeMeta.detail)}</small></span></span>`;
  const quantityCell = `<span class="warehouse-history-quantity ${quantityTone}">${escapeHtml(signedQuantity(changed, unit))}</span>`;
  const detailCell = `<details class="warehouse-history-detail"><summary>ดูรายละเอียด</summary><div class="warehouse-history-detail-body"><div><span>ต้นทุนต่อหน่วย</span><strong>${txn.unitCost == null ? "ไม่คิดต้นทุน" : money(txn.unitCost)}</strong></div><div><span>มูลค่ารายการ</span><strong>${txn.totalValue == null ? "—" : money(txn.totalValue)}</strong></div><div><span>ผู้บันทึก</span><strong>${escapeHtml(txn.createdBy || "—")}</strong></div>${txn.remarks ? `<div><span>หมายเหตุ</span><strong>${escapeHtml(txn.remarks)}</strong></div>` : ""}</div></details>`;
  return [
    dateTime(txn.dateTime),
    typeCell,
    escapeHtml(product?.name || txn.productId),
    escapeHtml(destination?.name || "คลังกลาง Grand House"),
    escapeHtml(qty(txn.previousQuantity, unit)),
    quantityCell,
    escapeHtml(qty(txn.currentQuantity, unit)),
    escapeHtml(txn.referenceNumber || "—"),
    detailCell
  ];
}

function summarizeTransactionQuantity(rows) {
  const totals = rows.reduce((result, txn) => {
    const product = state.data.materialProducts.find((item) => item.id === txn.productId);
    const unit = product?.unit || "หน่วย";
    result[unit] = (result[unit] || 0) + Math.abs(Number(txn.quantityChanged || 0));
    return result;
  }, {});
  const labels = Object.entries(totals).map(([unit, value]) => qty(value, unit));
  return labels.length ? labels.join(" · ") : "0 หน่วย";
}

function dispatchTable(rows) {
  const canUpdate = canKitchen();
  return simpleTable(
    ["วันเวลา", "สาขา", "เมนู", "ห้องผลิต", "จำนวนส่ง", "ต้นทุน", "สถานะ", "อัปเดต", ""],
    rows.map((dispatch) => [
      `${dispatch.dispatchDate}<br><span class="muted">${dispatch.dispatchTime || ""}</span>`,
      dispatch.branchName,
      dispatch.productName,
      productionRoomBadge(dispatch.productionRoom),
      canUpdate ? `<input data-dispatch-actual="${dispatch.id}" type="number" min="0" step="0.01" value="${dispatch.actualQty}">` : qty(dispatch.actualQty, dispatch.unit),
      money(dispatch.totalCost),
      status(dispatch.status),
      dispatch.updatedAt ? dateTime(dispatch.updatedAt) : "",
      canUpdate ? `<button class="secondary" data-dispatch-status="${dispatch.id}" data-dispatch-next="SHIPPED">บันทึกว่าส่งแล้ว</button>` : ""
    ])
  );
}

function kitchenHistoryTable(rows) {
  if (!rows.length) return empty("ยังไม่มีประวัติการส่ง");
  return simpleTable(
    ["เลขรายการ", "ประเภท", "สาขา", "สินค้า", "จำนวน", "ต้นทุน", "สถานะ", "อัปเดต"],
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
        isDispatch ? "ส่งเพิ่ม" : "",
        item.branchName,
        itemText,
        quantityText,
        money(item.totalCost),
        status(item.status),
        item.updatedAt ? dateTime(item.updatedAt) : item.timeline?.length ? dateTime(item.timeline.at(-1).at) : ""
      ];
    })
  );
}

function priceTable(kind, products) {
  if (kind === "material") {
    return simpleTable(
      ["สินค้า", "หมวดหมู่", "หน่วย", "ต้นทุน", ""],
      products.map((product) => [
        product.name,
        `<input data-price-category value="${escapeAttr(product.category || "")}">`,
        unitSelect("", product.unit || "ชิ้น", "data-price-unit"),
        `<input data-price-cost type="number" min="0" step="0.01" value="${product.standardCost}">`,
        `<button class="primary" data-price-kind="${kind}" data-price-product="${product.id}">บันทึก</button>`
      ])
    );
  }

  return simpleTable(
    ["เมนู", "ประเภท", "หน่วย", "ต้นทุน/หน่วย", "ราคาขายจริง", ""],
    products.map((product) => [
        product.name,
      product.category,
      product.unit,
      `<input data-price-cost type="number" min="0" step="0.01" value="${product.standardCost || 0}">`,
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
        <thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead>
        <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  `;
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function warehouseStatCard(label, value, detail, icon, tone = "value") {
  return `<article class="warehouse-stat-card ${tone}"><span class="warehouse-stat-icon" aria-hidden="true">${icon}</span><div class="warehouse-stat-copy"><span class="warehouse-stat-label">${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ""}</div></article>`;
}

function warehouseCategoryPie(rows) {
  const hasCost = rows.some((row) => Number(row.inventoryValue || 0) > 0);
  const totals = rows.reduce((result, row) => {
    const category = row.category || "อื่นๆ";
    const value = hasCost ? Number(row.inventoryValue || 0) : Number(row.quantity || 0);
    result[category] = (result[category] || 0) + value;
    return result;
  }, {});
  const entries = Object.entries(totals).filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const colors = ["#aebcf0", "#b9dfc9", "#f4d58d", "#e4c3df", "#f2b5ac", "#b7dce6"];
  const hasData = entries.length > 0 && total > 0;
  const displayEntries = hasData ? entries : materialCategoryOptions().map(([category]) => [category, 0]);
  const center = 120;
  const outerRadius = 94;
  const innerRadius = 53;
  const point = (angle, radius, offsetY = 0) => {
    const radians = (angle - 90) * Math.PI / 180;
    return {
      x: center + radius * Math.cos(radians),
      y: center + radius * Math.sin(radians) + offsetY
    };
  };
  const donutPath = (startAngle, endAngle, offsetY = 0) => {
    const safeEnd = endAngle - startAngle >= 359.99 ? endAngle - 0.01 : endAngle;
    const outerStart = point(startAngle, outerRadius, offsetY);
    const outerEnd = point(safeEnd, outerRadius, offsetY);
    const innerEnd = point(safeEnd, innerRadius, offsetY);
    const innerStart = point(startAngle, innerRadius, offsetY);
    const largeArc = safeEnd - startAngle > 180 ? 1 : 0;
    return `M ${outerStart.x.toFixed(2)} ${outerStart.y.toFixed(2)} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x.toFixed(2)} ${outerEnd.y.toFixed(2)} L ${innerEnd.x.toFixed(2)} ${innerEnd.y.toFixed(2)} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x.toFixed(2)} ${innerStart.y.toFixed(2)} Z`;
  };
  let cursor = 0;
  const segments = displayEntries.map(([category, value], index) => {
    const start = cursor;
    cursor += hasData ? (value / total) * 360 : 0;
    const color = colors[index % colors.length];
    const categoryValue = hasCost ? money(value) : qty(value, "หน่วย");
    const share = hasData ? percent((value / total) * 100) : percent(0);
    const midAngle = (start + cursor) / 2;
    const radians = (midAngle - 90) * Math.PI / 180;
    const label = `${category} ${categoryValue}`;
    return {
      category,
      value,
      color,
      index,
      start,
      end: cursor,
      label,
      categoryValue,
      share,
      popX: (Math.cos(radians) * 9).toFixed(2),
      popY: (Math.sin(radians) * 9).toFixed(2),
      path: donutPath(start, cursor),
      depthPath: donutPath(start, cursor, 9)
    };
  });
  const segmentMarkup = hasData
    ? segments.map((segment) => `<g class="warehouse-pie-segment" data-category-pie-segment="${segment.index}" data-category-pie-name="${escapeAttr(segment.category)}" data-category-pie-value="${escapeAttr(segment.categoryValue || segment.label)}" data-category-pie-share="${escapeAttr(segment.share)}" style="--pie-pop-x:${segment.popX}px;--pie-pop-y:${segment.popY}px" tabindex="0" role="button" aria-label="${escapeAttr(segment.label)}"><path class="warehouse-pie-depth" d="${segment.depthPath}" fill="${segment.color}" aria-hidden="true"></path><path class="warehouse-pie-surface" d="${segment.path}" fill="${segment.color}"></path></g>`).join("")
    : `<path class="warehouse-pie-empty-depth" d="${donutPath(0, 360, 9)}" aria-hidden="true"></path><path class="warehouse-pie-empty-ring" d="${donutPath(0, 360)}" aria-hidden="true"></path>`;
  const emptyState = hasData ? "" : `<div class="warehouse-category-pie-empty-state" aria-label="ยังไม่มีข้อมูล"><strong>0</strong><span>ไม่มีข้อมูล</span></div>`;
  return `
    <div class="warehouse-category-chart">
      <div class="warehouse-category-pie" aria-label="${hasData ? "สัดส่วนตามหมวดหมู่" : "สัดส่วนตามหมวดหมู่ ยังไม่มีข้อมูล"}">
        <svg viewBox="0 0 240 240" role="img" aria-label="กราฟสัดส่วนตามหมวดหมู่" focusable="false">${segmentMarkup}</svg>
        ${emptyState}
      </div>
      <div class="warehouse-category-pie-tooltip" data-category-pie-tooltip role="status" aria-live="polite" aria-hidden="true"><strong data-category-pie-tooltip-name></strong><span data-category-pie-tooltip-value></span><small data-category-pie-tooltip-share></small></div>
      <div class="warehouse-category-legend" aria-label="สัดส่วนตามหมวดหมู่">${segments.map((segment) => `<div class="warehouse-category-legend-row" data-category-pie-legend="${segment.index}" data-category-pie-name="${escapeAttr(segment.category)}" data-category-pie-value="${escapeAttr(hasCost ? money(segment.value) : qty(segment.value, "หน่วย"))}" data-category-pie-share="${escapeAttr(segment.share)}" tabindex="0" style="--dot-color:${segment.color}"><span class="warehouse-category-dot"></span><div><strong>${segment.category}</strong><small>${segment.share} ของ${hasCost ? "มูลค่าคลัง" : "จำนวนคงเหลือ"}</small></div><b>${hasCost ? money(segment.value) : qty(segment.value, "หน่วย")}</b></div>`).join("")}</div>
    </div>
  `;
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
  const hasActive = group.items.some((item) => menuItemIsActive(item));
  const isOpen = group.open === true || hasActive || group.items.length <= 1;
  return `
    <details class="role-menu-group" ${isOpen ? "open" : ""}>
      <summary>${group.title}</summary>
      ${roleMenuItems(group.items)}
    </details>
  `;
}

function roleMenuItems(items) {
  return `
    <div class="role-menu-items">
      ${items.map((item) => {
        const [scope, value, label, forceScope, forceValue, badge, targetView] = item;
        const isActive = menuItemIsActive(item);
        return `
          <button type="button" class="${isActive ? "active" : ""}" data-tab-scope="${scope}" data-tab-value="${value}" ${targetView ? `data-view-target="${targetView}"` : ""} ${forceScope ? `data-force-tab-scope="${forceScope}" data-force-tab-value="${forceValue}"` : ""}>
            <span>${label}</span>
            ${badge ? `<em>${badge}</em>` : ""}
          </button>
        `;
      }).join("")}
    </div>
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
    finished: { title: "เบิกสินค้าสำเร็จรูป", subtitle: "เลือกอาหารสำเร็จรูปหรือน้ำ แล้วใส่จำนวนตามหน่วยที่ตั้งไว้" },
    "food-ready": { title: "เบิกอาหารสำเร็จรูป", subtitle: "เลือกเมนูและใส่จำนวนตามหน่วยที่ตั้งไว้" },
    drink: { title: "เบิกน้ำ", subtitle: "เลือกเครื่องดื่มและใส่จำนวนตามหน่วยที่ตั้งไว้" },
    raw: { title: "เบิกวัตถุดิบ", subtitle: "หมู ไก่ หรือวัตถุดิบสด" },
    "raw-own": { title: "เบิกวัตถุดิบจากคลังกลาง", subtitle: "คลังกลางจัดส่งตามยอดที่มี พร้อมบันทึกต้นทุนตามยอดส่งจริง" },
    "raw-grand": { title: "เบิกวัตถุดิบจากคลังกลาง", subtitle: "คลังกลางจัดส่งตามยอดที่มี พร้อมบันทึกต้นทุนตามยอดส่งจริง" },
    packaging: { title: "เบิกบรรจุภัณฑ์", subtitle: "กล่อง ถุง แก้ว สติ๊กเกอร์ และของใช้หน้าร้าน" },
    "packaging-own": { title: "เบิกบรรจุภัณฑ์จากคลังกลาง", subtitle: "คลังกลางจัดส่งตามยอดที่มี พร้อมบันทึกต้นทุนตามยอดส่งจริง" },
    "packaging-grand": { title: "เบิกบรรจุภัณฑ์จากคลังกลาง", subtitle: "คลังกลางจัดส่งตามยอดที่มี พร้อมบันทึกต้นทุนตามยอดส่งจริง" },
    seasoning: { title: "เบิกเครื่องปรุง", subtitle: "ซอส ผงปรุงรส และเครื่องปรุงอื่น ๆ" },
    dry: { title: "เบิกอาหารแห้ง", subtitle: "ข้าวสาร เส้นแห้ง และของแห้ง" }
  }[type] || { title: "ทำรายการเบิก", subtitle: "เลือกสินค้าและใส่จำนวน" };
}

function menuItemIsActive(item) {
  const [scope, value, , forceScope, forceValue, , targetView] = item;
  return (!targetView || state.view === targetView)
    && state.filters[scope] === value
    && (!forceScope || state.filters[forceScope] === forceValue);
}

function materialRequestSource(sourceType) {
  return { label: "คลังกลาง", detail: "ต้นทุนตามยอดส่งจริงจากคลังกลาง Grand House" };
}

function requestSourceLabel(sourceType) {
  return materialRequestSource(sourceType).label;
}

function updateLineUnit(selectEl) {
  const label = selectEl.closest(".line-item")?.querySelector("[data-unit-label]");
  if (!label) return;
  label.textContent = selectEl.selectedOptions[0]?.dataset.unit || "";
}

function bindProductLine(line) {
  if (!line) return;
  const form = line.closest("form");
  line.querySelectorAll(".request-product-select").forEach((selectEl) => {
    selectEl.addEventListener("change", () => {
      updateLineUnit(selectEl);
      updateRequestCostSummary(form);
    });
    updateLineUnit(selectEl);
  });
  line.querySelectorAll("[data-product-search]").forEach((input) => bindProductSearch(input));
  line.querySelector("[name$='[requestedQty]']")?.addEventListener("input", () => updateRequestCostSummary(form));
  updateRequestCostSummary(form);
}

function bindProductSearch(input) {
  const control = input.closest(".product-search-control");
  const select = control?.querySelector(".request-product-select");
  const list = control ? document.getElementById(input.getAttribute("list")) : null;
  if (!select || !list) return;
  const sync = () => {
    const option = [...list.options].find((item) => item.value === input.value);
    select.value = option?.dataset.productId || "";
    input.setCustomValidity(option ? "" : "กรุณาเลือกสินค้าจากรายการค้นหา");
    input.setAttribute("aria-invalid", option || !input.value ? "false" : "true");
    if (option) select.dispatchEvent(new Event("change", { bubbles: true }));
  };
  input.addEventListener("input", sync);
  input.addEventListener("change", sync);
  sync();
}

function updateRequestCostSummary(form) {
  const summary = form?.querySelector("[data-request-cost-summary]");
  if (!summary) return;
  const products = ["finished", "food-ready", "drink"].includes(summary.dataset.requestType)
    ? state.data.foodProducts
    : state.data.materialProducts;
  const productById = new Map(products.map((product) => [product.id, product]));
  const selectedLines = [...form.querySelectorAll(".line-item")].map((line) => ({
    product: productById.get(line.querySelector(".request-product-select")?.value || ""),
    requestedQty: Number(line.querySelector("[name$='[requestedQty]']")?.value || 0)
  })).filter(({ product, requestedQty }) => product && requestedQty > 0);
  const costableLines = selectedLines.filter(({ product }) => Number(product.standardCost || 0) > 0);
  const totalCost = costableLines.reduce((sum, { product, requestedQty }) => sum + requestedQty * Number(product.standardCost || 0), 0);
  const totalNode = summary.querySelector("[data-request-total-cost]");
  if (totalNode) totalNode.textContent = costableLines.length ? money(totalCost) : "—";
  summary.classList.toggle("has-items", costableLines.length > 0);
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
      const productId = line.querySelector(".request-product-select")?.value || "";
      const requestedQty = line.querySelector("[name$='[requestedQty]']")?.value || "";
      return requestedQty ? { productId, requestedQty: Number(requestedQty) } : null;
    })
    .filter((item) => item?.productId && Number.isFinite(item.requestedQty) && item.requestedQty > 0);
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
      const materialRequest = state.data.materialRequests.find((request) => request.id === transaction.referenceNumber);
      const quantity = Math.abs(Number(transaction.quantityChanged || 0));
      const unitCost = Number(transaction.unitCost ?? product.standardCost ?? 0);
      entries.push({
        date: normalizeDate(transaction.dateTime),
        dateTime: transaction.dateTime,
        branchId: transaction.branchId,
        branchName: branchName(transaction.branchId),
        kind: "material",
        movementType: transaction.type,
        source: transaction.type === "MATERIAL_REQUEST"
          ? "คลังกลาง Grand House"
          : materialSources[transaction.type],
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
          productionRoom: item.productionRoom || "",
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
          productionRoom: dispatch.productionRoom || "",
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
    <section class="panel monthly-export-panel" data-report-branch="${escapeAttr(branchId)}">
      <div>
        <p class="eyebrow">รายงานสำหรับ Office และ Owner</p>
        <h2>รายงานและส่งออกข้อมูลรายเดือน</h2>
        <p class="muted">ไฟล์ Excel รวมยอดขาย ต้นทุนที่ส่ง/เบิก มูลค่าคลัง การเคลื่อนไหว ปิดวัน และรายการที่ยังไม่มีข้อมูลของ ${branchLabel}</p>
      </div>
      <label class="field"><span>เดือน</span><input data-monthly-export-month type="month" value="${month}"></label>
      <button type="button" class="primary export-excel-button" data-export-monthly>ส่งออก Excel</button>
    </section>
    ${monthlyReportPreview(branchId, month)}
  `;
}

function monthlyReportSheetsForPreview(month, branchValue) {
  const startDate = `${month}-01`;
  const endDate = endOfMonth(startDate);
  const entries = movementEntries(startDate, endDate, branchValue);
  const usageRows = ownerUsageRowsForRange(startDate, endDate, branchValue);
  const inventoryValues = state.data.reports.inventoryValueByBranch || [];
  const selectedBranches = state.data.branches.filter((branch) => branchValue === "all" || branch.id === branchValue);
  const summaryHeaders = ["สาขา", "ยอดขายรวม", "ต้นทุนอาหาร", "ต้นทุนวัตถุดิบ/บรรจุภัณฑ์", "ต้นทุนที่ส่ง/เบิกรวม", "ส่วนต่างเบื้องต้น", "มูลค่าคลังปัจจุบัน", "ยอดขายที่กรอก", "ปิดวันที่มีข้อมูล"];
  const summaryRows = usageRows.map((row) => {
    const inventory = inventoryValues.find((item) => item.branchId === row.branchId);
    const salesDays = state.data.dailySales.filter((sale) => sale.branchId === row.branchId && dateInRange(sale.salesDate, startDate, endDate)).length;
    const closingDays = (state.data.branchDailyClosings || []).filter((closing) => closing.branchId === row.branchId && dateInRange(closing.closingDate, startDate, endDate)).length;
    return [row.branchName, row.sales, row.foodCost, row.materialCost, row.totalCost, row.grossProfit, inventory?.value || 0, salesDays, closingDays];
  });
  const branchHeaders = ["สาขา", "ยอดขาย", "ต้นทุนรวม", "ส่วนต่างจากต้นทุนที่ส่ง/เบิก", "อัตราต้นทุนต่อยอดขาย", "หมายเหตุ"];
  const branchRows = usageRows.map((row) => [row.branchName, row.sales, row.totalCost, row.grossProfit, row.costRatio, row.sales ? (row.grossMargin < 20 ? "ส่วนต่างต่ำ" : "ปกติ") : "ยังไม่มียอดขาย"]);
  const foodHeaders = ["วันที่", "สาขา", "ห้องผลิต", "เมนู", "จำนวน", "หน่วย", "ต้นทุน/หน่วย", "ต้นทุนรวม", "มูลค่าขายตามราคาตั้ง", "อ้างอิง", "สถานะ"];
  const foodRows = entries.filter((entry) => entry.kind === "food").map((entry) => [entry.date, entry.branchName, entry.productionRoom || "", entry.productName, entry.quantity, entry.unit, entry.unitCost, entry.totalCost, entry.totalSellingValue, entry.reference, "ส่ง/เบิกแล้ว"]);
  const inventoryHeaders = ["สาขา", "สินค้า", "หมวดหมู่", "หน่วย", "คงเหลือ", "ต้นทุนเฉลี่ย", "มูลค่าคลัง", "จุดสั่งซื้อ", "สต็อกเป้าหมาย", "สถานะ"];
  const inventoryRows = (state.data.inventorySnapshot || []).filter((item) => branchValue === "all" || item.branchId === branchValue).map((item) => [item.branchName, item.productName, item.category, item.unit, item.quantity, item.averageCost || item.standardCost, item.inventoryValue, item.reorderPoint, item.targetStock ?? item.reserveTarget ?? 0, item.isLow ? "ถึงจุดสั่งซื้อ" : item.needsRestock || item.isBelowReserve ? "คงเหลือน้อยกว่าระดับเป้าหมาย" : "ปกติ"]);
  const movementHeaders = ["วันเวลา", "สาขา", "สินค้า", "หมวดหมู่", "ประเภท", "จำนวนเปลี่ยน", "ก่อนหน้า", "คงเหลือ", "ต้นทุน/หน่วย", "มูลค่า", "อ้างอิง", "ผู้บันทึก", "หมายเหตุ"];
  const movementRows = state.data.inventoryTransactions.filter((txn) => txn.dateTime.slice(0, 7) === month && (branchValue === "all" || txn.branchId === branchValue)).map((txn) => {
    const product = state.data.materialProducts.find((item) => item.id === txn.productId);
    const branch = state.data.branches.find((item) => item.id === txn.branchId);
    return [txn.dateTime.slice(0, 10), branch?.name || txn.branchId, product?.name || txn.productId, product?.category || "", status(txn.type), txn.quantityChanged, txn.previousQuantity, txn.currentQuantity, txn.unitCost, txn.totalValue, txn.referenceNumber, txn.createdBy, txn.remarks];
  });
  const requestHeaders = ["วันที่ขอ", "รายการ", "ประเภท", "สาขา", "จำนวนรวม", "ต้นทุน", "สถานะ", "วันจัดของเสร็จ", "วันสาขารับ"];
  const requestRows = state.data.materialRequests.filter((request) => (branchValue === "all" || request.branchId === branchValue) && request.createdAt.slice(0, 7) === month).map((request) => [request.createdAt.slice(0, 10), request.id, `${requestSourceLabel(request.sourceType)} · วัตถุดิบ/บรรจุภัณฑ์`, request.branchName, request.items.reduce((sum, item) => sum + Number(item.actualIssuedQty || 0), 0), request.totalCost, status(request.status), request.timeline?.find((event) => event.label === "จัดส่งแล้ว")?.at?.slice(0, 10) || "", request.status === "BRANCH_RECEIVED" ? request.timeline?.at(-1)?.at?.slice(0, 10) || "" : ""]);
  const closingHeaders = ["วันที่", "สาขา", "แหล่งรายการ", "รายการ", "เหลือปลายวัน", "สถานะ", "หมายเหตุ"];
  const closingRows = (state.data.branchDailyClosings || []).filter((closing) => (branchValue === "all" || closing.branchId === branchValue) && closing.closingDate.slice(0, 7) === month).flatMap((closing) => closing.entries.map((entry) => [closing.closingDate, closing.branchName, entry.sourceType === "BRANCH_MADE" ? "เพิ่มเอง / ทำเอง" : entry.sourceType === "CENTRAL_WAREHOUSE" ? "คลังกลาง" : "ห้องผลิต", entry.itemName, entry.endingQty, entry.wasteQty > 0 ? "มีของเสีย" : "บันทึกยอดเหลือ", entry.wasteReason || entry.remarks || ""]));
  const qualityHeaders = ["สาขา", "วันที่", "ยอดขาย", "ปิดวัน", "สถานะข้อมูล"];
  const qualityRows = selectedBranches.flatMap((branch) => Array.from({ length: daysBetween(startDate, endDate) + 1 }, (_, index) => addDays(startDate, index)).map((date) => {
    const sale = dailySaleRecord(branch.id, date);
    const closing = (state.data.branchDailyClosings || []).find((item) => item.branchId === branch.id && item.closingDate === date);
    return [branch.name, date, sale ? sale.totalSales : "", closing ? "ครบ" : "", sale && closing ? "ครบ" : "ไม่มีข้อมูลบางส่วน"];
  }));
  const detailHeaders = ["วันที่", "เวลา", "สาขา", "ที่มา", "เลขอ้างอิง", "สินค้า / เมนู", "ประเภท", "หน่วย", "จำนวน", "ต้นทุนต่อหน่วย", "ต้นทุนรวม", "ราคาขายจริงต่อหน่วย", "มูลค่าขายรวม"];
  const detailRows = entries.slice().reverse().map((entry) => [displayDate(entry.date), entry.dateTime?.slice(11, 16) || "", entry.branchName, displaySourceLabel(entry.source), entry.reference, entry.productName, entry.category, entry.unit, entry.quantity, entry.unitCost, entry.totalCost, entry.sellingPrice, entry.totalSellingValue]);
  const purchaseHeaders = ["วันที่", "เวลา", "สาขา", "สินค้า", "หมวดหมู่", "จำนวนรับเข้า", "หน่วย", "ต้นทุนต่อหน่วย", "ต้นทุนรวม", "เลขอ้างอิง", "ผู้บันทึก", "หมายเหตุ"];
  const purchaseRows = state.data.inventoryTransactions.filter((txn) => txn.type === "PURCHASE" && txn.dateTime.slice(0, 7) === month && (branchValue === "all" || txn.branchId === branchValue)).map((txn) => {
    const product = state.data.materialProducts.find((item) => item.id === txn.productId);
    const branch = state.data.branches.find((item) => item.id === txn.branchId);
    return [displayDate(txn.dateTime.slice(0, 10)), txn.dateTime.slice(11, 16), branch?.name || txn.branchId, product?.name || txn.productId, product?.category || "", txn.quantityChanged, product?.unit || "", txn.unitCost, txn.totalValue, txn.referenceNumber, txn.createdBy, txn.remarks];
  });
  return [
    ["สรุปภาพรวม", summaryHeaders, summaryRows],
    ["วิเคราะห์ตามสาขา", branchHeaders, branchRows],
    ["อาหารที่ส่งสาขา", foodHeaders, foodRows],
    ["คลังสาขา", inventoryHeaders, inventoryRows],
    ["ประวัติการเคลื่อนไหว", movementHeaders, movementRows],
    ["ประวัติการเบิก", requestHeaders, requestRows],
    ["ปิดวันสาขา", closingHeaders, closingRows],
    ["ตรวจสอบข้อมูล", qualityHeaders, qualityRows],
    ["รายละเอียดต้นทุน", detailHeaders, detailRows],
    ["ประวัติซื้อเข้า", purchaseHeaders, purchaseRows]
  ];
}

function monthlyReportPreview(branchId, month) {
  const sheets = monthlyReportSheetsForPreview(month, branchId);
  return `
    <section class="panel report-preview-panel">
      <div class="report-preview-heading"><div><p class="eyebrow">ตรวจสอบก่อนส่งออก</p><h2>ตัวอย่างรายงานครบทุกคอลัมน์</h2><p class="muted">เปิดดูรายละเอียดของทุกชีทก่อนกดส่งออก Excel หากพบข้อมูลผิดให้กลับไปแก้ในหน้าที่เกี่ยวข้องได้ทันที</p></div><span class="pill">${sheets.length} ชีท</span></div>
      <div class="report-preview-note">เลื่อนตารางแนวนอนเพื่อดูคอลัมน์ทั้งหมด และเปิด/ปิดแต่ละชีทเพื่อจัดระเบียบการตรวจสอบ</div>
      <div class="report-preview-sheets">${sheets.map(([name, headers, rows]) => `<details class="report-preview-sheet" open><summary><strong>${name}</strong><span>${rows.length} รายการ · ${headers.length} คอลัมน์</span></summary><div class="report-preview-content">${reportPreviewTable(headers, rows)}</div></details>`).join("")}</div>
    </section>
  `;
}

function reportPreviewTable(headers, rows) {
  return `<div class="report-preview-table-wrap"><table class="report-preview-table"><thead><tr>${headers.map((header) => `<th>${escapeAttr(header)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((row) => `<tr>${headers.map((_, index) => `<td>${reportPreviewCell(row[index])}</td>`).join("")}</tr>`).join("") : `<tr><td class="report-preview-empty" colspan="${headers.length}">ไม่มีรายการในเดือน/สาขาที่เลือก</td></tr>`}</tbody></table></div>`;
}

function reportPreviewCell(value) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  return escapeAttr(text).replaceAll("&quot;", "&quot;");
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
          ${simpleTable(["ที่มา", "ต้นทุน"], [...bySource.entries()].map(([source, value]) => [displaySourceLabel(source), money(value)]))}
        </div>
        <div>
          <h3>รายละเอียดที่ฝ่ายบัญชีตรวจสอบได้</h3>
          ${simpleTable(
            ["วันที่", "สาขา", "ที่มา", "เลขอ้างอิง", "สินค้า", "จำนวน", "ต้นทุน/หน่วย", "ต้นทุนรวม"],
            entries.map((entry) => [
              displayDate(entry.date),
              entry.branchName,
              displaySourceLabel(entry.source),
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
  const branchValue = button.closest(".monthly-export-panel")?.dataset.reportBranch || (state.view === "office" ? (state.filters.officeBranch || "all") : (state.filters.ownerBranch || "all"));
  const startDate = `${month}-01`;
  const endDate = endOfMonth(startDate);
  const entries = movementEntries(startDate, endDate, branchValue);
  const usageRows = ownerUsageRowsForRange(startDate, endDate, branchValue);
  const inventoryValues = state.data.reports.inventoryValueByBranch || [];
  const selectedBranches = state.data.branches.filter((branch) => branchValue === "all" || branch.id === branchValue);
  const summaryHeaders = ["สาขา", "ยอดขายรวม", "ต้นทุนอาหาร", "ต้นทุนวัตถุดิบ/บรรจุภัณฑ์", "ต้นทุนที่ส่ง/เบิกรวม", "ส่วนต่างเบื้องต้น", "มูลค่าคลังปัจจุบัน", "ยอดขายที่กรอก", "ปิดวันที่มีข้อมูล"];
  const summaryRows = usageRows.map((row) => {
    const inventory = inventoryValues.find((item) => item.branchId === row.branchId);
    const salesDays = state.data.dailySales.filter((sale) => sale.branchId === row.branchId && dateInRange(sale.salesDate, startDate, endDate)).length;
    const closingDays = (state.data.branchDailyClosings || []).filter((closing) => closing.branchId === row.branchId && dateInRange(closing.closingDate, startDate, endDate)).length;
    return [row.branchName, row.sales, row.foodCost, row.materialCost, row.totalCost, row.grossProfit, inventory?.value || 0, salesDays, closingDays];
  });
  const branchHeaders = ["สาขา", "ยอดขาย", "ต้นทุนรวม", "ส่วนต่างจากต้นทุนที่ส่ง/เบิก", "อัตราต้นทุนต่อยอดขาย", "หมายเหตุ"];
  const branchRows = usageRows.map((row) => [row.branchName, row.sales, row.totalCost, row.grossProfit, row.costRatio, row.sales ? (row.grossMargin < 20 ? "ส่วนต่างต่ำ" : "ปกติ") : "ยังไม่มียอดขาย"]);
  const foodHeaders = ["วันที่", "สาขา", "ห้องผลิต", "เมนู", "จำนวน", "หน่วย", "ต้นทุน/หน่วย", "ต้นทุนรวม", "มูลค่าขายตามราคาตั้ง", "อ้างอิง", "สถานะ"];
  const foodRows = entries.filter((entry) => entry.kind === "food").map((entry) => [entry.date, entry.branchName, entry.productionRoom || "", entry.productName, entry.quantity, entry.unit, entry.unitCost, entry.totalCost, entry.totalSellingValue, entry.reference, "ส่ง/เบิกแล้ว"]);
  const inventoryHeaders = ["สาขา", "สินค้า", "หมวดหมู่", "หน่วย", "คงเหลือ", "ต้นทุนเฉลี่ย", "มูลค่าคลัง", "จุดสั่งซื้อ", "สต็อกเป้าหมาย", "สถานะ"];
  const inventoryRows = (state.data.inventorySnapshot || []).filter((item) => branchValue === "all" || item.branchId === branchValue).map((item) => [item.branchName, item.productName, item.category, item.unit, item.quantity, item.averageCost || item.standardCost, item.inventoryValue, item.reorderPoint, item.targetStock ?? item.reserveTarget ?? 0, item.isLow ? "ถึงจุดสั่งซื้อ" : item.needsRestock || item.isBelowReserve ? "คงเหลือน้อยกว่าระดับเป้าหมาย" : "ปกติ"]);
  const detailHeaders = ["วันที่", "เวลา", "สาขา", "ที่มา", "เลขอ้างอิง", "สินค้า / เมนู", "ประเภท", "หน่วย", "จำนวน", "ต้นทุนต่อหน่วย", "ต้นทุนรวม", "ราคาขายจริงต่อหน่วย", "มูลค่าขายรวม"];
  const detailRows = entries.slice().reverse().map((entry) => [
    displayDate(entry.date),
    entry.dateTime?.slice(11, 16) || "",
    entry.branchName,
    displaySourceLabel(entry.source),
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
  const movementHeaders = ["วันเวลา", "สาขา", "สินค้า", "หมวดหมู่", "ประเภท", "จำนวนเปลี่ยน", "ก่อนหน้า", "คงเหลือ", "ต้นทุน/หน่วย", "มูลค่า", "อ้างอิง", "ผู้บันทึก", "หมายเหตุ"];
  const movementRows = state.data.inventoryTransactions.filter((txn) => txn.dateTime.slice(0, 7) === month && (branchValue === "all" || txn.branchId === branchValue)).map((txn) => {
    const product = state.data.materialProducts.find((item) => item.id === txn.productId);
    const branch = state.data.branches.find((item) => item.id === txn.branchId);
    return [txn.dateTime.slice(0, 10), branch?.name || txn.branchId, product?.name || txn.productId, product?.category || "", status(txn.type), txn.quantityChanged, txn.previousQuantity, txn.currentQuantity, txn.unitCost, txn.totalValue, txn.referenceNumber, txn.createdBy, txn.remarks];
  });
  const requestHeaders = ["วันที่ขอ", "รายการ", "ประเภท", "สาขา", "จำนวนรวม", "ต้นทุน", "สถานะ", "วันจัดของเสร็จ", "วันสาขารับ"];
  const requestRows = state.data.materialRequests.filter((request) => (branchValue === "all" || request.branchId === branchValue) && request.createdAt.slice(0, 7) === month).map((request) => [request.createdAt.slice(0, 10), request.id, `${requestSourceLabel(request.sourceType)} · วัตถุดิบ/บรรจุภัณฑ์`, request.branchName, request.items.reduce((sum, item) => sum + Number(item.actualIssuedQty || 0), 0), request.totalCost, status(request.status), request.timeline?.find((event) => event.label === "จัดส่งแล้ว")?.at?.slice(0, 10) || "", request.status === "BRANCH_RECEIVED" ? request.timeline?.at(-1)?.at?.slice(0, 10) || "" : ""]);
  const closingHeaders = ["วันที่", "สาขา", "แหล่งรายการ", "รายการ", "เหลือปลายวัน", "สถานะ", "หมายเหตุ"];
  const closingRows = (state.data.branchDailyClosings || []).filter((closing) => (branchValue === "all" || closing.branchId === branchValue) && closing.closingDate.slice(0, 7) === month).flatMap((closing) => closing.entries.map((entry) => [closing.closingDate, closing.branchName, entry.sourceType === "BRANCH_MADE" ? "เพิ่มเอง / ทำเอง" : entry.sourceType === "CENTRAL_WAREHOUSE" ? "คลังกลาง" : "ห้องผลิต", entry.itemName, entry.endingQty, entry.wasteQty > 0 ? "มีของเสีย" : "บันทึกยอดเหลือ", entry.wasteReason || entry.remarks || ""]));
  const qualityHeaders = ["สาขา", "วันที่", "ยอดขาย", "ปิดวัน", "สถานะข้อมูล"];
  const qualityRows = selectedBranches.flatMap((branch) => Array.from({ length: daysBetween(startDate, endDate) + 1 }, (_, index) => addDays(startDate, index)).map((date) => {
    const sale = dailySaleRecord(branch.id, date);
    const closing = (state.data.branchDailyClosings || []).find((item) => item.branchId === branch.id && item.closingDate === date);
    return [branch.name, date, sale ? sale.totalSales : "", closing ? "ครบ" : "", sale && closing ? "ครบ" : "ไม่มีข้อมูลบางส่วน"];
  }));
  const workbook = spreadsheetWorkbook([
    ["สรุปภาพรวม", summaryHeaders, summaryRows],
    ["วิเคราะห์ตามสาขา", branchHeaders, branchRows],
    ["อาหารที่ส่งสาขา", foodHeaders, foodRows],
    ["คลังสาขา", inventoryHeaders, inventoryRows],
    ["ประวัติการเคลื่อนไหว", movementHeaders, movementRows],
    ["ประวัติการเบิก", requestHeaders, requestRows],
    ["ปิดวันสาขา", closingHeaders, closingRows],
    ["ตรวจสอบข้อมูล", qualityHeaders, qualityRows],
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

function warehouseSummaryAlertCard(title, value, subtitle, tone = "neutral", rows = []) {
  const previewRows = rows.slice(0, 4);
  return `
    <article class="action-card ${tone}">
      <span>${title}</span>
      <strong>${value}</strong>
      ${subtitle ? `<small>${subtitle}</small>` : ""}
      ${previewRows.length ? `<ul class="warehouse-summary-list">${previewRows.map((item) => `<li><span>${escapeHtml(item.productName)}</span><strong>${item.suggestedPurchaseQty > 0 ? `ซื้อเพิ่ม ${qty(item.suggestedPurchaseQty, item.unit)}` : `เหลือ ${qty(item.quantity, item.unit)}`}</strong></li>`).join("")}</ul>${rows.length > previewRows.length ? `<small class="warehouse-summary-more">อีก ${rows.length - previewRows.length} รายการ</small>` : ""}` : ""}
      ${value ? `<button type="button" class="warehouse-summary-alert-link" data-warehouse-alert-tab="stock-alerts"><span class="warning-icon">!</span><span>ดูรายละเอียดสินค้าที่ต้องซื้อ</span></button>` : `<em class="warehouse-summary-clear">ไม่มีรายการต้องซื้อเพิ่ม</em>`}
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

function statusPillClass(statusValue) {
  if (["CREATED", "OFFICE_RECEIVED", "START_PRODUCTION", "IN_PRODUCTION", "REQUESTED", "PLANNED"].includes(statusValue)) return "warning";
  if (statusValue === "SHIPPED") return "info";
  if (["BRANCH_RECEIVED", "COMPLETED"].includes(statusValue)) return "success";
  return "";
}

function progressStepTone(statusValue) {
  if (statusValue === "SHIPPED") return "info";
  if (["BRANCH_RECEIVED", "COMPLETED"].includes(statusValue)) return "success";
  return "warning";
}

function stockFor(branchId, productId, sourceType = "GRAND_SUPPLIED") {
  const officeRows = state.data.officeInventorySnapshot || [];
  return officeRows.find((item) => item.productId === productId
    && (item.stockOwnerType || "GRAND_SUPPLIED") === "GRAND_SUPPLIED");
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
  return Number(item.reorderPoint || 0) > 0 ? qty(item.reorderPoint, item.unit) : "ยังไม่ตั้ง";
}

function stockOwnerShortLabel(owner) {
  if (!owner) return "แกรนด์";
  if ((owner.type || "") === "GRAND_SUPPLIED" || owner.id === "grand") return "แกรนด์";
  const source = String(owner.name || owner.label || owner.id || "").trim();
  return source.replace(/^ของ/, "").replace(/ฝากเก็บ$/, "").trim() || source || "ฝากเก็บ";
}

function selectedBranch() {
  return state.data.branches.find((branch) => branch.id === state.selectedBranchId) || state.data.branches[0];
}

function branchSelect(name, selected = "") {
  return select(name, state.data.branches.map((item) => [item.id, item.name]), selected);
}

function officeStockOwnerOptions(selected = "") {
  const owners = Array.isArray(state.data?.stockOwners) && state.data.stockOwners.length
    ? state.data.stockOwners
    : [
      { id: "grand", type: "GRAND_SUPPLIED", label: "ของแกรนด์" },
      { id: "br-phu-doi", type: "BRANCH_OWNED", label: "ของภูดอยฝากเก็บ" },
      { id: "owner-phela", type: "BRANCH_OWNED", label: "ของเพลาฝากเก็บ" }
    ];
  return owners
    .map((owner) => `<option value="${escapeAttr(owner.id)}" data-owner-type="${escapeAttr(owner.type || "GRAND_SUPPLIED")}" ${selected === owner.id ? "selected" : ""}>${escapeAttr(stockOwnerShortLabel(owner))}</option>`)
    .join("");
}

function officeStockOwnerSelect(name, selected = "grand") {
  return `<select name="${escapeAttr(name)}" data-office-stock-owner>${officeStockOwnerOptions(selected)}</select>`;
}

function supplierSelect(name) {
  return select(name, state.data.suppliers.map((item) => [item.id, item.name]));
}

function materialCategoryOptions(selected = "") {
  const defaults = ["วัตถุดิบ", "บรรจุภัณฑ์", "เครื่องปรุง", "ของแห้ง"];
  const categories = state.data?.inventoryOptions?.materialCategories?.length
    ? state.data.inventoryOptions.materialCategories
    : defaults;
  const values = [...new Set([selected, ...categories].filter(Boolean))];
  return values.map((category) => [category, category]);
}

function inventoryCategoryLabel(canonical) {
  return state.data?.inventoryOptions?.categoryAliases?.[canonical] || canonical;
}

function materialSelect(name, group = "all") {
  return productSelect(name, materialProductsForGroup(group));
}

function foodSelect(name, group = "all") {
  return productSelect(name, foodProductsForGroup(group));
}

function productSelect(name, products) {
  const searchId = `product-search-${name.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const first = products[0];
  const productLabel = (item) => item.name;
  return `<div class="product-search-control">
    <div class="product-search-input-wrap">
      <input class="product-search-input" type="search" list="${searchId}-options" data-product-search placeholder="พิมพ์ชื่อเพื่อค้นหา" value="${escapeAttr(first ? productLabel(first) : "")}" aria-label="ค้นหาสินค้า" aria-invalid="false">
    </div>
    <datalist id="${searchId}-options">${products.map((item) => `<option value="${escapeAttr(productLabel(item))}" data-product-id="${escapeAttr(item.id)}" label="${escapeAttr(`${item.category || ""}${item.productionRoom ? ` · ${item.productionRoom}` : ""}`)}"></option>`).join("")}</datalist>
    <select class="request-product-select" name="${name}" hidden aria-hidden="true">${products.map((item) => `<option value="${escapeAttr(item.id)}" data-unit="${escapeAttr(item.unit || "")}">${escapeAttr(item.name)} (${escapeAttr(item.unit || "")})</option>`).join("")}</select>
  </div>`;
}

function materialProductsForGroup(group = "all") {
  return state.data.materialProducts.filter((item) => {
    if (group === "packaging") return item.category === inventoryCategoryLabel("บรรจุภัณฑ์");
    if (group === "raw") return item.category === inventoryCategoryLabel("วัตถุดิบ");
    if (group === "seasoning") return item.category === inventoryCategoryLabel("เครื่องปรุง");
    if (group === "dry") return item.category === inventoryCategoryLabel("ของแห้ง");
    if (group === "materials") return item.category !== inventoryCategoryLabel("บรรจุภัณฑ์");
    return true;
  });
}

function foodProductsForGroup(group = "all") {
  return state.data.foodProducts.filter((item) => {
    if (group === "finished") return ["อาหารสำเร็จรูป", "น้ำ"].includes(item.category);
    if (group === "food-ready") return item.category === "อาหารสำเร็จรูป";
    if (group === "drink") return item.category === "น้ำ";
    if (productionRooms.some((room) => room.name === group)) return item.productionRoom === group;
    return true;
  });
}

async function handleBranchDailyClosingSave(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const entries = [...form.querySelectorAll("[data-closing-entry]")].map((line) => {
    const get = (field) => line.querySelector(`[data-closing-field="${field}"]`)?.value || "";
    return {
      sourceType: get("sourceType"),
      productId: get("productId") || null,
      itemName: get("itemName"),
      unit: get("unit"),
      endingQty: Number(get("endingQty") || 0)
    };
  }).filter((entry) => entry.itemName || entry.productId);
  const payload = { branchId: form.elements.branchId.value, closingDate: form.elements.closingDate.value, remarks: form.elements.remarks.value, entries };
  await run(() => api("/api/branch-daily-closings", { method: "POST", body: JSON.stringify(payload) }), "บันทึกปิดวันสาขาแล้ว");
}

function unitSelect(name, selected = "ชิ้น", extraAttr = "") {
  const defaults = ["กล่อง", "ขวด", "แก้ว", "จาน", "ถ้วย", "ชุด", "ชิ้น", "แผ่น", "แถว", "ใบ", "ม้วน", "แพ็ก", "ถุง", "กก.", "กิโลกรัม", "ขีด", "กรัม", "ลิตร"];
  const units = state.data?.inventoryOptions?.units?.length ? state.data.inventoryOptions.units : defaults;
  const values = [...new Set([selected, ...units].filter(Boolean))];
  const nameAttr = name ? `name="${escapeAttr(name)}"` : "";
  return `<select ${nameAttr} ${extraAttr}>${values.map((unit) => `<option value="${escapeAttr(unit)}" ${selected === unit ? "selected" : ""}>${escapeHtml(unit)}</option>`).join("")}</select>`;
}

function productionRoomSelect(name, selected = "", extraAttr = "") {
  const nameAttr = name ? `name="${name}"` : "";
  const placeholder = selected ? "" : `<option value="" selected>เลือกห้องผลิต</option>`;
  return `<select ${nameAttr} ${extraAttr}>${placeholder}${productionRooms.map((room) => `<option value="${room.name}" ${selected === room.name ? "selected" : ""}>${room.name}</option>`).join("")}</select>`;
}

function select(name, options, selected = "") {
  return `<select name="${escapeAttr(name)}">${options.map(([value, label]) => `<option value="${escapeAttr(value)}" ${selected === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>`;
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
    KITCHEN: "ห้องผลิต",
    BRANCH: "พนักงานสาขา"
  }[user.role] || user.role;
}

function userDisplayName(user) {
  return user.role === "KITCHEN" ? "ห้องผลิต" : user.name;
}

function displaySourceLabel(label) {
  return {
    "ครัวกลาง": "ห้องผลิต",
    "ครัวกลางส่งเพิ่ม": "ส่งเพิ่ม"
  }[label] || label;
}

function roleInitial(user) {
  return {
    OWNER: "จ",
    OFFICE: "อ",
    KITCHEN: "ห",
    BRANCH: "ส"
  }[user.role] || "ผ";
}

function roleLoginLabel(user) {
  if (user.role === "BRANCH") return `สาขา ${user.branchName}`;
  return roleLabel(user);
}

function userAccessText(user) {
  if (user.role === "OWNER") return "เข้าได้ทุกส่วน";
  if (user.role === "OFFICE") return "ออฟฟิศ / คลังสินค้า / ตั้งค่าเมนูของแกรนด์เฮาส์";
  if (user.role === "KITCHEN") return "ห้องผลิต";
  return `เฉพาะสาขา ${user.branchName}`;
}

function authHeaders() {
  return {
    ...(state.currentUser?.id ? { "x-user-id": state.currentUser.id } : {}),
    ...(state.officeBrandToken ? { "x-office-brand-token": state.officeBrandToken } : {})
  };
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("warehouseUser"));
  } catch {
    return null;
  }
}

function clearSession() {
  stopLiveRefresh();
  state.currentUser = null;
  state.data = null;
  state.view = "";
  state.selectedBranchId = "";
  state.officeBrandId = "";
  state.officeBrandToken = "";
  state.officeBrandGateTarget = "";
  state.officeBrandGateError = "";
  state.filters.warehouseFocus = false;
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
    OFFICE_RECEIVED: "รับเรื่อง",
    PREPARING: "รับเรื่อง",
    READY: "จัดของเสร็จ",
    PURCHASE: "ซื้อเข้า",
    BRANCH_DEPOSIT: "รับฝากจากสาขา",
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

function requestStatusLabel(route, statusValue) {
  const labels = {
    office: {
      CREATED: "ส่งคำขอ",
      OFFICE_RECEIVED: "ส่งคำขอ",
      PREPARING: "ส่งคำขอ",
      READY: "ส่งคำขอ",
      SHIPPED: "จัดของเสร็จ",
      BRANCH_RECEIVED: "สาขารับแล้ว",
      COMPLETED: "เสร็จสิ้น"
    },
    kitchen: {
      CREATED: "รอจัดส่ง",
      REQUESTED: "รอจัดส่ง",
      PLANNED: "รอจัดส่ง",
      SHIPPED: "ส่งออกแล้ว",
      BRANCH_RECEIVED: "สาขารับแล้ว",
      COMPLETED: "เสร็จสิ้น"
    }
  };
  return labels[route]?.[statusValue] || status(statusValue);
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
    CREATED: "จัดของเสร็จ",
    OFFICE_RECEIVED: "จัดของเสร็จ",
    PREPARING: "จัดของเสร็จ",
    READY: "จัดของเสร็จ",
    SHIPPED: "สาขารับของ",
    BRANCH_RECEIVED: "เสร็จสิ้น"
  }[statusValue] || "อัปเดต";
}

function nextFoodAction(statusValue) {
  return {
    CREATED: "ยืนยันส่งออก",
    SHIPPED: "สาขารับแล้ว",
    BRANCH_RECEIVED: "เสร็จสิ้น"
  }[statusValue] || "อัปเดต";
}

function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toast(message) {
  const node = document.getElementById("toast");
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove("show"), 3000);
}

function shipmentReportData() {
  const f = state.filters;
  const start = f.shipmentStart || "";
  const end = f.shipmentEnd || "";
  const invalid = Boolean(start && end && start > end);
  const branches = state.data.branches.filter(b => !f.shipmentBranch || f.shipmentBranch === "all" || b.id === f.shipmentBranch);
  const entries = invalid ? [] : movementEntries(start || "0001-01-01", end || "9999-12-31", f.shipmentBranch || "all").filter(e => e.kind === "food").map(e => {
    const extra = (state.data.kitchenDispatches || []).find(d => d.id === e.reference);
    const record = extra || state.data.foodRequests.find(r => r.id === e.reference);
    return {...e, productionRoom: e.productionRoom || "ไม่ระบุห้อง", source: extra ? "ส่งเพิ่ม" : "ตามใบเบิก", received: ["BRANCH_RECEIVED", "COMPLETED"].includes(record?.status) ? "รับแล้ว" : "รอรับสินค้า"};
  }).sort((a,b) => b.dateTime.localeCompare(a.dateTime));
  const rooms = [...new Set([...productionRooms.map(r => r.name), ...entries.map(e => e.productionRoom)])];
  const detail = entries.filter(e => (!f.shipmentDetailRoom || e.productionRoom === f.shipmentDetailRoom) && (!f.shipmentDetailBranch || e.branchId === f.shipmentDetailBranch));
  return {start, end, invalid, branches, entries, rooms, detail};
}

function shipmentReportPanel() {
  const d = shipmentReportData(), f = state.filters;
  const sum = rows => rows.reduce((n,e) => n + e.totalCost, 0);
  const cell = (room, branch, rows, label) => `<button type="button" class="shipment-cell" data-shipment-room="${escapeAttr(room)}" data-shipment-branch="${escapeAttr(branch)}" aria-label="${escapeAttr(label)} ${escapeAttr(money(sum(rows)))} ดูรายละเอียด">${money(sum(rows))}</button>`;
  const headers = ["วันที่ส่ง", "เลขรายการ", "ห้องผลิต", "สาขา", "สินค้า", "ประเภท", "ส่งจริง", "หน่วย", "ต้นทุน/หน่วย", "รวม", "การรับสินค้า"];
  const detailRows = d.detail.map(e => [e.date,e.reference,e.productionRoom,e.branchName,e.productName,e.source,qty(e.quantity),e.unit,money(e.unitCost),money(e.totalCost),e.received]);
  return `<div class="shipment-report">
    <section class="panel"><div class="row-between"><div><h2>สรุปการส่งสินค้าและต้นทุน</h2><p class="muted">ยอดส่งจริงตามใบเบิกและส่งเพิ่ม · ไม่นับจำนวนที่ไม่ได้ส่ง</p></div><button type="button" class="primary" data-shipment-export ${d.invalid || !d.entries.length ? "disabled" : ""}>ส่งออก Excel</button></div>
    <div class="shipment-filters"><label class="field"><span>ตั้งแต่วันที่</span><input type="date" data-filter-scope="shipmentStart" value="${escapeAttr(d.start)}"></label><label class="field"><span>ถึงวันที่</span><input type="date" data-filter-scope="shipmentEnd" value="${escapeAttr(d.end)}"></label><label class="field"><span>สาขา</span>${selectWithFilter("shipmentBranch", [["all","ทุกสาขา"],...state.data.branches.map(b=>[b.id,b.name])], f.shipmentBranch || "all")}</label><button type="button" class="secondary" data-shipment-reset>ดูทุกช่วงเวลา</button></div>
    ${d.invalid ? '<p role="alert">วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม กรุณาเลือกช่วงวันที่ใหม่</p>' : ''}</section>
    <div class="shipment-stats"><section class="panel"><span>ต้นทุนที่ส่งรวม</span><strong>${money(sum(d.entries))}</strong></section><section class="panel"><span>ส่งตามใบเบิก</span><strong>${money(sum(d.entries.filter(e=>e.source === "ตามใบเบิก")))}</strong></section><section class="panel"><span>ส่งเพิ่ม</span><strong>${money(sum(d.entries.filter(e=>e.source === "ส่งเพิ่ม")))}</strong></section></div>
    <section class="panel"><h2>ต้นทุนแยกห้องผลิตและสาขา</h2><p class="muted">กดยอดเพื่อดูรายการของสาขานั้น หรือกดชื่อห้องเพื่อดูทุกสาขา · หน่วยบาท</p><div class="table-wrap"><table class="shipment-matrix"><thead><tr><th scope="col">ห้องผลิต</th>${d.branches.map(b=>`<th scope="col">${escapeHtml(b.name)}</th>`).join("")}<th scope="col">รวม</th></tr></thead><tbody>${d.rooms.map(room=>`<tr><th scope="row"><button type="button" class="shipment-cell shipment-room" data-shipment-room="${escapeAttr(room)}" data-shipment-branch="">${escapeHtml(room)}</button></th>${d.branches.map(b=>`<td>${cell(room,b.id,d.entries.filter(e=>e.productionRoom===room && e.branchId===b.id),room+" "+b.name)}</td>`).join("")}<td>${cell(room,"",d.entries.filter(e=>e.productionRoom===room),room+" รวม")}</td></tr>`).join("")}</tbody><tfoot><tr><th scope="row">รวมทั้งหมด</th>${d.branches.map(b=>`<td>${cell("",b.id,d.entries.filter(e=>e.branchId===b.id),b.name)}</td>`).join("")}<td>${cell("","",d.entries,"ทั้งหมด")}</td></tr></tfoot></table></div>${!d.entries.length ? '<p class="empty">ไม่มีรายการส่งสินค้าในช่วงที่เลือก ลองเปลี่ยนวันที่หรือสาขา</p>' : ''}</section>
    <section class="panel" id="shipmentDetails" tabindex="-1"><div class="row-between"><div><h2>รายละเอียดการส่งสินค้า</h2><p class="muted">${escapeHtml(f.shipmentDetailRoom || "ทุกห้องผลิต")} · ${escapeHtml(state.data.branches.find(b=>b.id===f.shipmentDetailBranch)?.name || "ทุกสาขาที่เลือก")} · ${d.detail.length} รายการ · ${money(sum(d.detail))}</p></div><button type="button" class="secondary" data-shipment-clear>ดูรายละเอียดทั้งหมด</button></div>${reportPreviewTable(headers,detailRows)}</section>
  </div>`;
}

function bindShipmentReport(root) {
  root.querySelectorAll("[data-shipment-room]").forEach(button => button.addEventListener("click", () => {
    state.filters.shipmentDetailRoom = button.dataset.shipmentRoom;
    state.filters.shipmentDetailBranch = button.dataset.shipmentBranch;
    render();
    document.getElementById("shipmentDetails")?.focus();
  }));
  root.querySelector("[data-shipment-clear]")?.addEventListener("click", () => { state.filters.shipmentDetailRoom = ""; state.filters.shipmentDetailBranch = ""; render(); });
  root.querySelector("[data-shipment-reset]")?.addEventListener("click", () => { state.filters.shipmentStart = ""; state.filters.shipmentEnd = ""; state.filters.shipmentBranch = "all"; state.filters.shipmentDetailRoom = ""; state.filters.shipmentDetailBranch = ""; render(); });
  root.querySelector("[data-shipment-export]")?.addEventListener("click", () => {
    const d = shipmentReportData();
    if (d.invalid || !d.entries.length) return;
    const sum = rows => Math.round(rows.reduce((n,e)=>n+e.totalCost,0)*100)/100;
    const summary = d.rooms.map(room=>[room,...d.branches.map(b=>sum(d.entries.filter(e=>e.productionRoom===room && e.branchId===b.id))),sum(d.entries.filter(e=>e.productionRoom===room))]);
    summary.push(["รวมทั้งหมด",...d.branches.map(b=>sum(d.entries.filter(e=>e.branchId===b.id))),sum(d.entries)]);
    const sheets = [["ขอบเขตรายงาน",["รายการ","ค่า"],[["ตั้งแต่",d.start || "ทั้งหมด"],["ถึง",d.end || "ทั้งหมด"],["สาขา",d.branches.map(b=>b.name).join(", ")],["หลักการ","ต้นทุนส่งจริง รวมส่งเพิ่ม ไม่รวมจำนวนที่ไม่ได้ส่ง"],["รายละเอียด","ทุกรายการตามช่วงวันที่และสาขา ไม่จำกัดเฉพาะช่องที่กด"]]], ["สรุปต้นทุน",["ห้องผลิต",...d.branches.map(b=>b.name),"รวม"],summary], ["รายละเอียด",["วันที่ส่ง","เลขรายการ","ห้องผลิต","สาขา","สินค้า","ประเภท","จำนวนส่งจริง","หน่วย","ต้นทุนต่อหน่วย","รวม","การรับสินค้า"],d.entries.map(e=>[e.date,e.reference,e.productionRoom,e.branchName,e.productName,e.source,e.quantity,e.unit,e.unitCost,e.totalCost,e.received])]];
    const url = URL.createObjectURL(new Blob([spreadsheetWorkbook(sheets)],{type:"application/vnd.ms-excel;charset=utf-8"}));
    const link = document.createElement("a"); link.href=url; link.download=`สรุปการส่งสินค้า_${d.start || "ทั้งหมด"}_${d.end || "ทั้งหมด"}.xml`; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast("ส่งออกไฟล์สำหรับเปิดใน Excel แล้ว");
  });
}
