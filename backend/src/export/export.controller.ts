import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { createReadStream, existsSync } from 'node:fs';
import { exportRequestSchema, type ExportJob } from '@excel-export/shared';
import type { Observable } from 'rxjs';
import { ExportService } from './export.service';
import { WidgetSessionGuard } from '../auth/guards/widget-session.guard';
import { CurrentAccount } from '../auth/decorators/current-account.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { AccountRecord } from '../accounts/interfaces/account.types';

@Controller('api/export')
@UseGuards(WidgetSessionGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  async create(
    @CurrentAccount() account: AccountRecord,
    @Body(new ZodValidationPipe(exportRequestSchema)) body: ReturnType<typeof exportRequestSchema.parse>,
  ): Promise<ExportJob> {
    return this.exportService.createJob(account, body);
  }

  @Get(':jobId')
  async getStatus(
    @CurrentAccount() account: AccountRecord,
    @Param('jobId') jobId: string,
  ): Promise<ExportJob> {
    return this.exportService.getJob(account, jobId);
  }

  @Sse(':jobId/stream')
  stream(
    @CurrentAccount() account: AccountRecord,
    @Param('jobId') jobId: string,
  ): Observable<{ data: ExportJob }> {
    return this.exportService.streamProgress(account, jobId);
  }

  @Post(':jobId/cancel')
  async cancel(
    @CurrentAccount() account: AccountRecord,
    @Param('jobId') jobId: string,
  ): Promise<ExportJob> {
    return this.exportService.cancelJob(account, jobId);
  }

  @Get(':jobId/download')
  async download(
    @CurrentAccount() account: AccountRecord,
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filePath, fileName } = await this.exportService.resolveDownload(account, jobId);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Export file no longer exists on disk');
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    createReadStream(filePath).pipe(res);
  }
}
