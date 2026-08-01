import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { AccountRecord } from '../../accounts/interfaces/account.types';

export const CurrentAccount = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccountRecord => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.account;
  },
);
