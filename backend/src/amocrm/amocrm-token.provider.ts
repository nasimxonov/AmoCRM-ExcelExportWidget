import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '../accounts/interfaces/account.types';

export interface ResolvedToken {
  accessToken: string;
  baseUrl: string;
}

/**
 * Resolves the amoCRM bearer token + base URL for a given account. Private
 * Integration long-lived tokens don't expire on a rolling basis and have no
 * refresh_token (see docs/AMOCRM_SETUP.md), so this is a direct read of
 * AMOCRM_LONG_LIVED_TOKEN rather than an OAuth refresh flow.
 */
@Injectable()
export class AmoCrmTokenProvider {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async getValidAccessToken(accountDbId: number): Promise<ResolvedToken> {
    const account = await this.accountRepository.findById(accountDbId);
    if (!account) {
      throw new UnauthorizedException('amoCRM account is not connected');
    }

    const { longLivedToken } = this.configService.get('amocrm', { infer: true });
    return { accessToken: longLivedToken, baseUrl: `https://${account.subdomain}.amocrm.ru` };
  }
}
