import { z } from 'zod';
import type { DigitalPipelineWebhookPayload } from '../types/digital-pipeline';

/**
 * Raw wire shape amoCRM posts to a Digital Pipeline widget's webhook_url.
 * The exact ack response amoCRM expects back is not documented in this repo
 * and has not been verified against a live account — see WIDGET.md.
 */
const rawTriggerSettingsSchema = z.object({
  spreadsheet_url: z.string().min(1),
  sheet_name: z.string().min(1),
  field_codes: z.string().optional().default(''),
});

export const digitalPipelineWebhookSchema = z
  .object({
    event: z.object({
      type: z.number(),
      type_code: z.string(),
      data: z.object({
        id: z.number(),
        element_type: z.number(),
        status_id: z.number().optional(),
        pipeline_id: z.number().optional(),
      }),
      time: z.number().optional(),
    }),
    action: z.object({
      settings: z.object({
        widget: z.object({
          settings: rawTriggerSettingsSchema,
        }),
      }),
    }),
    subdomain: z.string().min(1),
    account_id: z.number(),
  })
  .transform(
    (raw): DigitalPipelineWebhookPayload => ({
      event: {
        type: raw.event.type,
        typeCode: raw.event.type_code,
        data: {
          id: raw.event.data.id,
          elementType: raw.event.data.element_type,
          statusId: raw.event.data.status_id ?? 0,
          pipelineId: raw.event.data.pipeline_id ?? 0,
        },
        time: raw.event.time ?? 0,
      },
      settings: {
        spreadsheetUrl: raw.action.settings.widget.settings.spreadsheet_url,
        sheetName: raw.action.settings.widget.settings.sheet_name,
        fieldCodes: raw.action.settings.widget.settings.field_codes
          .split(',')
          .map((code) => code.trim())
          .filter(Boolean),
      },
      subdomain: raw.subdomain,
      accountId: raw.account_id,
    }),
  );

export type DigitalPipelineWebhookDto = z.infer<typeof digitalPipelineWebhookSchema>;
