export interface AmoIntegrationAccount {
  accountId: number;
  subdomain: string;
  connectedAt: string;
}

export interface WidgetSessionContext {
  accountId: number;
  subdomain: string;
  userId: number;
}
