import type { Request } from 'express';
import type { AccountRecord } from '../../accounts/interfaces/account.types';

export interface AuthenticatedRequest extends Request {
  account: AccountRecord;
  sessionUserId: number;
}
