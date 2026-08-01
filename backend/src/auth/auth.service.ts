import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { SessionRequestDto } from '@excel-export/shared';
import type { AppConfig } from '../config/configuration';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '../accounts/interfaces/account.types';

export interface WidgetSessionPayload {
  accountId: number;
  subdomain: string;
  userId: number;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async createWidgetSession(dto: SessionRequestDto): Promise<{ token: string; expiresIn: number }> {
    const account = await this.accountRepository.findByAccountId(BigInt(dto.accountId));
    if (!account || account.subdomain !== dto.subdomain) {
      throw new UnauthorizedException('This amoCRM account is not the one connected via the Private Integration long-lived token');
    }

    const payload: WidgetSessionPayload = {
      accountId: dto.accountId,
      subdomain: dto.subdomain,
      userId: dto.userId,
    };

    const expiresIn = this.parseExpiresInSeconds(
      this.configService.get('security', { infer: true }).jwtExpiresIn,
    );

    const token = await this.jwtService.signAsync(payload);
    return { token, expiresIn };
  }

  private parseExpiresInSeconds(expr: string): number {
    const match = /^(\d+)([smhd])$/.exec(expr);
    if (!match) return 3600;
    const [, amountStr, unit] = match;
    const amount = Number(amountStr);
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return amount * (multipliers[unit as string] ?? 1);
  }
}
