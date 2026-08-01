import type { ExportFilters } from '@excel-export/shared';

function toUnixSeconds(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor(new Date(iso).getTime() / 1000);
}

/** Filters shared by leads, contacts and companies list endpoints. */
export function buildCommonFilterParams(
  filters: ExportFilters,
): Record<string, string | number> {
  const params: Record<string, string | number> = {};

  if (filters.responsibleUserId) {
    params['filter[responsible_user_id]'] = filters.responsibleUserId;
  }

  if (filters.query) {
    params.query = filters.query;
  }

  const createdFrom = toUnixSeconds(filters.createdRange?.from ?? null);
  const createdTo = toUnixSeconds(filters.createdRange?.to ?? null);
  if (createdFrom !== null) params['filter[created_at][from]'] = createdFrom;
  if (createdTo !== null) params['filter[created_at][to]'] = createdTo;

  const updatedFrom = toUnixSeconds(filters.updatedRange?.from ?? null);
  const updatedTo = toUnixSeconds(filters.updatedRange?.to ?? null);
  if (updatedFrom !== null) params['filter[updated_at][from]'] = updatedFrom;
  if (updatedTo !== null) params['filter[updated_at][to]'] = updatedTo;

  return params;
}

/** Adds lead-only pipeline/status filters on top of the common set. */
export function buildLeadFilterParams(filters: ExportFilters): Record<string, string | number> {
  const params = buildCommonFilterParams(filters);

  if (filters.statusId) {
    params['filter[statuses][0][status_id]'] = filters.statusId;
    if (filters.pipelineId) {
      params['filter[statuses][0][pipeline_id]'] = filters.pipelineId;
    }
  } else if (filters.pipelineId) {
    params['filter[pipeline_id]'] = filters.pipelineId;
  }

  return params;
}
