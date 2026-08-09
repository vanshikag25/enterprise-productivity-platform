import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthObject } from './auth-object';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthObject => {
    const request = ctx.switchToHttp().getRequest<Request>();

    if (!request.auth) {
      throw new UnauthorizedException('Request is not authenticated');
    }

    return request.auth;
  },
);