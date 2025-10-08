import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { createServer } from "http";
import { Server } from "socket.io";
import playerRouter from "./routes/player.js";

dotenv.config({ path: "../.env" });

const app = express();
const port = 3001;

// Parse JSON before routes
app.use(express.json());

// Player API routes
app.use("/api/player", playerRouter);

// Discord OAuth token exchange
app.post("/api/token", async (req, res) => {
  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.VITE_DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: req.body.code,
      }),
    });

    const data = await response.json();
    if (!data.access_token) {
      console.error("❌ Token exchange failed:", data);
      return res.status(400).json({ error: "Token exchange failed" });
    }

    res.json({ access_token: data.access_token });
  } catch (err) {
    console.error("Error in /api/token:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Socket.IO real-time layer ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const players = new Map();

io.on("connection", (socket) => {
  console.log(`🟢 Connected: ${socket.id}`);

  // Spawn near world center
  const playerData = {
    x: 1000 + Math.random() * 200 - 100,
    y: 1000 + Math.random() * 200 - 100,
    name: `Player-${socket.id.slice(0, 4)}`,
  };

  players.set(socket.id, playerData);
  socket.emit("init", Object.fromEntries(players));
  socket.broadcast.emit("playerJoined", { id: socket.id, ...playerData });

  socket.on("move", (pos) => {
    const p = players.get(socket.id);
    if (!p) return;
    players.set(socket.id, { ...p, ...pos });
    socket.broadcast.emit("playerMoved", { id: socket.id, ...pos });
  });

  socket.on("disconnect", () => {
    console.log(`🔴 Disconnected: ${socket.id}`);
    players.delete(socket.id);
    io.emit("playerLeft", socket.id);
  });
});

httpServer.listen(port, () =>
  console.log(`✅ Server running on port ${port}`)
);
