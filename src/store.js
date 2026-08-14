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
    return db;
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    await writeDb(seedData);
    return structuredClone(seedData);
  }
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
