import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { NumericField } from '@atlas/shared-types';

/**
 * Global UI state — *not* the dataset itself.
 *
 * Why Zustand and not Context for these?
 *   - Filters, axis pickers, hover state, and pagination change frequently.
 *     A Context holding this would re-render every subscriber on every
 *     keystroke / page click.
 *   - Zustand's selector subscriptions let the chart re-render on axis changes
 *     while the table ignores them, and vice-versa.
 *
 * Why split `selectedId` here from the dedicated SelectedEarthquakeContext?
 *   - The Context exposes the *resolved record* + setter to the visual
 *     "detail" subtree (header badge, etc.).
 *   - The store holds the *id* as the canonical source of truth so anything
 *     in the app can both read and write it without subscribing to the Provider.
 *   - The Context derives its value from this store (see `SelectedEarthquakeProvider`).
 */
export interface EarthquakeUiState {
  /** Currently selected (clicked) earthquake. Persists across chart/table. */
  selectedId: string | null;
  /** Hover-highlighted earthquake — transient, never persisted. */
  hoveredId: string | null;

  /** Chart axis selections. */
  xAxis: NumericField;
  yAxis: NumericField;

  /** Filters applied to the dataset before any rendering. */
  minMagnitude: number;
  searchQuery: string;
  tsunamiOnly: boolean;

  /** 0-indexed current page in the records table. */
  currentPage: number;
  /** Records per page in the records table. */
  pageSize: number;

  setSelectedId: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setXAxis: (field: NumericField) => void;
  setYAxis: (field: NumericField) => void;
  setMinMagnitude: (value: number) => void;
  setSearchQuery: (query: string) => void;
  setTsunamiOnly: (value: boolean) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetFilters: () => void;
}

const INITIAL_FILTERS = {
  minMagnitude: 0,
  searchQuery: '',
  tsunamiOnly: false,
} as const;

const DEFAULT_PAGE_SIZE = 50;

export const useEarthquakeStore = create<EarthquakeUiState>()(
  // `subscribeWithSelector` lets us imperatively subscribe to slices outside
  // React (e.g. logging, persistence) without re-rendering components.
  subscribeWithSelector((set) => ({
    selectedId: null,
    hoveredId: null,

    xAxis: 'longitude',
    yAxis: 'latitude',

    ...INITIAL_FILTERS,

    currentPage: 0,
    pageSize: DEFAULT_PAGE_SIZE,

    setSelectedId: (id) => set({ selectedId: id }),
    setHoveredId: (id) => set({ hoveredId: id }),
    setXAxis: (field) => set({ xAxis: field }),
    setYAxis: (field) => set({ yAxis: field }),
    // Filter setters also reset the page — otherwise the user could be left
    // staring at "page 7 of 1" after narrowing their search.
    setMinMagnitude: (value) => set({ minMagnitude: value, currentPage: 0 }),
    setSearchQuery: (query) => set({ searchQuery: query, currentPage: 0 }),
    setTsunamiOnly: (value) => set({ tsunamiOnly: value, currentPage: 0 }),
    setCurrentPage: (page) => set({ currentPage: Math.max(0, page) }),
    setPageSize: (size) => set({ pageSize: Math.max(1, size), currentPage: 0 }),
    resetFilters: () => set({ ...INITIAL_FILTERS, selectedId: null, currentPage: 0 }),
  })),
);

/**
 * Stable selectors — exporting these as named functions keeps reference
 * equality across renders, so `useEarthquakeStore(selectSelectedId)` does
 * not subscribe to the whole store.
 */
export const selectSelectedId = (s: EarthquakeUiState): string | null => s.selectedId;
export const selectHoveredId = (s: EarthquakeUiState): string | null => s.hoveredId;
