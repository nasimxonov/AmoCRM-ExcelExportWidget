import type { ExportJob, ExportProgress } from '@excel-export/shared';
import type { ExportJobRecord } from './interfaces/export-job-repository.interface';

function toStage(stage: string): ExportProgress['currentStage'] {
  return (['fetching', 'transforming', 'writing', 'done'] as const).includes(
    stage as ExportProgress['currentStage'],
  )
    ? (stage as ExportProgress['currentStage'])
    : 'fetching';
}

export function toExportJobDto(record: ExportJobRecord, appUrl: string): ExportJob {
  const percentage = record.total > 0 ? Math.min(100, Math.round((record.processed / record.total) * 100)) : 0;

  return {
    id: record.id,
    accountId: Number(record.accountDbId),
    entityType: record.entityType,
    status: record.status,
    progress: {
      processed: record.processed,
      total: record.total,
      percentage,
      currentStage: toStage(record.stage),
    },
    fileName: record.fileName,
    downloadUrl: record.status === 'completed' ? `${appUrl}/api/export/${record.id}/download` : null,
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    completedAt: record.completedAt ? record.completedAt.toISOString() : null,
  };
}
