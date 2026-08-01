import { Injectable } from '@nestjs/common';
import { AmoCrmHttpClient } from './amocrm-http.client';
import type { RawPipeline, RawUser } from './interfaces/amocrm-raw.types';
import type { AmoPipeline, AmoUser } from '@excel-export/shared';

interface CachedEntry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Pipelines/statuses and users change rarely relative to export frequency,
 * so they're fetched once per account and cached in-memory for a few
 * minutes rather than being re-fetched for every lead in an export batch.
 */
@Injectable()
export class ReferenceDataService {
  private readonly pipelineCache = new Map<number, CachedEntry<Map<number, AmoPipeline>>>();
  private readonly userCache = new Map<number, CachedEntry<Map<number, AmoUser>>>();

  constructor(private readonly httpClient: AmoCrmHttpClient) {}

  async getPipelines(accountDbId: number): Promise<Map<number, AmoPipeline>> {
    const cached = this.pipelineCache.get(accountDbId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const response = await this.httpClient.request<{ _embedded: { pipelines: RawPipeline[] } }>(
      accountDbId,
      { method: 'GET', url: '/api/v4/leads/pipelines' },
    );

    const map = new Map<number, AmoPipeline>();
    for (const raw of response._embedded.pipelines) {
      map.set(raw.id, {
        id: raw.id,
        name: raw.name,
        isMain: raw.is_main,
        statuses: (raw._embedded?.statuses ?? []).map((status) => ({
          id: status.id,
          name: status.name,
          color: status.color,
          pipelineId: raw.id,
          sort: status.sort,
        })),
      });
    }

    this.pipelineCache.set(accountDbId, { value: map, expiresAt: Date.now() + CACHE_TTL_MS });
    return map;
  }

  async getUsers(accountDbId: number): Promise<Map<number, AmoUser>> {
    const cached = this.userCache.get(accountDbId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const response = await this.httpClient.request<{ _embedded: { users: RawUser[] } }>(
      accountDbId,
      { method: 'GET', url: '/api/v4/users', params: { limit: 250 } },
    );

    const map = new Map<number, AmoUser>();
    for (const raw of response._embedded.users) {
      map.set(raw.id, { id: raw.id, name: raw.name, email: raw.email });
    }

    this.userCache.set(accountDbId, { value: map, expiresAt: Date.now() + CACHE_TTL_MS });
    return map;
  }

  invalidate(accountDbId: number): void {
    this.pipelineCache.delete(accountDbId);
    this.userCache.delete(accountDbId);
  }
}
