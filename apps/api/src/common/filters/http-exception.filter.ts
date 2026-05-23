import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Single exception filter for all uncaught errors.
 *
 * Two goals:
 *   1. **Don't leak internals**. Stack traces and raw `Error.message` strings
 *      can disclose paths, dependency versions, or query structure. We return
 *      a sanitized envelope to the client and keep the detail in server logs.
 *   2. **Consistent shape**. Clients (including our React app) always get the
 *      same `{statusCode, message, timestamp, path}` envelope regardless of
 *      which layer threw.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const safeMessage =
      exception instanceof HttpException
        ? this.extractClientMessage(exception)
        : 'Internal server error';

    if (status >= 500) {
      // Full stack only for 5xx — 4xx are usually client error and just noise in logs.
      this.logger.error(
        `[${request.method} ${request.url}] ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`[${request.method} ${request.url}] ${status} — ${safeMessage}`);
    }

    response.status(status).json({
      statusCode: status,
      message: safeMessage,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private extractClientMessage(exception: HttpException): string {
    const res = exception.getResponse();
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object' && 'message' in res) {
      const m = (res as { message: unknown }).message;
      if (typeof m === 'string') return m;
      if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join('; ');
    }
    return exception.message;
  }
}
