import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor} from '@nestjs/common';
import {
  Injectable,
  Logger
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { Observable} from 'rxjs';
import { tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startedAt;
          this.logger.log(
            `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`,
          );
        },
        error: (error: Error) => {
          const durationMs = Date.now() - startedAt;
          this.logger.warn(
            `${request.method} ${request.originalUrl} failed after ${durationMs}ms: ${error.message}`,
          );
        },
      }),
    );
  }
}
