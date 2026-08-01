import { Module } from '@nestjs/common';
import { PrismaAccountRepository } from './account.repository';
import { ACCOUNT_REPOSITORY } from './interfaces/account.types';

@Module({
  providers: [{ provide: ACCOUNT_REPOSITORY, useClass: PrismaAccountRepository }],
  exports: [ACCOUNT_REPOSITORY],
})
export class AccountModule {}
