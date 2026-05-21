import { useState, useRef } from "react";
import { RadarLocation } from "../types";
import { useGeocoding } from "../hooks/useGeocoding";

interface Props {
  location: RadarLocation | null;
  onLocationSet: (loc: RadarLocation) => void;
  colorScheme: "green" | "blue" | "amber";
}

const SCHEME_COLORS = {
  green: { accent: "#00ff3c", dim: "#005500", border: "#003300", bg: "#001500", muted: "#003300" },
  blue: { accent: "#3a8fff", dim: "#002255", border: "#001833", bg: "#00091a", muted: "#001833" },
  amber: { accent: "#ffaa00", dim: "#442200", border: "#2a1400", bg: "#120800", muted: "#2a1400" },
};

const PRESETS = [
  { label: "Portland, ME", lat: 43.6591, lon: -70.2568 },
  { label: "New York", lat: 40.7128, lon: -74.006 },
  { label: "Chicago", lat: 41.8781, lon: -87.6298 },
  { label: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { label: "London", lat: 51.5074, lon: -0.1278 },
  { label: "Tokyo", lat: 35.6762, lon: 139.6503 },
];

export function LocationInput({ location, onLocationSet, colorScheme }: Props) {
  const [mode, setMode] = useState<"search" | "coords">("search");
  const [query, setQuery] = useState("");
  const [latStr, setLatStr] = useState("");
  const [lonStr, setLonStr] = useState("");
  const [coordError, setCoordError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { searchLocation, getBrowserLocation, searching, searchError } = useGeocoding();
  const colors = SCHEME_COLORS[colorScheme];

  const handleSearch = async () => {
    if (!query.trim()) return;
    const loc = await searchLocation(query.trim());
    if (loc) {
      onLocationSet(loc);
      setQuery("");
    }
  };

  const handleCoords = () => {
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setCoordError("Latitude must be between -90 and 90");
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setCoordError("Longitude must be between -180 and 180");
      return;
    }
    setCoordError("");
    onLocationSet({ lat, lon, label: `${lat.toFixed(4)}, ${lon.toFixed(4)}` });
    setLatStr("");
    setLonStr("");
  };

  const handleGeo = async () => {
    const loc = await getBrowserLocation();
    if (loc) onLocationSet(loc);
  };

  return (
    <div className="font-mono space-y-3" style={{ color: colors.accent }}>
      {/* Current location display */}
      {location && (
        <div
          className="px-3 py-2 rounded text-xs border"
          style={{ background: colors.dim, borderColor: colors.border }}
        >
          <div className="opacity-50 text-xs mb-0.5">TRACKING</div>
          <div className="font-bold truncate">{location.label}</div>
          <div className="opacity-40 text-xs">
            {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
          </div>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1.5">
        {(["search", "coords"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="flex-1 py-1 text-xs border rounded transition-all"
            style={{
              borderColor: mode === m ? colors.accent : colors.border,
              background: mode === m ? colors.dim : "transparent",
              color: mode === m ? colors.accent : colors.muted,
            }}
          >
            {m === "search" ? "Place" : "Coords"}
          </button>
        ))}
      </div>

      {mode === "search" ? (
        <div className="space-y-2">
          <div className="flex gap-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="City, airport, address..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-transparent border rounded px-2 py-1.5 text-xs outline-none focus:border-current placeholder:opacity-30"
              style={{ borderColor: colors.border, color: colors.accent }}
            />
            <button
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="px-2.5 py-1.5 text-xs border rounded transition-all disabled:opacity-30"
              style={{ borderColor: colors.accent, color: colors.accent, background: searching ? colors.dim : "transparent" }}
            >
              {searching ? "…" : "GO"}
            </button>
          </div>
          {searchError && (
            <div className="text-xs text-red-400">{searchError}</div>
          )}
          <button
            onClick={handleGeo}
            disabled={searching}
            className="w-full py-1.5 text-xs border rounded transition-all disabled:opacity-30"
            style={{ borderColor: colors.border, color: colors.accent, background: "transparent" }}
          >
            {searching ? "Locating…" : "◎ Use My Location"}
          </button>
          {/* Presets */}
          <div className="space-y-1">
            <div className="text-xs opacity-30">Quick presets</div>
            <div className="grid grid-cols-2 gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => onLocationSet({ lat: p.lat, lon: p.lon, label: p.label })}
                  className="py-1 text-xs border rounded truncate transition-all text-left px-2"
                  style={{ borderColor: colors.muted, color: colors.dim.replace("00", "99") }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <div className="flex-1">
              <div className="text-xs opacity-40 mb-0.5">LAT</div>
              <input
                type="number"
                placeholder="43.6591"
                value={latStr}
                onChange={(e) => setLatStr(e.target.value)}
                className="w-full bg-transparent border rounded px-2 py-1.5 text-xs outline-none focus:border-current placeholder:opacity-30"
                style={{ borderColor: colors.border, color: colors.accent }}
                step="any"
                min="-90"
                max="90"
              />
            </div>
            <div className="flex-1">
              <div className="text-xs opacity-40 mb-0.5">LON</div>
              <input
                type="number"
                placeholder="-70.2568"
                value={lonStr}
                onChange={(e) => setLonStr(e.target.value)}
                className="w-full bg-transparent border rounded px-2 py-1.5 text-xs outline-none focus:border-current placeholder:opacity-30"
                style={{ borderColor: colors.border, color: colors.accent }}
                step="any"
                min="-180"
                max="180"
              />
            </div>
          </div>
          {coordError && <div className="text-xs text-red-400">{coordError}</div>}
          <button
            onClick={handleCoords}
            disabled={!latStr || !lonStr}
            className="w-full py-1.5 text-xs border rounded transition-all disabled:opacity-30"
            style={{ borderColor: colors.accent, color: colors.accent, background: "transparent" }}
          >
            SET LOCATION
          </button>
        </div>
      )}
    </div>
  );
}
