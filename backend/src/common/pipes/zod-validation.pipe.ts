import type { PipeTransform } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  // Input intentionally left as `unknown` (rather than `T`) so schemas that
  // use `.transform()` — where the parsed input shape differs from the
  // output shape, e.g. digitalPipelineWebhookSchema's snake_case wire format
  // -> camelCase domain type — can still be passed here.
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
