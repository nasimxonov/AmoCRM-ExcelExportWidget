import type { GoogleConnectionStatus } from '@excel-export/shared';
import { apiClient } from './api-client';

export async function getGoogleStatus(): Promise<GoogleConnectionStatus> {
  const { data } = await apiClient.get<GoogleConnectionStatus>('/api/google/status');
  return data;
}

export async function getGoogleOAuthUrl(): Promise<string> {
  const { data } = await apiClient.get<{ url: string }>('/api/google/oauth/url');
  return data.url;
}

export async function disconnectGoogle(): Promise<void> {
  await apiClient.post('/api/google/disconnect');
}
