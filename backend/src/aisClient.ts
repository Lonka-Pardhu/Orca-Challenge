import WebSocket from "ws";
import { AISMessage, AISSubscription } from "./types";
import { upsertVessel, upsertVesselStatic } from "./db";

const AIS_STREAM_URL = "wss://stream.aisstream.io/v0/stream";

let ws: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let messageCount = 0;
let lastMessageTime = Date.now();

function createSubscription(apiKey: string): AISSubscription {
  return {
    APIKey: apiKey,
    // Global bounding box to receive all vessels
    BoundingBoxes: [
      [
        [-90, -180],
        [90, 180],
      ],
    ],
    FilterMessageTypes: ["PositionReport", "ShipStaticData"],
  };
}

function processMessage(data: AISMessage): void {
  const positionReport = data.Message.PositionReport;
  if (!positionReport) return;

  const { MetaData } = data;

  upsertVessel({
    mmsi: MetaData.MMSI_String,
    name: MetaData.ShipName?.trim() || null,
    latitude: positionReport.Latitude,
    longitude: positionReport.Longitude,
    course: positionReport.Cog,
    speed: positionReport.Sog,
    heading:
      positionReport.TrueHeading === 511 ? null : positionReport.TrueHeading,
    updatedAt: Date.now(),
  });

  messageCount++;
  lastMessageTime = Date.now();
}

function processStaticData(data: {
  MessageType: string;
  MetaData: { MMSI: number; MMSI_String: string; ShipName: string };
  Message: {
    ShipStaticData: {
      ImoNumber: number;
      CallSign: string;
      Destination: string;
      Type: number;
      MaximumStaticDraught: number;
      Dimension: { A: number; B: number; C: number; D: number };
    };
  };
}): void {
  const { MetaData } = data;
  const staticData = data.Message.ShipStaticData;

  upsertVesselStatic(MetaData.MMSI_String, {
    name: MetaData.ShipName?.trim() || null,
    shipType: staticData.Type,
    imo: staticData.ImoNumber ? String(staticData.ImoNumber) : undefined,
    callSign: staticData.CallSign?.trim() || undefined,
    destination: staticData.Destination?.trim() || undefined,
    draught: staticData.MaximumStaticDraught || undefined,
    dimensionA: staticData.Dimension?.A,
    dimensionB: staticData.Dimension?.B,
    dimensionC: staticData.Dimension?.C,
    dimensionD: staticData.Dimension?.D,
  });

  messageCount++;
  lastMessageTime = Date.now();
}

export function connect(apiKey: string): void {
  if (ws) {
    ws.close();
  }

  console.log("[AIS] Connecting to AIS stream...");

  ws = new WebSocket(AIS_STREAM_URL);

  ws.on("open", () => {
    console.log("[AIS] Connected to AIS stream");
    const subscription = createSubscription(apiKey);
    ws!.send(JSON.stringify(subscription));
    console.log("[AIS] Subscription sent");
  });

  ws.on("message", (rawData) => {
    try {
      const data = JSON.parse(rawData.toString());
      if (data.MessageType === "PositionReport") {
        processMessage(data as AISMessage);
      } else if (data.MessageType === "ShipStaticData") {
        processStaticData(data);
      }
    } catch (err) {
      console.error("[AIS] Error parsing message:", err);
    }
  });

  ws.on("error", (err) => {
    console.error("[AIS] WebSocket error:", err.message);
  });

  ws.on("close", (code, reason) => {
    console.log(`[AIS] Connection closed (${code}): ${reason}`);
    ws = null;

    // Reconnect after 5 seconds
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      console.log("[AIS] Attempting reconnection...");
      connect(apiKey);
    }, 5000);
  });
}

export function disconnect(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function getStatus(): {
  connected: boolean;
  messageCount: number;
  lastMessageTime: number;
} {
  return {
    connected: ws?.readyState === WebSocket.OPEN,
    messageCount,
    lastMessageTime,
  };
}
