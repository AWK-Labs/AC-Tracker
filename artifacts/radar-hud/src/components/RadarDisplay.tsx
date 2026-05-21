import { useEffect, useRef, useCallback } from "react";
import { Aircraft, RadarLocation, RadarSettings, TrailPoint } from "../types";

interface Props {
  aircraft: Aircraft[];
  trails: Record<string, TrailPoint[]>;
  location: RadarLocation;
  settings: RadarSettings;
  selectedHex: string | null;
  onSelect: (hex: string | null) => void;
}

const COLORS = {
  green: {
    bg: "#000d00",
    ring: "#003300",
    sweep: "rgba(0,255,60,0.08)",
    sweepLine: "rgba(0,255,60,0.6)",
    blip: "#00ff3c",
    blipSelected: "#ffffff",
    blipAlert: "#ff4444",
    trail: "rgba(0,255,60,",
    label: "#00dd30",
    rangeLabel: "#005500",
    centerCross: "#006600",
    heading: "#00ff3c",
    gridLine: "#001a00",
  },
  blue: {
    bg: "#00050f",
    ring: "#001833",
    sweep: "rgba(30,120,255,0.08)",
    sweepLine: "rgba(30,120,255,0.6)",
    blip: "#3a8fff",
    blipSelected: "#ffffff",
    blipAlert: "#ff4444",
    trail: "rgba(30,120,255,",
    label: "#5aafff",
    rangeLabel: "#002255",
    centerCross: "#003388",
    heading: "#3a8fff",
    gridLine: "#000d22",
  },
  amber: {
    bg: "#0d0500",
    ring: "#2a1400",
    sweep: "rgba(255,160,0,0.08)",
    sweepLine: "rgba(255,160,0,0.6)",
    blip: "#ffaa00",
    blipSelected: "#ffffff",
    blipAlert: "#ff4444",
    trail: "rgba(255,160,0,",
    label: "#ffcc44",
    rangeLabel: "#442200",
    centerCross: "#553300",
    heading: "#ffaa00",
    gridLine: "#1a0a00",
  },
};

function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function aircraftToCanvas(
  ac: Aircraft,
  center: RadarLocation,
  radiusNm: number,
  canvasR: number
): { x: number; y: number; distNm: number; bearing: number } | null {
  if (ac.lat == null || ac.lon == null) return null;
  const distNm = haversineDistanceNm(center.lat, center.lon, ac.lat, ac.lon);
  if (distNm > radiusNm) return null;
  const bearing = bearingDeg(center.lat, center.lon, ac.lat, ac.lon);
  const r = (distNm / radiusNm) * canvasR;
  const angle = ((bearing - 90) * Math.PI) / 180;
  return {
    x: canvasR + r * Math.cos(angle),
    y: canvasR + r * Math.sin(angle),
    distNm,
    bearing,
  };
}

