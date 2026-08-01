import type { AmoCompany, AmoContact, AmoLead } from '@excel-export/shared';
import { EXPORT_COLUMN_LABELS, ExportColumnKey } from '@excel-export/shared';
import type { ColumnDef } from './column-types';

const DATE_FORMAT = 'yyyy-mm-dd hh:mm';
const CURRENCY_FORMAT = '#,##0.00';

function formatTags(tags: { name: string }[]): string {
  return tags.map((tag) => tag.name).join(', ');
}

function formatCustomFields(fields: { fieldName: string; values: { value: unknown }[] }[]): string {
  return fields
    .map((field) => `${field.fieldName}: ${field.values.map((v) => v.value).join(' / ')}`)
    .join(' | ');
}

function formatNotes(notes: { text: string }[]): string {
  return notes.map((note) => note.text).filter(Boolean).join('\n---\n');
}

function col<T>(key: ExportColumnKey, width: number, getValue: ColumnDef<T>['getValue'], numFmt?: string): ColumnDef<T> {
  return { key, header: EXPORT_COLUMN_LABELS[key], width, getValue, numFmt };
}

export function buildLeadColumns(columns: ExportColumnKey[]): ColumnDef<AmoLead>[] {
  const all: Partial<Record<ExportColumnKey, ColumnDef<AmoLead>>> = {
    [ExportColumnKey.ID]: col(ExportColumnKey.ID, 10, (l) => ({ value: l.id })),
    [ExportColumnKey.NAME]: col(ExportColumnKey.NAME, 32, (l) => ({ value: l.name })),
    [ExportColumnKey.BUDGET]: col(ExportColumnKey.BUDGET, 14, (l) => ({ value: l.price }), CURRENCY_FORMAT),
    [ExportColumnKey.PIPELINE]: col(ExportColumnKey.PIPELINE, 20, (l) => ({ value: l.pipelineName })),
    [ExportColumnKey.STATUS]: col(ExportColumnKey.STATUS, 18, (l) => ({
      value: l.statusName,
      fillColor: l.statusColor?.replace('#', ''),
    })),
    [ExportColumnKey.RESPONSIBLE_USER]: col(ExportColumnKey.RESPONSIBLE_USER, 20, (l) => ({
      value: l.responsibleUserName,
    })),
    [ExportColumnKey.CONTACTS]: col(ExportColumnKey.CONTACTS, 28, (l) => ({
      value: l.contacts.map((c) => c.name).join(', '),
    })),
    [ExportColumnKey.COMPANY]: col(ExportColumnKey.COMPANY, 24, (l) => ({ value: l.company?.name ?? '' })),
    [ExportColumnKey.TAGS]: col(ExportColumnKey.TAGS, 20, (l) => ({ value: formatTags(l.tags) })),
    [ExportColumnKey.NOTES]: col(ExportColumnKey.NOTES, 40, (l) => ({ value: formatNotes(l.notes) })),
    [ExportColumnKey.CREATED_AT]: col(ExportColumnKey.CREATED_AT, 18, (l) => ({
      value: new Date(l.createdAt),
    }), DATE_FORMAT),
    [ExportColumnKey.UPDATED_AT]: col(ExportColumnKey.UPDATED_AT, 18, (l) => ({
      value: new Date(l.updatedAt),
    }), DATE_FORMAT),
    [ExportColumnKey.CLOSED_AT]: col(ExportColumnKey.CLOSED_AT, 18, (l) => ({
      value: l.closedAt ? new Date(l.closedAt) : null,
    }), DATE_FORMAT),
    [ExportColumnKey.CUSTOM_FIELDS]: col(ExportColumnKey.CUSTOM_FIELDS, 50, (l) => ({
      value: formatCustomFields(l.customFields),
    })),
    [ExportColumnKey.CRM_LINK]: col(ExportColumnKey.CRM_LINK, 16, (l) => ({
      value: 'Open in amoCRM',
      hyperlink: l.crmUrl,
    })),
  };

  return columns.map((key) => all[key]).filter((def): def is ColumnDef<AmoLead> => Boolean(def));
}

