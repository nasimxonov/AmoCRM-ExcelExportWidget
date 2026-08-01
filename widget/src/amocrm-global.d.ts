/**
 * Minimal ambient typings for the amoCRM legacy widget runtime. The widget
 * bundle is loaded directly into the amoCRM account page (not an iframe),
 * so it can see amoCRM's own globals. Only the subset this widget actually
 * touches is declared here.
 */
interface AmoWidgetSelf {
  render_tpl?: (data: Record<string, unknown>) => string;
  system: () => {
    area: string;
    amouser_id: number;
    amohash: string;
    subdomain: string;
    is_modern: boolean;
  };
  get_settings: () => Record<string, unknown>;
  langs?: Record<string, unknown>;
  i18n?: (key: string) => string;
}

interface AmoWidgetCallbacks {
  render: () => boolean;
  init: () => boolean;
  bind_actions: () => boolean;
  settings: () => boolean;
  onSave: () => boolean;
  destroy: () => boolean;
}

declare const define: (deps: string[], factory: (jQuery: JQueryStatic) => unknown) => void;

interface JQueryStatic {
  (selector: string | Document): JQueryLike;
}

interface JQueryLike {
  length: number;
  find: (selector: string) => JQueryLike;
  on: (event: string, handler: (event: Event) => void) => JQueryLike;
  append: (html: string) => JQueryLike;
  remove: () => JQueryLike;
}

declare const AMOCRM:
  | {
      constant: (key: 'account' | 'user') => { id: number; subdomain?: string } | undefined;
    }
  | undefined;
