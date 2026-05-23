import Papa from 'papaparse';
import type { EarthquakeRecord } from '@atlas/shared-types';

/**
 * Serializes the currently-displayed records back to CSV and triggers a
 * client-side download. Done in-browser to keep this app fully static.
 */
export const downloadCsv = (records: readonly EarthquakeRecord[], filename: string): void => {
  const csv = Papa.unparse(records as EarthquakeRecord[]);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Important: free the object URL — otherwise the browser holds the blob
  // in memory for the lifetime of the document.
  URL.revokeObjectURL(url);
};
