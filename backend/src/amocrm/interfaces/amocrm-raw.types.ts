/** Shapes as returned by amoCRM REST API v4 (snake_case, subset actually consumed). */

export interface RawCustomFieldValue {
  value: string | number | boolean | null;
  enum_id?: number;
  enum_code?: string;
}

export interface RawCustomField {
  field_id: number;
  field_name: string;
  field_code: string | null;
  field_type: string;
  values: RawCustomFieldValue[];
}

export interface RawTag {
  id: number;
  name: string;
  color: string | null;
}

export interface RawEntityRef {
  id: number;
  is_main?: boolean;
}

export interface RawLead {
  id: number;
  name: string;
  price: number;
  pipeline_id: number;
  status_id: number;
  responsible_user_id: number;
  created_at: number;
  updated_at: number;
  closed_at: number | null;
  custom_fields_values: RawCustomField[] | null;
  _embedded?: {
    tags?: RawTag[];
    contacts?: RawEntityRef[];
    companies?: RawEntityRef[];
  };
}

export interface RawPhoneEmailValue {
  value: string;
  enum_code?: string | null;
}

export interface RawContact {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  responsible_user_id: number;
  created_at: number;
  updated_at: number;
  custom_fields_values: RawCustomField[] | null;
  _embedded?: {
    tags?: RawTag[];
    companies?: RawEntityRef[];
  };
}

export interface RawCompany {
  id: number;
  name: string;
  responsible_user_id: number;
  created_at: number;
  updated_at: number;
  custom_fields_values: RawCustomField[] | null;
  _embedded?: {
    tags?: RawTag[];
    contacts?: RawEntityRef[];
  };
}

export interface RawLinkedLeadRef {
  id: number;
}

export interface RawPipelineStatus {
  id: number;
  name: string;
  color: string;
  sort: number;
}

export interface RawPipeline {
  id: number;
  name: string;
  is_main: boolean;
  _embedded?: {
    statuses?: RawPipelineStatus[];
  };
}

export interface RawUser {
  id: number;
  name: string;
  email: string | null;
}

export interface RawNote {
  id: number;
  note_type: string;
  created_at: number;
  created_by: number | null;
  params?: { text?: string };
}
