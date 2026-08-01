import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ExportJobStatus, type ExportJob, type ExportRequest } from '@excel-export/shared';
import type { AccountRecord } from '../accounts/interfaces/account.types';
import {
  EXPORT_JOB_REPOSITORY,
  type IExportJobRepository,
} from './interfaces/export-job-repository.interface';
import { EXPORT_QUEUE_ADAPTER, type IExportQueueAdapter } from './queue/queue-adapter.interface';
import { ExcelBuilderService } from './excel/excel-builder.service';
import { JobCancellationRegistry } from './job-cancellation.registry';
import { JobEventsService } from './job-events.service';
import { toExportJobDto } from './export-job.mapper';
import type { AppConfig } from '../config/configuration';

@Injectable()
export class ExportService {
  constructor(
    @Inject(EXPORT_JOB_REPOSITORY) private readonly jobRepository: IExportJobRepository,
    @Inject(EXPORT_QUEUE_ADAPTER) private readonly queueAdapter: IExportQueueAdapter,
    private readonly excelBuilder: ExcelBuilderService,
    private readonly cancellationRegistry: JobCancellationRegistry,
    private readonly jobEvents: JobEventsService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async createJob(account: AccountRecord, request: ExportRequest): Promise<ExportJob> {
    const fileName = this.excelBuilder.sanitizeFileName(request.fileName, request.entityType);

    const job = await this.jobRepository.create({
      accountDbId: account.id,
      entityType: request.entityType,
      requestPayload: request,
      fileName,
    });

    await this.queueAdapter.enqueue(job.id);
    return toExportJobDto(job, this.appUrl());
  }

  async getJob(account: AccountRecord, jobId: string): Promise<ExportJob> {
    const job = await this.assertOwnedJob(account, jobId);
    return toExportJobDto(job, this.appUrl());
  }

  async cancelJob(account: AccountRecord, jobId: string): Promise<ExportJob> {
    const job = await this.assertOwnedJob(account, jobId);

    if (job.status === ExportJobStatus.COMPLETED || job.status === ExportJobStatus.FAILED) {
      return toExportJobDto(job, this.appUrl());
    }

    const wasRunning = this.cancellationRegistry.cancel(jobId);
    if (!wasRunning) {
      await this.jobRepository.updateStatus(jobId, ExportJobStatus.CANCELLED);
    }

    const updated = await this.jobRepository.findById(jobId);
    return toExportJobDto(updated ?? job, this.appUrl());
  }

  streamProgress(account: AccountRecord, jobId: string): Observable<{ data: ExportJob }> {
    return this.jobEvents.stream(jobId).pipe(map((snapshot) => ({ data: snapshot })));
  }

  async resolveDownload(
    account: AccountRecord,
    jobId: string,
  ): Promise<{ filePath: string; fileName: string }> {
    const job = await this.assertOwnedJob(account, jobId);
    if (job.status !== ExportJobStatus.COMPLETED || !job.filePath) {
      throw new NotFoundException('Export file is not ready yet');
    }
    return { filePath: job.filePath, fileName: job.fileName ?? `export-${jobId}.xlsx` };
  }

  private async assertOwnedJob(account: AccountRecord, jobId: string) {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException('Export job not found');
    }
    if (job.accountDbId !== account.id) {
      throw new ForbiddenException('This export job does not belong to your account');
    }
    return job;
  }

  private appUrl(): string {
    return this.configService.get('appUrl', { infer: true });
  }
}
