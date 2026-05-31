import { useCallback, useEffect, useState } from 'react';

export type AppView = 'dashboard' | 'graph';

const QUERY_KEY = 'view';

const readView = (): AppView =>
  new URLSearchParams(window.location.search).get(QUERY_KEY) === 'graph'
    ? 'graph'
    : 'dashboard';

export interface UseViewRouteResult {
  view: AppView;
  setView: (next: AppView) => void;
}

/**
 * Minimal `?view=` router — avoids pulling in a routing library for a single
 * extra view. Owns the canonical view state, keeps the URL in sync via
 * `history.pushState`, and reacts to browser back/forward (`popstate`).
 */
export const useViewRoute = (): UseViewRouteResult => {
  const [view, setViewState] = useState<AppView>(readView);

  useEffect(() => {
    const onPopState = () => setViewState(readView());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setView = useCallback((next: AppView) => {
    const url = new URL(window.location.href);
    if (next === 'graph') url.searchParams.set(QUERY_KEY, 'graph');
    else url.searchParams.delete(QUERY_KEY);
    window.history.pushState({}, '', url);
    setViewState(next);
  }, []);

  return { view, setView };
};
