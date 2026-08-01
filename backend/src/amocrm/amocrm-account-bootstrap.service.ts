import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration';
import { AmoCrmAccountClient } from './amocrm-account.client';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '../accounts/interfaces/account.types';

/**
 * A Private Integration long-lived token is scoped to exactly one amoCRM
 * account, but doesn't carry that account's id/subdomain in the token
 * itself. This resolves it once at boot (via GET /api/v4/account) and
 * upserts the local AmoAccount cache row that WidgetSessionGuard and
 * AmoCrmTokenProvider look up by accountId/subdomain.
 */
@Injectable()
export class AmoCrmAccountBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AmoCrmAccountBootstrapService.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly accountClient: AmoCrmAccountClient,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async onModuleInit(): Promise<void> {
    const { subdomain, longLivedToken } = this.configService.get('amocrm', { infer: true });

    let accountInfo: { id: number; subdomain: string };
    try {
      accountInfo = await this.accountClient.fetchAccountInfo(subdomain, longLivedToken);
    } catch (error) {
      this.logger.warn(
        `Could not verify amoCRM account for subdomain "${subdomain}" at startup — is AMOCRM_LONG_LIVED_TOKEN valid? Continuing without an auto-registered account.`,
      );
      this.logDetailedError('fetchAccountInfo', error);
      return;
    }

    try {
      await this.accountRepository.upsertAccount({
        accountId: BigInt(accountInfo.id),
        subdomain: accountInfo.subdomain,
      });
      this.logger.log(`amoCRM account ${accountInfo.id} (${accountInfo.subdomain}) registered from long-lived token`);
    } catch (error) {
      this.logger.warn(
        `Resolved amoCRM account ${accountInfo.id} (${accountInfo.subdomain}) but failed to persist it locally. Continuing without an auto-registered account.`,
      );
      this.logDetailedError('accountRepository.upsertAccount', error);
    }
  }

  private logDetailedError(step: string, error: unknown): void {
    const details: Record<string, unknown> = { step };
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;
      if ('code' in err) details.prismaCode = err.code; // e.g. P2021 = table does not exist
      if ('meta' in err) details.prismaMeta = err.meta;
      if ('message' in err) details.message = err.message;
      if ('response' in err) {
        const response = err.response as { status?: number; data?: unknown } | undefined;
        details.httpStatus = response?.status;
        details.httpBody = response?.data;
      }
    }
    this.logger.error(JSON.stringify(details, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)));
    if (error instanceof Error && error.stack) {
      this.logger.error(error.stack);
    }
  }
}
