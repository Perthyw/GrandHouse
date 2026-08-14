import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedData } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
const dbPath = path.join(dataDir, "db.json");

let writeQueue = Promise.resolve();

export async function readDb() {
  await mkdir(dataDir, { recursive: true });
  try {
    const raw = await readFile(dbPath, "utf8");
    const db = JSON.parse(raw);
    if (db.schemaVersion !== seedData.schemaVersion) {
      await writeDb(seedData);
      return structuredClone(seedData);
    }
    if (migrateProductionRoomNames(db)) await writeDb(db);
    if (migrateFoodWorkflow(db)) await writeDb(db);
    return db;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeDb(seedData);
    return structuredClone(seedData);
  }
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

function migrateFoodWorkflow(db) {
  const legacyQueueStatuses = new Set(["ACCEPTED", "START_PRODUCTION", "READY_TO_DELIVER"]);
  let changed = false;
  (db.foodRequests || []).forEach((request) => {
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
  await mkdir(dataDir, { recursive: true });
  writeQueue = writeQueue.then(() => writeFile(dbPath, JSON.stringify(data, null, 2)));
  await writeQueue;
}

export async function mutateDb(mutator) {
  const db = await readDb();
  const result = await mutator(db);
  await writeDb(db);
  return result;
}
