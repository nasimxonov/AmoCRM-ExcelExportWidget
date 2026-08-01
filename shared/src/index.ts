// Explicit named re-exports (rather than `export *`) so bundlers that rely
// on static CJS-export analysis (e.g. Vite/Rollup's commonjs plugin) can see
// these names — TypeScript's `export *` compiles to a runtime copy loop that
// tools like cjs-module-lexer cannot statically detect.

export type {
  AmoCustomFieldValue,
  AmoCustomField,
  AmoTag,
  AmoUser,
  AmoPipelineStatus,
  AmoPipeline,
  AmoNote,
  AmoContactRef,
  AmoCompanyRef,
  AmoPhone,
  AmoEmail,
  AmoLead,
  AmoContact,
  AmoCompany,
  AmoEntity,
  AmoAccountContext,
} from './types/amocrm';

export {
  ExportEntityType,
  ExportSourceMode,
  ExportJobStatus,
  ExportColumnKey,
  DEFAULT_EXPORT_COLUMNS,
  AVAILABLE_EXPORT_COLUMNS,
  EXPORT_COLUMN_LABELS,
} from './types/export';
export type {
  ExportDateRange,
  ExportFilters,
  ExportRequest,
  ExportProgress,
  ExportJob,
} from './types/export';

export type { AmoIntegrationAccount, WidgetSessionContext } from './types/auth';

export {
  exportDateRangeSchema,
  exportFiltersSchema,
  exportRequestSchema,
  cancelExportSchema,
} from './dto/export.dto';
export type { ExportRequestDto, CancelExportDto } from './dto/export.dto';

export { sessionRequestSchema, sessionResponseSchema } from './dto/auth.dto';
export type { SessionRequestDto, SessionResponseDto } from './dto/auth.dto';

export type {
  DigitalPipelineTriggerSettings,
  DigitalPipelineEventData,
  DigitalPipelineEvent,
  DigitalPipelineWebhookPayload,
} from './types/digital-pipeline';
export type { GoogleConnectionStatus } from './types/google';

export { digitalPipelineWebhookSchema } from './dto/digital-pipeline.dto';
export type { DigitalPipelineWebhookDto } from './dto/digital-pipeline.dto';
