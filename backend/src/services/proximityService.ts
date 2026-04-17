import { ProximityAlert, Vessel } from "../types";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const NM_PER_DEG_LAT = 60; // 1 degree latitude = 60 nautical miles

/**
 * Calculate Closest Point of Approach (CPA) and Time to CPA (TCPA)
 * between user's vessel and nearby vessels.
 *
 * Uses equirectangular approximation for local coordinate conversion
 * and linear motion model for CPA/TCPA prediction.
 */
export async function calculateCPA(
  userPos: { lat: number; lon: number },
  userCourse: number,
  userSpeed: number,
  vessels: Vessel[],
): Promise<ProximityAlert[]> {
  const cosLat = Math.cos(userPos.lat * DEG_TO_RAD);

  // User velocity vector (NM/hour), course is degrees clockwise from north
  const userVx = userSpeed * Math.sin(userCourse * DEG_TO_RAD);
  const userVy = userSpeed * Math.cos(userCourse * DEG_TO_RAD);

  const alerts: ProximityAlert[] = [];

  for (const vessel of vessels) {
    // Skip vessels without course or speed — can't predict their path
    if (vessel.course === null || vessel.speed === null) continue;

    // 1. Convert vessel position to local coordinates (NM from user)
    const dx = (vessel.longitude - userPos.lon) * cosLat * NM_PER_DEG_LAT;
    const dy = (vessel.latitude - userPos.lat) * NM_PER_DEG_LAT;

    // 2. Vessel velocity vector (NM/hour)
    const vesselVx = vessel.speed * Math.sin(vessel.course * DEG_TO_RAD);
    const vesselVy = vessel.speed * Math.cos(vessel.course * DEG_TO_RAD);

    // 3. Relative position and velocity (vessel relative to user)
    const relVx = vesselVx - userVx;
    const relVy = vesselVy - userVy;

    const relVelSq = relVx * relVx + relVy * relVy;

    let cpa: number;
    let tcpaMinutes: number;

    if (relVelSq < 1e-10) {
      // Vessels have essentially the same velocity — CPA is current distance
      cpa = Math.sqrt(dx * dx + dy * dy);
      // No meaningful TCPA when relative velocity is ~zero; skip
      continue;
    }

    // 4. TCPA in hours = -(relPos dot relVel) / |relVel|^2
    const tcpaHours = -(dx * relVx + dy * relVy) / relVelSq;

    // Vessels are diverging (TCPA in the past)
    if (tcpaHours <= 0) continue;

    tcpaMinutes = tcpaHours * 60;

    // Only interested in approaches within 60 minutes
    if (tcpaMinutes > 60) continue;

    // 5. CPA = distance at TCPA
    const cpaX = dx + relVx * tcpaHours;
    const cpaY = dy + relVy * tcpaHours;
    cpa = Math.sqrt(cpaX * cpaX + cpaY * cpaY);

    // 6. Bearing from user to vessel (current bearing, degrees true)
    let bearing = Math.atan2(dx, dy) * RAD_TO_DEG;
    if (bearing < 0) bearing += 360;

    alerts.push({
      mmsi: vessel.mmsi,
      vesselName: vessel.name,
      cpa: Math.round(cpa * 100) / 100, // round to 2 decimal places
      tcpa: Math.round(tcpaMinutes * 10) / 10, // round to 1 decimal place
      bearing: Math.round(bearing),
    });
  }

  // Sort by CPA ascending (closest approach first), return top 20
  alerts.sort((a, b) => a.cpa - b.cpa);
  return alerts.slice(0, 20);
}
