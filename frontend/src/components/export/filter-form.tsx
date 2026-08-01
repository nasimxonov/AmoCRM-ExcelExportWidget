import { useQuery } from '@tanstack/react-query';
import { ExportEntityType, type ExportFilters } from '@excel-export/shared';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchPipelines, fetchUsers } from '@/lib/meta-api';

interface FilterFormProps {
  entityType: ExportEntityType;
  filters: ExportFilters;
  onChange: (filters: ExportFilters) => void;
}

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

function fromDateInputValue(value: string, endOfDay: boolean): string | null {
  if (!value) return null;
  return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}.000Z`).toISOString();
}

export function FilterForm({ entityType, filters, onChange }: FilterFormProps): React.JSX.Element {
  const pipelinesQuery = useQuery({
    queryKey: ['pipelines'],
    queryFn: fetchPipelines,
    enabled: entityType === ExportEntityType.LEADS,
    staleTime: 5 * 60 * 1000,
  });

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers, staleTime: 5 * 60 * 1000 });

  const selectedPipeline = pipelinesQuery.data?.find((pipeline) => pipeline.id === filters.pipelineId);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {entityType === ExportEntityType.LEADS && (
        <>
          <div className="space-y-1.5">
            <Label>Pipeline</Label>
            <Select
              value={filters.pipelineId ? String(filters.pipelineId) : 'any'}
              onValueChange={(value) =>
                onChange({
                  ...filters,
                  pipelineId: value === 'any' ? null : Number(value),
                  statusId: null,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any pipeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any pipeline</SelectItem>
                {pipelinesQuery.data?.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={String(pipeline.id)}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={filters.statusId ? String(filters.statusId) : 'any'}
              onValueChange={(value) => onChange({ ...filters, statusId: value === 'any' ? null : Number(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any status</SelectItem>
                {selectedPipeline?.statuses.map((status) => (
                  <SelectItem key={status.id} value={String(status.id)}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label>Responsible user</Label>
        <Select
          value={filters.responsibleUserId ? String(filters.responsibleUserId) : 'any'}
          onValueChange={(value) =>
            onChange({ ...filters, responsibleUserId: value === 'any' ? null : Number(value) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Any user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any user</SelectItem>
            {usersQuery.data?.map((user) => (
              <SelectItem key={user.id} value={String(user.id)}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Search query</Label>
        <Input
          placeholder="Name, phone, email…"
          value={filters.query ?? ''}
          onChange={(e) => onChange({ ...filters, query: e.target.value || null })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Created between</Label>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={toDateInputValue(filters.createdRange?.from ?? null)}
            onChange={(e) =>
              onChange({
                ...filters,
                createdRange: {
                  from: fromDateInputValue(e.target.value, false),
                  to: filters.createdRange?.to ?? null,
                },
              })
            }
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDateInputValue(filters.createdRange?.to ?? null)}
            onChange={(e) =>
              onChange({
                ...filters,
                createdRange: {
                  from: filters.createdRange?.from ?? null,
                  to: fromDateInputValue(e.target.value, true),
                },
              })
            }
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Updated between</Label>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={toDateInputValue(filters.updatedRange?.from ?? null)}
            onChange={(e) =>
              onChange({
                ...filters,
                updatedRange: {
                  from: fromDateInputValue(e.target.value, false),
                  to: filters.updatedRange?.to ?? null,
                },
              })
            }
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={toDateInputValue(filters.updatedRange?.to ?? null)}
            onChange={(e) =>
              onChange({
                ...filters,
                updatedRange: {
                  from: filters.updatedRange?.from ?? null,
                  to: fromDateInputValue(e.target.value, true),
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
