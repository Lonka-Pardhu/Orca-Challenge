import { MongoClient, Collection, AnyBulkWriteOperation } from "mongodb";
import { Vessel, ViewportQuery } from "./types";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = "ais_viewer";
const COLLECTION_NAME = "vessels";

// Requirement: most vessels are relatively fresh (updated within 10 minutes)
const FRESHNESS_MS = 10 * 60 * 1000;

// MongoDB document shape with GeoJSON location
interface VesselDoc {
  _id: string; // MMSI as natural unique key
  name: string | null;
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  course: number | null;
  speed: number | null;
  heading: number | null;
  updatedAt: Date;
}

let client: MongoClient;
let vessels: Collection<VesselDoc>;

// Batch write buffer for high-throughput AIS ingestion
let writeBuffer: AnyBulkWriteOperation<VesselDoc>[] = [];
const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 1000;
let flushTimer: NodeJS.Timeout | null = null;

async function flushWrites(): Promise<void> {
  if (writeBuffer.length === 0) return;
  const ops = writeBuffer.splice(0);
  try {
    await vessels.bulkWrite(ops, { ordered: false });
  } catch (err) {
    console.error("[DB] Bulk write error:", err);
  }
}

export async function connectDb(): Promise<void> {
  client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  vessels = db.collection<VesselDoc>(COLLECTION_NAME);

  // Create geospatial and time indexes (idempotent)
  await vessels.createIndex({ location: "2dsphere" });
  await vessels.createIndex({ updatedAt: 1 });

  // Start periodic flush for batched writes
  flushTimer = setInterval(flushWrites, FLUSH_INTERVAL_MS);

  console.log("[DB] Connected to MongoDB with 2dsphere geospatial index");
}

export function upsertVessel(
  vessel: Omit<Vessel, "updatedAt"> & { updatedAt?: number },
): void {
  const now = vessel.updatedAt ? new Date(vessel.updatedAt) : new Date();

  writeBuffer.push({
    updateOne: {
      filter: { _id: vessel.mmsi },
      update: {
        $set: {
          name: vessel.name,
          location: {
            type: "Point" as const,
            coordinates: [vessel.longitude, vessel.latitude], // [lon, lat]
          },
          course: vessel.course,
          speed: vessel.speed,
          heading: vessel.heading,
          updatedAt: now,
        },
      },
      upsert: true,
    },
  });

  // Flush when buffer is full
  if (writeBuffer.length >= BATCH_SIZE) {
    flushWrites();
  }
}

export async function getVesselsInViewport(
  query: ViewportQuery,
  maxAgeMs: number = FRESHNESS_MS,
): Promise<Vessel[]> {
  const minTime = new Date(Date.now() - maxAgeMs);

  const docs = await vessels
    .find({
      location: {
        $geoWithin: {
          $geometry: {
            type: "Polygon",
            coordinates: [
              [
                [query.minLon, query.minLat],
                [query.maxLon, query.minLat],
                [query.maxLon, query.maxLat],
                [query.minLon, query.maxLat],
                [query.minLon, query.minLat], // close the ring
              ],
            ],
          },
        },
      },
      updatedAt: { $gte: minTime },
    })
    .limit(1000)
    .toArray();

  // Map back to Vessel interface (keeps API response identical)
  return docs.map((doc) => ({
    mmsi: doc._id,
    name: doc.name,
    latitude: doc.location.coordinates[1],
    longitude: doc.location.coordinates[0],
    course: doc.course,
    speed: doc.speed,
    heading: doc.heading,
    updatedAt: doc.updatedAt.getTime(),
  }));
}

export async function getStats(): Promise<{ total: number; recent: number }> {
  const recentTime = new Date(Date.now() - FRESHNESS_MS);

  const [total, recent] = await Promise.all([
    vessels.countDocuments(),
    vessels.countDocuments({ updatedAt: { $gte: recentTime } }),
  ]);

  return { total, recent };
}

export async function getHotspots(): Promise<
  { lat: number; lon: number; count: number }[]
> {
  const recentTime = new Date(Date.now() - FRESHNESS_MS);

  const results = await vessels
    .aggregate<{ _id: { lat: number; lon: number }; count: number }>([
      { $match: { updatedAt: { $gte: recentTime } } },
      {
        $group: {
          _id: {
            lat: {
              $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 0],
            },
            lon: {
              $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 0],
            },
          },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ])
    .toArray();

  return results.map((r) => ({
    lat: r._id.lat,
    lon: r._id.lon,
    count: r.count,
  }));
}

export async function getSampleVessels(): Promise<
  { name: string; latitude: number; longitude: number }[]
> {
  const recentTime = new Date(Date.now() - FRESHNESS_MS);

  const docs = await vessels
    .aggregate<VesselDoc>([
      {
        $match: {
          updatedAt: { $gte: recentTime },
          name: { $nin: [null, ""] },
        },
      },
      { $sample: { size: 10 } },
    ])
    .toArray();

  return docs.map((d) => ({
    name: d.name || "",
    latitude: d.location.coordinates[1],
    longitude: d.location.coordinates[0],
  }));
}

export async function closeDb(): Promise<void> {
  if (flushTimer) clearInterval(flushTimer);
  await flushWrites(); // Flush remaining writes
  await client?.close();
}
