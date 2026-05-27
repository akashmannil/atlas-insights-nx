import {
  DEFAULT_PAGE_SIZE,
  type EarthquakeListResponse,
  type EarthquakeRecord,
  type EarthquakeStatsResponse,
} from '@atlas/shared-types';
import { computeEarthquakeStats, parseEarthquakeCsv } from '@atlas/shared-utils';

/**
 * Network entry points for earthquake data.
 *
 * Modes:
 *   1. **API mode** (default) — paginated `GET /api/earthquakes?cursor=&limit=`,
 *      JSON envelope, ETag-aware so the browser auto-304s unchanged pages.
 *   2. **Direct mode** (`VITE_USE_DIRECT_FEED=true`) — single CSV fetch
 *      against USGS, parsed locally; pagination is faked from the full
 *      array so the FE behaves identically downstream.
 *
 * React Query owns retry / backoff — these functions just succeed or throw.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');
const USE_DIRECT_FEED = import.meta.env.VITE_USE_DIRECT_FEED === 'true';
const DIRECT_FEED_URL =
  import.meta.env.VITE_USGS_FEED_URL ??
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv';

export const EARTHQUAKES_QUERY_KEY = ['earthquakes', 'pages'] as const;
export const EARTHQUAKES_STATS_KEY = ['earthquakes', 'stats'] as const;

export const fetchEarthquakePage = async (
  cursor: number,
  signal?: AbortSignal,
): Promise<EarthquakeListResponse> =>
  USE_DIRECT_FEED ? fetchDirectPage(cursor, signal) : fetchApiPage(cursor, signal);

export const fetchEarthquakeStats = async (
  signal?: AbortSignal,
): Promise<EarthquakeStatsResponse> =>
  USE_DIRECT_FEED ? fetchDirectStats(signal) : fetchApiStats(signal);

// ---------- API mode ----------

const fetchApiPage = async (
  cursor: number,
  signal?: AbortSignal,
): Promise<EarthquakeListResponse> => {
  const url = `${API_BASE}/earthquakes?cursor=${cursor}&limit=${DEFAULT_PAGE_SIZE}`;
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(
      `API responded ${response.status} ${response.statusText}. ` +
        `If you're running the FE standalone, set VITE_USE_DIRECT_FEED=true to bypass the API.`,
    );
  }

  return (await response.json()) as EarthquakeListResponse;
};

const fetchApiStats = async (signal?: AbortSignal): Promise<EarthquakeStatsResponse> => {
  const response = await fetch(`${API_BASE}/earthquakes/stats`, {
    signal,
    headers: { Accept: 'application/json' },
    credentials: 'omit',
  });
  if (!response.ok) {
    throw new Error(`Stats endpoint responded ${response.status} ${response.statusText}.`);
  }
  return (await response.json()) as EarthquakeStatsResponse;
};

// ---------- Direct mode (FE-only, no API deployed) ----------

let directCache: { fetchedAt: number; records: EarthquakeRecord[] } | null = null;
const DIRECT_TTL_MS = 5 * 60 * 1000;

const getDirectDataset = async (signal?: AbortSignal): Promise<EarthquakeRecord[]> => {
  if (directCache && Date.now() - directCache.fetchedAt < DIRECT_TTL_MS) {
    return directCache.records;
  }
  const response = await fetch(DIRECT_FEED_URL, {
    signal,
    headers: { Accept: 'text/csv' },
  });
  if (!response.ok) {
    throw new Error(`USGS feed responded with ${response.status} ${response.statusText}.`);
  }
  const csv = await response.text();
  if (!csv.trim()) throw new Error('USGS feed returned an empty response.');
  const records = parseEarthquakeCsv(csv);
  directCache = { fetchedAt: Date.now(), records };
  return records;
};

const fetchDirectPage = async (
  cursor: number,
  signal?: AbortSignal,
): Promise<EarthquakeListResponse> => {
  const all = await getDirectDataset(signal);
  const slice = all.slice(cursor, cursor + DEFAULT_PAGE_SIZE);
  const nextOffset = cursor + slice.length;
  return {
    data: slice,
    meta: {
      generatedAt: Date.now(),
      count: slice.length,
      total: all.length,
      cursor,
      nextCursor: nextOffset < all.length ? nextOffset : null,
      cached: directCache !== null && Date.now() - directCache.fetchedAt < DIRECT_TTL_MS,
    },
  };
};

const fetchDirectStats = async (
  signal?: AbortSignal,
): Promise<EarthquakeStatsResponse> => {
  const records = await getDirectDataset(signal);
  return {
    ...computeEarthquakeStats(records),
    generatedAt: Date.now(),
  };
};
