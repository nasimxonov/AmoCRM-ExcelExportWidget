import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { digitalPipelineWebhookSchema } from '@excel-export/shared';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { DigitalPipelineService, type DigitalPipelineResult } from './digital-pipeline.service';

// Public: amoCRM calls this server-to-server per the manifest's webhook_url,
// not through the widget-session JWT flow used by the browser-facing API.
@Controller('api/webhooks/digital-pipeline')
export class DigitalPipelineController {
  constructor(private readonly digitalPipelineService: DigitalPipelineService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body(new ZodValidationPipe(digitalPipelineWebhookSchema)) payload: ReturnType<typeof digitalPipelineWebhookSchema.parse>,
  ): Promise<DigitalPipelineResult> {
    return this.digitalPipelineService.handleTriggerFired(payload);
  }
}
