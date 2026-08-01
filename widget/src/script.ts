/**
 * amoCRM legacy widget entry point. This file is executed directly inside
 * the amoCRM account page (not an iframe) per the standard widget SDK
 * contract: it registers lifecycle callbacks via `define(['jquery'], ...)`
 * and returns an object exposing `callbacks`.
 *
 * The heavy export UI (React/Vite app in /frontend) is hosted separately
 * and opened in a modal iframe from here, because building a full
 * React+Tailwind UI directly against the legacy widget runtime is
 * impractical — this mirrors how most modern amoCRM integrations split a
 * thin in-page loader from a richly-hosted settings/action UI.
 *
 * WIDGET_APP_URL is substituted at package time by scripts/build.js from
 * the WIDGET_URL environment variable — see WIDGET.md.
 */
const WIDGET_APP_URL = '__WIDGET_APP_URL__';
const OVERLAY_ID = 'excel-export-widget-overlay';
const CLOSE_MESSAGE_TYPE = 'amocrm-excel-export:close';

// --- TEMPORARY lifecycle diagnostics (see WIDGET.md investigation notes) ---
// Every log is prefixed so it can be filtered in DevTools with "[ExcelExportWidget]".
// Remove once the "widget doesn't appear" investigation is resolved.
const LOG_PREFIX = '[ExcelExportWidget]';
function diag(...args: unknown[]): void {
  console.log(LOG_PREFIX, ...args);
}
diag('script.js parsed and executing (top of file)');

type EntityType = 'leads' | 'contacts' | 'companies';

interface WidgetContext {
  accountId: number | null;
  subdomain: string | null;
  userId: number | null;
  entityType: EntityType | null;
  selectedIds: number[];
}

function detectEntityType(): EntityType | null {
  const path = window.location.pathname;
  if (path.includes('/leads')) return 'leads';
  if (path.includes('/contacts')) return 'contacts';
  if (path.includes('/companies')) return 'companies';
  return null;
}

/**
 * amoCRM's list view marks selected rows with a checked checkbox on the
 * row; the exact selector has drifted across amoCRM UI versions, so this
 * tries a few known patterns. Verify against your account's markup after
 * installing (see WIDGET.md "Selector maintenance").
 */
function detectSelectedIds(): number[] {
  const candidateSelectors = [
    'tr.is-selected[data-id]',
    'tr[data-id] input[type="checkbox"]:checked',
    '.linked-list__item.is-selected[data-id]',
  ];

  const ids = new Set<number>();

  for (const selector of candidateSelectors) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      const row = element.closest<HTMLElement>('[data-id]') ?? element;
      const rawId = row.getAttribute('data-id');
      const id = rawId ? Number(rawId) : NaN;
      if (Number.isFinite(id) && id > 0) {
        ids.add(id);
      }
    });
  }

  return Array.from(ids);
}

function getWidgetContext(self: AmoWidgetSelf): WidgetContext {
  const system = self.system();
  const account = typeof AMOCRM !== 'undefined' ? AMOCRM?.constant('account') : undefined;
  const user = typeof AMOCRM !== 'undefined' ? AMOCRM?.constant('user') : undefined;

  return {
    accountId: account?.id ?? null,
    subdomain: account?.subdomain ?? system.subdomain ?? null,
    userId: user?.id ?? system.amouser_id ?? null,
    entityType: detectEntityType(),
    selectedIds: detectSelectedIds(),
  };
}

function buildIframeUrl(context: WidgetContext): string {
  const url = new URL(WIDGET_APP_URL);
  if (context.accountId) url.searchParams.set('accountId', String(context.accountId));
  if (context.subdomain) url.searchParams.set('subdomain', context.subdomain);
  if (context.userId) url.searchParams.set('userId', String(context.userId));
  if (context.entityType) url.searchParams.set('entityType', context.entityType);
  if (context.selectedIds.length > 0) {
    url.searchParams.set('selectedIds', context.selectedIds.join(','));
  }
  return url.toString();
}

function closeModal(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  window.removeEventListener('message', handleChildMessage);
  document.removeEventListener('keydown', handleEscape);
}

function handleChildMessage(event: MessageEvent): void {
  if (event.data?.type === CLOSE_MESSAGE_TYPE) {
    closeModal();
  }
}

function handleEscape(event: KeyboardEvent): void {
  if (event.key === 'Escape') closeModal();
}

