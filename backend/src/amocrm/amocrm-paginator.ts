import { Injectable } from '@nestjs/common';
import { AmoCrmHttpClient } from './amocrm-http.client';

export const AMOCRM_MAX_PAGE_SIZE = 250;

interface RawListResponse<T> {
  _page?: number;
  _embedded?: Record<string, T[]>;
  _links?: { next?: { href: string } };
}

export interface PaginateOptions {
  path: string;
  embeddedKey: string;
  params?: Record<string, string | number | boolean | undefined>;
  pageSize?: number;
  /** Hard ceiling on total records fetched, used for safety on very large accounts. */
  maxRecords?: number;
}

/**
 * Streams amoCRM v4 list results page-by-page as an async generator so
 * callers (the export pipeline) never have to hold the full result set in
 * memory — critical for the 100k+ row export requirement.
 */
@Injectable()
export class AmoCrmPaginator {
  constructor(private readonly httpClient: AmoCrmHttpClient) {}

  async *paginate<T>(accountDbId: number, options: PaginateOptions): AsyncGenerator<T[], void, void> {
    const pageSize = Math.min(options.pageSize ?? AMOCRM_MAX_PAGE_SIZE, AMOCRM_MAX_PAGE_SIZE);
    let page = 1;
    let fetched = 0;

    while (true) {
      const response = await this.httpClient.request<RawListResponse<T>>(accountDbId, {
        method: 'GET',
        url: options.path,
        params: { ...options.params, page, limit: pageSize },
      });

      const items = response._embedded?.[options.embeddedKey] ?? [];
      if (items.length === 0) {
        return;
      }

      yield items;
      fetched += items.length;

      const hasNext = Boolean(response._links?.next) && items.length === pageSize;
      if (!hasNext) {
        return;
      }
      if (options.maxRecords && fetched >= options.maxRecords) {
        return;
      }
      page += 1;
    }
  }
}
