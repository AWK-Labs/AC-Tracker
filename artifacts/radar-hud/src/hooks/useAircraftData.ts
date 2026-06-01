import { useState, useEffect, useRef, useCallback } from "react";
import { Aircraft, AircraftResponse, RadarLocation, TrailPoint } from "../types";

const MAX_TRAIL_POINTS = 8;
const TRAIL_MAX_AGE_MS = 120_000;

export function useAircraftData(
  location: RadarLocation | null,
  radiusNm: number,
  refreshIntervalMs: number
) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [trails, setTrails] = useState<Record<string, TrailPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const fetchingRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAircraft = useCallback(async () => {
    if (!location || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        lat: String(location.lat),
        lon: String(location.lon),
        radiusNm: String(radiusNm),
      });
      const url = `/api/aircraft/point?${params}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: AircraftResponse = await res.json();
      const list = (data.ac || []).filter((a) => a.lat != null && a.lon != null);
      setAircraft(list);
      setTotalCount(list.length);
      setLastUpdated(new Date());
      setError(null);

      setTrails((prev) => {
        const now = Date.now();
        const updated = { ...prev };
        list.forEach((ac) => {
          if (ac.hex && ac.lat != null && ac.lon != null) {
            const existing = (updated[ac.hex] || []).filter(
              (p) => now - p.timestamp < TRAIL_MAX_AGE_MS
            );
            const newPoint: TrailPoint = { lat: ac.lat!, lon: ac.lon!, timestamp: now };
            updated[ac.hex] = [...existing.slice(-MAX_TRAIL_POINTS + 1), newPoint];
          }
        });
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch aircraft data");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [location, radiusNm]);

  useEffect(() => {
    if (!location) return;
    fetchAircraft();
    const effectiveInterval = Math.max(refreshIntervalMs, 1000);
    intervalRef.current = setInterval(fetchAircraft, effectiveInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [location, radiusNm, refreshIntervalMs, fetchAircraft]);

  return { aircraft, trails, loading, error, lastUpdated, totalCount, refetch: fetchAircraft };
}
