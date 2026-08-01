import { Injectable } from '@nestjs/common';
import type { AmoCompany, ExportFilters } from '@excel-export/shared';
import { AmoCrmPaginator } from '../amocrm-paginator';
import { AmoCrmHttpClient } from '../amocrm-http.client';
import { ReferenceDataService } from '../reference-data.service';
import { EntityRefResolverService } from '../entity-ref-resolver.service';
import { buildCommonFilterParams } from '../filters/build-query-params';
import { mapRawCompany } from '../mappers/company.mapper';
import type { RawCompany } from '../interfaces/amocrm-raw.types';

const WITH_PARAM = 'contacts';

@Injectable()
export class CompaniesRepository {
  constructor(
    private readonly paginator: AmoCrmPaginator,
    private readonly httpClient: AmoCrmHttpClient,
    private readonly referenceData: ReferenceDataService,
    private readonly entityRefResolver: EntityRefResolverService,
  ) {}

  async *streamAll(
    accountDbId: number,
    subdomain: string,
    filters: ExportFilters,
  ): AsyncGenerator<AmoCompany[], void, void> {
    const users = await this.referenceData.getUsers(accountDbId);

    const pages = this.paginator.paginate<RawCompany>(accountDbId, {
      path: '/api/v4/companies',
      embeddedKey: 'companies',
      params: { with: WITH_PARAM, ...buildCommonFilterParams(filters) },
    });

    for await (const page of pages) {
      yield await this.mapPage(accountDbId, subdomain, page, users);
    }
  }

  async findByIds(accountDbId: number, subdomain: string, ids: number[]): Promise<AmoCompany[]> {
    if (ids.length === 0) return [];
    const users = await this.referenceData.getUsers(accountDbId);

    const params: Record<string, string> = { with: WITH_PARAM, limit: String(ids.length) };
    ids.forEach((id, index) => {
      params[`filter[id][${index}]`] = String(id);
    });

    const response = await this.httpClient.request<{ _embedded?: { companies: RawCompany[] } }>(
      accountDbId,
      { method: 'GET', url: '/api/v4/companies', params },
    );

    return this.mapPage(accountDbId, subdomain, response._embedded?.companies ?? [], users);
  }

  private async mapPage(
    accountDbId: number,
    subdomain: string,
    rawCompanies: RawCompany[],
    users: Awaited<ReturnType<ReferenceDataService['getUsers']>>,
  ): Promise<AmoCompany[]> {
    if (rawCompanies.length === 0) return [];

    const contactIds = rawCompanies.flatMap((c) => c._embedded?.contacts?.map((ref) => ref.id) ?? []);
    const contactNames = await this.entityRefResolver.resolveNames(
      accountDbId,
      '/api/v4/contacts',
      'contacts',
      contactIds,
    );

    return rawCompanies.map((raw) => mapRawCompany(raw, { subdomain, users, contactNames }));
  }
}
