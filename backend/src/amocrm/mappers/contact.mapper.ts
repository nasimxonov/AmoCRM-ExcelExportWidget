import type { AmoContact, AmoUser } from '@excel-export/shared';
import type { RawContact } from '../interfaces/amocrm-raw.types';
import { extractPhonesEmailsAndCustomFields, mapTags, unixToIso } from './custom-field.util';

export interface ContactMapperContext {
  subdomain: string;
  users: Map<number, AmoUser>;
  companyNames: Map<number, string>;
}

export function mapRawContact(raw: RawContact, ctx: ContactMapperContext): AmoContact {
  const responsibleUser = ctx.users.get(raw.responsible_user_id);
  const { phones, emails, customFields } = extractPhonesEmailsAndCustomFields(raw.custom_fields_values);
  const companyRefs = raw._embedded?.companies ?? [];

  return {
    id: raw.id,
    name: raw.name || `Contact #${raw.id}`,
    firstName: raw.first_name,
    lastName: raw.last_name,
    responsibleUserId: raw.responsible_user_id,
    responsibleUserName: responsibleUser?.name ?? `User #${raw.responsible_user_id}`,
    createdAt: unixToIso(raw.created_at) ?? new Date(0).toISOString(),
    updatedAt: unixToIso(raw.updated_at) ?? new Date(0).toISOString(),
    phones,
    emails,
    tags: mapTags(raw._embedded?.tags),
    customFields,
    companies: companyRefs.map((ref) => ({
      id: ref.id,
      name: ctx.companyNames.get(ref.id) ?? `Company #${ref.id}`,
    })),
    leadIds: [],
    notes: [],
    crmUrl: `https://${ctx.subdomain}.amocrm.ru/contacts/detail/${raw.id}`,
  };
}
