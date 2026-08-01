import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AccountRecord, IAccountRepository, UpsertAccountInput } from './interfaces/account.types';

@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountId(accountId: bigint): Promise<AccountRecord | null> {
    const record = await this.prisma.amoAccount.findUnique({ where: { accountId } });
    return record ? this.toAccountRecord(record) : null;
  }

  async findById(dbId: number): Promise<AccountRecord | null> {
    const record = await this.prisma.amoAccount.findUnique({ where: { id: dbId } });
    return record ? this.toAccountRecord(record) : null;
  }

  async upsertAccount(input: UpsertAccountInput): Promise<AccountRecord> {
    const record = await this.prisma.amoAccount.upsert({
      where: { accountId: input.accountId },
      create: {
        accountId: input.accountId,
        subdomain: input.subdomain,
      },
      update: {
        subdomain: input.subdomain,
      },
    });
    return this.toAccountRecord(record);
  }

  private toAccountRecord(record: {
    id: number;
    accountId: bigint;
    subdomain: string;
    connectedAt: Date;
  }): AccountRecord {
    return {
      id: record.id,
      accountId: record.accountId,
      subdomain: record.subdomain,
      connectedAt: record.connectedAt,
    };
  }
}
