import type {
  ArgumentsHost,
  ExceptionFilter} from '@nestjs/common';
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorBody {
  statusCode: number;
  path: string;
  timestamp: string;
  message: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message, details } = this.resolve(exception);

    const body: ErrorBody = {
      statusCode: status,
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
      ...(details !== undefined ? { details } : {}),
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.url} -> ${status}: ${message}`, (exception as Error)?.stack);
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${message}`);
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; message: string; details?: unknown } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return { status: exception.getStatus(), message: response };
      }
      const responseObj = response as Record<string, unknown>;
      return {
        status: exception.getStatus(),
        message: (responseObj.message as string) ?? exception.message,
        details: responseObj.details ?? responseObj.errors,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.resolvePrismaError(exception);
    }

    if (exception instanceof Error) {
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error', details: undefined };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Unknown error occurred' };
  }

  private resolvePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): { status: number; message: string } {
    switch (exception.code) {
      case 'P2002':
        return { status: HttpStatus.CONFLICT, message: 'A record with this value already exists' };
      case 'P2025':
        return { status: HttpStatus.NOT_FOUND, message: 'Record not found' };
      default:
        return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Database error' };
    }
  }
}
