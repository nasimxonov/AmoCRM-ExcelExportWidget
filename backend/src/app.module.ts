import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration, { type AppConfig } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AccountModule } from './accounts/account.module';
import { AmoCrmModule } from './amocrm/amocrm.module';
import { AuthModule } from './auth/auth.module';
import { ExportModule } from './export/export.module';
import { HealthModule } from './health/health.module';
import { MetaModule } from './meta/meta.module';
import { GoogleModule } from './google/google.module';
import { DigitalPipelineModule } from './digital-pipeline/digital-pipeline.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const throttle = configService.get('throttle', { infer: true });
        return { throttlers: [{ ttl: throttle.ttlSeconds * 1000, limit: throttle.limit }] };
      },
    }),
    PrismaModule,
    AccountModule,
    AmoCrmModule,
    AuthModule,
    ExportModule,
    HealthModule,
    MetaModule,
    GoogleModule,
    DigitalPipelineModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
