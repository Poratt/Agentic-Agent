// FILE: src/core/filters/http-exception.filter.ts

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { toHebrewUserMessage } from '../errors/user-message.he';
import { AppErrorCode } from '../errors/app-error-code';

interface HttpExceptionResponse {
  code?: string;
  message?: string | string[];
  error?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let userMessage = toHebrewUserMessage();
    let userError: string | string[] | null = null;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as HttpExceptionResponse;

      code = typeof res?.code === 'string' ? res.code : undefined;
      if (!code) {
        if (status === HttpStatus.NOT_FOUND) code = AppErrorCode.NOT_FOUND;
        if (status === HttpStatus.UNAUTHORIZED) code = AppErrorCode.UNAUTHORIZED;
        if (status === HttpStatus.FORBIDDEN) code = AppErrorCode.FORBIDDEN;
        if (status === HttpStatus.BAD_REQUEST) code = AppErrorCode.VALIDATION_ERROR;
      }

      const rawMessage = Array.isArray(res?.message)
        ? res.message[0]
        : typeof res?.message === 'string'
          ? res.message
          : undefined;

      // ValidationPipe and custom exceptions may attach user-facing details in `error`.
      const rawError = res?.error;
      if (Array.isArray(rawError)) {
        userError = rawError.filter((x) => typeof x === 'string');
      } else if (typeof rawError === 'string') {
        userError = rawError;
      }

      userMessage = toHebrewUserMessage(code, rawMessage);

      // Never leak technical/internal messages to the client.
      // Log full context server-side instead.
      const technical = typeof res === 'string' ? res : JSON.stringify({ status, code, res }, null, 2);
      this.logger.warn(`HTTP exception (${status})`, technical);
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
      userMessage = toHebrewUserMessage();
    }

    response.status(status).json({
      success: false,
      message: userMessage,
      result: null,
      error: userError,
      statusCode: status,
    });
  }
}
