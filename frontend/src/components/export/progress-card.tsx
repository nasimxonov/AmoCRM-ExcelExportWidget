import type { ExportJob } from '@excel-export/shared';
import { CheckCircle2, Download, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProgressCardProps {
  job: ExportJob;
  onCancel: () => void;
  onReset: () => void;
}

const STAGE_LABELS: Record<ExportJob['progress']['currentStage'], string> = {
  fetching: 'Fetching records from amoCRM…',
  transforming: 'Transforming records…',
  writing: 'Writing Excel file…',
  done: 'Done',
};

export function ProgressCard({ job, onCancel, onReset }: ProgressCardProps): React.JSX.Element {
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(job.status);
  const hasKnownTotal = job.progress.total > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Export progress</CardTitle>
        <StatusBadge status={job.status} />
      </CardHeader>
      <CardContent className="space-y-4">
        {job.status === 'processing' || job.status === 'pending' ? (
          <>
            {hasKnownTotal ? (
              <Progress value={job.progress.percentage} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{job.progress.processed.toLocaleString()} records processed…</span>
              </div>
            )}
            {hasKnownTotal && (
              <p className="text-xs text-muted-foreground">
                {job.progress.processed.toLocaleString()} / {job.progress.total.toLocaleString()} —{' '}
                {STAGE_LABELS[job.progress.currentStage]}
              </p>
            )}
          </>
        ) : null}

        {job.status === 'completed' && job.downloadUrl && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            <span>{job.progress.processed.toLocaleString()} rows exported successfully</span>
          </div>
        )}

        {job.status === 'failed' && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            <span>{job.errorMessage ?? 'Export failed'}</span>
          </div>
        )}

        {job.status === 'cancelled' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4" />
            <span>Export was cancelled</span>
          </div>
        )}

        <div className="flex gap-2">
          {!isTerminal && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel export
            </Button>
          )}
          {job.status === 'completed' && job.downloadUrl && (
            <Button asChild size="sm">
              <a href={job.downloadUrl}>
                <Download className="h-4 w-4" />
                Download .xlsx
              </a>
            </Button>
          )}
          {isTerminal && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Start a new export
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: ExportJob['status'] }): React.JSX.Element {
  const variant =
    status === 'completed'
      ? 'success'
      : status === 'failed'
        ? 'destructive'
        : status === 'cancelled'
          ? 'outline'
          : 'secondary';
  return <Badge variant={variant}>{status}</Badge>;
}
