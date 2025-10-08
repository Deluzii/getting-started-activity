import { DiscordSDK } from "@discord/embedded-app-sdk";
import { io } from "socket.io-client";
import rocketLogo from "/rocket.png";
import "./style.css";

let auth;
const discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);

// --- Discord Authentication ---
async function setupDiscordSdk() {
  await discordSdk.ready();
  console.log("✅ Discord SDK ready");

  const { code } = await discordSdk.commands.authorize({
    client_id: import.meta.env.VITE_DISCORD_CLIENT_ID,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "guilds", "applications.commands"],
  });

  const response = await fetch("/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const { access_token } = await response.json();
  auth = await discordSdk.commands.authenticate({ access_token });

  if (!auth) throw new Error("Authenticate command failed");
  console.log("✅ Discord SDK authenticated");
  return access_token;
}

// --- API helpers ---
async function fetchPlayer(token) {
  const res = await fetch("/api/player", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await res.json();
}

async function updatePlayer(token, data) {
  await fetch("/api/player/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

// --- Game Logic ---
async function startGame(character) {
  const app = document.querySelector("#app");
  app.innerHTML = `
    <div class="game-screen">
      <div id="game-area">
        <div id="player"></div>
      </div>

      <div class="stats">
        <p>Lv. ${character.level}</p>
        <p>HP: ${character.hp}</p>
        <p>ATK: ${character.atk}</p>
        <p>Gold: ${character.gold}</p>
      </div>

      <button id="inventory-btn" class="btn-inventory">Inventory 🎒</button>
      <div id="log" class="log-box"></div>
      <button id="reset-btn" class="btn-reset">Reset Character 🔄</button>
    </div>
  `;

  const player = document.getElementById("player");
  const gameArea = document.getElementById("game-area");

  // Socket connects automatically (same domain)
  const socket = io();
  const others = {};

  const MAP_W = 2000;
  const MAP_H = 2000;
  const SPEED = 6;
  let pos = { x: MAP_W / 2, y: MAP_H / 2 };

  const keys = {};
  window.addEventListener("keydown", (e) => (keys[e.key.toLowerCase()] = true));
  window.addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));

  // --- Socket events ---
  socket.on("connect", () => console.log("🟢 Connected:", socket.id));
  socket.on("init", (players) => {
    for (const [id, info] of Object.entries(players)) {
      if (id !== socket.id) spawnOtherPlayer(id, info);
    }
  });
  socket.on("playerJoined", (p) => spawnOtherPlayer(p.id, p));
  socket.on("playerMoved", (d) => {
    const el = others[d.id];
    if (el) {
      el.style.left = d.x + "px";
      el.style.top = d.y + "px";
    }
  });
  socket.on("playerLeft", (id) => {
    if (others[id]) others[id].remove();
    delete others[id];
  });

  function spawnOtherPlayer(id, data) {
    const el = document.createElement("div");
    el.className = "other-player";
    el.style.left = data.x + "px";
    el.style.top = data.y + "px";
    gameArea.appendChild(el);
    others[id] = el;
  }

  function gameLoop() {
    let moved = false;
    if (keys["w"]) { pos.y -= SPEED; moved = true; }
    if (keys["s"]) { pos.y += SPEED; moved = true; }
    if (keys["a"]) { pos.x -= SPEED; moved = true; }
    if (keys["d"]) { pos.x += SPEED; moved = true; }

    pos.x = Math.max(0, Math.min(MAP_W - 50, pos.x));
    pos.y = Math.max(0, Math.min(MAP_H - 50, pos.y));

    player.style.left = pos.x + "px";
    player.style.top = pos.y + "px";

    const camX = window.innerWidth / 2 - pos.x - 25;
    const camY = window.innerHeight / 2 - pos.y - 25;
    gameArea.style.transform = `translate(${camX}px, ${camY}px)`;

    if (moved) socket.emit("move", pos);
    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);

  const logBox = document.getElementById("log");
  document.getElementById("inventory-btn").addEventListener("click", () => {
    const msg = document.createElement("p");
    msg.textContent = "👜 Inventory is empty for now.";
    logBox.appendChild(msg);
  });

  document.getElementById("reset-btn").addEventListener("click", async () => {
    if (!confirm("Reset character?")) return;
    character = { hp: 30, atk: 5, level: 1, exp: 0, gold: 0 };
    await updatePlayer(auth.access_token, character);
    startGame(await fetchPlayer(auth.access_token));
  });
}

// --- Main menu ---
document.querySelector("#app").innerHTML = `
  <div class="menu-container">
    <img src="${rocketLogo}" class="logo" alt="Logo" />
    <h1 class="game-title">Discord RPG</h1>
    <p class="subtitle">Press Start</p>
    <button id="start-btn" class="menu-btn">Start Game</button>
  </div>
`;

document.getElementById("start-btn").addEventListener("click", async () => {
  try {
    await setupDiscordSdk();
    const playerData = await fetchPlayer(auth.access_token);
    startGame(playerData);
  } catch (err) {
    console.error("❌ Error starting game:", err);
  }
});
