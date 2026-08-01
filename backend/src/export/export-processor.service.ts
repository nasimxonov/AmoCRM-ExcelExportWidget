import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AmoCompany, AmoContact, AmoLead, ExportRequest } from '@excel-export/shared';
import { ExportEntityType, ExportJobStatus, ExportSourceMode } from '@excel-export/shared';
import { ACCOUNT_REPOSITORY, type IAccountRepository } from '../accounts/interfaces/account.types';
import { LeadsRepository } from '../amocrm/repositories/leads.repository';
import { ContactsRepository } from '../amocrm/repositories/contacts.repository';
import { CompaniesRepository } from '../amocrm/repositories/companies.repository';
import { NotesService } from '../amocrm/notes.service';
import { ExcelBuilderService } from './excel/excel-builder.service';
import { JobCancellationRegistry } from './job-cancellation.registry';
import { JobEventsService } from './job-events.service';
import { toExportJobDto } from './export-job.mapper';
import type { AppConfig } from '../config/configuration';
import {
  EXPORT_JOB_REPOSITORY,
  type IExportJobRepository,
} from './interfaces/export-job-repository.interface';

const FIND_BY_IDS_BATCH_SIZE = 250;
type ExportableEntity = AmoLead | AmoContact | AmoCompany;

@Injectable()
export class ExportProcessorService {
  private readonly logger = new Logger(ExportProcessorService.name);

  constructor(
    @Inject(EXPORT_JOB_REPOSITORY) private readonly jobRepository: IExportJobRepository,
    @Inject(ACCOUNT_REPOSITORY) private readonly accountRepository: IAccountRepository,
    private readonly leadsRepository: LeadsRepository,
    private readonly contactsRepository: ContactsRepository,
    private readonly companiesRepository: CompaniesRepository,
    private readonly notesService: NotesService,
    private readonly excelBuilder: ExcelBuilderService,
    private readonly cancellationRegistry: JobCancellationRegistry,
    private readonly jobEvents: JobEventsService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async run(jobId: string): Promise<void> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      this.logger.warn(`Export job ${jobId} not found; skipping`);
      return;
    }

    if (job.status === ExportJobStatus.CANCELLED) {
      this.logger.log(`Export job ${jobId} was cancelled before processing started`);
      return;
    }

    const account = await this.accountRepository.findById(job.accountDbId);
    if (!account) {
      await this.jobRepository.markFailed(jobId, 'amoCRM account is no longer connected');
      return;
    }

    const controller = this.cancellationRegistry.register(jobId);
    const request = job.requestPayload;
    const appUrl = this.configService.get('appUrl', { infer: true });

    await this.jobRepository.updateStatus(jobId, ExportJobStatus.PROCESSING);
    this.emitSnapshot(jobId, appUrl);

    try {
      const { writer, filePath } = await this.excelBuilder.createWriter(
        jobId,
        request.entityType,
        request.columns,
      );

      let processed = 0;
      const knownTotal = request.sourceMode === ExportSourceMode.SELECTED ? request.selectedIds.length : 0;

      const publishProgress = async (stage: string): Promise<void> => {
        await this.jobRepository.updateProgress(jobId, {
          processed,
          total: Math.max(knownTotal, processed),
          stage,
        });
        this.emitSnapshot(jobId, appUrl);
      };

      for await (const batch of this.iterateBatches(job.accountDbId, account.subdomain, request)) {
        if (controller.signal.aborted) {
          await this.jobRepository.updateStatus(jobId, ExportJobStatus.CANCELLED);
          this.emitSnapshot(jobId, appUrl);
          return;
        }

        const enriched = request.includeNotes
          ? await this.attachNotes(job.accountDbId, request.entityType, batch)
          : batch;

        writer.appendRows(enriched as never);
        processed += batch.length;
        await publishProgress('fetching');
      }

      if (controller.signal.aborted) {
        await this.jobRepository.updateStatus(jobId, ExportJobStatus.CANCELLED);
        this.emitSnapshot(jobId, appUrl);
        return;
      }

      await publishProgress('writing');
      writer.addSummarySheet({
        entityLabel: request.entityType,
        accountSubdomain: account.subdomain,
        generatedAt: new Date(),
        sourceMode: request.sourceMode,
        appliedFilters: this.describeFilters(request),
      });
      await writer.finalize();

      await this.jobRepository.markCompleted(jobId, filePath);
      this.emitSnapshot(jobId, appUrl);
      this.logger.log(`Export job ${jobId} completed with ${processed} rows`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown export error';
      this.logger.error(`Export job ${jobId} failed: ${message}`);
      await this.jobRepository.markFailed(jobId, message);
      this.emitSnapshot(jobId, appUrl);
    } finally {
      this.cancellationRegistry.release(jobId);
    }
  }

