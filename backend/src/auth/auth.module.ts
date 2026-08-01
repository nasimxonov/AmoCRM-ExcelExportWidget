import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AccountModule } from '../accounts/account.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WidgetSessionGuard } from './guards/widget-session.guard';
import type { AppConfig } from '../config/configuration';

@Module({
  imports: [
    AccountModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        secret: configService.get('security', { infer: true }).jwtSecret,
        signOptions: { expiresIn: configService.get('security', { infer: true }).jwtExpiresIn },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, WidgetSessionGuard],
  exports: [WidgetSessionGuard, JwtModule],
})
export class AuthModule {}
