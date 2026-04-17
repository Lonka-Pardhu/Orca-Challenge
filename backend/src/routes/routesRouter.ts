import { Router, Request, Response } from "express";
import {
  createRoute,
  getAllRoutes,
  getRouteById,
  updateRoute,
  deleteRoute,
} from "../db";
import { Waypoint } from "../types";

const router = Router();

function isValidLatLon(lat: unknown, lon: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

function validateWaypoints(waypoints: unknown): waypoints is Waypoint[] {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return false;
  return waypoints.every(
    (wp) =>
      wp !== null &&
      typeof wp === "object" &&
      isValidLatLon(wp.lat, wp.lon),
  );
}

// POST /routes — create a new route
router.post("/routes", async (req: Request, res: Response) => {
  try {
    const { name, waypoints } = req.body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "name is required and must be a non-empty string" });
    }

    if (!validateWaypoints(waypoints)) {
      return res.status(400).json({
        error: "waypoints must be an array of at least 2 points, each with valid lat (-90..90) and lon (-180..180)",
      });
    }

    const route = await createRoute({ name: name.trim(), waypoints });
    return res.status(201).json(route);
  } catch (err) {
    console.error("[Routes] POST error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /routes — list all routes
router.get("/routes", async (_req: Request, res: Response) => {
  try {
    const routes = await getAllRoutes();
    return res.json({ routes, count: routes.length });
  } catch (err) {
    console.error("[Routes] GET list error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /routes/:id — get a single route
router.get("/routes/:id", async (req: Request, res: Response) => {
  try {
    const route = await getRouteById(req.params.id as string);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }
    return res.json(route);
  } catch (err) {
    console.error("[Routes] GET by id error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /routes/:id — update a route
router.put("/routes/:id", async (req: Request, res: Response) => {
  try {
    const { name, waypoints } = req.body;
    const updates: { name?: string; waypoints?: Waypoint[] } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "name must be a non-empty string" });
      }
      updates.name = name.trim();
    }

    if (waypoints !== undefined) {
      if (!validateWaypoints(waypoints)) {
        return res.status(400).json({
          error: "waypoints must be an array of at least 2 points, each with valid lat (-90..90) and lon (-180..180)",
        });
      }
      updates.waypoints = waypoints;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update (provide name and/or waypoints)" });
    }

    const route = await updateRoute(req.params.id as string, updates);
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }
    return res.json(route);
  } catch (err) {
    console.error("[Routes] PUT error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /routes/:id — delete a route
router.delete("/routes/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await deleteRoute(req.params.id as string);
    if (!deleted) {
      return res.status(404).json({ error: "Route not found" });
    }
    return res.json({ deleted: true });
  } catch (err) {
    console.error("[Routes] DELETE error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
