import { Body, Controller, Post } from '@nestjs/common';
import { sessionRequestSchema } from '@excel-export/shared';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('session')
  async createSession(
    @Body(new ZodValidationPipe(sessionRequestSchema)) body: ReturnType<typeof sessionRequestSchema.parse>,
  ): Promise<{ token: string; expiresIn: number }> {
    return this.authService.createWidgetSession(body);
  }
}
