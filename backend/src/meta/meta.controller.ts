import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AmoPipeline, AmoUser } from '@excel-export/shared';
import { ReferenceDataService } from '../amocrm/reference-data.service';
import { WidgetSessionGuard } from '../auth/guards/widget-session.guard';
import { CurrentAccount } from '../auth/decorators/current-account.decorator';
import type { AccountRecord } from '../accounts/interfaces/account.types';

@Controller('api/meta')
@UseGuards(WidgetSessionGuard)
export class MetaController {
  constructor(private readonly referenceData: ReferenceDataService) {}

  @Get('pipelines')
  async pipelines(@CurrentAccount() account: AccountRecord): Promise<AmoPipeline[]> {
    const map = await this.referenceData.getPipelines(account.id);
    return Array.from(map.values());
  }

  @Get('users')
  async users(@CurrentAccount() account: AccountRecord): Promise<AmoUser[]> {
    const map = await this.referenceData.getUsers(account.id);
    return Array.from(map.values());
  }
}
