import { AlertTriangle, Loader2, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { useWidgetSession } from '@/hooks/use-widget-session';
import { ExportPanel } from '@/components/export/export-panel';
import { GoogleSettingsPanel } from '@/components/settings/google-settings-panel';
import { isEmbeddedInParentFrame, requestCloseFromParent } from '@/lib/parent-messenger';

function CenteredMessage({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      {children}
    </div>
  );
}

export default function App(): React.JSX.Element {
  const session = useWidgetSession();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-end gap-2 border-b border-border px-6 py-3">
        <ThemeToggle />
        {isEmbeddedInParentFrame() && (
          <Button variant="ghost" size="icon" aria-label="Close" onClick={requestCloseFromParent}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </header>

      {session.isLoading && (
        <CenteredMessage>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Connecting to amoCRM…</p>
        </CenteredMessage>
      )}

      {session.isError && (
        <CenteredMessage>
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <p className="max-w-sm text-sm text-muted-foreground">
            {session.error instanceof Error ? session.error.message : 'Failed to connect to amoCRM'}
          </p>
          <Button variant="outline" size="sm" onClick={() => session.refetch()}>
            Retry
          </Button>
        </CenteredMessage>
      )}

      {session.isSuccess && session.data.context.view === 'settings' && <GoogleSettingsPanel />}
      {session.isSuccess && session.data.context.view === 'export' && (
        <ExportPanel context={session.data.context} />
      )}

      <Toaster />
    </div>
  );
}
