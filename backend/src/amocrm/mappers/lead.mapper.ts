import type { AmoLead, AmoPipeline, AmoUser } from '@excel-export/shared';
import type { RawLead } from '../interfaces/amocrm-raw.types';
import { extractPhonesEmailsAndCustomFields, mapTags, unixToIso } from './custom-field.util';

export interface LeadMapperContext {
  subdomain: string;
  pipelines: Map<number, AmoPipeline>;
  users: Map<number, AmoUser>;
  contactNames: Map<number, string>;
  companyNames: Map<number, string>;
}

export function mapRawLead(raw: RawLead, ctx: LeadMapperContext): AmoLead {
  const pipeline = ctx.pipelines.get(raw.pipeline_id);
  const status = pipeline?.statuses.find((s) => s.id === raw.status_id);
  const responsibleUser = ctx.users.get(raw.responsible_user_id);
  const { customFields } = extractPhonesEmailsAndCustomFields(raw.custom_fields_values);

  const contactRefs = raw._embedded?.contacts ?? [];
  const companyRefs = raw._embedded?.companies ?? [];
  const firstCompany = companyRefs[0];

  return {
    id: raw.id,
    name: raw.name || `Lead #${raw.id}`,
    price: raw.price,
    currency: null,
    pipelineId: raw.pipeline_id,
    pipelineName: pipeline?.name ?? `Pipeline #${raw.pipeline_id}`,
    statusId: raw.status_id,
    statusName: status?.name ?? `Status #${raw.status_id}`,
    statusColor: status?.color ?? null,
    responsibleUserId: raw.responsible_user_id,
    responsibleUserName: responsibleUser?.name ?? `User #${raw.responsible_user_id}`,
    createdAt: unixToIso(raw.created_at) ?? new Date(0).toISOString(),
    updatedAt: unixToIso(raw.updated_at) ?? new Date(0).toISOString(),
    closedAt: unixToIso(raw.closed_at),
    tags: mapTags(raw._embedded?.tags),
    customFields,
    contacts: contactRefs.map((ref) => ({
      id: ref.id,
      name: ctx.contactNames.get(ref.id) ?? `Contact #${ref.id}`,
      isMain: Boolean(ref.is_main),
    })),
    company: firstCompany
      ? { id: firstCompany.id, name: ctx.companyNames.get(firstCompany.id) ?? `Company #${firstCompany.id}` }
      : null,
    notes: [],
    crmUrl: `https://${ctx.subdomain}.amocrm.ru/leads/detail/${raw.id}`,
  };
}
