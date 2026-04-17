import { MongoClient, Collection, AnyBulkWriteOperation, ObjectId } from "mongodb";
import { Vessel, VesselDetail, ViewportQuery, Route, Waypoint } from "./types";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = "ais_viewer";
const COLLECTION_NAME = "vessels";

// Only show vessels updated within the last 10 minutes
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

interface WeatherCacheDoc {
  _id: string;
  data: unknown;
  fetchedAt: Date;
}

interface RouteDoc {
  _id?: string;
  name: string;
  waypoints: { lat: number; lon: number; name?: string }[];
  createdAt: number;
  updatedAt?: number;
}

let client: MongoClient;
let vessels: Collection<VesselDoc>;
let routesCollection: Collection<RouteDoc>;
let weatherCacheCollection: Collection<WeatherCacheDoc>;

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

  routesCollection = db.collection<RouteDoc>("routes");
  weatherCacheCollection = db.collection<WeatherCacheDoc>("weather_cache");

  // Create geospatial and time indexes (idempotent)
  await vessels.createIndex({ location: "2dsphere" });
  await vessels.createIndex({ updatedAt: 1 });

  // TTL index on weather cache — expire after 30 minutes
  await weatherCacheCollection.createIndex(
    { fetchedAt: 1 },
    { expireAfterSeconds: 1800 },
  );

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

export function upsertVesselStatic(
  mmsi: string,
  staticData: {
    name: string | null;
    shipType?: number;
    imo?: string;
    callSign?: string;
    destination?: string;
    draught?: number;
    dimensionA?: number;
    dimensionB?: number;
    dimensionC?: number;
    dimensionD?: number;
  },
): void {
  const setFields: Record<string, unknown> = { updatedAt: new Date() };
  if (staticData.name) setFields.name = staticData.name;
  if (staticData.shipType !== undefined) setFields.shipType = staticData.shipType;
  if (staticData.imo !== undefined) setFields.imo = staticData.imo;
  if (staticData.callSign !== undefined) setFields.callSign = staticData.callSign;
  if (staticData.destination !== undefined)
    setFields.destination = staticData.destination;
  if (staticData.draught !== undefined) setFields.draught = staticData.draught;
  if (staticData.dimensionA !== undefined)
    setFields.dimensionA = staticData.dimensionA;
  if (staticData.dimensionB !== undefined)
    setFields.dimensionB = staticData.dimensionB;
  if (staticData.dimensionC !== undefined)
    setFields.dimensionC = staticData.dimensionC;
  if (staticData.dimensionD !== undefined)
    setFields.dimensionD = staticData.dimensionD;

  writeBuffer.push({
    updateOne: {
      filter: { _id: mmsi },
      update: { $set: setFields },
      upsert: false, // Only update existing vessels (need position first)
    },
  });

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
    shipType: doc.shipType ?? null,
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

export function getRoutesCollection(): Collection<RouteDoc> {
  return routesCollection;
}

export function getWeatherCacheCollection(): Collection<WeatherCacheDoc> {
  return weatherCacheCollection;
}

export async function getVesselByMmsi(
  mmsi: string,
): Promise<VesselDetail | null> {
  const doc = await vessels.findOne({ _id: mmsi });
  if (!doc) return null;

  const result: VesselDetail = {
    mmsi: doc._id,
    name: doc.name,
    latitude: doc.location.coordinates[1],
    longitude: doc.location.coordinates[0],
    course: doc.course,
    speed: doc.speed,
    heading: doc.heading,
    updatedAt: doc.updatedAt.getTime(),
  };

  // Include static data fields if present
  const anyDoc = doc as Record<string, unknown>;
  if (anyDoc.shipType !== undefined) result.shipType = anyDoc.shipType as number;
  if (anyDoc.imo !== undefined) result.imo = anyDoc.imo as string;
  if (anyDoc.callSign !== undefined) result.callSign = anyDoc.callSign as string;
  if (anyDoc.destination !== undefined)
    result.destination = anyDoc.destination as string;
  if (anyDoc.draught !== undefined) result.draught = anyDoc.draught as number;
  if (anyDoc.dimensionA !== undefined)
    result.dimensionA = anyDoc.dimensionA as number;
  if (anyDoc.dimensionB !== undefined)
    result.dimensionB = anyDoc.dimensionB as number;
  if (anyDoc.dimensionC !== undefined)
    result.dimensionC = anyDoc.dimensionC as number;
  if (anyDoc.dimensionD !== undefined)
    result.dimensionD = anyDoc.dimensionD as number;

  return result;
}

// ── Route CRUD helpers ──────────────────────────────────────────────

export async function createRoute(
  route: Omit<Route, "_id" | "createdAt">,
): Promise<Route> {
  const doc: RouteDoc = {
    _id: new ObjectId().toHexString(),
    name: route.name,
    waypoints: route.waypoints,
    createdAt: Date.now(),
  };
  await routesCollection.insertOne(doc as any);
  return doc as Route;
}

export async function getAllRoutes(): Promise<Route[]> {
  return routesCollection.find().sort({ createdAt: -1 }).toArray() as unknown as Route[];
}

export async function getRouteById(id: string): Promise<Route | null> {
  return routesCollection.findOne({ _id: id }) as unknown as Route | null;
}

export async function updateRoute(
  id: string,
  updates: { name?: string; waypoints?: Waypoint[] },
): Promise<Route | null> {
  const setFields: Record<string, unknown> = { updatedAt: Date.now() };
  if (updates.name !== undefined) setFields.name = updates.name;
  if (updates.waypoints !== undefined) setFields.waypoints = updates.waypoints;

  const result = await routesCollection.findOneAndUpdate(
    { _id: id } as any,
    { $set: setFields },
    { returnDocument: "after" },
  );
  return (result as unknown as Route) || null;
}

export async function deleteRoute(id: string): Promise<boolean> {
  const result = await routesCollection.deleteOne({ _id: id } as any);
  return result.deletedCount === 1;
}

export async function closeDb(): Promise<void> {
  if (flushTimer) clearInterval(flushTimer);
  await flushWrites(); // Flush remaining writes
  await client?.close();
}
