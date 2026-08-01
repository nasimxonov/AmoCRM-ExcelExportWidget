import type { AmoCustomField, AmoEmail, AmoPhone, AmoTag } from '@excel-export/shared';
import type { RawCustomField, RawTag } from '../interfaces/amocrm-raw.types';

export interface ExtractedFields {
  phones: AmoPhone[];
  emails: AmoEmail[];
  customFields: AmoCustomField[];
}

/**
 * amoCRM has no dedicated "phone"/"email" columns on contacts/companies —
 * both live inside custom_fields_values under the well-known field codes
 * PHONE and EMAIL. This splits those out from the generic custom field list
 * so they can be rendered as their own Excel columns.
 */
export function extractPhonesEmailsAndCustomFields(
  rawFields: RawCustomField[] | null,
): ExtractedFields {
  const phones: AmoPhone[] = [];
  const emails: AmoEmail[] = [];
  const customFields: AmoCustomField[] = [];

  for (const field of rawFields ?? []) {
    if (field.field_code === 'PHONE') {
      for (const value of field.values) {
        phones.push({ value: String(value.value ?? ''), enumCode: value.enum_code ?? null });
      }
      continue;
    }

    if (field.field_code === 'EMAIL') {
      for (const value of field.values) {
        emails.push({ value: String(value.value ?? ''), enumCode: value.enum_code ?? null });
      }
      continue;
    }

    customFields.push({
      fieldId: field.field_id,
      fieldName: field.field_name,
      fieldCode: field.field_code,
      fieldType: field.field_type,
      values: field.values.map((value) => ({
        value: value.value,
        enumId: value.enum_id,
        enumCode: value.enum_code,
      })),
    });
  }

  return { phones, emails, customFields };
}

export function mapTags(rawTags: RawTag[] | undefined): AmoTag[] {
  return (rawTags ?? []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color }));
}

export function unixToIso(seconds: number | null | undefined): string | null {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}
