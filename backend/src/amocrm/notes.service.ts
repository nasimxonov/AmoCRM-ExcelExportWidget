import { Injectable } from '@nestjs/common';
import type { AmoNote } from '@excel-export/shared';
import { AmoCrmHttpClient } from './amocrm-http.client';
import type { RawNote } from './interfaces/amocrm-raw.types';
import { unixToIso } from './mappers/custom-field.util';

type NotableEntityType = 'leads' | 'contacts' | 'companies';

const NOTES_CONCURRENCY = 4;

/**
 * amoCRM has no bulk "notes for these N entities" endpoint — notes must be
 * fetched per-entity (`GET /api/v4/{type}/{id}/notes`). This is why notes
 * are opt-in on export: enabling them turns an O(pages) export into
 * O(records) additional requests. A small concurrency pool keeps it from
 * either serializing (slow) or hammering the rate limiter (429s).
 */
@Injectable()
export class NotesService {
  constructor(private readonly httpClient: AmoCrmHttpClient) {}

  async fetchNotesForEntities(
    accountDbId: number,
    entityType: NotableEntityType,
    entityIds: number[],
  ): Promise<Map<number, AmoNote[]>> {
    const result = new Map<number, AmoNote[]>();
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < entityIds.length) {
        const index = cursor;
        cursor += 1;
        const entityId = entityIds[index];
        if (entityId === undefined) continue;
        result.set(entityId, await this.fetchNotesForOne(accountDbId, entityType, entityId));
      }
    };

    await Promise.all(Array.from({ length: Math.min(NOTES_CONCURRENCY, entityIds.length) }, worker));
    return result;
  }

  private async fetchNotesForOne(
    accountDbId: number,
    entityType: NotableEntityType,
    entityId: number,
  ): Promise<AmoNote[]> {
    const response = await this.httpClient.request<{ _embedded?: { notes: RawNote[] } }>(
      accountDbId,
      { method: 'GET', url: `/api/v4/${entityType}/${entityId}/notes`, params: { limit: 50 } },
    );

    return (response._embedded?.notes ?? []).map((note) => ({
      id: note.id,
      noteType: note.note_type,
      text: note.params?.text ?? '',
      createdAt: unixToIso(note.created_at) ?? new Date(0).toISOString(),
      createdBy: note.created_by,
    }));
  }
}