export function RadarDisplay({ aircraft, trails, location, settings, selectedHex, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const sweepAngleRef = useRef(0);
  const lastFrameRef = useRef(0);

  const draw = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dt = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;
      const c = COLORS[settings.colorScheme];
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(cx, cy) - 2;

      if (settings.radarMode === "sweep") {
        sweepAngleRef.current = (sweepAngleRef.current + (dt / 3000) * 360) % 360;
      }

      ctx.clearRect(0, 0, W, H);

      // Background fill inside radar circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = c.bg;
      ctx.fill();
      ctx.restore();

      // Grid lines (cardinal directions)
      ctx.save();
      ctx.strokeStyle = c.gridLine;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 8]);
      for (let angle = 0; angle < 360; angle += 45) {
        const rad = ((angle - 90) * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(rad), cy + R * Math.sin(rad));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Range rings
      const ringCount = 4;
      for (let i = 1; i <= ringCount; i++) {
        const rr = (i / ringCount) * R;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = c.ring;
        ctx.lineWidth = i === ringCount ? 1.5 : 0.7;
        ctx.stroke();

        // Range label
        const labelNm = Math.round((i / ringCount) * settings.radiusNm);
        ctx.fillStyle = c.rangeLabel;
        ctx.font = "10px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${labelNm}nm`, cx, cy - rr + 12);
      }

      // Compass labels
      const dirs = ["N", "E", "S", "W"];
      ctx.font = "bold 11px 'Courier New', monospace";
      ctx.fillStyle = c.centerCross;
      dirs.forEach((d, i) => {
        const angle = ((i * 90 - 90) * Math.PI) / 180;
        const lx = cx + (R + 14) * Math.cos(angle);
        const ly = cy + (R + 14) * Math.sin(angle);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(d, lx, ly);
      });

      // Sweep effect
      if (settings.radarMode === "sweep") {
        const sweepRad = ((sweepAngleRef.current - 90) * Math.PI) / 180;
        const grad = ctx.createConicalGradient
          ? null
          : null;
        // Sweep fan (approximated with arc sector)
        const fanSpan = (70 * Math.PI) / 180;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, sweepRad - fanSpan, sweepRad, false);
        ctx.closePath();
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
        grd.addColorStop(0, c.sweep);
        grd.addColorStop(1, c.sweep.replace("0.08", "0.0"));
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();

        // Sweep line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + R * Math.cos(sweepRad), cy + R * Math.sin(sweepRad));
        ctx.strokeStyle = c.sweepLine;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = c.blip;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();
      }

      // Center cross
      ctx.save();
      ctx.strokeStyle = c.centerCross;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Trails
      if (settings.showTrails) {
        aircraft.forEach((ac) => {
          const trail = trails[ac.hex];
          if (!trail || trail.length < 2) return;
          const canvasPoints = trail
            .map((p) => {
              const distNm = haversineDistanceNm(location.lat, location.lon, p.lat, p.lon);
              const bearing = bearingDeg(location.lat, location.lon, p.lat, p.lon);
              const r = (distNm / settings.radiusNm) * R;
              const angle = ((bearing - 90) * Math.PI) / 180;
              return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
            });
          ctx.save();
          ctx.lineWidth = 1;
          for (let i = 1; i < canvasPoints.length; i++) {
            const alpha = (i / canvasPoints.length) * 0.5;
            ctx.strokeStyle = `${c.trail}${alpha})`;
            ctx.beginPath();
            ctx.moveTo(canvasPoints[i - 1].x, canvasPoints[i - 1].y);
            ctx.lineTo(canvasPoints[i].x, canvasPoints[i].y);
            ctx.stroke();
          }
          ctx.restore();
        });
      }

      // Aircraft blips
      aircraft.forEach((ac) => {
        const pos = aircraftToCanvas(ac, location, settings.radiusNm, R);
        if (!pos) return;

        const { x, y } = { x: cx + (pos.x - R), y: cy + (pos.y - R) };
        const isSelected = ac.hex === selectedHex;
        const isEmergency = ac.squawk === "7500" || ac.squawk === "7600" || ac.squawk === "7700" || ac.emergency === "general";
        const color = isEmergency ? c.blipAlert : isSelected ? c.blipSelected : c.blip;
        const trackRad = ac.track != null ? ((ac.track - 90) * Math.PI) / 180 : 0;
        const size = isSelected ? 7 : 5;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(trackRad);

        // Aircraft triangle
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 10 : 4;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -size * 1.5);
        ctx.lineTo(size * 0.8, size);
        ctx.lineTo(0, size * 0.3);
        ctx.lineTo(-size * 0.8, size);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Label
        if (settings.showLabels) {
          const label = (ac.flight || ac.hex).trim();
          const alt = ac.alt_baro != null && ac.alt_baro !== "ground"
            ? typeof ac.alt_baro === "number"
              ? `${Math.round(ac.alt_baro / 100) * 100}ft`
              : "GND"
            : "";
          ctx.save();
          ctx.font = `${isSelected ? "bold " : ""}9px 'Courier New', monospace`;
          ctx.fillStyle = c.label;
          ctx.shadowColor = c.blip;
          ctx.shadowBlur = 2;
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillText(label, x + 8, y - 4);
          if (alt) {
            ctx.font = "8px 'Courier New', monospace";
            ctx.fillStyle = c.rangeLabel.replace("00", "44");
            ctx.fillText(alt, x + 8, y + 5);
          }
          ctx.restore();
        }

        // Selection ring
        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = c.blipSelected;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      // Outer ring border
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = c.ring.replace("33", "66");
      ctx.lineWidth = 2;
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    },
    [aircraft, trails, location, settings, selectedHex]
  );

  useEffect(() => {
    lastFrameRef.current = performance.now();
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const R = Math.min(cx, cy) - 2;

      let closestHex: string | null = null;
      let closestDist = 16;

      aircraft.forEach((ac) => {
        const pos = aircraftToCanvas(ac, location, settings.radiusNm, R);
        if (!pos) return;
        const ax = cx + (pos.x - R);
        const ay = cy + (pos.y - R);
        const d = Math.hypot(mx - ax, my - ay);
        if (d < closestDist) {
          closestDist = d;
          closestHex = ac.hex;
        }
      });

      onSelect(closestHex);
    },
    [aircraft, location, settings.radiusNm, onSelect]
  );

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={600}
      onClick={handleClick}
      className="w-full h-full cursor-crosshair"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
