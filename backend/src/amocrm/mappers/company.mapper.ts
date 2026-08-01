import type { AmoCompany, AmoUser } from '@excel-export/shared';
import type { RawCompany } from '../interfaces/amocrm-raw.types';
import { extractPhonesEmailsAndCustomFields, mapTags, unixToIso } from './custom-field.util';

export interface CompanyMapperContext {
  subdomain: string;
  users: Map<number, AmoUser>;
  contactNames: Map<number, string>;
}

export function mapRawCompany(raw: RawCompany, ctx: CompanyMapperContext): AmoCompany {
  const responsibleUser = ctx.users.get(raw.responsible_user_id);
  const { phones, emails, customFields } = extractPhonesEmailsAndCustomFields(raw.custom_fields_values);
  const contactRefs = raw._embedded?.contacts ?? [];

  return {
    id: raw.id,
    name: raw.name || `Company #${raw.id}`,
    responsibleUserId: raw.responsible_user_id,
    responsibleUserName: responsibleUser?.name ?? `User #${raw.responsible_user_id}`,
    createdAt: unixToIso(raw.created_at) ?? new Date(0).toISOString(),
    updatedAt: unixToIso(raw.updated_at) ?? new Date(0).toISOString(),
    phones,
    emails,
    tags: mapTags(raw._embedded?.tags),
    customFields,
    contacts: contactRefs.map((ref) => ({
      id: ref.id,
      name: ctx.contactNames.get(ref.id) ?? `Contact #${ref.id}`,
    })),
    leadIds: [],
    notes: [],
    crmUrl: `https://${ctx.subdomain}.amocrm.ru/companies/detail/${raw.id}`,
  };
}
