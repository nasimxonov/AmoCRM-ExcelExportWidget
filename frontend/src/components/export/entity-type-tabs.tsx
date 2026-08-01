import { ExportEntityType } from '@excel-export/shared';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LABELS: Record<ExportEntityType, string> = {
  [ExportEntityType.LEADS]: 'Leads',
  [ExportEntityType.CONTACTS]: 'Contacts',
  [ExportEntityType.COMPANIES]: 'Companies',
};

interface EntityTypeTabsProps {
  value: ExportEntityType;
  onChange: (value: ExportEntityType) => void;
}

export function EntityTypeTabs({ value, onChange }: EntityTypeTabsProps): React.JSX.Element {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as ExportEntityType)}>
      <TabsList>
        {Object.values(ExportEntityType).map((entityType) => (
          <TabsTrigger key={entityType} value={entityType}>
            {LABELS[entityType]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
