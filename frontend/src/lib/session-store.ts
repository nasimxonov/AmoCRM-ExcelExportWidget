let currentToken: string | null = null;

export function setSessionToken(token: string): void {
  currentToken = token;
}

export function getSessionToken(): string | null {
  return currentToken;
}

export function clearSessionToken(): void {
  currentToken = null;
}
