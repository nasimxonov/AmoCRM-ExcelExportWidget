import { Injectable } from '@nestjs/common';

/**
 * In-process registry of AbortControllers for currently running export
 * jobs. The streaming export loop in ExportService checks
 * `signal.aborted` between chunks so a cancel request takes effect within
 * one page fetch instead of running to completion.
 */
@Injectable()
export class JobCancellationRegistry {
  private readonly controllers = new Map<string, AbortController>();

  register(jobId: string): AbortController {
    const controller = new AbortController();
    this.controllers.set(jobId, controller);
    return controller;
  }

  cancel(jobId: string): boolean {
    const controller = this.controllers.get(jobId);
    if (!controller) return false;
    controller.abort();
    return true;
  }

  isCancelled(jobId: string): boolean {
    return this.controllers.get(jobId)?.signal.aborted ?? false;
  }

  release(jobId: string): void {
    this.controllers.delete(jobId);
  }
}
