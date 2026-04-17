import { Router } from "express";
import { calculateCPA } from "../services/proximityService";
import { getVesselsInViewport } from "../db";
import { ViewportQuery } from "../types";

const router = Router();

// Search radius in degrees (~30 NM at equator, slightly more at higher latitudes)
const SEARCH_RADIUS_DEG = 0.5;

// GET /alerts/proximity?lat=X&lon=X&course=X&speed=X — proximity alerts
router.get("/alerts/proximity", async (req, res) => {
  const { lat, lon, course, speed } = req.query;

  if (!lat || !lon || !course || !speed) {
    return res.status(400).json({
      error: "Missing required query parameters: lat, lon, course, speed",
    });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);
  const userCourse = parseFloat(course as string);
  const userSpeed = parseFloat(speed as string);

  if ([latitude, longitude, userCourse, userSpeed].some(isNaN)) {
    return res
      .status(400)
      .json({ error: "All parameters must be valid numbers" });
  }

  try {
    // Build a bounding box around the user's position (~30 NM search radius)
    const viewport: ViewportQuery = {
      minLat: latitude - SEARCH_RADIUS_DEG,
      maxLat: latitude + SEARCH_RADIUS_DEG,
      minLon: longitude - SEARCH_RADIUS_DEG,
      maxLon: longitude + SEARCH_RADIUS_DEG,
    };

    const vessels = await getVesselsInViewport(viewport);

    const alerts = await calculateCPA(
      { lat: latitude, lon: longitude },
      userCourse,
      userSpeed,
      vessels,
    );
    res.json({ alerts });
  } catch (err) {
    console.error("Error calculating proximity:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
