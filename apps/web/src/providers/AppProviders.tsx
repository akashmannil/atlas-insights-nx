import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

/**
 * Root-level providers. Kept in a single file so wiring stays discoverable:
 * any future provider (theme, i18n, feature flags) gets added here.
 *
 * `QueryClient` is created lazily inside state so it survives Hot Module
 * Reload — otherwise every save would wipe the in-memory cache.
 */
interface AppProvidersProps {
  children: ReactNode;
}

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        refetchOnWindowFocus: false,
        // Keep parsed CSV in memory for a half-hour so HMR / nav doesn't
        // re-parse a multi-MB payload.
        gcTime: 30 * 60 * 1000,
      },
    },
  });

export const AppProviders = ({ children }: AppProvidersProps) => {
  const [client] = useState(createQueryClient);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={client}>
        {children}
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
