import type { OnModuleDestroy } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import type { ExportProcessorService } from '../export-processor.service';
import type { AppConfig } from '../../config/configuration';
import type { IExportQueueAdapter } from './queue-adapter.interface';

const QUEUE_NAME = 'excel-export';

interface ExportJobData {
  jobId: string;
}

/**
 * Redis-backed queue used when REDIS_URL is configured, so export jobs can
 * be processed by any backend replica rather than only the instance that
 * received the HTTP request — required for horizontal scaling.
 */
@Injectable()
export class BullMqQueueAdapter implements IExportQueueAdapter, OnModuleDestroy {
  private readonly logger = new Logger(BullMqQueueAdapter.name);
  private readonly queue: Queue<ExportJobData>;
  private readonly worker: Worker<ExportJobData>;
  private readonly connection: IORedis;

  constructor(
    private readonly processor: ExportProcessorService,
    configService: ConfigService<AppConfig, true>,
  ) {
    const redisUrl = configService.get('redis', { infer: true }).url;
    if (!redisUrl) {
      throw new Error('BullMqQueueAdapter requires REDIS_URL to be configured');
    }

    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<ExportJobData>(QUEUE_NAME, { connection: this.connection });
    this.worker = new Worker<ExportJobData>(
      QUEUE_NAME,
      async (job: Job<ExportJobData>) => this.processor.run(job.data.jobId),
      { connection: this.connection, concurrency: 4 },
    );

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Export job ${job?.data.jobId ?? 'unknown'} failed: ${error.message}`);
    });
  }

  async enqueue(jobId: string): Promise<void> {
    await this.queue.add('export', { jobId }, { removeOnComplete: true, removeOnFail: 100 });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    this.connection.disconnect();
  }
}
