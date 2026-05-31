import { Controller, Get, Header } from '@nestjs/common';
import type { KnowledgeGraphResponse } from '@atlas/shared-types';
import { GraphService } from './graph.service';

/**
 * Read-only endpoint exposing the architecture knowledge graph.
 *
 * The source is a static doc, so a long public cache is safe — clients and
 * CDNs can hold it for minutes. Throttling is inherited from the global guard.
 */
@Controller('graph')
export class GraphController {
  constructor(private readonly service: GraphService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300, s-maxage=600')
  get(): Promise<KnowledgeGraphResponse> {
    return this.service.getGraph();
  }
}
