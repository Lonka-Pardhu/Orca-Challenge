export interface Vessel {
  mmsi: string;
  name: string | null;
  latitude: number;
  longitude: number;
  course: number | null;
  speed: number | null;
  heading: number | null;
  updatedAt: number;
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
