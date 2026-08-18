import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContextData {
  ip?: string;
  userAgent?: string;
}

/**
 * Async-local storage carrying the current HTTP request's network metadata so
 * that services (which have no direct request access) can attach IP / device
 * information to audit records without threading it through every call site.
 */
export const requestContext = new AsyncLocalStorage<RequestContextData>();

export function getRequestContext(): RequestContextData | undefined {
  return requestContext.getStore();
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const forwarded = req.headers['x-forwarded-for'];
    const forwardedIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(',')[0]
      ?.trim();
    const ip = forwardedIp || req.socket?.remoteAddress || undefined;
    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : undefined;

    requestContext.run({ ip, userAgent }, () => next());
  }
}
