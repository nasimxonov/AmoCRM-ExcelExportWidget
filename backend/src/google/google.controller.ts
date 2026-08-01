import { Controller, Get, Inject, Post, Query, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import type { GoogleConnectionStatus } from '@excel-export/shared';
import { WidgetSessionGuard } from '../auth/guards/widget-session.guard';
import { CurrentAccount } from '../auth/decorators/current-account.decorator';
import type { AccountRecord } from '../accounts/interfaces/account.types';
import { GoogleOAuthService } from './google-oauth.service';
import { GOOGLE_ACCOUNT_REPOSITORY, type IGoogleAccountRepository } from './interfaces/google-account.types';

interface OAuthStatePayload {
  accountDbId: number;
}

const OAUTH_STATE_EXPIRES_IN = '10m';

@Controller('api/google')
export class GoogleController {
  constructor(
    private readonly googleOAuthService: GoogleOAuthService,
    @Inject(GOOGLE_ACCOUNT_REPOSITORY) private readonly googleAccountRepository: IGoogleAccountRepository,
    private readonly jwtService: JwtService,
  ) {}

  @UseGuards(WidgetSessionGuard)
  @Get('oauth/url')
  async getOAuthUrl(@CurrentAccount() account: AccountRecord): Promise<{ url: string }> {
    const payload: OAuthStatePayload = { accountDbId: account.id };
    const state = await this.jwtService.signAsync(payload, { expiresIn: OAUTH_STATE_EXPIRES_IN });
    return { url: this.googleOAuthService.buildConsentUrl(state) };
  }

  // Public: Google redirects the user's browser here directly after consent,
  // it cannot attach our widget-session Bearer token. The `state` JWT (minted
  // by getOAuthUrl above, same signing secret as WidgetSessionGuard) is what
  // ties this callback back to the amoCRM account that started the flow.
  @Get('oauth/callback')
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    let payload: OAuthStatePayload;
    try {
      payload = await this.jwtService.verifyAsync<OAuthStatePayload>(state);
    } catch {
      throw new UnauthorizedException('Invalid or expired Google OAuth state');
    }

    await this.googleOAuthService.connectAccount(payload.accountDbId, code);

    res
      .status(200)
      .type('html')
      .send(
        '<html><body style="font-family:sans-serif;text-align:center;padding:48px">' +
          '<p>Google account connected. You can close this tab.</p>' +
          '<script>window.close();</script></body></html>',
      );
  }

  @UseGuards(WidgetSessionGuard)
  @Get('status')
  async getStatus(@CurrentAccount() account: AccountRecord): Promise<GoogleConnectionStatus> {
    const record = await this.googleAccountRepository.findByAccountId(account.id);
    return { connected: Boolean(record), googleEmail: record?.googleEmail ?? null };
  }

  @UseGuards(WidgetSessionGuard)
  @Post('disconnect')
  async disconnect(@CurrentAccount() account: AccountRecord): Promise<{ success: true }> {
    await this.googleAccountRepository.delete(account.id);
    return { success: true };
  }
}
