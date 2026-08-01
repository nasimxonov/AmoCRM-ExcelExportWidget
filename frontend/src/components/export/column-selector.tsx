import { AVAILABLE_EXPORT_COLUMNS, EXPORT_COLUMN_LABELS, type ExportColumnKey, type ExportEntityType } from '@excel-export/shared';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ColumnSelectorProps {
  entityType: ExportEntityType;
  selected: ExportColumnKey[];
  onChange: (columns: ExportColumnKey[]) => void;
}

export function ColumnSelector({ entityType, selected, onChange }: ColumnSelectorProps): React.JSX.Element {
  const available = AVAILABLE_EXPORT_COLUMNS[entityType];

  const toggle = (key: ExportColumnKey): void => {
    if (selected.includes(key)) {
      onChange(selected.filter((column) => column !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {available.map((key) => {
        const checked = selected.includes(key);
        return (
          <Label
            key={key}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-2 text-xs font-normal transition-colors',
              checked && 'border-primary/50 bg-primary/5',
            )}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-input accent-[hsl(var(--primary))]"
              checked={checked}
              onChange={() => toggle(key)}
            />
            {EXPORT_COLUMN_LABELS[key]}
          </Label>
        );
      })}
    </div>
  );
}
