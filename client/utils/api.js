// --------------------------------------------
// API Helper Functions for Discord RPG Game
// --------------------------------------------

// ✅ Fetch player data from the server (auto-creates if missing)
export async function fetchPlayer(accessToken) {
  const res = await fetch("/api/player", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    console.error("Failed to fetch player:", res.status);
    throw new Error("Failed to fetch player data");
  }

  return res.json();
}

// ✅ Update player stats on the server
export async function updatePlayer(accessToken, data) {
  const res = await fetch("/api/player/update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    console.error("Failed to update player:", res.status);
    throw new Error("Failed to update player data");
  }

  return res.json();
}
