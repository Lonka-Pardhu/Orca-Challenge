import { Router } from "express";
import {
  getVesselsInViewport,
  getHotspots,
  getSampleVessels,
  getVesselByMmsi,
} from "../db";
import { ViewportQuery } from "../types";

const router = Router();

// GET /vessels - Returns vessels within viewport
router.get("/vessels", async (req, res) => {
  const { minLat, maxLat, minLon, maxLon } = req.query;

  // Validate required parameters
  if (!minLat || !maxLat || !minLon || !maxLon) {
    return res.status(400).json({
      error:
        "Missing required query parameters: minLat, maxLat, minLon, maxLon",
    });
  }

  const query: ViewportQuery = {
    minLat: parseFloat(minLat as string),
    maxLat: parseFloat(maxLat as string),
    minLon: parseFloat(minLon as string),
    maxLon: parseFloat(maxLon as string),
  };

  // Validate parsed values
  if (Object.values(query).some(isNaN)) {
    return res.status(400).json({
      error: "Query parameters must be valid numbers",
    });
  }

  // Validate viewport bounds: min <= max
  if (query.minLat > query.maxLat || query.minLon > query.maxLon) {
    return res.status(400).json({
      error:
        "Invalid viewport: minLat must be <= maxLat and minLon must be <= maxLon",
    });
  }

  // Reject unreasonably large viewports (full world or more)
  const latSpan = query.maxLat - query.minLat;
  const lonSpan = query.maxLon - query.minLon;
  if (latSpan > 180 || lonSpan > 360) {
    return res.status(400).json({
      error: "Viewport too large: limit lat span to 180° and lon span to 360°",
    });
  }

  try {
    const vessels = await getVesselsInViewport(query);
    res.json({
      vessels,
      count: vessels.length,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Error fetching vessels:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /vessels/:mmsi - Returns a single vessel by MMSI
router.get("/vessels/:mmsi", async (req, res) => {
  const { mmsi } = req.params;

  if (!mmsi || !/^\d+$/.test(mmsi)) {
    return res.status(400).json({ error: "Invalid MMSI format" });
  }

  try {
    const vessel = await getVesselByMmsi(mmsi);
    if (!vessel) {
      return res.status(404).json({ error: "Vessel not found" });
    }
    res.json(vessel);
  } catch (err) {
    console.error("Error fetching vessel:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /hotspots - Returns areas with most vessels (for finding ships)
router.get("/hotspots", async (_req, res) => {
  try {
    const [hotspots, samples] = await Promise.all([
      getHotspots(),
      getSampleVessels(),
    ]);

    res.json({
      hotspots,
      sampleVessels: samples,
      tip: "Navigate to these coordinates (zoom level 12+) to see vessels",
    });
  } catch (err) {
    console.error("Error fetching hotspots:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
