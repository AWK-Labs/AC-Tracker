import { Router, type IRouter, type Request, type Response } from "express";

const AIRCRAFT_CACHE_TTL_MS = 3_000;
const GEOCODE_CACHE_TTL_MS = 60 * 60_000;
const UPSTREAM_TIMEOUT_MS = 8_000;
const RATE_WINDOW_MS = 60_000;

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

type RateEntry = {
  resetAt: number;
  count: number;
};

const aircraftCache = new Map<string, CacheEntry>();
const geocodeCache = new Map<string, CacheEntry>();
const rateLimits = new Map<string, RateEntry>();

const router: IRouter = Router();

function readNumber(value: unknown): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRateLimited(req: Request, bucket: string, limit: number): boolean {
  const now = Date.now();
  const key = `${bucket}:${req.ip}`;
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { resetAt: now + RATE_WINDOW_MS, count: 1 });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

function sendBadRequest(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

function getCached(cache: Map<string, CacheEntry>, key: string): unknown | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(
  cache: Map<string, CacheEntry>,
  key: string,
  data: unknown,
  ttlMs: number,
): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Upstream responded with ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

router.get("/aircraft/point", async (req, res, next) => {
  const lat = readNumber(req.query["lat"]);
  const lon = readNumber(req.query["lon"]);
  const radiusNm = readNumber(req.query["radiusNm"]);

  if (lat == null || lat < -90 || lat > 90) {
    sendBadRequest(res, "lat must be a number between -90 and 90");
    return;
  }

  if (lon == null || lon < -180 || lon > 180) {
    sendBadRequest(res, "lon must be a number between -180 and 180");
    return;
  }

  if (radiusNm == null || radiusNm < 1 || radiusNm > 500) {
    sendBadRequest(res, "radiusNm must be a number between 1 and 500");
    return;
  }

  if (isRateLimited(req, "aircraft", 60)) {
    res.status(429).json({ error: "Too many aircraft requests" });
    return;
  }

  const roundedLat = lat.toFixed(4);
  const roundedLon = lon.toFixed(4);
  const roundedRadius = String(Math.round(radiusNm));
  const cacheKey = `${roundedLat}:${roundedLon}:${roundedRadius}`;
  const cached = getCached(aircraftCache, cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const data = await fetchJson(
      `https://api.airplanes.live/v2/point/${roundedLat}/${roundedLon}/${roundedRadius}`,
    );
    setCached(aircraftCache, cacheKey, data, AIRCRAFT_CACHE_TTL_MS);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

router.get("/geocode/search", async (req, res, next) => {
  const query = typeof req.query["q"] === "string" ? req.query["q"].trim() : "";

  if (query.length < 1 || query.length > 120) {
    sendBadRequest(res, "q must be between 1 and 120 characters");
    return;
  }

  if (isRateLimited(req, "geocode", 20)) {
    res.status(429).json({ error: "Too many geocoding requests" });
    return;
  }

  const cacheKey = query.toLowerCase();
  const cached = getCached(geocodeCache, cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
  });

  try {
    const data = await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`, {
      "Accept-Language": "en",
      "User-Agent": "AC-Tracker/0.1",
    });
    setCached(geocodeCache, cacheKey, data, GEOCODE_CACHE_TTL_MS);
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;
