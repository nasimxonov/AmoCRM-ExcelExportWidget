/**
 * Domain types that mirror the subset of the amoCRM REST API v4 payloads
 * this widget actually consumes. These are intentionally narrower than the
 * full amoCRM API surface — only fields the export pipeline reads or writes.
 */

export interface AmoCustomFieldValue {
  value: string | number | boolean | null;
  enumId?: number;
  enumCode?: string;
}

export interface AmoCustomField {
  fieldId: number;
  fieldName: string;
  fieldCode: string | null;
  fieldType: string;
  values: AmoCustomFieldValue[];
}

export interface AmoTag {
  id: number;
  name: string;
  color: string | null;
}

export interface AmoUser {
  id: number;
  name: string;
  email: string | null;
}

export interface AmoPipelineStatus {
  id: number;
  name: string;
  color: string;
  pipelineId: number;
  sort: number;
}

export interface AmoPipeline {
  id: number;
  name: string;
  isMain: boolean;
  statuses: AmoPipelineStatus[];
}

export interface AmoNote {
  id: number;
  noteType: string;
  text: string;
  createdAt: string;
  createdBy: number | null;
}

export interface AmoContactRef {
  id: number;
  name: string;
  isMain: boolean;
}

export interface AmoCompanyRef {
  id: number;
  name: string;
}

export interface AmoPhone {
  value: string;
  enumCode: string | null;
}

export interface AmoEmail {
  value: string;
  enumCode: string | null;
}

export interface AmoLead {
  id: number;
  name: string;
  price: number;
  currency: string | null;
  pipelineId: number;
  pipelineName: string;
  statusId: number;
  statusName: string;
  statusColor: string | null;
  responsibleUserId: number;
  responsibleUserName: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  tags: AmoTag[];
  customFields: AmoCustomField[];
  contacts: AmoContactRef[];
  company: AmoCompanyRef | null;
  notes: AmoNote[];
  crmUrl: string;
}

export interface AmoContact {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  responsibleUserId: number;
  responsibleUserName: string;
  createdAt: string;
  updatedAt: string;
  phones: AmoPhone[];
  emails: AmoEmail[];
  tags: AmoTag[];
  customFields: AmoCustomField[];
  companies: AmoCompanyRef[];
  leadIds: number[];
  notes: AmoNote[];
  crmUrl: string;
}

export interface AmoCompany {
  id: number;
  name: string;
  responsibleUserId: number;
  responsibleUserName: string;
  createdAt: string;
  updatedAt: string;
  phones: AmoPhone[];
  emails: AmoEmail[];
  tags: AmoTag[];
  customFields: AmoCustomField[];
  contacts: { id: number; name: string }[];
  leadIds: number[];
  notes: AmoNote[];
  crmUrl: string;
}

export type AmoEntity = AmoLead | AmoContact | AmoCompany;

export interface AmoAccountContext {
  accountId: number;
  subdomain: string;
  baseUrl: string;
}
