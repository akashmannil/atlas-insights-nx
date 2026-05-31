import type { KnowledgeGraphResponse } from '@atlas/shared-types';

/**
 * Network entry point for the architecture knowledge graph.
 *
 * Plain async function (no hooks) per the `api/` convention — React Query owns
 * retry/caching in the consuming hook.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/$/, '');

export const KNOWLEDGE_GRAPH_QUERY_KEY = ['knowledge-graph'] as const;

export const fetchKnowledgeGraph = async (
  signal?: AbortSignal,
): Promise<KnowledgeGraphResponse> => {
  const response = await fetch(`${API_BASE}/graph`, {
    signal,
    headers: { Accept: 'application/json' },
    credentials: 'omit',
  });

  if (!response.ok) {
    throw new Error(
      `Graph endpoint responded ${response.status} ${response.statusText}. ` +
        'The API parses KNOWLEDGE_GRAPH.md — ensure the API is running and the file is present.',
    );
  }

  return (await response.json()) as KnowledgeGraphResponse;
};
