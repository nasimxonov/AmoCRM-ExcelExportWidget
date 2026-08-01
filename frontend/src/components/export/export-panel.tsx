import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_EXPORT_COLUMNS,
  ExportEntityType,
  ExportSourceMode,
  exportRequestSchema,
  type ExportColumnKey,
  type ExportFilters,
} from '@excel-export/shared';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useExportJob } from '@/hooks/use-export-job';
import type { AmoWidgetContext } from '@/lib/amocrm-context';
import { EntityTypeTabs } from './entity-type-tabs';
import { SourceModeSelect } from './source-mode-select';
import { ColumnSelector } from './column-selector';
import { FilterForm } from './filter-form';
import { ProgressCard } from './progress-card';

const EMPTY_FILTERS: ExportFilters = {
  pipelineId: null,
  statusId: null,
  responsibleUserId: null,
  query: null,
  createdRange: null,
  updatedRange: null,
};

interface ExportPanelProps {
  context: AmoWidgetContext;
}

export function ExportPanel({ context }: ExportPanelProps): React.JSX.Element {
  const { toast } = useToast();
  const { job, isSubmitting, start, cancel, reset } = useExportJob();

  const initialEntityType = context.entityType ?? ExportEntityType.LEADS;
  const [entityType, setEntityType] = useState<ExportEntityType>(initialEntityType);
  const [sourceMode, setSourceMode] = useState<ExportSourceMode>(
    context.entityType && context.selectedIds.length > 0
      ? ExportSourceMode.SELECTED
      : ExportSourceMode.FILTERED,
  );
  const [filters, setFilters] = useState<ExportFilters>(EMPTY_FILTERS);
  const [columns, setColumns] = useState<ExportColumnKey[]>(DEFAULT_EXPORT_COLUMNS[initialEntityType]);
  const [includeCustomFields, setIncludeCustomFields] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [fileName, setFileName] = useState('');

  const selectedCount = entityType === context.entityType ? context.selectedIds.length : 0;

  useEffect(() => {
    setColumns(DEFAULT_EXPORT_COLUMNS[entityType]);
    setFilters(EMPTY_FILTERS);
    if (sourceMode === ExportSourceMode.SELECTED && selectedCount === 0) {
      setSourceMode(ExportSourceMode.FILTERED);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType]);

  const canSubmit = useMemo(() => columns.length > 0 && !isSubmitting, [columns, isSubmitting]);

  const handleSubmit = async (): Promise<void> => {
    const request = {
      entityType,
      sourceMode,
      selectedIds: sourceMode === ExportSourceMode.SELECTED ? context.selectedIds : [],
      filters,
      columns,
      includeCustomFields,
      includeNotes,
      fileName: fileName.trim() || null,
    };

    const parsed = exportRequestSchema.safeParse(request);
    if (!parsed.success) {
      toast({
        variant: 'destructive',
        title: 'Check your export settings',
        description: parsed.error.issues[0]?.message ?? 'Invalid export request',
      });
      return;
    }

    await start(parsed.data);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Export to Excel
          </CardTitle>
          <CardDescription>
            Export leads, contacts or companies from {context.subdomain}.amocrm.ru into a formatted .xlsx file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Entity type</Label>
            <EntityTypeTabs value={entityType} onChange={setEntityType} />
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <SourceModeSelect value={sourceMode} onChange={setSourceMode} selectedCount={selectedCount} />
          </div>

          {sourceMode === ExportSourceMode.FILTERED && (
            <div className="space-y-2">
              <Label>Filters</Label>
              <FilterForm entityType={entityType} filters={filters} onChange={setFilters} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Columns</Label>
            <ColumnSelector entityType={entityType} selected={columns} onChange={setColumns} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Custom fields</p>
                <p className="text-xs text-muted-foreground">Include amoCRM custom field values</p>
              </div>
              <Switch checked={includeCustomFields} onCheckedChange={setIncludeCustomFields} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Notes</p>
                <p className="text-xs text-muted-foreground">Slower — fetches notes per record</p>
              </div>
              <Switch checked={includeNotes} onCheckedChange={setIncludeNotes} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>File name (optional)</Label>
            <Input
              placeholder={`${entityType}-export`}
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
            />
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Start export
          </Button>
        </CardContent>
      </Card>

      {job && <ProgressCard job={job} onCancel={cancel} onReset={reset} />}
    </div>
  );
}
