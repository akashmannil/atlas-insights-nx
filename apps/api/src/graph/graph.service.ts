import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { KnowledgeGraphResponse } from '@atlas/shared-types';
import { parseTriples } from './triple-parser';

const SOURCE_FILENAME = 'KNOWLEDGE_GRAPH.md';

/**
 * Serves the parsed `KNOWLEDGE_GRAPH.md` triple store.
 *
 * The doc is a static repo artifact, so we parse it once and memoize — there's
 * no upstream call and no TTL to manage. Resolution walks up from both the
 * process cwd and this module's location so it works in dev (cwd = apps/api)
 * and in the slim Docker runtime (cwd = /app, where the Dockerfile copies the
 * file). If it can't be located we surface a generic 503, matching how the
 * earthquakes service treats a missing upstream — detail stays in the logs.
 */
@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);
  private cached: KnowledgeGraphResponse | null = null;

  async getGraph(): Promise<KnowledgeGraphResponse> {
    if (this.cached) return this.cached;

    const path = resolveSourcePath();
    if (!path) {
      this.logger.error(`${SOURCE_FILENAME} not found in any candidate location`);
      throw new ServiceUnavailableException('Knowledge graph source is unavailable.');
    }

    let markdown: string;
    try {
      markdown = await readFile(path, 'utf8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to read ${SOURCE_FILENAME}: ${message}`);
      throw new ServiceUnavailableException('Knowledge graph source is unavailable.');
    }

    const { nodes, edges } = parseTriples(markdown);
    const response: KnowledgeGraphResponse = {
      nodes,
      edges,
      meta: { generatedAt: Date.now(), nodeCount: nodes.length, edgeCount: edges.length },
    };

    this.cached = response;
    this.logger.log(`Parsed knowledge graph: ${nodes.length} nodes, ${edges.length} edges`);
    return response;
  }
}

/** Walk up from a starting dir looking for the source file (bounded depth). */
const searchUpward = (start: string): string | null => {
  let dir = start;
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(dir, SOURCE_FILENAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};

const resolveSourcePath = (): string | null =>
  searchUpward(process.cwd()) ?? searchUpward(__dirname);
