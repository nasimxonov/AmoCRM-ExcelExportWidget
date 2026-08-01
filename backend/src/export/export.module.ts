import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountModule } from '../accounts/account.module';
import { AmoCrmModule } from '../amocrm/amocrm.module';
import { AuthModule } from '../auth/auth.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportProcessorService } from './export-processor.service';
import { ExcelBuilderService } from './excel/excel-builder.service';
import { JobCancellationRegistry } from './job-cancellation.registry';
import { JobEventsService } from './job-events.service';
import { PrismaExportJobRepository } from './repositories/export-job.repository';
import { EXPORT_JOB_REPOSITORY } from './interfaces/export-job-repository.interface';
import { EXPORT_QUEUE_ADAPTER } from './queue/queue-adapter.interface';
import { InMemoryQueueAdapter } from './queue/in-memory-queue.adapter';
import { BullMqQueueAdapter } from './queue/bullmq-queue.adapter';
import type { AppConfig } from '../config/configuration';

@Module({
  imports: [AccountModule, AmoCrmModule, AuthModule],
  controllers: [ExportController],
  providers: [
    ExportService,
    ExportProcessorService,
    ExcelBuilderService,
    JobCancellationRegistry,
    JobEventsService,
    { provide: EXPORT_JOB_REPOSITORY, useClass: PrismaExportJobRepository },
    {
      provide: EXPORT_QUEUE_ADAPTER,
      inject: [ConfigService, ExportProcessorService],
      useFactory: (configService: ConfigService<AppConfig, true>, processor: ExportProcessorService) => {
        const redisUrl = configService.get('redis', { infer: true }).url;
        return redisUrl
          ? new BullMqQueueAdapter(processor, configService)
          : new InMemoryQueueAdapter(processor);
      },
    },
  ],
})
export class ExportModule {}