export function buildContactColumns(columns: ExportColumnKey[]): ColumnDef<AmoContact>[] {
  const all: Partial<Record<ExportColumnKey, ColumnDef<AmoContact>>> = {
    [ExportColumnKey.ID]: col(ExportColumnKey.ID, 10, (c) => ({ value: c.id })),
    [ExportColumnKey.NAME]: col(ExportColumnKey.NAME, 28, (c) => ({ value: c.name })),
    [ExportColumnKey.PHONES]: col(ExportColumnKey.PHONES, 22, (c) => ({
      value: c.phones.map((p) => p.value).join(', '),
    })),
    [ExportColumnKey.EMAILS]: col(ExportColumnKey.EMAILS, 26, (c) => ({
      value: c.emails.map((e) => e.value).join(', '),
    })),
    [ExportColumnKey.RESPONSIBLE_USER]: col(ExportColumnKey.RESPONSIBLE_USER, 20, (c) => ({
      value: c.responsibleUserName,
    })),
    [ExportColumnKey.COMPANIES]: col(ExportColumnKey.COMPANIES, 26, (c) => ({
      value: c.companies.map((co) => co.name).join(', '),
    })),
    [ExportColumnKey.TAGS]: col(ExportColumnKey.TAGS, 20, (c) => ({ value: formatTags(c.tags) })),
    [ExportColumnKey.NOTES]: col(ExportColumnKey.NOTES, 40, (c) => ({ value: formatNotes(c.notes) })),
    [ExportColumnKey.CREATED_AT]: col(ExportColumnKey.CREATED_AT, 18, (c) => ({
      value: new Date(c.createdAt),
    }), DATE_FORMAT),
    [ExportColumnKey.UPDATED_AT]: col(ExportColumnKey.UPDATED_AT, 18, (c) => ({
      value: new Date(c.updatedAt),
    }), DATE_FORMAT),
    [ExportColumnKey.CUSTOM_FIELDS]: col(ExportColumnKey.CUSTOM_FIELDS, 50, (c) => ({
      value: formatCustomFields(c.customFields),
    })),
    [ExportColumnKey.CRM_LINK]: col(ExportColumnKey.CRM_LINK, 16, (c) => ({
      value: 'Open in amoCRM',
      hyperlink: c.crmUrl,
    })),
  };

  return columns.map((key) => all[key]).filter((def): def is ColumnDef<AmoContact> => Boolean(def));
}

export function buildCompanyColumns(columns: ExportColumnKey[]): ColumnDef<AmoCompany>[] {
  const all: Partial<Record<ExportColumnKey, ColumnDef<AmoCompany>>> = {
    [ExportColumnKey.ID]: col(ExportColumnKey.ID, 10, (c) => ({ value: c.id })),
    [ExportColumnKey.NAME]: col(ExportColumnKey.NAME, 28, (c) => ({ value: c.name })),
    [ExportColumnKey.PHONES]: col(ExportColumnKey.PHONES, 22, (c) => ({
      value: c.phones.map((p) => p.value).join(', '),
    })),
    [ExportColumnKey.EMAILS]: col(ExportColumnKey.EMAILS, 26, (c) => ({
      value: c.emails.map((e) => e.value).join(', '),
    })),
    [ExportColumnKey.RESPONSIBLE_USER]: col(ExportColumnKey.RESPONSIBLE_USER, 20, (c) => ({
      value: c.responsibleUserName,
    })),
    [ExportColumnKey.CONTACTS]: col(ExportColumnKey.CONTACTS, 28, (c) => ({
      value: c.contacts.map((ct) => ct.name).join(', '),
    })),
    [ExportColumnKey.TAGS]: col(ExportColumnKey.TAGS, 20, (c) => ({ value: formatTags(c.tags) })),
    [ExportColumnKey.NOTES]: col(ExportColumnKey.NOTES, 40, (c) => ({ value: formatNotes(c.notes) })),
    [ExportColumnKey.CREATED_AT]: col(ExportColumnKey.CREATED_AT, 18, (c) => ({
      value: new Date(c.createdAt),
    }), DATE_FORMAT),
    [ExportColumnKey.UPDATED_AT]: col(ExportColumnKey.UPDATED_AT, 18, (c) => ({
      value: new Date(c.updatedAt),
    }), DATE_FORMAT),
    [ExportColumnKey.CUSTOM_FIELDS]: col(ExportColumnKey.CUSTOM_FIELDS, 50, (c) => ({
      value: formatCustomFields(c.customFields),
    })),
    [ExportColumnKey.CRM_LINK]: col(ExportColumnKey.CRM_LINK, 16, (c) => ({
      value: 'Open in amoCRM',
      hyperlink: c.crmUrl,
    })),
  };

  return columns.map((key) => all[key]).filter((def): def is ColumnDef<AmoCompany> => Boolean(def));
}