  cancel(jobId: string): boolean {
    return this.cancellationRegistry.cancel(jobId);
  }

  private async *iterateBatches(
    accountDbId: number,
    subdomain: string,
    request: ExportRequest,
  ): AsyncGenerator<ExportableEntity[], void, void> {
    if (request.sourceMode === ExportSourceMode.SELECTED) {
      for (let i = 0; i < request.selectedIds.length; i += FIND_BY_IDS_BATCH_SIZE) {
        const chunk = request.selectedIds.slice(i, i + FIND_BY_IDS_BATCH_SIZE);
        yield await this.findByIds(accountDbId, subdomain, request.entityType, chunk);
      }
      return;
    }

    const stream = this.streamAll(accountDbId, subdomain, request);
    for await (const batch of stream) {
      yield batch;
    }
  }

  private async findByIds(
    accountDbId: number,
    subdomain: string,
    entityType: ExportEntityType,
    ids: number[],
  ): Promise<ExportableEntity[]> {
    switch (entityType) {
      case ExportEntityType.LEADS:
        return this.leadsRepository.findByIds(accountDbId, subdomain, ids);
      case ExportEntityType.CONTACTS:
        return this.contactsRepository.findByIds(accountDbId, subdomain, ids);
      case ExportEntityType.COMPANIES:
        return this.companiesRepository.findByIds(accountDbId, subdomain, ids);
    }
  }

  private streamAll(
    accountDbId: number,
    subdomain: string,
    request: ExportRequest,
  ): AsyncGenerator<ExportableEntity[], void, void> {
    switch (request.entityType) {
      case ExportEntityType.LEADS:
        return this.leadsRepository.streamAll(accountDbId, subdomain, request.filters);
      case ExportEntityType.CONTACTS:
        return this.contactsRepository.streamAll(accountDbId, subdomain, request.filters);
      case ExportEntityType.COMPANIES:
        return this.companiesRepository.streamAll(accountDbId, subdomain, request.filters);
    }
  }

  private async attachNotes(
    accountDbId: number,
    entityType: ExportEntityType,
    batch: ExportableEntity[],
  ): Promise<ExportableEntity[]> {
    const ids = batch.map((entity) => entity.id);
    const notesMap = await this.notesService.fetchNotesForEntities(accountDbId, entityType, ids);
    return batch.map((entity) => ({ ...entity, notes: notesMap.get(entity.id) ?? [] })) as ExportableEntity[];
  }

  private describeFilters(request: ExportRequest): Record<string, string> {
    const description: Record<string, string> = { 'Source mode': request.sourceMode };
    if (request.filters.pipelineId) description['Pipeline ID'] = String(request.filters.pipelineId);
    if (request.filters.statusId) description['Status ID'] = String(request.filters.statusId);
    if (request.filters.responsibleUserId) {
      description['Responsible user ID'] = String(request.filters.responsibleUserId);
    }
    if (request.filters.query) description.Query = request.filters.query;
    if (request.filters.createdRange?.from || request.filters.createdRange?.to) {
      description['Created range'] = `${request.filters.createdRange.from ?? '...'} → ${request.filters.createdRange.to ?? '...'}`;
    }
    if (request.filters.updatedRange?.from || request.filters.updatedRange?.to) {
      description['Updated range'] = `${request.filters.updatedRange.from ?? '...'} → ${request.filters.updatedRange.to ?? '...'}`;
    }
    return description;
  }

  private emitSnapshot(jobId: string, appUrl: string): void {
    this.jobRepository.findById(jobId).then((record) => {
      if (record) this.jobEvents.publish(jobId, toExportJobDto(record, appUrl));
    });
  }
}
