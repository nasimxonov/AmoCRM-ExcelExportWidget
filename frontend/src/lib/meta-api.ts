import type { AmoPipeline, AmoUser } from '@excel-export/shared';
import { apiClient } from './api-client';

export async function fetchPipelines(): Promise<AmoPipeline[]> {
  const { data } = await apiClient.get<AmoPipeline[]>('/api/meta/pipelines');
  return data;
}

export async function fetchUsers(): Promise<AmoUser[]> {
  const { data } = await apiClient.get<AmoUser[]>('/api/meta/users');
  return data;
}
