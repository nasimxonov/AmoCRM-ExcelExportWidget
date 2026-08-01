import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

export interface AmoAccountInfo {
  id: number;
  subdomain: string;
}

/**
 * Minimal bootstrap client used once at startup to resolve which amoCRM
 * account a Private Integration long-lived token belongs to (there is no
 * account id embedded in the token itself). Kept separate from
 * AmoCrmHttpClient because it runs before any AmoAccount row exists.
 */
@Injectable()
export class AmoCrmAccountClient {
  private readonly logger = new Logger(AmoCrmAccountClient.name);

  async fetchAccountInfo(subdomain: string, longLivedToken: string): Promise<AmoAccountInfo> {
    try {
      const response = await axios.get<{
        id: number;
        subdomain: string;
      }>(`https://${subdomain}.amocrm.ru/api/v4/account`, {
        headers: {
          Authorization: `Bearer ${longLivedToken}`,
        },
      });

      return {
        id: response.data.id,
        subdomain: response.data.subdomain,
      };
    } catch (error) {
      this.logger.error(this.describeError(error));
      throw error;
    }
  }

  private describeError(error: unknown): string {
    if (error instanceof AxiosError) {
      return `${error.response?.status ?? 'no-status'} ${JSON.stringify(
        error.response?.data ?? error.message,
      )}`;
    }

    return error instanceof Error ? error.message : String(error);
  }
}
