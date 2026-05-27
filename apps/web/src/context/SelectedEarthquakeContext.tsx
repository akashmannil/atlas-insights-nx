// Why: project convention co-locates the Context, Provider, and accessor
// hook in a single file (see .claude/rules/code-style.md). That trips
// react-refresh/only-export-components, which insists a file export only
// components. Disabling here is preferable to splitting the file.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { EarthquakeRecord } from '@atlas/shared-types';
import { useEarthquakeStore } from '@/store/useEarthquakeStore';

/**
 * Context that exposes the *resolved* selected earthquake record (plus a
 * setter) to descendants without prop-drilling.
 *
 * Why a Context here when we already have Zustand?
 *   - The store holds the *id*. Resolving it to the full record requires the
 *     dataset, which lives in TanStack Query's cache. Doing this resolution in
 *     every consumer means duplicating the lookup. Wrapping it once at the
 *     Provider level is exactly what Context is for.
 *   - Demonstrates the canonical "shared selection state without prop
 *     drilling" pattern called out in the assessment brief.
 *
 * The Provider derives its value from `records` + Zustand selection state,
 * memoized so consumers only re-render when the selection actually flips.
 */
interface SelectedEarthquakeContextValue {
  selected: EarthquakeRecord | null;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  clearSelection: () => void;
}

const SelectedEarthquakeContext = createContext<SelectedEarthquakeContextValue | null>(null);

interface ProviderProps {
  records: readonly EarthquakeRecord[];
  children: ReactNode;
}

export const SelectedEarthquakeProvider = ({ records, children }: ProviderProps) => {
  const selectedId = useEarthquakeStore((s) => s.selectedId);
  const setSelectedId = useEarthquakeStore((s) => s.setSelectedId);

  const value = useMemo<SelectedEarthquakeContextValue>(() => {
    const selected =
      selectedId === null ? null : records.find((r) => r.id === selectedId) ?? null;

    return {
      selected,
      selectedId,
      setSelectedId,
      clearSelection: () => setSelectedId(null),
    };
  }, [records, selectedId, setSelectedId]);

  return (
    <SelectedEarthquakeContext.Provider value={value}>
      {children}
    </SelectedEarthquakeContext.Provider>
  );
};

/**
 * Strict accessor — throws when called outside the Provider so misuse fails
 * loudly at the boundary instead of returning a misleading null.
 */
export const useSelectedEarthquake = (): SelectedEarthquakeContextValue => {
  const ctx = useContext(SelectedEarthquakeContext);
  if (!ctx) {
    throw new Error(
      'useSelectedEarthquake must be used inside a <SelectedEarthquakeProvider>.',
    );
  }
  return ctx;
};
