import { useQuery } from '@tanstack/react-query';
import type { KnowledgeGraphResponse } from '@atlas/shared-types';
import { KNOWLEDGE_GRAPH_QUERY_KEY, fetchKnowledgeGraph } from '@/api/graph';

export interface UseKnowledgeGraphResult {
  graph: KnowledgeGraphResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetches the parsed architecture graph from the API.
 *
 * The source is a static doc, so it never goes stale within a session
 * (`staleTime: Infinity`) — one fetch, then served from the Query cache.
 */
export const useKnowledgeGraph = (): UseKnowledgeGraphResult => {
  const query = useQuery<KnowledgeGraphResponse, Error>({
    queryKey: KNOWLEDGE_GRAPH_QUERY_KEY,
    queryFn: ({ signal }) => fetchKnowledgeGraph(signal),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    graph: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => {
      query.refetch();
    },
  };
};
