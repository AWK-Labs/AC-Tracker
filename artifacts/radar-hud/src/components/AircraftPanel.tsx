import { Aircraft } from "../types";

interface Props {
  aircraft: Aircraft | null;
  onClose: () => void;
  colorScheme: "green" | "blue" | "amber";
}

const SCHEME_COLORS = {
  green: { accent: "#00ff3c", dim: "#005500", border: "#003300", bg: "#001500" },
  blue: { accent: "#3a8fff", dim: "#002255", border: "#001833", bg: "#00091a" },
  amber: { accent: "#ffaa00", dim: "#442200", border: "#2a1400", bg: "#120800" },
};

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between items-baseline gap-2 py-0.5">
      <span className="text-xs font-mono opacity-50 shrink-0">{label}</span>
      <span className="text-xs font-mono text-right truncate">{value}</span>
    </div>
  );
}

function formatAlt(alt?: number | string | null): string {
  if (alt == null) return "—";
  if (alt === "ground") return "Ground";
  if (typeof alt === "number") {
    return `${alt.toLocaleString()} ft`;
  }
  return String(alt);
}

function formatSpeed(gs?: number | null): string {
  if (gs == null) return "—";
  return `${Math.round(gs)} kts`;
}

function formatHeading(track?: number | null): string {
  if (track == null) return "—";
  const dir = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(track / 45) % 8];
  return `${Math.round(track)}° ${dir}`;
}

function formatVRate(rate?: number | null): string {
  if (rate == null) return "—";
  const sign = rate > 0 ? "▲" : rate < 0 ? "▼" : "→";
  return `${sign} ${Math.abs(rate)} fpm`;
}

function getCategory(cat?: string): string {
  const map: Record<string, string> = {
    A0: "Unknown",
    A1: "Light",
    A2: "Small",
    A3: "Large",
    A4: "High Vortex",
    A5: "Heavy",
    A6: "High Performance",
    A7: "Rotorcraft",
    B0: "Unknown",
    B1: "Glider/Sailplane",
    B2: "Lighter-than-air",
    B3: "Skydiver",
    B4: "Ultralight",
    B6: "UAV",
    B7: "Space/Trans-atm",
    C0: "Unknown",
    C1: "Emergency",
    C2: "Service",
    C3: "Point Obstacle",
    C4: "Cluster Obstacle",
    C5: "Line Obstacle",
    D0: "Unknown",
  };
  return cat ? (map[cat] || cat) : "—";
}

export function AircraftPanel({ aircraft: ac, onClose, colorScheme }: Props) {
  const colors = SCHEME_COLORS[colorScheme];

  if (!ac) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center font-mono text-xs opacity-30 px-4 text-center"
        style={{ color: colors.accent }}
      >
        <div className="text-2xl mb-2">✈</div>
        <div>Click an aircraft</div>
        <div>to view details</div>
      </div>
    );
  }

  const isEmergency =
    ac.squawk === "7500" || ac.squawk === "7600" || ac.squawk === "7700" || ac.emergency === "general";

  return (
    <div className="h-full flex flex-col font-mono" style={{ color: colors.accent }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b shrink-0"
        style={{ borderColor: colors.border, background: colors.bg }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base font-bold tracking-widest">
            {(ac.flight || ac.hex).trim()}
          </span>
          {isEmergency && (
            <span className="text-xs px-1.5 py-0.5 rounded font-bold animate-pulse" style={{ background: "#ff0000", color: "#fff" }}>
              EMERGENCY
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-xs opacity-50 hover:opacity-100 transition-opacity px-1"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3" style={{ scrollbarWidth: "none" }}>
        {/* Primary data */}
        <div className="space-y-0.5">
          <div
            className="text-xs font-bold tracking-wider opacity-40 mb-1 uppercase"
          >
            Position
          </div>
          <Row label="Altitude" value={formatAlt(ac.alt_baro)} />
          <Row label="Geo Alt" value={ac.alt_geom != null ? `${ac.alt_geom.toLocaleString()} ft` : undefined} />
          <Row label="Speed" value={formatSpeed(ac.gs)} />
          <Row label="IAS" value={ac.ias != null ? formatSpeed(ac.ias) : undefined} />
          <Row label="Heading" value={formatHeading(ac.track)} />
          <Row label="Vert Rate" value={formatVRate(ac.baro_rate)} />
        </div>

        <div className="border-t opacity-10" style={{ borderColor: colors.accent }} />

        {/* Aircraft info */}
        <div className="space-y-0.5">
          <div className="text-xs font-bold tracking-wider opacity-40 mb-1 uppercase">
            Aircraft
          </div>
          <Row label="ICAO" value={ac.hex?.toUpperCase()} />
          <Row label="Reg" value={ac.r} />
          <Row label="Type" value={ac.t} />
          <Row label="Category" value={getCategory(ac.category)} />
        </div>

        <div className="border-t opacity-10" style={{ borderColor: colors.accent }} />

        {/* Flight info */}
        <div className="space-y-0.5">
          <div className="text-xs font-bold tracking-wider opacity-40 mb-1 uppercase">
            Flight
          </div>
          <Row label="Squawk" value={ac.squawk} />
          <Row label="Emergency" value={ac.emergency && ac.emergency !== "none" ? ac.emergency : undefined} />
          <Row label="Nav Alt" value={ac.nav_altitude_mcp != null ? `${ac.nav_altitude_mcp.toLocaleString()} ft` : undefined} />
          <Row label="Nav Hdg" value={ac.nav_heading != null ? `${Math.round(ac.nav_heading)}°` : undefined} />
        </div>

        {ac.lat != null && ac.lon != null && (
          <>
            <div className="border-t opacity-10" style={{ borderColor: colors.accent }} />
            <div className="space-y-0.5">
              <div className="text-xs font-bold tracking-wider opacity-40 mb-1 uppercase">
                Coordinates
              </div>
              <Row label="Lat" value={ac.lat.toFixed(5)} />
              <Row label="Lon" value={ac.lon.toFixed(5)} />
              {ac.dst != null && <Row label="Distance" value={`${ac.dst.toFixed(1)} nm`} />}
              {ac.dir != null && <Row label="Bearing" value={`${Math.round(ac.dir)}°`} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
