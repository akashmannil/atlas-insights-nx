/**
 * Sanitization helpers for untrusted text that flows in from upstream feeds.
 *
 * React's JSX already escapes interpolated text — so XSS via `<div>{place}</div>`
 * is already prevented at the FE. But:
 *   1. The same string is logged on the server, returned to API consumers,
 *      and could one day be rendered with `dangerouslySetInnerHTML` if a
 *      future developer drops their guard.
 *   2. Control characters can corrupt CSV / NDJSON outputs.
 *   3. A bounded length stops a hostile feed from blowing up payload size.
 *
 * Keeping sanitization here means the cleanup happens **once at the
 * ingestion boundary** and every downstream consumer can trust the result.
 */

const MAX_PLACE_LENGTH = 200;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x1F\x7F]/g;
const HTML_TAGS = /<\/?[^>]+(>|$)/g;

export const sanitizePlace = (raw: string): string => {
  if (!raw) return 'Unknown location';
  const stripped = raw
    .replace(CONTROL_CHARS, ' ')
    .replace(HTML_TAGS, '')
    .trim();
  if (stripped.length === 0) return 'Unknown location';
  return stripped.length > MAX_PLACE_LENGTH
    ? `${stripped.slice(0, MAX_PLACE_LENGTH - 1)}…`
    : stripped;
};
