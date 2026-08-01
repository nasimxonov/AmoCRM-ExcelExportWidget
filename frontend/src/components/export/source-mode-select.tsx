import { ExportSourceMode } from '@excel-export/shared';
import { CheckSquare, Filter, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ExportSourceMode; icon: typeof Layers; label: string; description: string }[] = [
  {
    value: ExportSourceMode.SELECTED,
    icon: CheckSquare,
    label: 'Selected records',
    description: 'Only the records you had selected in amoCRM',
  },
  {
    value: ExportSourceMode.FILTERED,
    icon: Filter,
    label: 'Filtered records',
    description: 'Records matching the filters below',
  },
  {
    value: ExportSourceMode.ALL,
    icon: Layers,
    label: 'All records',
    description: 'Every record of this type in the account',
  },
];

interface SourceModeSelectProps {
  value: ExportSourceMode;
  onChange: (value: ExportSourceMode) => void;
  selectedCount: number;
}

export function SourceModeSelect({ value, onChange, selectedCount }: SourceModeSelectProps): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {OPTIONS.map((option) => {
        const disabled = option.value === ExportSourceMode.SELECTED && selectedCount === 0;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
              value === option.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <Icon className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {option.label}
              {option.value === ExportSourceMode.SELECTED && selectedCount > 0 && ` (${selectedCount})`}
            </span>
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
