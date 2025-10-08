import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Define safe absolute paths
const dbPath = path.join(__dirname, "../db/players.json");
const backupDir = path.join(__dirname, "../db/backups");

// ✅ Ensure folders exist
if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

// A small queue to avoid concurrent writes
let writeQueue = Promise.resolve();

export function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) return {};
    const content = fs.readFileSync(dbPath, "utf-8");
    return JSON.parse(content || "{}");
  } catch (err) {
    console.error("❌ Failed to load DB:", err);
    return {};
  }
}

export function saveDB(data) {
  // Queue writes so multiple saves don’t clash
  writeQueue = writeQueue.then(async () => {
    try {
      // ✅ Make timestamped backup first
      if (fs.existsSync(dbPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFile = path.join(backupDir, `players-${timestamp}.json`);
        fs.copyFileSync(dbPath, backupFile);
        console.log(`🧾 Backup saved → ${backupFile}`);
      }

      // ✅ Write new file safely
      const tmpPath = `${dbPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
      fs.renameSync(tmpPath, dbPath);
      console.log("💾 DB saved successfully");

      // ✅ Keep only 10 most recent backups
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith("players-"))
        .sort()
        .reverse();

      if (files.length > 10) {
        files.slice(10).forEach(f => fs.unlinkSync(path.join(backupDir, f)));
      }
    } catch (err) {
      console.error("❌ Failed to save DB:", err);
    }
  });

  return writeQueue;
}
