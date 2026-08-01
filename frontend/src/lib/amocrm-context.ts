import { ExportEntityType } from '@excel-export/shared';

/**
 * The rich export UI runs inside an iframe that the amoCRM-side widget
 * loader (see /widget) opens, passing the current account/user context as
 * query params — the amoCRM iframe sandbox does not otherwise expose that
 * information to an externally-hosted page. See WIDGET.md for the full
 * handshake description.
 */
export type WidgetView = 'export' | 'settings';

export interface AmoWidgetContext {
  accountId: number;
  subdomain: string;
  userId: number;
  entityType: ExportEntityType | null;
  selectedIds: number[];
  view: WidgetView;
}

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export function readAmoWidgetContext(): AmoWidgetContext | null {
  const params = new URLSearchParams(window.location.search);
  const accountId = Number(params.get('accountId'));
  const subdomain = params.get('subdomain');
  const userId = Number(params.get('userId'));

  if (!accountId || !subdomain || !userId) {
    return null;
  }

  const entityType = params.get('entityType');
  const validEntityTypes: string[] = Object.values(ExportEntityType);

  return {
    accountId,
    subdomain,
    userId,
    entityType:
      entityType && validEntityTypes.includes(entityType) ? (entityType as ExportEntityType) : null,
    selectedIds: parseIds(params.get('selectedIds')),
    view: params.get('view') === 'settings' ? 'settings' : 'export',
  };
}
