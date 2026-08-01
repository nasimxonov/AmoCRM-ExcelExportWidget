export interface AccountRecord {
  id: number;
  accountId: bigint;
  subdomain: string;
  connectedAt: Date;
}

export interface UpsertAccountInput {
  accountId: bigint;
  subdomain: string;
}

/** Repository Pattern contract — isolates Prisma from the rest of the app. */
export interface IAccountRepository {
  findByAccountId(accountId: bigint): Promise<AccountRecord | null>;
  findById(dbId: number): Promise<AccountRecord | null>;
  upsertAccount(input: UpsertAccountInput): Promise<AccountRecord>;
}

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');
