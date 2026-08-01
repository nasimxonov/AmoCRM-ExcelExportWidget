import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExportJob, ExportRequest } from '@excel-export/shared';
import { cancelExportJob, createExportJob, getExportJob, subscribeToExportProgress } from '../lib/export-api';

const POLL_INTERVAL_MS = 2000;

export interface UseExportJobResult {
  job: ExportJob | null;
  isSubmitting: boolean;
  error: string | null;
  start: (request: ExportRequest) => Promise<void>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export function useExportJob(): UseExportJobResult {
  const [job, setJob] = useState<ExportJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const teardown = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => teardown, [teardown]);

  const startPolling = useCallback((jobId: string) => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const latest = await getExportJob(jobId);
        setJob(latest);
        if (['completed', 'failed', 'cancelled'].includes(latest.status)) {
          teardown();
        }
      } catch {
        // transient network errors during polling are ignored; next tick retries
      }
    }, POLL_INTERVAL_MS);
  }, [teardown]);

  const start = useCallback(
    async (request: ExportRequest) => {
      teardown();
      setError(null);
      setIsSubmitting(true);
      try {
        const created = await createExportJob(request);
        setJob(created);

        cleanupRef.current = subscribeToExportProgress(
          created.id,
          (update) => setJob(update),
          () => startPolling(created.id),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start export');
      } finally {
        setIsSubmitting(false);
      }
    },
    [teardown, startPolling],
  );

  const cancel = useCallback(async () => {
    if (!job) return;
    try {
      const updated = await cancelExportJob(job.id);
      setJob(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel export');
    }
  }, [job]);

  const reset = useCallback(() => {
    teardown();
    setJob(null);
    setError(null);
  }, [teardown]);

  return { job, isSubmitting, error, start, cancel, reset };
}
