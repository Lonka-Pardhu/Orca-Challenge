import Database from 'better-sqlite3';
import path from 'path';
import { Vessel, ViewportQuery } from './types';

const DB_PATH = path.join(__dirname, '..', 'vessels.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS vessels (
    mmsi TEXT PRIMARY KEY,
    name TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    course REAL,
    speed REAL,
    heading REAL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_vessels_location ON vessels(latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_vessels_updated ON vessels(updated_at);
`);

// Prepared statements for better performance
const upsertStmt = db.prepare(`
  INSERT INTO vessels (mmsi, name, latitude, longitude, course, speed, heading, updated_at)
  VALUES (@mmsi, @name, @latitude, @longitude, @course, @speed, @heading, @updatedAt)
  ON CONFLICT(mmsi) DO UPDATE SET
    name = COALESCE(@name, vessels.name),
    latitude = @latitude,
    longitude = @longitude,
    course = @course,
    speed = @speed,
    heading = @heading,
    updated_at = @updatedAt
`);

const queryViewportStmt = db.prepare(`
  SELECT mmsi, name, latitude, longitude, course, speed, heading, updated_at as updatedAt
  FROM vessels
  WHERE latitude >= @minLat AND latitude <= @maxLat
    AND longitude >= @minLon AND longitude <= @maxLon
    AND updated_at >= @minTime
  ORDER BY updated_at DESC
  LIMIT 1000
`);

const getStatsStmt = db.prepare(`
  SELECT
    COUNT(*) as total,
    SUM(CASE WHEN updated_at >= @recentTime THEN 1 ELSE 0 END) as recent
  FROM vessels
`);

export function upsertVessel(vessel: Omit<Vessel, 'updatedAt'> & { updatedAt?: number }): void {
  upsertStmt.run({
    mmsi: vessel.mmsi,
    name: vessel.name,
    latitude: vessel.latitude,
    longitude: vessel.longitude,
    course: vessel.course,
    speed: vessel.speed,
    heading: vessel.heading,
    updatedAt: vessel.updatedAt ?? Date.now(),
  });
}

export function getVesselsInViewport(query: ViewportQuery, maxAgeMs: number = 120000): Vessel[] {
  const minTime = Date.now() - maxAgeMs;
  return queryViewportStmt.all({
    ...query,
    minTime,
  }) as Vessel[];
}

export function getStats(): { total: number; recent: number } {
  const twoMinutesAgo = Date.now() - 120000;
  return getStatsStmt.get({ recentTime: twoMinutesAgo }) as { total: number; recent: number };
}

export function getHotspots(): { lat: number; lon: number; count: number }[] {
  const twoMinutesAgo = Date.now() - 120000;
  const hotspotsStmt = db.prepare(`
    SELECT
      ROUND(latitude, 0) as lat,
      ROUND(longitude, 0) as lon,
      COUNT(*) as count
    FROM vessels
    WHERE updated_at >= ?
    GROUP BY ROUND(latitude, 0), ROUND(longitude, 0)
    HAVING COUNT(*) >= 5
    ORDER BY count DESC
    LIMIT 20
  `);
  return hotspotsStmt.all(twoMinutesAgo) as { lat: number; lon: number; count: number }[];
}

export function getSampleVessels(): { name: string; latitude: number; longitude: number }[] {
  const twoMinutesAgo = Date.now() - 120000;
  const sampleStmt = db.prepare(`
    SELECT name, latitude, longitude
    FROM vessels
    WHERE updated_at >= ? AND name IS NOT NULL AND name != ''
    ORDER BY RANDOM()
    LIMIT 10
  `);
  return sampleStmt.all(twoMinutesAgo) as { name: string; latitude: number; longitude: number }[];
}

export function closeDb(): void {
  db.close();
}
