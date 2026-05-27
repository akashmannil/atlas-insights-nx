/**
 * Strip CR/LF (and bound length) on any untrusted string before it hits the
 * log stream. Forging fake log lines via embedded `\r\n` is the easiest log
 * injection mistake to make — keep this sanitizer between every user-derived
 * string and the logger.
 */
export const sanitize = (s: string): string => s.replace(/[\r\n]/g, ' ').slice(0, 256);
