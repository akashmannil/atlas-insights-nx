import type {
  GraphEdge,
  GraphNode,
  GraphNodeType,
  GraphRelation,
} from '@atlas/shared-types';

/**
 * Parses the `KNOWLEDGE_GRAPH.md` triple store into nodes + edges.
 *
 * The markdown holds triples of the form `(subject)-[relation]->(object)`,
 * fenced in code blocks. Parsing is gated to the "Triple store" section (the
 * `## 4.` heading the doc designates as the source of truth) so illustrative
 * examples elsewhere — e.g. the `(subject)-[relation]->(object)` format demo in
 * §1 — never leak in. The Mermaid block in §5 is excluded both by the section
 * gate and because its `a -->|rel| b` lines don't start with `(`.
 *
 * Two relations are folded into node metadata rather than emitted as edges:
 *   - `instance_of` sets the node's `type`.
 *   - `has_attribute` (object shaped `key:value`) sets `layer` / `route`.
 *
 * Any node referenced by an edge but never declared gets auto-created with the
 * default `file` type, so the graph is always internally consistent.
 */

const TRIPLE_RE = /^\(([^)]+)\)-\[([^\]]+)\]->\((.+)\)$/;
// The triple store lives under the `## 4.` heading; an h2 heading for any other
// section closes it. Gating to this section keeps doc examples out of the graph.
const H2_RE = /^##\s+(\d+)\./;
const STORE_SECTION = '4';

const NODE_TYPES = new Set<GraphNodeType>([
  'module',
  'file',
  'class',
  'function',
  'endpoint',
  'service',
  'config',
  'external_lib',
  'datastore',
]);

const RELATIONS = new Set<GraphRelation>([
  'imports',
  'calls',
  'defines',
  'inherits',
  'implements',
  'depends_on',
  'exposes',
  'reads_from',
  'writes_to',
  'configures',
  'tested_by',
  'instantiates',
  'related_to',
]);

interface MutableNode {
  id: string;
  type: GraphNodeType;
  declared: boolean;
  layer?: string;
  route?: string;
}

/** Prettify an id into a display label: drop the symbol prefix, de-snake. */
const deriveLabel = (id: string): string => {
  const tail = id.includes('::') ? id.slice(id.lastIndexOf('::') + 2) : id;
  return tail.replace(/_/g, ' ');
};

export interface ParsedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const parseTriples = (markdown: string): ParsedGraph => {
  const nodes = new Map<string, MutableNode>();
  const edges: GraphEdge[] = [];

  const ensure = (id: string): MutableNode => {
    let node = nodes.get(id);
    if (!node) {
      node = { id, type: 'file', declared: false };
      nodes.set(id, node);
    }
    return node;
  };

  let inStore = false;
  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim();

    const heading = H2_RE.exec(line);
    if (heading) {
      inStore = heading[1] === STORE_SECTION;
      continue;
    }
    if (!inStore) continue;

    // Skip diff-removal markers (`-(subject)-...`) and non-triple prose.
    if (!line.startsWith('(')) continue;

    const match = TRIPLE_RE.exec(line);
    if (!match) continue;
    const [, subject, relation, object] = match;
    if (!subject || !relation || !object) continue;

    if (relation === 'instance_of') {
      const node = ensure(subject);
      if (NODE_TYPES.has(object as GraphNodeType)) {
        node.type = object as GraphNodeType;
        node.declared = true;
      }
      continue;
    }

    if (relation === 'has_attribute') {
      const node = ensure(subject);
      const sep = object.indexOf(':');
      if (sep > 0) {
        const key = object.slice(0, sep).trim();
        const value = object.slice(sep + 1).trim();
        if (key === 'layer') node.layer = value;
        else if (key === 'route') node.route = value;
      }
      continue;
    }

    // Real relationship edge — make sure both endpoints exist as nodes.
    ensure(subject);
    ensure(object);
    edges.push({
      from: subject,
      to: object,
      relation: RELATIONS.has(relation as GraphRelation)
        ? (relation as GraphRelation)
        : 'related_to',
    });
  }

  const resolved: GraphNode[] = [...nodes.values()].map((n) => ({
    id: n.id,
    type: n.type,
    label: n.type === 'endpoint' && n.route ? n.route : deriveLabel(n.id),
    ...(n.layer ? { layer: n.layer } : {}),
    ...(n.route ? { route: n.route } : {}),
  }));

  return { nodes: resolved, edges };
};
