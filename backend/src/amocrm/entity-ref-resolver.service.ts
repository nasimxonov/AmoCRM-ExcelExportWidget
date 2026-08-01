import { Injectable } from '@nestjs/common';
import { AmoCrmHttpClient } from './amocrm-http.client';

const BATCH_SIZE = 250;

interface NamedEntity {
  id: number;
  name: string;
}

/**
 * Leads only embed bare `{ id }` references for linked contacts/companies
 * (amoCRM does not inline full contact/company payloads there). Rather than
 * issuing one request per referenced record (N+1), this batch-resolves
 * names for a set of ids via `filter[id][]=` in chunks of up to 250 —
 * the same limit amoCRM enforces on page size.
 */
@Injectable()
export class EntityRefResolverService {
  constructor(private readonly httpClient: AmoCrmHttpClient) {}

  async resolveNames(
    accountDbId: number,
    path: '/api/v4/contacts' | '/api/v4/companies',
    embeddedKey: 'contacts' | 'companies',
    ids: number[],
  ): Promise<Map<number, string>> {
    const uniqueIds = Array.from(new Set(ids)).filter((id) => Number.isFinite(id));
    const result = new Map<number, string>();
    if (uniqueIds.length === 0) return result;

    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
      const chunk = uniqueIds.slice(i, i + BATCH_SIZE);
      const params: Record<string, string> = { limit: String(BATCH_SIZE) };
      chunk.forEach((id, index) => {
        params[`filter[id][${index}]`] = String(id);
      });

      const response = await this.httpClient.request<{
        _embedded?: Record<string, NamedEntity[]>;
      }>(accountDbId, { method: 'GET', url: path, params });

      for (const entity of response._embedded?.[embeddedKey] ?? []) {
        result.set(entity.id, entity.name);
      }
    }

    return result;
  }
}
