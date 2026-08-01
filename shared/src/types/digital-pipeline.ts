/**
 * Domain types for the Digital Pipeline trigger -> Google Sheets export flow.
 * Mirrors the amoCRM webhook payload shape (see dto/digital-pipeline.dto.ts
 * for the raw snake_case wire format this is transformed from).
 */

export interface DigitalPipelineTriggerSettings {
  spreadsheetUrl: string;
  sheetName: string;
  fieldCodes: string[];
}

export interface DigitalPipelineEventData {
  id: number;
  elementType: number;
  statusId: number;
  pipelineId: number;
}

export interface DigitalPipelineEvent {
  type: number;
  typeCode: string;
  data: DigitalPipelineEventData;
  time: number;
}

export interface DigitalPipelineWebhookPayload {
  event: DigitalPipelineEvent;
  settings: DigitalPipelineTriggerSettings;
  subdomain: string;
  accountId: number;
}
