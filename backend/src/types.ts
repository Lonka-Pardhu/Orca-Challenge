export interface Vessel {
  mmsi: string;
  name: string | null;
  latitude: number;
  longitude: number;
  course: number | null;
  speed: number | null;
  heading: number | null;
  updatedAt: number;
  shipType?: number | null;
}

export interface ViewportQuery {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface AISMessage {
  MessageType: string;
  MetaData: {
    MMSI: number;
    MMSI_String: string;
    ShipName: string;
    latitude: number;
    longitude: number;
    time_utc: string;
  };
  Message: {
    PositionReport?: {
      Cog: number; // Course over ground
      Sog: number; // Speed over ground
      TrueHeading: number;
      Latitude: number;
      Longitude: number;
      NavigationalStatus: number;
    };
  };
}

export interface AISSubscription {
  APIKey: string;
  BoundingBoxes: [[[number, number], [number, number]]];
  FilterMessageTypes: string[];
}

// Expanded vessel with static data (from ShipStaticData AIS messages)
export interface VesselDetail extends Vessel {
  shipType?: number;
  imo?: string;
  callSign?: string;
  destination?: string;
  draught?: number;
  dimensionA?: number;
  dimensionB?: number;
  dimensionC?: number;
  dimensionD?: number;
}

// Route types
export interface Waypoint {
  lat: number;
  lon: number;
  name?: string;
}

export interface Route {
  _id?: string;
  name: string;
  waypoints: Waypoint[];
  createdAt: number;
  updatedAt?: number;
}

// Weather types
export interface WeatherData {
  wind: { speed: number; gust: number; direction: number };
  waves: { height: number; period: number; direction: number };
  temperature: { air: number; sea: number };
  pressure: number;
  visibility: number;
}

// Tide types
export interface TidePrediction {
  time: string;
  height: number;
  type: "high" | "low";
}

// Hourly forecast point
export interface HourlyForecastPoint {
  time: string;
  temperature: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  visibility: number;
  weatherCode: number;
  waveHeight: number | null;
  waveDirection: number | null;
  wavePeriod: number | null;
}

// Tide response with station info
export interface TideResponse {
  station: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    distance: number;
  } | null;
  predictions: TidePrediction[];
}

// CPA/TCPA
export interface ProximityAlert {
  mmsi: string;
  vesselName: string | null;
  cpa: number; // nautical miles
  tcpa: number; // minutes
  bearing: number;
}
