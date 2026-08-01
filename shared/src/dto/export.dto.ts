import { z } from 'zod';
import { ExportColumnKey, ExportEntityType, ExportSourceMode } from '../types/export';

export const exportDateRangeSchema = z
  .object({
    from: z.string().datetime().nullable(),
    to: z.string().datetime().nullable(),
  })
  .nullable();

export const exportFiltersSchema = z.object({
  pipelineId: z.number().int().positive().nullable(),
  statusId: z.number().int().positive().nullable(),
  responsibleUserId: z.number().int().positive().nullable(),
  query: z.string().max(255).nullable(),
  createdRange: exportDateRangeSchema,
  updatedRange: exportDateRangeSchema,
});

export const exportRequestSchema = z
  .object({
    entityType: z.nativeEnum(ExportEntityType),
    sourceMode: z.nativeEnum(ExportSourceMode),
    selectedIds: z.array(z.number().int().positive()).max(10_000),
    filters: exportFiltersSchema,
    columns: z.array(z.nativeEnum(ExportColumnKey)).min(1),
    includeCustomFields: z.boolean(),
    includeNotes: z.boolean(),
    fileName: z
      .string()
      .max(120)
      .regex(/^[\w\-. ()]+$/, 'File name contains unsupported characters')
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceMode === ExportSourceMode.SELECTED && data.selectedIds.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedIds'],
        message: 'At least one record must be selected when sourceMode is "selected"',
      });
    }
  });

export type ExportRequestDto = z.infer<typeof exportRequestSchema>;

export const cancelExportSchema = z.object({
  jobId: z.string().uuid(),
});

export type CancelExportDto = z.infer<typeof cancelExportSchema>;
