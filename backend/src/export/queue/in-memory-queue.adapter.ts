import { Injectable, Logger } from '@nestjs/common';
import type { ExportProcessorService } from '../export-processor.service';
import type { IExportQueueAdapter } from './queue-adapter.interface';

const CONCURRENCY = 2;

/**
 * Single-process FIFO queue. Sufficient for a single backend instance and
 * the default deployment target for this widget; swap in
 * BullMqQueueAdapter (already implemented) by setting REDIS_URL if you
 * scale to multiple backend instances.
 */
@Injectable()
export class InMemoryQueueAdapter implements IExportQueueAdapter {
  private readonly logger = new Logger(InMemoryQueueAdapter.name);
  private readonly pending: string[] = [];
  private active = 0;

  constructor(private readonly processor: ExportProcessorService) {}

  async enqueue(jobId: string): Promise<void> {
    this.pending.push(jobId);
    this.drain();
  }

  private drain(): void {
    while (this.active < CONCURRENCY && this.pending.length > 0) {
      const jobId = this.pending.shift();
      if (!jobId) continue;
      this.active += 1;
      this.processor
        .run(jobId)
        .catch((error: Error) => this.logger.error(`Unhandled export job error: ${error.message}`))
        .finally(() => {
          this.active -= 1;
          this.drain();
        });
    }
  }
}
