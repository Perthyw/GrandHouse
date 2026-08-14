export const seedData = {
  schemaVersion: 9,
  company: {
    parent: "เดอะ แกรนด์",
    business: "แกรนด์ เฮาส์",
    centralKitchenName: "ครัวกลางแกรนด์ เฮาส์"
  },
  branches: [
    { id: "br-phu-doi", name: "ภูดอย", warehouseName: "คลังสาขาภูดอย" },
    { id: "br-ban-jo", name: "บ้านโจ้", warehouseName: "คลังสาขาบ้านโจ้" },
    { id: "br-kaset-mai", name: "เกษตรใหม่", warehouseName: "คลังสาขาเกษตรใหม่" },
    { id: "br-tha-rua-1", name: "ท่ารั้ว", warehouseName: "คลังสาขาท่ารั้ว" },
    { id: "br-tha-rua-2", name: "แกรนด์ปาร์ค", warehouseName: "คลังสาขาแกรนด์ปาร์ค" }
  ],
  users: [
    { id: "user-owner", username: "owner", password: "owner", name: "เจ้าของ", role: "OWNER" },
    { id: "user-office", username: "office", password: "office", name: "ออฟฟิศ", role: "OFFICE" },
    { id: "user-kitchen", username: "kitchen", password: "kitchen", name: "ครัวกลาง", role: "KITCHEN" },
    { id: "user-phu-doi", username: "phudoi", password: "1234", name: "สาขาภูดอย", role: "BRANCH", branchId: "br-phu-doi" },
    { id: "user-ban-jo", username: "banjo", password: "1234", name: "สาขาบ้านโจ้", role: "BRANCH", branchId: "br-ban-jo" },
    { id: "user-kaset-mai", username: "kasetmai", password: "1234", name: "สาขาเกษตรใหม่", role: "BRANCH", branchId: "br-kaset-mai" },
    { id: "user-tha-rua-1", username: "tharua1", password: "1234", name: "สาขาท่ารั้ว", role: "BRANCH", branchId: "br-tha-rua-1" },
    { id: "user-tha-rua-2", username: "tharua2", password: "1234", name: "สาขาแกรนด์ปาร์ค", role: "BRANCH", branchId: "br-tha-rua-2" }
  ],
  suppliers: [
    { id: "sup-grand", name: "คลังใหญ่เดอะ แกรนด์" },
    { id: "sup-local", name: "ซื้อจากตลาด" },
    { id: "sup-pack", name: "ร้านบรรจุภัณฑ์" }
  ],
  materialProducts: [
    { id: "mat-pork", name: "หมูสด", category: "วัตถุดิบ", unit: "กก.", standardCost: 165, sellingPrice: 0 },
    { id: "mat-chicken", name: "ไก่สด", category: "วัตถุดิบ", unit: "กก.", standardCost: 92, sellingPrice: 0 },
    { id: "mat-sauce", name: "ซอสหมัก", category: "เครื่องปรุง", unit: "ลิตร", standardCost: 58, sellingPrice: 0 },
    { id: "mat-seasoning", name: "ผงปรุงรส", category: "เครื่องปรุง", unit: "แพ็ก", standardCost: 42, sellingPrice: 0 },
    { id: "mat-rice", name: "ข้าวสาร", category: "ของแห้ง", unit: "กก.", standardCost: 38, sellingPrice: 0 },
    { id: "mat-noodle", name: "เส้นแห้ง", category: "ของแห้ง", unit: "แพ็ก", standardCost: 24, sellingPrice: 0 },
    { id: "mat-box", name: "กล่องอาหาร", category: "บรรจุภัณฑ์", unit: "ชิ้น", standardCost: 3.8, sellingPrice: 0 },
    { id: "mat-bag", name: "ถุงหิ้ว", category: "บรรจุภัณฑ์", unit: "ชิ้น", standardCost: 0.55, sellingPrice: 0 },
    { id: "mat-cup", name: "แก้วน้ำ", category: "บรรจุภัณฑ์", unit: "ชิ้น", standardCost: 1.8, sellingPrice: 0 }
  ],
  foodProducts: [
    { id: "food-pork", name: "หมูหมักพร้อมขาย", category: "อาหารสำเร็จรูป", unit: "กก.", productionRoom: "ห้องอาหาร", standardCost: 210, sellingPrice: 320 },
    { id: "food-chicken", name: "ไก่หมักพร้อมขาย", category: "อาหารสำเร็จรูป", unit: "กก.", productionRoom: "ห้องอาหาร", standardCost: 130, sellingPrice: 220 },
    { id: "food-beef-set", name: "ชุดเนื้อ", category: "อาหารสำเร็จรูป", unit: "ชุด", productionRoom: "ครัวกลาง", standardCost: 145, sellingPrice: 260 },
    { id: "food-tea", name: "ชานม", category: "น้ำ", unit: "แก้ว", productionRoom: "ห้องของหวาน", standardCost: 18, sellingPrice: 45 },
    { id: "food-herbal", name: "น้ำสมุนไพร", category: "น้ำ", unit: "ขวด", productionRoom: "ห้องผลไม้", standardCost: 12, sellingPrice: 35 }
  ],
  inventorySettings: [
    { branchId: "br-phu-doi", productId: "mat-pork", reorderPoint: 35 },
    { branchId: "br-phu-doi", productId: "mat-chicken", reorderPoint: 30 },
    { branchId: "br-phu-doi", productId: "mat-box", reorderPoint: 450 },
    { branchId: "br-phu-doi", productId: "mat-rice", reorderPoint: 25 },
    { branchId: "br-ban-jo", productId: "mat-pork", reorderPoint: 30 },
    { branchId: "br-ban-jo", productId: "mat-sauce", reorderPoint: 20 },
    { branchId: "br-ban-jo", productId: "mat-bag", reorderPoint: 400 },
    { branchId: "br-ban-jo", productId: "mat-noodle", reorderPoint: 40 },
    { branchId: "br-kaset-mai", productId: "mat-chicken", reorderPoint: 32 },
    { branchId: "br-kaset-mai", productId: "mat-box", reorderPoint: 500 },
    { branchId: "br-kaset-mai", productId: "mat-seasoning", reorderPoint: 25 },
    { branchId: "br-tha-rua-1", productId: "mat-pork", reorderPoint: 28 },
    { branchId: "br-tha-rua-1", productId: "mat-seasoning", reorderPoint: 18 },
    { branchId: "br-tha-rua-1", productId: "mat-cup", reorderPoint: 260 },
    { branchId: "br-tha-rua-2", productId: "mat-chicken", reorderPoint: 26 },
    { branchId: "br-tha-rua-2", productId: "mat-cup", reorderPoint: 300 },
    { branchId: "br-tha-rua-2", productId: "mat-rice", reorderPoint: 24 }
  ],
  inventoryTransactions: [
    makeTxn("txn-001", "2026-07-21T08:00:00.000+07:00", "br-phu-doi", "mat-pork", "PURCHASE", "PO20260721001", 0, 80, 165),
    makeTxn("txn-002", "2026-07-21T08:05:00.000+07:00", "br-phu-doi", "mat-box", "PURCHASE", "PO20260721002", 0, 900, 3.8),
    makeTxn("txn-003", "2026-07-21T08:10:00.000+07:00", "br-ban-jo", "mat-sauce", "PURCHASE", "PO20260721003", 0, 42, 58),
    makeTxn("txn-004", "2026-07-21T08:15:00.000+07:00", "br-kaset-mai", "mat-chicken", "PURCHASE", "PO20260721004", 0, 72, 92),
    makeTxn("txn-005", "2026-07-21T08:20:00.000+07:00", "br-tha-rua-1", "mat-seasoning", "PURCHASE", "PO20260721005", 0, 30, 42),
    makeTxn("txn-006", "2026-07-21T08:25:00.000+07:00", "br-tha-rua-2", "mat-cup", "PURCHASE", "PO20260721006", 0, 520, 1.8),
    makeTxn("txn-007", "2026-07-21T08:30:00.000+07:00", "br-phu-doi", "mat-rice", "PURCHASE", "PO20260721007", 0, 18, 38),
    makeTxn("txn-008", "2026-07-21T08:35:00.000+07:00", "br-ban-jo", "mat-noodle", "PURCHASE", "PO20260721008", 0, 24, 24),
    makeTxn("txn-009", "2026-07-21T08:40:00.000+07:00", "br-tha-rua-1", "mat-cup", "PURCHASE", "PO20260721009", 0, 180, 1.8),
    makeTxn("txn-010", "2026-07-21T08:45:00.000+07:00", "br-tha-rua-2", "mat-rice", "PURCHASE", "PO20260721010", 0, 14, 38)
  ],
  kitchenDispatches: [
    {
      id: "KC20260721001",
      branchId: "br-phu-doi",
      productId: "food-pork",
      sourceType: "KITCHEN_EXTRA",
      plannedQty: 45,
      actualQty: 42,
      status: "SHIPPED",
      dispatchDate: "2026-07-21",
      dispatchTime: "07:45",
      createdAt: "2026-07-21T07:20:00.000+07:00",
      updatedAt: "2026-07-21T07:45:00.000+07:00",
      timeline: [
        { at: "2026-07-21T07:20:00.000+07:00", label: "รอส่ง" },
        { at: "2026-07-21T07:45:00.000+07:00", label: "จัดส่งแล้ว" }
      ],
      remarks: "ส่งตามแผนเช้า"
    },
    {
      id: "KC20260721002",
      branchId: "br-ban-jo",
      productId: "food-tea",
      sourceType: "KITCHEN_EXTRA",
      plannedQty: 80,
      actualQty: 80,
      status: "PLANNED",
      dispatchDate: "2026-07-21",
      dispatchTime: "08:00",
      createdAt: "2026-07-21T07:30:00.000+07:00",
      updatedAt: "2026-07-21T07:30:00.000+07:00",
      timeline: [
        { at: "2026-07-21T07:30:00.000+07:00", label: "รอส่ง" }
      ],
      remarks: "ประมาณการณ์รายวัน"
    }
  ],
  foodRequests: [
    {
      id: "KC20260721003",
      branchId: "br-kaset-mai",
      sourceType: "BRANCH_REQUEST",
      status: "START_PRODUCTION",
      createdAt: "2026-07-21T09:20:00.000+07:00",
      items: [
        { productId: "food-pork", requestedQty: 50, deliveredQty: 40, status: "IN_PRODUCTION" },
        { productId: "food-beef-set", requestedQty: 25, deliveredQty: 25, status: "IN_PRODUCTION" }
      ],
      timeline: [
        { at: "2026-07-21T09:20:00.000+07:00", label: "สาขาสร้างรายการ" },
        { at: "2026-07-21T09:35:00.000+07:00", label: "ครัวกลางรับเรื่อง" },
        { at: "2026-07-21T09:45:00.000+07:00", label: "เริ่มผลิต" }
      ]
    },
    {
      id: "KC20260721004",
      branchId: "br-phu-doi",
      sourceType: "BRANCH_REQUEST",
      status: "CREATED",
      createdAt: "2026-07-21T09:28:00.000+07:00",
      items: [
        { productId: "food-chicken", requestedQty: 30, deliveredQty: 30, status: "REQUESTED" },
        { productId: "food-tea", requestedQty: 50, deliveredQty: 50, status: "REQUESTED" }
      ],
      timeline: [
        { at: "2026-07-21T09:28:00.000+07:00", label: "สาขาสร้างรายการ" }
      ]
    },
    {
      id: "KC20260721005",
      branchId: "br-tha-rua-2",
      sourceType: "BRANCH_REQUEST",
      status: "ACCEPTED",
      createdAt: "2026-07-21T09:32:00.000+07:00",
      items: [
        { productId: "food-herbal", requestedQty: 60, deliveredQty: 60, status: "REQUESTED" }
      ],
      timeline: [
        { at: "2026-07-21T09:32:00.000+07:00", label: "สาขาสร้างรายการ" },
        { at: "2026-07-21T09:39:00.000+07:00", label: "ครัวกลางรับเรื่อง" }
      ]
    }
  ],
  materialRequests: [
    {
      id: "OF20260721001",
      branchId: "br-tha-rua-1",
      status: "OFFICE_RECEIVED",
      createdAt: "2026-07-21T09:00:00.000+07:00",
      items: [
        { productId: "mat-seasoning", requestedQty: 12, actualIssuedQty: 12 },
        { productId: "mat-box", requestedQty: 250, actualIssuedQty: 240 }
      ],
      timeline: [
        { at: "2026-07-21T09:00:00.000+07:00", label: "สาขาสร้างรายการ" },
        { at: "2026-07-21T09:15:00.000+07:00", label: "ออฟฟิศรับเรื่อง" }
      ],
      issueTransactionIds: []
    },
    {
      id: "OF20260721002",
      branchId: "br-ban-jo",
      status: "CREATED",
      createdAt: "2026-07-21T09:08:00.000+07:00",
      items: [
        { productId: "mat-sauce", requestedQty: 35, actualIssuedQty: 35 },
        { productId: "mat-noodle", requestedQty: 36, actualIssuedQty: 36 }
      ],
      timeline: [
        { at: "2026-07-21T09:08:00.000+07:00", label: "สาขาสร้างรายการ" }
      ],
      issueTransactionIds: []
    },
    {
      id: "OF20260721003",
      branchId: "br-phu-doi",
      status: "CREATED",
      createdAt: "2026-07-21T09:12:00.000+07:00",
      items: [
        { productId: "mat-rice", requestedQty: 28, actualIssuedQty: 28 },
        { productId: "mat-box", requestedQty: 350, actualIssuedQty: 350 }
      ],
      timeline: [
        { at: "2026-07-21T09:12:00.000+07:00", label: "สาขาสร้างรายการ" }
      ],
      issueTransactionIds: []
    },
    {
      id: "OF20260721004",
      branchId: "br-tha-rua-2",
      status: "CREATED",
      createdAt: "2026-07-21T09:18:00.000+07:00",
      items: [
        { productId: "mat-cup", requestedQty: 380, actualIssuedQty: 380 },
        { productId: "mat-rice", requestedQty: 20, actualIssuedQty: 20 }
      ],
      timeline: [
        { at: "2026-07-21T09:18:00.000+07:00", label: "สาขาสร้างรายการ" }
      ],
      issueTransactionIds: []
    }
  ],
  dailySales: [
    { id: "SALE20260721001", branchId: "br-phu-doi", salesDate: "2026-07-21", cashSales: 12850, transferSales: 18740, remarks: "ยอดรวมปิดร้าน" },
    { id: "SALE20260721002", branchId: "br-ban-jo", salesDate: "2026-07-21", cashSales: 9200, transferSales: 14350, remarks: "เงินสดและสแกน" },
    { id: "SALE20260721003", branchId: "br-kaset-mai", salesDate: "2026-07-21", cashSales: 16200, transferSales: 26580, remarks: "ยอดรวมจากพนักงาน" },
    { id: "SALE20260721004", branchId: "br-tha-rua-1", salesDate: "2026-07-21", cashSales: 7800, transferSales: 11900, remarks: "" },
    { id: "SALE20260721005", branchId: "br-tha-rua-2", salesDate: "2026-07-21", cashSales: 8400, transferSales: 12650, remarks: "" }
  ]
};

function makeTxn(id, dateTime, branchId, productId, type, referenceNumber, previousQuantity, quantityChanged, unitCost) {
  return {
    id,
    dateTime,
    branchId,
    productId,
    type,
    referenceNumber,
    previousQuantity,
    quantityChanged,
    currentQuantity: previousQuantity + quantityChanged,
    unitCost,
    totalValue: Math.round(quantityChanged * unitCost * 100) / 100,
    createdBy: "ออฟฟิศ",
    remarks: "ยอดตั้งต้น"
  };
}
