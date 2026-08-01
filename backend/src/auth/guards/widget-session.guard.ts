import type {
  CanActivate,
  ExecutionContext} from '@nestjs/common';
import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '../../accounts/interfaces/account.types';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { WidgetSessionPayload } from '../auth.service';

@Injectable()
export class WidgetSessionGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // EventSource (used for SSE progress streaming) cannot set custom
    // headers, so the token may arrive as a query param on that route.
    const queryToken = typeof request.query.token === 'string' ? request.query.token : null;
    const token = this.extractBearerToken(request.headers.authorization) ?? queryToken;
    if (!token) {
      throw new UnauthorizedException('Missing widget session token');
    }

    let payload: WidgetSessionPayload;
    try {
      payload = await this.jwtService.verifyAsync<WidgetSessionPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired widget session token');
    }

    const account = await this.accountRepository.findByAccountId(BigInt(payload.accountId));
    if (!account || account.subdomain !== payload.subdomain) {
      throw new UnauthorizedException('amoCRM account is no longer connected');
    }

    request.account = account;
    request.sessionUserId = payload.userId;
    return true;
  }

  private extractBearerToken(header: string | undefined): string | null {
    if (!header?.startsWith('Bearer ')) return null;
    return header.slice('Bearer '.length).trim() || null;
  }
}
