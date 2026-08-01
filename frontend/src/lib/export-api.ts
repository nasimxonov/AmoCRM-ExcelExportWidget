import type { ExportJob, ExportRequest, SessionRequestDto, SessionResponseDto } from '@excel-export/shared';
import { apiClient } from './api-client';
import { getSessionToken } from './session-store';

export async function createSession(payload: SessionRequestDto): Promise<SessionResponseDto> {
  const { data } = await apiClient.post<SessionResponseDto>('/api/auth/session', payload);
  return data;
}

export async function createExportJob(request: ExportRequest): Promise<ExportJob> {
  const { data } = await apiClient.post<ExportJob>('/api/export', request);
  return data;
}

export async function getExportJob(jobId: string): Promise<ExportJob> {
  const { data } = await apiClient.get<ExportJob>(`/api/export/${jobId}`);
  return data;
}

export async function cancelExportJob(jobId: string): Promise<ExportJob> {
  const { data } = await apiClient.post<ExportJob>(`/api/export/${jobId}/cancel`);
  return data;
}

export function subscribeToExportProgress(
  jobId: string,
  onUpdate: (job: ExportJob) => void,
  onError?: () => void,
): () => void {
  const token = getSessionToken() ?? '';
  const baseUrl = import.meta.env.VITE_API_URL;
  const url = `${baseUrl}/api/export/${jobId}/stream?token=${encodeURIComponent(token)}`;

  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const job = JSON.parse(event.data) as ExportJob;
      onUpdate(job);
    } catch {
      // ignore malformed keep-alive frames
    }
  };

  eventSource.onerror = () => {
    onError?.();
  };

  return () => eventSource.close();
}
