import type { ExportEntityType, ExportJobStatus, ExportRequest } from '@excel-export/shared';

export interface ExportJobRecord {
  id: string;
  accountDbId: number;
  entityType: ExportEntityType;
  status: ExportJobStatus;
  requestPayload: ExportRequest;
  processed: number;
  total: number;
  stage: string;
  fileName: string | null;
  filePath: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface CreateExportJobInput {
  accountDbId: number;
  entityType: ExportEntityType;
  requestPayload: ExportRequest;
  fileName: string;
}

export interface ProgressUpdate {
  processed: number;
  total: number;
  stage: string;
}

export const EXPORT_JOB_REPOSITORY = Symbol('EXPORT_JOB_REPOSITORY');

export interface IExportJobRepository {
  create(input: CreateExportJobInput): Promise<ExportJobRecord>;
  findById(jobId: string): Promise<ExportJobRecord | null>;
  updateStatus(jobId: string, status: ExportJobStatus): Promise<void>;
  updateProgress(jobId: string, progress: ProgressUpdate): Promise<void>;
  markCompleted(jobId: string, filePath: string): Promise<void>;
  markFailed(jobId: string, errorMessage: string): Promise<void>;
}
