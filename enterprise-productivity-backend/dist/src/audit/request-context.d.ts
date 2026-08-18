import { NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import type { NextFunction, Request, Response } from 'express';
export interface RequestContextData {
    ip?: string;
    userAgent?: string;
}
export declare const requestContext: AsyncLocalStorage<RequestContextData>;
export declare function getRequestContext(): RequestContextData | undefined;
export declare class RequestContextMiddleware implements NestMiddleware {
    use(req: Request, _res: Response, next: NextFunction): void;
}
