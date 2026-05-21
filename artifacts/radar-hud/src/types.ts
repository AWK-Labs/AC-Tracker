export interface Aircraft {
  hex: string;
  type?: string;
  flight?: string;
  r?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  alt_geom?: number;
  gs?: number;
  ias?: number;
  tas?: number;
  track?: number;
  track_rate?: number;
  baro_rate?: number;
  geom_rate?: number;
  squawk?: string;
  category?: string;
  nav_qnh?: number;
  nav_altitude_mcp?: number;
  nav_heading?: number;
  nic?: number;
  rc?: number;
  seen_pos?: number;
  seen?: number;
  rssi?: number;
  dst?: number;
  dir?: number;
  mlat?: string[];
  tisb?: string[];
  messages?: number;
  emergency?: string;
  dbFlags?: number;
}

export interface AircraftResponse {
  ac: Aircraft[];
  msg?: string;
  now?: number;
  total?: number;
  ctime?: number;
  ptime?: number;
}

export interface RadarLocation {
  lat: number;
  lon: number;
  label: string;
}

export interface RadarSettings {
  radiusNm: number;
  refreshIntervalMs: number;
  showLabels: boolean;
  showTrails: boolean;
  radarMode: "sweep" | "static";
  colorScheme: "green" | "blue" | "amber";
}

export interface TrailPoint {
  lat: number;
  lon: number;
  timestamp: number;
}
