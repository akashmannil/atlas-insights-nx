import Papa from 'papaparse';
import type { EarthquakeRecord } from '@atlas/shared-types';
import { sanitizePlace } from './sanitize';

/**
 * Parses the USGS earthquake CSV feed into a typed array of records.
 *
 * **Where this runs**: both the NestJS API (server-side ingestion) and the
 * web app (legacy direct-fetch fallback). Living in `libs/shared-utils` keeps
 * the parsing logic identical on both ends of the wire — eliminating a
 * whole class of "the FE reads it differently than the BE" bugs.
 *
 * Why we hand-pick fields rather than trusting `dynamicTyping`:
 *   - A stray non-numeric value in a magnitude column would silently turn it
 *     into a string and break the chart.
 *   - Rows missing critical geometry (lat / lon / id / time) get dropped —
 *     they cannot be plotted or keyed, and including them forces every
 *     downstream consumer to re-check.
 *   - Free-text `place` field passes through `sanitizePlace` to strip any
 *     embedded control characters / HTML — defense in depth even though
 *     React's JSX is already auto-escaped.
 */
export const parseEarthquakeCsv = (csv: string): EarthquakeRecord[] => {
  const result = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (result.errors.length > 0) {
    const first = result.errors[0];
    // PapaParse reports per-row issues; the feed sometimes has trailing junk
    // lines we can safely ignore.
    if (first && first.code !== 'TooFewFields' && first.code !== 'TooManyFields') {
      throw new Error(`CSV parse error: ${first.message}`);
    }
  }

  const records: EarthquakeRecord[] = [];
  for (const row of result.data) {
    const id = row.id?.trim();
    const timeStr = row.time?.trim();
    const lat = toNumber(row.latitude);
    const lon = toNumber(row.longitude);

    if (!id || !timeStr || lat === null || lon === null) continue;

    const time = Date.parse(timeStr);
    if (Number.isNaN(time)) continue;

    records.push({
      id: id.slice(0, 64), // USGS ids are < 30 chars; hard-cap to avoid abuse.
      time,
      place: sanitizePlace(row.place ?? ''),
      latitude: lat,
      longitude: lon,
      depth: toNumber(row.depth),
      magnitude: toNumber(row.mag),
      significance: toNumber(row.sig),
      felt: toNumber(row.felt),
      tsunami: row.tsunami === '1' ? 1 : 0,
      type: (row.type?.trim() || 'earthquake').slice(0, 32),
      magType: row.magType?.trim() || null,
    });
  }

  // Sort by time DESC — newest events first, matching what users expect
  // when they open a "recent activity" dashboard.
  records.sort((a, b) => b.time - a.time);
  return records;
};

const toNumber = (raw: string | undefined): number | null => {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
};
