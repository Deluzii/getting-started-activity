import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "../db/players.json");

function loadDB() {
  try {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
  } catch (e) {
    console.error("DB load failed:", e);
    return {};
  }
}
function saveDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// --- Get or create player ---
router.get("/", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  const db = loadDB();
  const player =
    db[token] || { name: "Adventurer", hp: 30, atk: 5, level: 1, exp: 0, gold: 0 };

  db[token] = player;
  saveDB(db);
  res.json(player);
});

// --- Update player stats ---
router.post("/update", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  const { hp, atk, level, exp, gold } = req.body || {};
  if (hp === undefined) return res.status(400).json({ error: "Missing body" });

  const db = loadDB();
  db[token] = { ...db[token], hp, atk, level, exp, gold };
  saveDB(db);
  res.json(db[token]);
});

export default router;
