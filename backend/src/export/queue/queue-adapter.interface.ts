export const EXPORT_QUEUE_ADAPTER = Symbol('EXPORT_QUEUE_ADAPTER');

export interface IExportQueueAdapter {
  enqueue(jobId: string): Promise<void>;
}
