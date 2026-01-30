# AIS Viewer

Real-time ship tracking system built for the Orca challenge. Displays vessels from the AIS (Automatic Identification System) on a Mapbox map.

## Project Structure

```
orca-challenge/
├── app/          # Expo React Native app
├── backend/      # Node.js server
└── README.md
```

## Prerequisites

1. **Mapbox Account**: Get a free access token at https://account.mapbox.com
2. **AISStream Account**: Get a free API key at https://aisstream.io

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your AIS_API_KEY

# Start the server
npm run dev
```

The backend will:
- Connect to AISStream WebSocket and receive live vessel data
- Store vessel positions in SQLite database
- Serve API at http://localhost:3001

### 2. Frontend Setup

```bash
cd app
npm install

# Create .env file
cp .env.example .env
# Edit .env and add your EXPO_PUBLIC_MAPBOX_TOKEN

# Start Expo
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

**Note**: Mapbox requires a native build (not Expo Go).

## API Endpoints

### GET /vessels

Returns vessels within a viewport bounding box.

```
GET /vessels?minLat=37.5&maxLat=38.0&minLon=-122.5&maxLon=-122.0
```

Response:
```json
{
  "vessels": [
    {
      "mmsi": "123456789",
      "name": "VESSEL NAME",
      "latitude": 37.789,
      "longitude": -122.401,
      "course": 45.5,
      "speed": 12.3,
      "heading": 44,
      "updatedAt": 1706380800000
    }
  ],
  "count": 1,
  "timestamp": 1706380805000
}
```

### GET /status

Returns server and AIS connection status.

### GET /health

Health check endpoint.

## Features

- Real-time vessel updates (5-second polling)
- Vessels displayed only at zoom level 12+
- Stale vessels (>2 min old) automatically hidden
- Directional markers showing vessel course
- Viewport-based data fetching for performance

## Tech Stack

**Backend**
- Node.js + TypeScript
- Express.js
- SQLite (better-sqlite3)
- WebSocket (ws)

**Frontend**
- Expo + React Native
- Expo Router
- Mapbox Maps SDK (@rnmapbox/maps)
