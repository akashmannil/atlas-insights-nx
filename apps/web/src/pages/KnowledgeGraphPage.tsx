import { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { MermaidDiagram } from '@/components/graph/MermaidDiagram';
import { useKnowledgeGraph } from '@/hooks/useKnowledgeGraph';
import { graphToMermaid } from '@/utils/graphToMermaid';

interface KnowledgeGraphPageProps {
  onBack: () => void;
}

/**
 * Architecture knowledge-graph view.
 *
 * Pulls the parsed triple store from `GET /api/graph`, converts it to a Mermaid
 * definition, and renders it. Thin composition — the data lives in TanStack
 * Query, the conversion is a pure util, and the drawing is isolated in
 * `<MermaidDiagram>`.
 */
export const KnowledgeGraphPage = ({ onBack }: KnowledgeGraphPageProps) => {
  const { graph, isLoading, isError, error, refetch } = useKnowledgeGraph();

  const chart = useMemo(
    () => (graph ? graphToMermaid(graph.nodes, graph.edges) : ''),
    [graph],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-brand-400 hover:text-brand-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Architecture graph</h1>
              <p className="text-xs text-slate-500">
                Dependency &amp; structure graph parsed from <code>KNOWLEDGE_GRAPH.md</code>
              </p>
            </div>
          </div>

          {graph && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium tabular-nums text-slate-700">
                {graph.meta.nodeCount.toLocaleString()} nodes
              </span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium tabular-nums text-slate-700">
                {graph.meta.edgeCount.toLocaleString()} edges
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-6 py-6">
        <Card
          title="Dependency graph"
          description="Nodes grouped by kind; arrows are labelled with the relation. Scroll to pan a large graph."
          className="min-h-[700px]"
        >
          {isLoading ? (
            <Skeleton className="h-[600px] w-full" />
          ) : isError ? (
            <ErrorState
              title="Couldn't load the knowledge graph"
              message={error?.message ?? 'Unknown error fetching /api/graph.'}
              onRetry={refetch}
            />
          ) : !graph || graph.nodes.length === 0 ? (
            <ErrorState
              title="Graph is empty"
              message="No triples were parsed from KNOWLEDGE_GRAPH.md."
              onRetry={refetch}
            />
          ) : (
            <MermaidDiagram chart={chart} />
          )}
        </Card>
      </main>
    </div>
  );
};
