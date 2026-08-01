export interface GoogleAccountRecord {
  id: number;
  accountId: number;
  googleEmail: string;
  refreshToken: string;
  accessToken: string | null;
  accessTokenExpiresAt: Date | null;
  connectedAt: Date;
}

export interface UpsertGoogleAccountInput {
  accountId: number;
  googleEmail: string;
  refreshToken: string;
}

export interface UpdateGoogleAccessTokenInput {
  accountId: number;
  accessToken: string;
  accessTokenExpiresAt: Date;
}

export const GOOGLE_ACCOUNT_REPOSITORY = Symbol('GOOGLE_ACCOUNT_REPOSITORY');

export interface IGoogleAccountRepository {
  findByAccountId(accountId: number): Promise<GoogleAccountRecord | null>;
  upsert(input: UpsertGoogleAccountInput): Promise<GoogleAccountRecord>;
  updateAccessToken(input: UpdateGoogleAccessTokenInput): Promise<void>;
  delete(accountId: number): Promise<void>;
}
