import { Injectable } from '@nestjs/common';
import type { AmoLead, ExportFilters } from '@excel-export/shared';
import { AmoCrmPaginator } from '../amocrm-paginator';
import { AmoCrmHttpClient } from '../amocrm-http.client';
import { ReferenceDataService } from '../reference-data.service';
import { EntityRefResolverService } from '../entity-ref-resolver.service';
import { buildLeadFilterParams } from '../filters/build-query-params';
import { mapRawLead } from '../mappers/lead.mapper';
import type { RawLead } from '../interfaces/amocrm-raw.types';

const WITH_PARAM = 'contacts,companies';

@Injectable()
export class LeadsRepository {
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
  ): AsyncGenerator<AmoLead[], void, void> {
    const [pipelines, users] = await Promise.all([
      this.referenceData.getPipelines(accountDbId),
      this.referenceData.getUsers(accountDbId),
    ]);

    const pages = this.paginator.paginate<RawLead>(accountDbId, {
      path: '/api/v4/leads',
      embeddedKey: 'leads',
      params: { with: WITH_PARAM, ...buildLeadFilterParams(filters) },
    });

    for await (const page of pages) {
      yield await this.mapPage(accountDbId, subdomain, page, pipelines, users);
    }
  }

  async findByIds(accountDbId: number, subdomain: string, ids: number[]): Promise<AmoLead[]> {
    if (ids.length === 0) return [];

    const [pipelines, users] = await Promise.all([
      this.referenceData.getPipelines(accountDbId),
      this.referenceData.getUsers(accountDbId),
    ]);

    const params: Record<string, string> = { with: WITH_PARAM, limit: String(ids.length) };
    ids.forEach((id, index) => {
      params[`filter[id][${index}]`] = String(id);
    });

    const response = await this.httpClient.request<{ _embedded?: { leads: RawLead[] } }>(
      accountDbId,
      { method: 'GET', url: '/api/v4/leads', params },
    );

    return this.mapPage(accountDbId, subdomain, response._embedded?.leads ?? [], pipelines, users);
  }

  private async mapPage(
    accountDbId: number,
    subdomain: string,
    rawLeads: RawLead[],
    pipelines: Awaited<ReturnType<ReferenceDataService['getPipelines']>>,
    users: Awaited<ReturnType<ReferenceDataService['getUsers']>>,
  ): Promise<AmoLead[]> {
    if (rawLeads.length === 0) return [];

    const contactIds = rawLeads.flatMap((lead) => lead._embedded?.contacts?.map((c) => c.id) ?? []);
    const companyIds = rawLeads.flatMap((lead) => lead._embedded?.companies?.map((c) => c.id) ?? []);

    const [contactNames, companyNames] = await Promise.all([
      this.entityRefResolver.resolveNames(accountDbId, '/api/v4/contacts', 'contacts', contactIds),
      this.entityRefResolver.resolveNames(accountDbId, '/api/v4/companies', 'companies', companyIds),
    ]);

    return rawLeads.map((raw) =>
      mapRawLead(raw, { subdomain, pipelines, users, contactNames, companyNames }),
    );
  }
}
