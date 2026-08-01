import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { Observable } from 'rxjs';
import type { ExportJob } from '@excel-export/shared';

/** Bridges internal job progress updates to SSE subscribers via RxJS. */
@Injectable()
export class JobEventsService {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(0);
  }

  publish(jobId: string, snapshot: ExportJob): void {
    this.emitter.emit(jobId, snapshot);
  }

  stream(jobId: string): Observable<ExportJob> {
    return new Observable<ExportJob>((subscriber) => {
      const handler = (snapshot: ExportJob): void => {
        subscriber.next(snapshot);
        if (snapshot.status === 'completed' || snapshot.status === 'failed' || snapshot.status === 'cancelled') {
          subscriber.complete();
        }
      };
      this.emitter.on(jobId, handler);
      return () => this.emitter.off(jobId, handler);
    });
  }
}
