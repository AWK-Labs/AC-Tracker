import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Aircraft, RadarLocation, RadarSettings, TrailPoint } from "../types";

interface Props {
  aircraft: Aircraft[];
  trails: Record<string, TrailPoint[]>;
  location: RadarLocation;
  settings: RadarSettings;
  selectedHex: string | null;
  onSelect: (hex: string | null) => void;
}

const NM_TO_METERS = 1852;

function altitudeColor(altBaro?: number | string | null): string {
  if (altBaro == null || altBaro === "ground") return "#aaaaaa";
  const alt = typeof altBaro === "number" ? altBaro : 0;
  if (alt <= 0) return "#aaaaaa";
  if (alt < 5000) return "#00ccff";
  if (alt < 15000) return "#00e676";
  if (alt < 25000) return "#ffee58";
  if (alt < 35000) return "#ff9800";
  return "#ff5252";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function safeHeading(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function planeSvg(color: string, heading: number, selected: boolean): string {
  const size = selected ? 32 : 26;
  const stroke = selected ? "#ffffff" : "none";
  const strokeW = selected ? 1.5 : 0;
  const glow = selected ? `filter: drop-shadow(0 0 4px ${color});` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" style="transform:rotate(${heading}deg);${glow}">
    <g transform="translate(16,16)">
      <!-- fuselage -->
      <ellipse rx="2.2" ry="10" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"/>
      <!-- wings -->
      <path d="M-2,1 L-13,7 L-13,9 L0,5 L13,9 L13,7 Z" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"/>
      <!-- tail -->
      <path d="M-1.5,7 L-5,11 L-5,12.5 L0,9.5 L5,12.5 L5,11 Z" fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"/>
    </g>
  </svg>`;
}

function makePlaneIcon(ac: Aircraft, selected: boolean): L.DivIcon {
  const color = altitudeColor(ac.alt_baro);
  const heading = safeHeading(ac.track);
  const size = selected ? 32 : 26;
  const label = escapeHtml((ac.flight || ac.hex || "").trim());
  const alt =
    ac.alt_baro != null && ac.alt_baro !== "ground" && typeof ac.alt_baro === "number"
      ? `${Math.round(ac.alt_baro / 100) * 100}ft`
      : ac.alt_baro === "ground"
      ? "GND"
      : "";
  const speed = ac.gs != null ? `${Math.round(ac.gs)}kt` : "";

  return L.divIcon({
    className: "aircraft-marker-container",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${planeSvg(color, heading, selected)}
      <div style="
        position:absolute;
        left:50%;
        top:${size + 2}px;
        transform:translateX(-50%);
        white-space:nowrap;
        pointer-events:none;
        line-height:1.3;
        text-align:center;
      ">
        <div style="color:${selected ? "#ffffff" : "#e0e0e0"};font-size:${selected ? 12 : 11}px;font-family:'Inter','Helvetica Neue',sans-serif;font-weight:${selected ? 700 : 600};text-shadow:0 0 3px #000,0 0 6px #000,1px 1px 2px #000;">${label}</div>
        ${alt ? `<div style="color:${color};font-size:10px;font-family:'Inter','Helvetica Neue',sans-serif;font-weight:500;text-shadow:0 0 3px #000,1px 1px 2px #000;">${alt}${speed ? " · " + speed : ""}</div>` : ""}
      </div>
    </div>`,
  });
}

