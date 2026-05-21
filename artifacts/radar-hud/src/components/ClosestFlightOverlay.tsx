import { useState, useEffect, useMemo } from "react";
import { Aircraft, RadarLocation } from "../types";

interface Props {
  aircraft: Aircraft[];
  location: RadarLocation;
  onClose: () => void;
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function altColor(alt?: number | string | null): string {
  if (alt == null || alt === "ground") return "#9e9e9e";
  const a = typeof alt === "number" ? alt : 0;
  if (a <= 0) return "#9e9e9e";
  if (a < 5000) return "#00ccff";
  if (a < 15000) return "#00e676";
  if (a < 25000) return "#ffee58";
  if (a < 35000) return "#ff9800";
  return "#ff5252";
}

function formatAlt(alt?: number | string | null): string {
  if (alt == null) return "—";
  if (alt === "ground") return "GROUND";
  if (typeof alt === "number") return `${alt.toLocaleString()} ft`;
  return String(alt);
}

function formatSpeed(gs?: number | null): string {
  if (gs == null) return "—";
  return `${Math.round(gs)} kts`;
}

function formatVRate(rate?: number | null): string {
  if (rate == null) return "—";
  if (Math.abs(rate) < 50) return "LEVEL";
  const sign = rate > 0 ? "▲" : "▼";
  return `${sign} ${Math.abs(rate).toLocaleString()} fpm`;
}

function cardinalDir(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function HeadingDial({ heading, color }: { heading: number; color: string }) {
  const r = 80;
  const cx = 90;
  const cy = 90;
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  const cardinals = [
    { deg: 0, label: "N" },
    { deg: 90, label: "E" },
    { deg: 180, label: "S" },
    { deg: 270, label: "W" },
  ];

  return (
    <svg width={180} height={180} viewBox="0 0 180 180">
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#222" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={r - 12} fill="none" stroke="#111" strokeWidth={1} />

      {/* Tick marks */}
      {ticks.map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const isMajor = deg % 30 === 0;
        const inner = r - (isMajor ? 12 : 7);
        const outer = r - 2;
        return (
          <line
            key={deg}
            x1={cx + inner * Math.cos(rad)}
            y1={cy + inner * Math.sin(rad)}
            x2={cx + outer * Math.cos(rad)}
            y2={cy + outer * Math.sin(rad)}
            stroke={isMajor ? "#555" : "#333"}
            strokeWidth={isMajor ? 1.5 : 1}
          />
        );
      })}

      {/* Cardinal labels */}
      {cardinals.map(({ deg, label }) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const lr = r - 22;
        return (
          <text
            key={label}
            x={cx + lr * Math.cos(rad)}
            y={cy + lr * Math.sin(rad)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fontFamily="'Inter', 'Helvetica Neue', sans-serif"
            fontWeight="bold"
            fill={label === "N" ? "#ff5252" : "#666"}
          >
            {label}
          </text>
        );
      })}

      {/* Plane icon */}
      <g transform={`translate(${cx},${cy}) rotate(${heading})`}>
        {/* Fuselage */}
        <ellipse rx={3} ry={18} fill={color} />
        {/* Wings */}
        <path d="M-3,2 L-22,12 L-22,16 L0,8 L22,16 L22,12 Z" fill={color} opacity={0.9} />
        {/* Tail */}
        <path d="M-2.5,13 L-9,20 L-9,23 L0,17 L9,23 L9,20 Z" fill={color} opacity={0.8} />
      </g>

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill="#fff" opacity={0.4} />

      {/* Heading readout */}
      <text
        x={cx}
        y={cy + r + 16}
        textAnchor="middle"
        fontSize={13}
        fontFamily="'Courier New', monospace"
        fontWeight="bold"
        fill={color}
      >
        {String(Math.round(heading)).padStart(3, "0")}°
      </text>
    </svg>
  );
}

function DataRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-2 border-b border-white/5">
      <span style={{ color: "#666", fontSize: 11, fontFamily: "'Inter','Helvetica Neue',sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ color: valueColor || "#e0e0e0", fontSize: 15, fontFamily: "'Inter','Helvetica Neue',sans-serif", fontWeight: 600, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

export function ClosestFlightOverlay({ aircraft, location, onClose }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const closest = useMemo(() => {
    if (!aircraft.length) return null;
    let best: Aircraft | null = null;
    let bestDist = Infinity;
    for (const ac of aircraft) {
      if (ac.lat == null || ac.lon == null) continue;
      const d = haversineNm(location.lat, location.lon, ac.lat, ac.lon);
      if (d < bestDist) {
        bestDist = d;
        best = ac;
      }
    }
    return best ? { ac: best, distNm: bestDist } : null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aircraft, location, tick]);

  const ac = closest?.ac ?? null;
  const distNm = closest?.distNm ?? null;

  const acColor = ac ? altColor(ac.alt_baro) : "#9e9e9e";
  const heading = ac?.track ?? 0;
  const bearingToAc =
    ac?.lat != null && ac?.lon != null
      ? bearingDeg(location.lat, location.lon, ac.lat, ac.lon)
      : null;

  const squawkEmergency =
    ac?.squawk === "7500"
      ? "HIJACK"
      : ac?.squawk === "7600"
      ? "COMMS FAIL"
      : ac?.squawk === "7700"
      ? "EMERGENCY"
      : ac?.emergency && ac.emergency !== "none"
      ? ac.emergency.toUpperCase()
      : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "min(400px, 100vw)",
          maxHeight: "min(750px, 100dvh)",
          background: "#0a0a0f",
          border: "1px solid #1e1e2e",
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: `0 0 40px ${acColor}22, 0 20px 60px rgba(0,0,0,0.8)`,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #1a1a2a",
            background: "#0d0d18",
          }}
        >
          <div>
            <div style={{ color: "#555", fontSize: 10, fontFamily: "'Inter',sans-serif", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
              Closest Flight
            </div>
            <div style={{ color: "#888", fontSize: 11, fontFamily: "'Courier New', monospace" }}>
              from {location.label}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "#111",
                border: "1px solid #222",
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 11,
                fontFamily: "'Courier New', monospace",
                color: "#555",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#00e676",
                  display: "inline-block",
                  boxShadow: "0 0 6px #00e676",
                  animation: "pulse 1s infinite",
                }}
              />
              LIVE
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#555",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 18px" }}>
          {!ac ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 12 }}>
              <div style={{ fontSize: 36, opacity: 0.2 }}>✈</div>
              <div style={{ color: "#555", fontFamily: "'Inter',sans-serif", fontSize: 14 }}>No aircraft in range</div>
            </div>
          ) : (
            <>
              {/* Emergency banner */}
              {squawkEmergency && (
                <div
                  style={{
                    background: "#ff0000",
                    color: "#fff",
                    textAlign: "center",
                    padding: "8px",
                    fontFamily: "'Inter',sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: "0.1em",
                    marginTop: 12,
                    borderRadius: 8,
                    animation: "pulse 1s infinite",
                  }}
                >
                  ⚠ {squawkEmergency}
                </div>
              )}

              {/* Callsign + type */}
              <div style={{ textAlign: "center", padding: "20px 0 12px" }}>
                <div
                  style={{
                    fontSize: 42,
                    fontFamily: "'Inter','Helvetica Neue',sans-serif",
                    fontWeight: 800,
                    color: acColor,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    textShadow: `0 0 30px ${acColor}55`,
                  }}
                >
                  {(ac.flight || ac.hex || "—").trim()}
                </div>
                {(ac.t || ac.r) && (
                  <div style={{ color: "#555", fontFamily: "'Inter',sans-serif", fontSize: 13, marginTop: 6 }}>
                    {[ac.t, ac.r].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>

              {/* Altitude + Heading compass row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 8 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <HeadingDial heading={heading} color={acColor} />
                  <div style={{ color: "#555", fontSize: 10, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 2 }}>
                    HEADING · {cardinalDir(heading)}
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Altitude big display */}
                  <div style={{ background: "#0f0f1a", border: "1px solid #1e1e2e", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ color: "#555", fontSize: 10, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                      Altitude
                    </div>
                    <div style={{ color: acColor, fontSize: 22, fontFamily: "'Inter',sans-serif", fontWeight: 700, lineHeight: 1 }}>
                      {formatAlt(ac.alt_baro)}
                    </div>
                    {ac.baro_rate != null && Math.abs(ac.baro_rate) >= 50 && (
                      <div style={{ color: ac.baro_rate > 0 ? "#00e676" : "#ff5252", fontSize: 11, fontFamily: "'Inter',sans-serif", marginTop: 3 }}>
                        {ac.baro_rate > 0 ? "▲" : "▼"} {Math.abs(ac.baro_rate).toLocaleString()} fpm
                      </div>
                    )}
                  </div>
                  {/* Speed big display */}
                  <div style={{ background: "#0f0f1a", border: "1px solid #1e1e2e", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                    <div style={{ color: "#555", fontSize: 10, fontFamily: "'Inter',sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                      Speed
                    </div>
                    <div style={{ color: "#e0e0e0", fontSize: 22, fontFamily: "'Inter',sans-serif", fontWeight: 700, lineHeight: 1 }}>
                      {formatSpeed(ac.gs)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail rows */}
              <div style={{ paddingBottom: 12 }}>
                {distNm != null && (
                  <DataRow
                    label="Distance"
                    value={`${distNm.toFixed(1)} nm`}
                    valueColor="#4fc3f7"
                  />
                )}
                {bearingToAc != null && (
                  <DataRow
                    label="Bearing to you"
                    value={`${Math.round(bearingToAc)}° ${cardinalDir(bearingToAc)}`}
                  />
                )}
                <DataRow label="Heading" value={`${String(Math.round(heading)).padStart(3, "0")}° ${cardinalDir(heading)}`} />
                <DataRow label="Altitude" value={formatAlt(ac.alt_baro)} valueColor={acColor} />
                {ac.alt_geom != null && (
                  <DataRow label="Geo Alt" value={`${ac.alt_geom.toLocaleString()} ft`} />
                )}
                {ac.baro_rate != null && (
                  <DataRow
                    label="Climb Rate"
                    value={formatVRate(ac.baro_rate)}
                    valueColor={ac.baro_rate > 50 ? "#00e676" : ac.baro_rate < -50 ? "#ff5252" : "#e0e0e0"}
                  />
                )}
                <DataRow label="Ground Speed" value={formatSpeed(ac.gs)} />
                {ac.ias != null && <DataRow label="IAS" value={formatSpeed(ac.ias)} />}
                {ac.squawk && <DataRow label="Squawk" value={ac.squawk} valueColor={squawkEmergency ? "#ff5252" : undefined} />}
                {ac.hex && <DataRow label="ICAO" value={ac.hex.toUpperCase()} />}
                {ac.nav_altitude_mcp != null && (
                  <DataRow label="Target Alt" value={`${ac.nav_altitude_mcp.toLocaleString()} ft`} />
                )}
                {ac.nav_heading != null && (
                  <DataRow label="Nav Heading" value={`${Math.round(ac.nav_heading)}°`} />
                )}
                {ac.lat != null && ac.lon != null && (
                  <DataRow label="Position" value={`${ac.lat.toFixed(4)}, ${ac.lon.toFixed(4)}`} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid #1a1a2a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#0d0d18",
          }}
        >
          <span style={{ color: "#333", fontSize: 10, fontFamily: "'Courier New', monospace" }}>
            airplanes.live
          </span>
          <span style={{ color: "#333", fontSize: 10, fontFamily: "'Courier New', monospace" }}>
            {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
