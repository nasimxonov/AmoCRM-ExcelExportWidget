import { Injectable } from '@nestjs/common';
import type { ExportJob as PrismaExportJob } from '@prisma/client';
import type { ExportEntityType} from '@excel-export/shared';
import { ExportJobStatus, type ExportRequest } from '@excel-export/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateExportJobInput,
  ExportJobRecord,
  IExportJobRepository,
  ProgressUpdate,
} from '../interfaces/export-job-repository.interface';

@Injectable()
export class PrismaExportJobRepository implements IExportJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateExportJobInput): Promise<ExportJobRecord> {
    const record = await this.prisma.exportJob.create({
      data: {
        accountId: input.accountDbId,
        entityType: input.entityType,
        requestPayload: input.requestPayload as unknown as object,
        fileName: input.fileName,
      },
    });
    return this.toRecord(record);
  }

  async findById(jobId: string): Promise<ExportJobRecord | null> {
    const record = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    return record ? this.toRecord(record) : null;
  }

  async updateStatus(jobId: string, status: ExportJobStatus): Promise<void> {
    await this.prisma.exportJob.update({ where: { id: jobId }, data: { status } });
  }

  async updateProgress(jobId: string, progress: ProgressUpdate): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { processed: progress.processed, total: progress.total, stage: progress.stage },
    });
  }

  async markCompleted(jobId: string, filePath: string): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: ExportJobStatus.COMPLETED,
        stage: 'done',
        filePath,
        completedAt: new Date(),
      },
    });
  }

  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: ExportJobStatus.FAILED, errorMessage, completedAt: new Date() },
    });
  }

  private toRecord(record: PrismaExportJob): ExportJobRecord {
    return {
      id: record.id,
      accountDbId: record.accountId,
      entityType: record.entityType as ExportEntityType,
      status: record.status as ExportJobStatus,
      requestPayload: record.requestPayload as unknown as ExportRequest,
      processed: record.processed,
      total: record.total,
      stage: record.stage,
      fileName: record.fileName,
      filePath: record.filePath,
      errorMessage: record.errorMessage,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      completedAt: record.completedAt,
    };
  }
}
