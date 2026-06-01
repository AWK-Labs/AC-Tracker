import { useState, useCallback } from "react";
import { RadarLocation } from "../types";

export function useGeocoding() {
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const searchLocation = useCallback(async (query: string): Promise<RadarLocation | null> => {
    setSearching(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`/api/geocode/search?${params}`);
      if (!res.ok) throw new Error("Geocoding request failed");
      const results = await res.json();
      if (!results.length) {
        setSearchError("Location not found");
        return null;
      }
      const r = results[0];
      return {
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        label: r.display_name.split(",").slice(0, 2).join(",").trim(),
      };
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      return null;
    } finally {
      setSearching(false);
    }
  }, []);

  const getBrowserLocation = useCallback((): Promise<RadarLocation | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setSearchError("Geolocation not supported");
        resolve(null);
        return;
      }
      setSearching(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setSearching(false);
          resolve({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            label: "My Location",
          });
        },
        () => {
          setSearching(false);
          setSearchError("Location access denied");
          resolve(null);
        }
      );
    });
  }, []);

  return { searchLocation, getBrowserLocation, searching, searchError };
}
