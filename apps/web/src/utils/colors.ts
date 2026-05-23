/**
 * Magnitude → color ramp used by both the chart and table magnitude pill.
 *
 * Buckets follow the rough USGS perception scale:
 *   < 2.5  micro      (slate)
 *   2.5–4  light      (sky blue)
 *   4–5    moderate   (amber)
 *   5–6    strong     (orange)
 *   6–7    major      (red)
 *   ≥ 7    great      (deep red)
 *
 * Returning Tailwind tokens keeps the visual language coherent and avoids
 * scattering hex literals through components.
 */
export interface MagnitudeStyle {
  /** Hex color for SVG / chart use. */
  hex: string;
  /** Tailwind background utility for badges. */
  bg: string;
  /** Tailwind text utility for badges. */
  text: string;
  label: string;
}

export const magnitudeStyle = (magnitude: number | null): MagnitudeStyle => {
  if (magnitude === null) {
    return { hex: '#94a3b8', bg: 'bg-slate-100', text: 'text-slate-600', label: 'Unknown' };
  }
  if (magnitude < 2.5) return { hex: '#64748b', bg: 'bg-slate-100', text: 'text-slate-700', label: 'Micro' };
  if (magnitude < 4) return { hex: '#0ea5e9', bg: 'bg-sky-50', text: 'text-sky-700', label: 'Light' };
  if (magnitude < 5) return { hex: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Moderate' };
  if (magnitude < 6) return { hex: '#f97316', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Strong' };
  if (magnitude < 7) return { hex: '#ef4444', bg: 'bg-red-50', text: 'text-red-700', label: 'Major' };
  return { hex: '#b91c1c', bg: 'bg-red-100', text: 'text-red-800', label: 'Great' };
};