function openExportModal(context: WidgetContext): void {
  if (document.getElementById(OVERLAY_ID)) return;

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:100000',
    'background:rgba(15,15,20,0.55)',
    'display:flex', 'align-items:center', 'justify-content:center',
  ].join(';');

  const panel = document.createElement('div');
  panel.style.cssText = [
    'position:relative', 'width:min(760px, 94vw)', 'height:min(880px, 92vh)',
    'background:#fff', 'border-radius:12px', 'overflow:hidden',
    'box-shadow:0 20px 60px rgba(0,0,0,0.35)',
  ].join(';');

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = '✕';
  closeButton.setAttribute('aria-label', 'Close');
  closeButton.style.cssText = [
    'position:absolute', 'top:8px', 'right:8px', 'z-index:1',
    'width:28px', 'height:28px', 'border-radius:6px', 'border:none',
    'background:rgba(0,0,0,0.06)', 'cursor:pointer', 'font-size:14px',
  ].join(';');
  closeButton.addEventListener('click', closeModal);

  const iframe = document.createElement('iframe');
  iframe.src = buildIframeUrl(context);
  iframe.style.cssText = 'width:100%;height:100%;border:0;';
  iframe.setAttribute('title', 'Excel Export');

  panel.appendChild(closeButton);
  panel.appendChild(iframe);
  overlay.appendChild(panel);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeModal();
  });

  document.body.appendChild(overlay);
  window.addEventListener('message', handleChildMessage);
  document.addEventListener('keydown', handleEscape);
}

function injectTriggerButton(self: AmoWidgetSelf, $: JQueryStatic): void {
  const entityType = detectEntityType();
  diag('init(): detectEntityType() ->', entityType, 'pathname:', window.location.pathname);
  if (!entityType) {
    diag('init(): no matching entity type for this page, skipping button injection');
    return; // only show on leads/contacts/companies list pages
  }

  const buttonId = 'excel-export-widget-trigger';
  if (document.getElementById(buttonId)) {
    diag('init(): button already present, skipping re-injection');
    return;
  }

  const label = self.i18n ? self.i18n('actions.export_button') : 'Export to Excel';
  const $matched = $('.control-bar__group, .js-control-bar-actions');
  diag('init(): toolbar selector matched element count ->', $matched.length);
  const $toolbar = $matched.length ? $matched : $(document);
  if (!$matched.length) {
    diag('init(): toolbar selector matched nothing — falling back to $(document), button will not be visibly placed');
  }

  $toolbar.append(
    `<button id="${buttonId}" type="button" class="button-input excel-export-trigger">${label}</button>`,
  );

  const button = document.getElementById(buttonId);
  diag('init(): button element present in DOM after append ->', Boolean(button));
  button?.addEventListener('click', () => openExportModal(getWidgetContext(self)));
}

diag('registering AMD module via define([\'jquery\'], ...)');

define(['jquery'], ($: JQueryStatic) => {
  diag('AMD factory executed — jquery dependency resolved');

  return function widgetFactory(this: AmoWidgetSelf) {
    diag('widget constructor invoked by amoCRM/Kommo runtime');

    // Diagnostic-only: check for the selection-driven list API (list_selected /
    // render_template) that developers.kommo.com documents for llist/clist
    // locations, which this widget does not currently declare or use.
    const selfAny = this as unknown as Record<string, unknown>;
    diag(
      'self capability check -> render_template:', typeof selfAny.render_template,
      '| list_selected:', typeof selfAny.list_selected,
      '| render (self.render, not callbacks.render):', typeof selfAny.render,
    );

    const callbacks: AmoWidgetCallbacks = {
      render: () => {
        diag('callbacks.render() invoked');
        return true;
      },
      init: () => {
        diag('callbacks.init() invoked');
        injectTriggerButton(this, $);
        return true;
      },
      bind_actions: () => {
        diag('callbacks.bind_actions() invoked');
        return true;
      },
      settings: () => {
        diag('callbacks.settings() invoked');
        return true;
      },
      onSave: () => {
        diag('callbacks.onSave() invoked');
        return true;
      },
      destroy: () => {
        diag('callbacks.destroy() invoked');
        document.getElementById('excel-export-widget-trigger')?.remove();
        closeModal();
        return true;
      },
    };

    (this as unknown as { callbacks: AmoWidgetCallbacks }).callbacks = callbacks;
    diag('callbacks object attached to widget instance');
    return this;
  };
});
