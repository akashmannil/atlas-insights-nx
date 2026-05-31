import type { GraphEdge, GraphNode, GraphNodeType } from '@atlas/shared-types';

/**
 * Converts a parsed knowledge graph into a Mermaid `graph LR` definition.
 *
 * Nodes are grouped into subgraphs by `instance_of` type (the grouping the
 * KNOWLEDGE_GRAPH.md RENDER recipe prescribes). Edges carry their relation as
 * the label. `instance_of` / `has_attribute` never reach the FE as edges — the
 * API already folds them into node fields — so every edge here is a real
 * dependency.
 */

const TYPE_TITLES: Record<GraphNodeType, string> = {
  external_lib: 'External libraries',
  datastore: 'Datastores',
  endpoint: 'Endpoints',
  service: 'Services',
  module: 'Modules',
  class: 'Classes',
  config: 'Config',
  function: 'Functions',
  file: 'Files',
};

// Stable, readable cluster order (left → right tends to follow this).
const TYPE_ORDER: readonly GraphNodeType[] = [
  'external_lib',
  'datastore',
  'config',
  'module',
  'service',
  'class',
  'endpoint',
  'file',
  'function',
];

/** Mermaid node ids must be identifier-safe; map our snake/`::` ids to that. */
const safeId = (id: string): string => `n_${id.replace(/[^a-zA-Z0-9_]/g, '_')}`;

const escapeLabel = (text: string): string =>
  text.replace(/"/g, '&quot;').replace(/[[\]]/g, '');

export const graphToMermaid = (
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): string => {
  const lines: string[] = ['graph LR'];

  const byType = new Map<GraphNodeType, GraphNode[]>();
  for (const node of nodes) {
    const bucket = byType.get(node.type);
    if (bucket) bucket.push(node);
    else byType.set(node.type, [node]);
  }

  const orderedTypes = [
    ...TYPE_ORDER.filter((t) => byType.has(t)),
    ...[...byType.keys()].filter((t) => !TYPE_ORDER.includes(t)),
  ];

  for (const type of orderedTypes) {
    const group = byType.get(type);
    if (!group || group.length === 0) continue;
    lines.push(`  subgraph grp_${type}["${escapeLabel(TYPE_TITLES[type] ?? type)}"]`);
    for (const node of group) {
      lines.push(`    ${safeId(node.id)}["${escapeLabel(node.label)}"]`);
    }
    lines.push('  end');
  }

  for (const edge of edges) {
    lines.push(`  ${safeId(edge.from)} -->|${edge.relation}| ${safeId(edge.to)}`);
  }

  return lines.join('\n');
};
