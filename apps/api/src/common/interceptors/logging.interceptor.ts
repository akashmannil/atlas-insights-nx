import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { sanitize } from '../log-sanitize';

/**
 * Lightweight access log.
 *
 * Intentionally **never logs request bodies or full headers** — even on a
 * public dataset, that's a discipline worth keeping so the same code is safe
 * to deploy in a context that does handle PII.
 *
 * Format: `[METHOD] /path STATUS duration` with the client IP appended,
 * sanitized to avoid log injection (CR/LF stripped).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const method = req.method;
    const url = sanitize(req.originalUrl ?? req.url);
    const ip = sanitize(req.ip ?? 'unknown');

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`[${method}] ${url} ${res.statusCode} ${ms}ms ip=${ip}`);
        },
        error: (err: unknown) => {
          const ms = Date.now() - start;
          const code = err instanceof Error ? err.message : String(err);
          this.logger.warn(`[${method}] ${url} ERR ${ms}ms ip=${ip} ${sanitize(code)}`);
        },
      }),
    );
  }
}

