# Data Docked API Integration Plan

## Overview
Replace aisstream.io (free, no SLA, beta) with Data Docked (€80/mo, satellite+terrestrial AIS, production-grade) as the primary AIS vessel data source. Keep aisstream.io as a free fallback.

## Data Docked API Details
- **Website:** https://datadocked.com
- **Pricing:** €80/month (credit-based), free trial with 100 credits
- **Rate Limits:** 100 req/min (Vessel Location API), 750 vessels/min (Bulk API)
- **Response Time:** <100ms
- **Coverage:** 800,000+ vessels globally (satellite + terrestrial AIS)
- **Format:** REST API, JSON responses
- **SDKs:** Python, JavaScript

## Key Endpoints We Need

### 1. Vessel Location API
- Get current position for a single vessel by MMSI or IMO
- Returns: lat, lon, speed, course, heading, nav status, destination, draught, ETA

### 2. Bulk Vessel Location API
- Get positions for up to 750 vessels per request
- Use for batch-fetching vessels in a viewport area

### 3. Vessels by Area API
- Radius-based search up to 50km from a coordinate
- Use for: finding vessels near a point (alternative to bounding box)
- **Note:** This is radius-based, not bounding box — we may need to adapt our viewport query to use center point + radius instead of min/max lat/lon

### 4. Vessel Details API
- Get static vessel data: name, type, flag, IMO, call sign, dimensions
- Use for: vessel detail bottom sheet

## Architecture Changes

### Backend Changes

#### New: `backend/src/services/dataDockedService.ts`
```typescript
// Data Docked API client
const BASE_URL = "https://api.datadocked.com/v1";
const API_KEY = process.env.DATA_DOCKED_API_KEY;

// Fetch vessels in an area (radius-based)
export async function getVesselsInArea(lat: number, lon: number, radiusKm: number): Promise<Vessel[]>

// Fetch single vessel details
export async function getVesselDetails(mmsi: string): Promise<VesselDetail>

// Bulk fetch vessel positions
export async function getBulkVesselPositions(mmsis: string[]): Promise<Vessel[]>
```

#### Modified: `backend/src/aisClient.ts`
- Keep aisstream.io WebSocket as fallback
- Add a flag/config to switch between Data Docked (polling) and aisstream.io (WebSocket)

#### Modified: `backend/src/db.ts`
- Data Docked returns data on-demand (pull) vs aisstream.io pushes continuously
- Two strategies:
  1. **Hybrid:** Keep aisstream.io WebSocket filling the DB continuously, use Data Docked for on-demand area queries when aisstream is down
  2. **Primary polling:** Backend polls Data Docked every N seconds for active viewport areas, caches in MongoDB

#### Recommended: Hybrid approach
```
Normal operation:
  aisstream.io WebSocket → continuous DB updates (free)
  Data Docked → on-demand single vessel lookups (paid, for detail pages)

If aisstream.io goes down:
  Data Docked Vessels by Area → replaces viewport queries
  Higher credit usage but keeps app working
```

This minimizes Data Docked credit usage (only pay for detail lookups normally) while having a production fallback.

### New Environment Variable
```
DATA_DOCKED_API_KEY=your_api_key_here
```

### Frontend Changes
- None — the frontend talks to our backend, not directly to Data Docked
- The `/vessels` and `/vessels/:mmsi` endpoints stay the same

## Credit Usage Estimate

Assuming hybrid approach:
- **Vessel detail lookups:** ~50-100/day (users tapping vessels) = ~50-100 credits/day
- **Fallback area queries:** 0 credits normally, ~500-1000/day if aisstream is down
- **Monthly estimate:** ~2,000-4,000 credits normal, ~30,000 credits if aisstream is down for a week

The €80/month plan should cover this comfortably.

## Implementation Steps

1. Sign up for Data Docked free trial
2. Create `dataDockedService.ts` with API client
3. Add `DATA_DOCKED_API_KEY` to backend `.env`
4. Modify `/vessels/:mmsi` endpoint to fetch from Data Docked if not in local DB
5. Add health check that detects aisstream.io downtime
6. Add fallback logic: if aisstream hasn't delivered data in 5 minutes, switch to Data Docked area queries
7. Test both modes
8. Monitor credit usage
