export enum ExportEntityType {
  LEADS = 'leads',
  CONTACTS = 'contacts',
  COMPANIES = 'companies',
}

export enum ExportSourceMode {
  SELECTED = 'selected',
  FILTERED = 'filtered',
  ALL = 'all',
}

export enum ExportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ExportColumnKey {
  ID = 'id',
  NAME = 'name',
  BUDGET = 'budget',
  PIPELINE = 'pipeline',
  STATUS = 'status',
  RESPONSIBLE_USER = 'responsibleUser',
  CONTACTS = 'contacts',
  COMPANY = 'company',
  COMPANIES = 'companies',
  PHONES = 'phones',
  EMAILS = 'emails',
  TAGS = 'tags',
  NOTES = 'notes',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  CLOSED_AT = 'closedAt',
  CUSTOM_FIELDS = 'customFields',
  CRM_LINK = 'crmLink',
}

export interface ExportDateRange {
  from: string | null;
  to: string | null;
}

export interface ExportFilters {
  pipelineId: number | null;
  statusId: number | null;
  responsibleUserId: number | null;
  query: string | null;
  createdRange: ExportDateRange | null;
  updatedRange: ExportDateRange | null;
}

export interface ExportRequest {
  entityType: ExportEntityType;
  sourceMode: ExportSourceMode;
  selectedIds: number[];
  filters: ExportFilters;
  columns: ExportColumnKey[];
  includeCustomFields: boolean;
  includeNotes: boolean;
  fileName: string | null;
}

export interface ExportProgress {
  processed: number;
  total: number;
  percentage: number;
  currentStage: 'fetching' | 'transforming' | 'writing' | 'done';
}

export interface ExportJob {
  id: string;
  accountId: number;
  entityType: ExportEntityType;
  status: ExportJobStatus;
  progress: ExportProgress;
  fileName: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export const DEFAULT_EXPORT_COLUMNS: Record<ExportEntityType, ExportColumnKey[]> = {
  [ExportEntityType.LEADS]: [
    ExportColumnKey.ID,
    ExportColumnKey.NAME,
    ExportColumnKey.BUDGET,
    ExportColumnKey.PIPELINE,
    ExportColumnKey.STATUS,
    ExportColumnKey.RESPONSIBLE_USER,
    ExportColumnKey.CONTACTS,
    ExportColumnKey.COMPANY,
    ExportColumnKey.TAGS,
    ExportColumnKey.CREATED_AT,
    ExportColumnKey.UPDATED_AT,
    ExportColumnKey.CUSTOM_FIELDS,
    ExportColumnKey.CRM_LINK,
  ],
  [ExportEntityType.CONTACTS]: [
    ExportColumnKey.ID,
    ExportColumnKey.NAME,
    ExportColumnKey.PHONES,
    ExportColumnKey.EMAILS,
    ExportColumnKey.RESPONSIBLE_USER,
    ExportColumnKey.COMPANIES,
    ExportColumnKey.TAGS,
    ExportColumnKey.CREATED_AT,
    ExportColumnKey.UPDATED_AT,
    ExportColumnKey.CUSTOM_FIELDS,
    ExportColumnKey.CRM_LINK,
  ],
  [ExportEntityType.COMPANIES]: [
    ExportColumnKey.ID,
    ExportColumnKey.NAME,
    ExportColumnKey.PHONES,
    ExportColumnKey.EMAILS,
    ExportColumnKey.RESPONSIBLE_USER,
    ExportColumnKey.CONTACTS,
    ExportColumnKey.TAGS,
    ExportColumnKey.CREATED_AT,
    ExportColumnKey.UPDATED_AT,
    ExportColumnKey.CUSTOM_FIELDS,
    ExportColumnKey.CRM_LINK,
  ],
};

/** Every selectable column per entity (superset of DEFAULT_EXPORT_COLUMNS — includes opt-in ones like NOTES). */
export const AVAILABLE_EXPORT_COLUMNS: Record<ExportEntityType, ExportColumnKey[]> = {
  [ExportEntityType.LEADS]: [...DEFAULT_EXPORT_COLUMNS[ExportEntityType.LEADS], ExportColumnKey.NOTES],
  [ExportEntityType.CONTACTS]: [
    ...DEFAULT_EXPORT_COLUMNS[ExportEntityType.CONTACTS],
    ExportColumnKey.NOTES,
  ],
  [ExportEntityType.COMPANIES]: [
    ...DEFAULT_EXPORT_COLUMNS[ExportEntityType.COMPANIES],
    ExportColumnKey.NOTES,
  ],
};

export const EXPORT_COLUMN_LABELS: Record<ExportColumnKey, string> = {
  [ExportColumnKey.ID]: 'ID',
  [ExportColumnKey.NAME]: 'Name',
  [ExportColumnKey.BUDGET]: 'Budget',
  [ExportColumnKey.PIPELINE]: 'Pipeline',
  [ExportColumnKey.STATUS]: 'Status',
  [ExportColumnKey.RESPONSIBLE_USER]: 'Responsible user',
  [ExportColumnKey.CONTACTS]: 'Contacts',
  [ExportColumnKey.COMPANY]: 'Company',
  [ExportColumnKey.COMPANIES]: 'Companies',
  [ExportColumnKey.PHONES]: 'Phones',
  [ExportColumnKey.EMAILS]: 'Emails',
  [ExportColumnKey.TAGS]: 'Tags',
  [ExportColumnKey.NOTES]: 'Notes',
  [ExportColumnKey.CREATED_AT]: 'Created at',
  [ExportColumnKey.UPDATED_AT]: 'Updated at',
  [ExportColumnKey.CLOSED_AT]: 'Closed at',
  [ExportColumnKey.CUSTOM_FIELDS]: 'Custom fields',
  [ExportColumnKey.CRM_LINK]: 'CRM link',
};
