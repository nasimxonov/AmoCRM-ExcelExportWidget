import { Injectable } from '@nestjs/common';
import type { AmoContact, ExportFilters } from '@excel-export/shared';
import { AmoCrmPaginator } from '../amocrm-paginator';
import { AmoCrmHttpClient } from '../amocrm-http.client';
import { ReferenceDataService } from '../reference-data.service';
import { EntityRefResolverService } from '../entity-ref-resolver.service';
import { buildCommonFilterParams } from '../filters/build-query-params';
import { mapRawContact } from '../mappers/contact.mapper';
import type { RawContact } from '../interfaces/amocrm-raw.types';

const WITH_PARAM = 'companies';

@Injectable()
export class ContactsRepository {
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
  ): AsyncGenerator<AmoContact[], void, void> {
    const users = await this.referenceData.getUsers(accountDbId);

    const pages = this.paginator.paginate<RawContact>(accountDbId, {
      path: '/api/v4/contacts',
      embeddedKey: 'contacts',
      params: { with: WITH_PARAM, ...buildCommonFilterParams(filters) },
    });

    for await (const page of pages) {
      yield await this.mapPage(accountDbId, subdomain, page, users);
    }
  }

  async findByIds(accountDbId: number, subdomain: string, ids: number[]): Promise<AmoContact[]> {
    if (ids.length === 0) return [];
    const users = await this.referenceData.getUsers(accountDbId);

    const params: Record<string, string> = { with: WITH_PARAM, limit: String(ids.length) };
    ids.forEach((id, index) => {
      params[`filter[id][${index}]`] = String(id);
    });

    const response = await this.httpClient.request<{ _embedded?: { contacts: RawContact[] } }>(
      accountDbId,
      { method: 'GET', url: '/api/v4/contacts', params },
    );

    return this.mapPage(accountDbId, subdomain, response._embedded?.contacts ?? [], users);
  }

  private async mapPage(
    accountDbId: number,
    subdomain: string,
    rawContacts: RawContact[],
    users: Awaited<ReturnType<ReferenceDataService['getUsers']>>,
  ): Promise<AmoContact[]> {
    if (rawContacts.length === 0) return [];

    const companyIds = rawContacts.flatMap((c) => c._embedded?.companies?.map((ref) => ref.id) ?? []);
    const companyNames = await this.entityRefResolver.resolveNames(
      accountDbId,
      '/api/v4/companies',
      'companies',
      companyIds,
    );

    return rawContacts.map((raw) => mapRawContact(raw, { subdomain, users, companyNames }));
  }
}
