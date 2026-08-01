import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TokenCipher } from './crypto/token-cipher';
import type {
  GoogleAccountRecord,
  IGoogleAccountRepository,
  UpdateGoogleAccessTokenInput,
  UpsertGoogleAccountInput,
} from './interfaces/google-account.types';

interface PrismaGoogleAccountRow {
  id: number;
  accountId: number;
  googleEmail: string;
  refreshTokenEncrypted: string;
  accessTokenEncrypted: string | null;
  accessTokenExpiresAt: Date | null;
  connectedAt: Date;
}

@Injectable()
export class PrismaGoogleAccountRepository implements IGoogleAccountRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCipher: TokenCipher,
  ) {}

  async findByAccountId(accountId: number): Promise<GoogleAccountRecord | null> {
    const record = await this.prisma.googleAccount.findUnique({ where: { accountId } });
    return record ? this.toRecord(record) : null;
  }

  async upsert(input: UpsertGoogleAccountInput): Promise<GoogleAccountRecord> {
    const refreshTokenEncrypted = this.tokenCipher.encrypt(input.refreshToken);
    const record = await this.prisma.googleAccount.upsert({
      where: { accountId: input.accountId },
      create: {
        accountId: input.accountId,
        googleEmail: input.googleEmail,
        refreshTokenEncrypted,
      },
      update: {
        googleEmail: input.googleEmail,
        refreshTokenEncrypted,
      },
    });
    return this.toRecord(record);
  }

  async updateAccessToken(input: UpdateGoogleAccessTokenInput): Promise<void> {
    await this.prisma.googleAccount.update({
      where: { accountId: input.accountId },
      data: {
        accessTokenEncrypted: this.tokenCipher.encrypt(input.accessToken),
        accessTokenExpiresAt: input.accessTokenExpiresAt,
      },
    });
  }

  async delete(accountId: number): Promise<void> {
    await this.prisma.googleAccount.deleteMany({ where: { accountId } });
  }

  private toRecord(record: PrismaGoogleAccountRow): GoogleAccountRecord {
    return {
      id: record.id,
      accountId: record.accountId,
      googleEmail: record.googleEmail,
      refreshToken: this.tokenCipher.decrypt(record.refreshTokenEncrypted),
      accessToken: record.accessTokenEncrypted ? this.tokenCipher.decrypt(record.accessTokenEncrypted) : null,
      accessTokenExpiresAt: record.accessTokenExpiresAt,
      connectedAt: record.connectedAt,
    };
  }
}
