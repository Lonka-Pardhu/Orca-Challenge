import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDb, getStats, closeDb } from "./db";
import {
  connect as connectAIS,
  disconnect as disconnectAIS,
  getStatus,
} from "./aisClient";

import vesselRouter from "./routes/vessels";
import weatherRouter from "./routes/weather";
import routesRouter from "./routes/routesRouter";
import alertsRouter from "./routes/alerts";

const app = express();
const PORT = process.env.PORT || 3001;
const AIS_API_KEY = process.env.AIS_API_KEY;

if (!AIS_API_KEY) {
  console.error("ERROR: AIS_API_KEY environment variable is required");
  console.error("Get your free API key at https://aisstream.io");
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Mount route modules
app.use(vesselRouter);
app.use(weatherRouter);
app.use(routesRouter);
app.use(alertsRouter);

// GET /status - Returns server and AIS connection status
app.get("/status", async (_req, res) => {
  const aisStatus = getStatus();
  const dbStats = await getStats();

  res.json({
    server: "running",
    ais: aisStatus,
    database: dbStats,
    timestamp: Date.now(),
  });
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

let server: ReturnType<typeof app.listen>;

async function main() {
  // Connect to MongoDB before starting the server
  await connectDb();

  server = app.listen(PORT, () => {
    console.log(
      `[Server] AIS Viewer backend running on http://localhost:${PORT}`,
    );
    console.log("[Server] Endpoints:");
    console.log(`  GET /vessels?minLat=X&maxLat=X&minLon=X&maxLon=X`);
    console.log(`  GET /vessels/:mmsi`);
    console.log(`  GET /hotspots`);
    console.log(`  GET /weather?lat=X&lon=X`);
    console.log(`  GET /tides?lat=X&lon=X`);
    console.log(`  GET /alerts/proximity?lat=X&lon=X&course=X&speed=X`);
    console.log(`  GET /routes`);
    console.log(`  GET /status`);
    console.log(`  GET /health`);

    // Connect to AIS stream
    connectAIS(AIS_API_KEY!);
  });

  // Periodic status logging
  setInterval(async () => {
    const status = getStatus();
    const stats = await getStats();
    console.log(
      `[Status] AIS ${status.connected ? "connected" : "disconnected"} | ` +
        `Messages: ${status.messageCount} | ` +
        `DB Total: ${stats.total} | Recent (10min): ${stats.recent}`,
    );
  }, 30000);
}

main().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});

// Graceful shutdown
async function shutdown() {
  console.log("\n[Server] Shutting down...");
  disconnectAIS();
  await closeDb();
  server?.close(() => {
    console.log("[Server] Goodbye!");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());
