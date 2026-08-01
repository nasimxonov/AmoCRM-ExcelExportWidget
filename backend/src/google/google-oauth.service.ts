import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import type { AppConfig } from '../config/configuration';
import { GOOGLE_ACCOUNT_REPOSITORY, type IGoogleAccountRepository } from './interfaces/google-account.types';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
];

// Refresh a bit before actual expiry so a slow request doesn't race the token dying mid-flight.
const ACCESS_TOKEN_REFRESH_MARGIN_MS = 60_000;

@Injectable()
export class GoogleOAuthService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    @Inject(GOOGLE_ACCOUNT_REPOSITORY) private readonly googleAccountRepository: IGoogleAccountRepository,
  ) {}

  buildConsentUrl(state: string): string {
    const client = this.createClient();
    return client.generateAuthUrl({
      access_type: 'offline',
      // Forces Google to hand back a refresh_token on every consent, not just
      // the very first time this Google account ever authorized this app.
      prompt: 'consent',
      scope: SCOPES,
      state,
    });
  }

  async connectAccount(accountDbId: number, code: string): Promise<void> {
    const client = this.createClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      throw new UnauthorizedException(
        "Google did not return a refresh token. Revoke this app's access at " +
          'https://myaccount.google.com/permissions and try connecting again.',
      );
    }

    client.setCredentials(tokens);
    const { data: userInfo } = await google.oauth2({ auth: client, version: 'v2' }).userinfo.get();

    await this.googleAccountRepository.upsert({
      accountId: accountDbId,
      googleEmail: userInfo.email ?? 'unknown',
      refreshToken: tokens.refresh_token,
    });
  }

  async getValidAccessToken(accountDbId: number): Promise<string> {
    const record = await this.googleAccountRepository.findByAccountId(accountDbId);
    if (!record) {
      throw new UnauthorizedException('No Google account connected for this amoCRM account');
    }

    const isFresh =
      record.accessToken !== null &&
      record.accessTokenExpiresAt !== null &&
      record.accessTokenExpiresAt.getTime() - ACCESS_TOKEN_REFRESH_MARGIN_MS > Date.now();

    if (isFresh) {
      return record.accessToken as string;
    }

    const client = this.createClient();
    client.setCredentials({ refresh_token: record.refreshToken });
    const { token } = await client.getAccessToken();
    if (!token) {
      throw new UnauthorizedException('Failed to refresh Google access token');
    }

    const expiryDate = client.credentials.expiry_date
      ? new Date(client.credentials.expiry_date)
      : new Date(Date.now() + 3_500_000);

    await this.googleAccountRepository.updateAccessToken({
      accountId: accountDbId,
      accessToken: token,
      accessTokenExpiresAt: expiryDate,
    });

    return token;
  }

  private createClient() {
    const { clientId, clientSecret, redirectUri } = this.configService.get('google', { infer: true });
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }
}
