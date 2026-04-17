# SeaTrack — Marine & Boating App

## Vision

Originally built as an AIS Viewer for the Orca challenge, this is now being developed into a full commercial marine app for **boaters, sailors, and maritime professionals**. The goal is to become one of the best marine apps on the App Store and Play Store — a go-to tool for anyone on the water.

## Product Model

The app uses a **freemium model** with Free and Pro tiers:

### Free Tier
- Real-time vessel tracking (AIS) on the map
- Basic vessel info (name, position, speed, course)
- Hotspot discovery (busy shipping areas)
- Standard map view

### Pro Tier (subscription)
- Vessel detail pages (full AIS data, history, photos)
- Route/track history and playback
- Weather overlays (wind, waves, tides, currents)
- Offline charts and map downloads
- Custom alerts (vessel proximity, weather warnings, anchor drag)
- Trip logging and voyage planning
- Waypoint and route creation
- Advanced filtering (by vessel type, flag, destination)
- Ad-free experience
- Priority data refresh rates

### Future Considerations
- Social features (fleet sharing, crew messaging)
- Marina/port directory with reviews
- Fuel price tracking
- Integration with onboard instruments (NMEA)
- Emergency/MOB features

## Architecture

- **`backend/`** — Node.js + TypeScript + Express server with MongoDB (native driver) and WebSocket AIS ingestion
- **`app/`** — Expo SDK 54 + React Native frontend with Expo Router and Mapbox Maps SDK (@rnmapbox/maps)

### How It Works

1. Backend connects to aisstream.io via WebSocket, receives live vessel positions
2. Positions are batched and bulk-upserted into MongoDB Atlas (keyed by MMSI)
3. MongoDB uses a `2dsphere` geospatial index for efficient spatial queries
4. Frontend polls `/vessels` every 3s with current map viewport bounds
5. Vessels render as directional boat markers on Mapbox (visible at zoom 12+)

### Key Endpoints

- `GET /vessels?minLat=X&maxLat=X&minLon=X&maxLon=X` — vessels in viewport
- `GET /status` — server, AIS connection, and DB status
- `GET /health` — health check
- `GET /hotspots` — areas with highest vessel concentration

## Feature Gating

- The app will eventually use a **Free + Pro** (2-tier) subscription model
- **For V1 development: NO gating** — all features are fully accessible, no auth, no paywall
- Pro gating will be added as a separate effort in V1.1 once we decide which features to lock
- When implemented later: use RevenueCat, `useProAccess()` hook, and show Pro features as locked (not hidden)

## Skill Usage Rules

### Expo & Styling Work — Always Use Expo Skills First

For ANY task related to Expo, React Native, styling, UI components, navigation, animations, or frontend app work, **always consult the relevant Expo skill first** before proceeding. We have 14 Expo skills available:

**From `expo` plugin (claude-plugins-official):**
1. `expo:building-native-ui` — UI fundamentals, styling, components, navigation, animations, native tabs
2. `expo:expo-api-routes` — API routes in Expo Router with EAS Hosting
3. `expo:expo-cicd-workflows` — EAS workflow YAML for CI/CD
4. `expo:expo-deployment` — Deploy to App Store, Play Store, web, API routes
5. `expo:expo-dev-client` — Dev clients locally or via TestFlight
6. `expo:expo-module` — Native modules/views (Swift, Kotlin, TypeScript)
7. `expo:expo-tailwind-setup` — Tailwind CSS v4 + NativeWind v5
8. `expo:expo-ui-jetpack-compose` — Jetpack Compose views
9. `expo:expo-ui-swift-ui` — SwiftUI views
10. `expo:native-data-fetching` — Fetch, React Query, SWR, caching, offline
11. `expo:upgrading-expo` — SDK version upgrades
12. `expo:use-dom` — DOM components, web-to-native migration

**From `expo-plugins` marketplace:**
13. `expo-app-design:building-ui` — Building beautiful apps with Expo Router
14. `upgrading-expo:upgrading-expo` — Expo SDK upgrade guidelines

### When to use which skill

- **Building UI / styling / components / animations** → `expo:building-native-ui` or `expo-app-design:building-ui`
- **Navigation / routing** → `expo:building-native-ui`
- **Data fetching / API calls** → `expo:native-data-fetching`
- **Tailwind / NativeWind setup** → `expo:expo-tailwind-setup`
- **Native modules (Swift/Kotlin)** → `expo:expo-module`
- **SwiftUI integration** → `expo:expo-ui-swift-ui`
- **Jetpack Compose integration** → `expo:expo-ui-jetpack-compose`
- **DOM / webview components** → `expo:use-dom`
- **API routes** → `expo:expo-api-routes`
- **Deployment** → `expo:expo-deployment`
- **Dev client builds** → `expo:expo-dev-client`
- **CI/CD workflows** → `expo:expo-cicd-workflows`
- **SDK upgrades** → `expo:upgrading-expo`
