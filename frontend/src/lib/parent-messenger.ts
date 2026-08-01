const CLOSE_MESSAGE_TYPE = 'amocrm-excel-export:close';

export function isEmbeddedInParentFrame(): boolean {
  return window.parent !== window;
}

export function requestCloseFromParent(): void {
  if (isEmbeddedInParentFrame()) {
    window.parent.postMessage({ type: CLOSE_MESSAGE_TYPE }, '*');
  }
}