export function MapView({ aircraft, trails, location, settings, selectedHex, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const trailLayersRef = useRef<Map<string, L.Polyline>>(new Map());
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.CircleMarker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [location.lat, location.lon],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });

    // CartoDB Dark Matter tiles — free for non-commercial
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    mapRef.current = map;

    map.on("click", (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest(".aircraft-marker-container")) {
        onSelect(null);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      trailLayersRef.current.clear();
    };
  }, []);

  // Update center / radius circle when location or radius changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setView([location.lat, location.lon], map.getZoom(), { animate: true });

    if (radiusCircleRef.current) radiusCircleRef.current.remove();
    radiusCircleRef.current = L.circle([location.lat, location.lon], {
      radius: settings.radiusNm * NM_TO_METERS,
      color: "#3a8fff",
      weight: 1,
      opacity: 0.35,
      fillColor: "#3a8fff",
      fillOpacity: 0.04,
      dashArray: "4 6",
    }).addTo(map);

    if (centerMarkerRef.current) centerMarkerRef.current.remove();
    centerMarkerRef.current = L.circleMarker([location.lat, location.lon], {
      radius: 5,
      color: "#ffffff",
      weight: 2,
      fillColor: "#3a8fff",
      fillOpacity: 1,
    }).addTo(map);
    centerMarkerRef.current.bindTooltip(location.label, {
      permanent: false,
      direction: "top",
      className: "map-tooltip",
    });
  }, [location.lat, location.lon, location.label, settings.radiusNm]);

  // Update aircraft markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentHexes = new Set(aircraft.map((a) => a.hex));

    // Remove stale markers
    markersRef.current.forEach((marker, hex) => {
      if (!currentHexes.has(hex)) {
        marker.remove();
        markersRef.current.delete(hex);
      }
    });

    // Remove stale trails
    trailLayersRef.current.forEach((line, hex) => {
      if (!currentHexes.has(hex)) {
        line.remove();
        trailLayersRef.current.delete(hex);
      }
    });

    aircraft.forEach((ac) => {
      if (ac.lat == null || ac.lon == null) return;
      const isSelected = ac.hex === selectedHex;
      const icon = makePlaneIcon(ac, isSelected);

      // Trails
      if (settings.showTrails && trails[ac.hex] && trails[ac.hex].length > 1) {
        const pts = trails[ac.hex].map((p) => [p.lat, p.lon] as [number, number]);
        if (trailLayersRef.current.has(ac.hex)) {
          trailLayersRef.current.get(ac.hex)!.setLatLngs(pts);
        } else {
          const line = L.polyline(pts, {
            color: altitudeColor(ac.alt_baro),
            weight: 1.5,
            opacity: 0.5,
            dashArray: "3 4",
          }).addTo(map);
          trailLayersRef.current.set(ac.hex, line);
        }
      }

      // Marker
      if (markersRef.current.has(ac.hex)) {
        const marker = markersRef.current.get(ac.hex)!;
        marker.setLatLng([ac.lat, ac.lon]);
        marker.setIcon(icon);
      } else {
        const marker = L.marker([ac.lat, ac.lon], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map);

        marker.on("click", () => {
          onSelect(ac.hex);
        });

        markersRef.current.set(ac.hex, marker);
      }

      // Bring selected to front
      const m = markersRef.current.get(ac.hex);
      if (m) {
        m.setZIndexOffset(isSelected ? 1000 : 0);
      }
    });
  }, [aircraft, trails, selectedHex, settings.showTrails, onSelect]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      {/* Altitude legend */}
      <div
        className="absolute bottom-3 left-3 rounded px-2.5 py-2 text-xs space-y-1"
        style={{
          background: "rgba(15,15,20,0.85)",
          border: "1px solid rgba(255,255,255,0.1)",
          fontFamily: "'Inter','Helvetica Neue',sans-serif",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
      >
        <div style={{ color: "#888", fontSize: 10, marginBottom: 4, letterSpacing: "0.05em" }}>ALTITUDE</div>
        {[
          { color: "#ff5252", label: "35,000+ ft" },
          { color: "#ff9800", label: "25–35,000 ft" },
          { color: "#ffee58", label: "15–25,000 ft" },
          { color: "#00e676", label: "5–15,000 ft" },
          { color: "#00ccff", label: "< 5,000 ft" },
          { color: "#aaaaaa", label: "Ground" },
        ].map((e) => (
          <div key={e.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: e.color }} />
            <span style={{ color: "#ccc" }}>{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
