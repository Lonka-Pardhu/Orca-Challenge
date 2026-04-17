import { Router } from "express";
import { getWeatherFull } from "../services/weatherService";
import { getTidePredictions } from "../services/tideService";

const router = Router();

// GET /weather?lat=X&lon=X — current weather + hourly forecast for a location
router.get("/weather", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res
      .status(400)
      .json({ error: "Missing required query parameters: lat, lon" });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res
      .status(400)
      .json({ error: "lat and lon must be valid numbers" });
  }

  try {
    const { current, hourly } = await getWeatherFull(latitude, longitude);
    res.json({
      current,
      hourly,
      location: { lat: latitude, lon: longitude },
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("[Route] Error fetching weather:", err);
    res.status(500).json({ error: "Failed to fetch weather data" });
  }
});

// GET /tides?lat=X&lon=X — tide predictions with nearest station info
router.get("/tides", async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res
      .status(400)
      .json({ error: "Missing required query parameters: lat, lon" });
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lon as string);

  if (isNaN(latitude) || isNaN(longitude)) {
    return res
      .status(400)
      .json({ error: "lat and lon must be valid numbers" });
  }

  try {
    const tideResponse = await getTidePredictions(latitude, longitude);
    res.json(tideResponse);
  } catch (err) {
    console.error("[Route] Error fetching tides:", err);
    res.status(500).json({ error: "Failed to fetch tide data" });
  }
});

export default router;
