import { Injectable, Inject, Logger } from '@nestjs/common';
import type { DigitalPipelineWebhookPayload } from '@excel-export/shared';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '../accounts/interfaces/account.types';
import { GOOGLE_ACCOUNT_REPOSITORY, type IGoogleAccountRepository } from '../google/interfaces/google-account.types';
import { GoogleSheetsService } from '../google/google-sheets.service';
import { LeadsRepository } from '../amocrm/repositories/leads.repository';

export interface DigitalPipelineResult {
  success: boolean;
  reason?: 'unknown_account' | 'google_not_connected' | 'lead_not_found';
}

/**
 * amoCRM's expected ack response body for a Digital Pipeline webhook isn't
 * documented anywhere in this repo and hasn't been verified against a live
 * account — {success:true/false} is a best-effort placeholder. Adjust once
 * tested against a real trigger fire (see WIDGET.md).
 */
@Injectable()
export class DigitalPipelineService {
  private readonly logger = new Logger(DigitalPipelineService.name);

  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    @Inject(GOOGLE_ACCOUNT_REPOSITORY) private readonly googleAccountRepository: IGoogleAccountRepository,
    private readonly leadsRepository: LeadsRepository,
    private readonly googleSheetsService: GoogleSheetsService,
  ) {}

  async handleTriggerFired(payload: DigitalPipelineWebhookPayload): Promise<DigitalPipelineResult> {
    const account = await this.accountRepository.findByAccountId(BigInt(payload.accountId));
    if (!account) {
      this.logger.warn(`Digital Pipeline webhook for unknown amoCRM account_id=${payload.accountId}`);
      return { success: false, reason: 'unknown_account' };
    }

    const googleAccount = await this.googleAccountRepository.findByAccountId(account.id);
    if (!googleAccount) {
      this.logger.warn(`Digital Pipeline trigger fired for account ${account.id} with no Google account connected`);
      return { success: false, reason: 'google_not_connected' };
    }

    const [lead] = await this.leadsRepository.findByIds(account.id, account.subdomain, [payload.event.data.id]);
    if (!lead) {
      this.logger.warn(`Lead ${payload.event.data.id} not found for account ${account.id}`);
      return { success: false, reason: 'lead_not_found' };
    }

    await this.googleSheetsService.appendLeadRow(account.id, payload.settings, lead);
    return { success: true };
  }
}
