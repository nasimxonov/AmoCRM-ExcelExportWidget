import { Module } from '@nestjs/common';
import { AccountModule } from '../accounts/account.module';
import { AuthModule } from '../auth/auth.module';
import { TokenCipher } from './crypto/token-cipher';
import { PrismaGoogleAccountRepository } from './google-account.repository';
import { GOOGLE_ACCOUNT_REPOSITORY } from './interfaces/google-account.types';
import { GoogleOAuthService } from './google-oauth.service';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleController } from './google.controller';

@Module({
  imports: [AccountModule, AuthModule],
  controllers: [GoogleController],
  providers: [
    TokenCipher,
    { provide: GOOGLE_ACCOUNT_REPOSITORY, useClass: PrismaGoogleAccountRepository },
    GoogleOAuthService,
    GoogleSheetsService,
  ],
  exports: [GoogleOAuthService, GoogleSheetsService, GOOGLE_ACCOUNT_REPOSITORY],
})
export class GoogleModule {}
