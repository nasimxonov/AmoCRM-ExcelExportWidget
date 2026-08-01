import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { disconnectGoogle, getGoogleOAuthUrl, getGoogleStatus } from '@/lib/google-api';
import { useToast } from '@/hooks/use-toast';

const STATUS_QUERY_KEY = ['google-status'];
// Google's consent screen refuses to render inside an iframe, so "Connect"
// opens a new top-level tab; while it's open we poll status so this panel
// flips to "connected" once the user finishes the OAuth flow there.
const POLL_INTERVAL_MS = 2000;

export function GoogleSettingsPanel(): React.JSX.Element {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const statusQuery = useQuery({
    queryKey: STATUS_QUERY_KEY,
    queryFn: getGoogleStatus,
    refetchInterval: isConnecting ? POLL_INTERVAL_MS : false,
  });

  const disconnectMutation = useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STATUS_QUERY_KEY });
      toast({ description: 'Google account disconnected.' });
    },
    onError: (error: unknown) => {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to disconnect Google account.',
      });
    },
  });

  async function handleConnect(): Promise<void> {
    try {
      const url = await getGoogleOAuthUrl();
      window.open(url, '_blank', 'noopener,noreferrer');
      setIsConnecting(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        description: error instanceof Error ? error.message : 'Failed to start Google connection.',
      });
    }
  }

  const connected = statusQuery.data?.connected ?? false;

  useEffect(() => {
    if (connected) setIsConnecting(false);
  }, [connected]);

  return (
    <div className="mx-auto max-w-lg p-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Sheets</CardTitle>
          <CardDescription>
            Connect a Google account so Digital Pipeline triggers can write lead data into a Google
            Sheet you choose per trigger.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {statusQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking connection…
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {connected ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {connected ? statusQuery.data?.googleEmail : 'Not connected'}
                </span>
              </div>
              <Badge variant={connected ? 'success' : 'outline'}>
                {connected ? 'Connected' : 'Not connected'}
              </Badge>
            </div>
          )}

          {connected ? (
            <Button
              variant="outline"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Disconnect Google Account
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isConnecting ? 'Waiting for Google…' : 'Connect Google Account'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
