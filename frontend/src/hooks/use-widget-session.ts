import { useQuery } from '@tanstack/react-query';
import { readAmoWidgetContext, type AmoWidgetContext } from '../lib/amocrm-context';
import { createSession } from '../lib/export-api';
import { setSessionToken } from '../lib/session-store';

export interface WidgetSession {
  context: AmoWidgetContext;
  token: string;
}

async function establishSession(): Promise<WidgetSession> {
  const context = readAmoWidgetContext();
  if (!context) {
    throw new Error(
      'Missing amoCRM context. Open this page from within the amoCRM widget rather than directly.',
    );
  }

  const { token } = await createSession({
    accountId: context.accountId,
    subdomain: context.subdomain,
    userId: context.userId,
  });

  setSessionToken(token);
  return { context, token };
}

export function useWidgetSession() {
  return useQuery({
    queryKey: ['widget-session'],
    queryFn: establishSession,
    retry: 1,
    staleTime: Infinity,
  });
}
