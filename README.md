# AIS Viewer

Real-time ship tracking system built for the [Orca AIS Viewer Challenge](https://github.com/orca-io/orca-challenges/tree/master/challenge-ais-viewer). Ingests live AIS data from aisstream.io and displays vessels on a Mapbox map with directional markers.



https://github.com/user-attachments/assets/1f8a1969-3dc5-4892-849f-3b11fcd08ca9



## Project Structure

```
orca-challenge/
├── app/          # Expo React Native app
├── backend/      # Node.js + TypeScript server
└── README.md
```

## Prerequisites

- Node.js (v18+)
- API keys are provided in the email. Create `.env` files as shown below.

## Quick Start

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` with the keys provided in the email:
```
AIS_API_KEY=<provided in email>
PORT=3001
MONGO_URI=<provided in email>
```

Start the server:
```bash
npm run dev
```

The backend will:
- Connect to MongoDB Atlas and create a `2dsphere` geospatial index
- Connect to AISStream WebSocket and receive live vessel positions
- Buffer incoming data and flush to MongoDB in batches (every 1s or 100 operations)
- Serve a REST API at http://localhost:3001

### 2. Frontend

```bash
cd app
npm install
```

Create `app/.env` with the keys provided in the email:
```
EXPO_PUBLIC_MAPBOX_TOKEN=<provided in email>
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Start Expo:
```bash
npx expo start
```

### 3. Run on Device/Simulator

For iOS simulator:
```bash
npx expo run:ios
```

For Android emulator:
```bash
npx expo run:android
```

**Note**: Mapbox requires a native build (not Expo Go). If testing on a physical device, set `EXPO_PUBLIC_API_URL` to your machine's local IP (e.g. `http://192.168.1.4:3001`) instead of `localhost`.

## API Endpoints

### GET /vessels

Returns vessels within a viewport bounding box. Uses MongoDB `$geoWithin` with a GeoJSON Polygon to query only the visible map area. Results are limited to 1000 and filtered to vessels updated within the last 10 minutes.

```
GET /vessels?minLat=51.5&maxLat=52.5&minLon=3.5&maxLon=5.5
```

Response:
```json
{
  "vessels": [
    {
      "mmsi": "244670560",
      "name": "ROTTERDAM EXPRESS",
      "latitude": 51.903,
      "longitude": 4.481,
      "course": 245.3,
      "speed": 12.1,
      "heading": 244,
      "updatedAt": 1706380800000
    }
  ],
  "count": 1,
  "timestamp": 1706380805000
}
```

### GET /status

Returns server, AIS connection, and database status.

```json
{
  "server": "running",
  "ais": {
    "connected": true,
    "messageCount": 58432,
    "lastMessageTime": 1706380800000
  },
  "database": {
    "total": 28500,
    "recent": 27800
  },
  "timestamp": 1706380805000
}
```

### GET /health

Health check endpoint. Returns `{ "status": "ok" }`.

### GET /hotspots

Returns areas with the highest vessel concentration. Useful for finding busy shipping areas.

```json
{
  "hotspots": [
    { "lat": 52, "lon": 5, "count": 1022 },
    { "lat": 51, "lon": 4, "count": 876 }
  ],
  "sampleVessels": [
    { "name": "ROTTERDAM EXPRESS", "latitude": 51.903, "longitude": 4.481 }
  ],
  "tip": "Navigate to these coordinates (zoom level 12+) to see vessels"
}
```

## How It Works

1. **AIS Ingestion** — The backend opens a WebSocket to aisstream.io and subscribes to `PositionReport` messages globally. Each message contains a ship's MMSI, name, position, course, speed, and heading.

2. **Batched Storage** — Incoming positions are buffered in memory and flushed to MongoDB Atlas in bulk (every 1 second or when the buffer hits 100 operations). Each vessel is upserted by MMSI so the same ship just gets its position updated.

3. **Geospatial Queries** — The `vessels` collection has a `2dsphere` index on the `location` field (stored as GeoJSON Point). When the app requests vessels, the backend constructs a GeoJSON Polygon from the viewport bounds and uses `$geoWithin` to efficiently find all vessels in that area.

4. **Frontend Polling** — The app polls `GET /vessels` every 3 seconds with the current map viewport bounds. It applies a client-side freshness filter (2 minutes) and renders each vessel as a directional boat marker rotated by its course.

## Features

- Real-time vessel tracking with 3-second polling
- MongoDB Atlas with `2dsphere` geospatial index for viewport queries
- Batched bulk writes for high-throughput AIS ingestion
- Vessels displayed only at zoom level 12+
- Stale vessels (>2 min old) automatically hidden on the client
- Directional boat markers with red bow tip showing vessel course
- Viewport-based data fetching (only retrieves visible area)
- Auto-reconnect on AIS WebSocket disconnection
- Data persists across backend reboots (MongoDB Atlas)

## Tech Stack

**Backend**
- Node.js + TypeScript
- Express.js
- MongoDB (native driver) with 2dsphere geospatial index
- WebSocket (ws) for AIS data ingestion

**Frontend**
- Expo SDK 54 + React Native
- Expo Router
- Mapbox Maps SDK (@rnmapbox/maps)
