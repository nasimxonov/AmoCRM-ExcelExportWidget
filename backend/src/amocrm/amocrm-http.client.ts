import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import { AmoCrmTokenProvider } from './amocrm-token.provider';

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 400;
const MIN_REQUEST_INTERVAL_MS = 150; // amoCRM allows ~7 req/s per account

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AmoCrmApiError extends Error {
  constructor(public readonly status: number) {
    super(`amoCRM API responded with ${status}`);
  }
}

/**
 * Low-level HTTP client for amoCRM's REST API v4. Handles:
 *  - injecting a valid (auto-refreshed) bearer token per account
 *  - a soft per-account rate limiter (amoCRM caps at ~7 req/s)
 *  - retrying 429 (honoring Retry-After) and transient 5xx/network errors
 *    with exponential backoff
 *  - one automatic re-auth + retry on an unexpected 401
 */
@Injectable()
export class AmoCrmHttpClient {
  private readonly logger = new Logger(AmoCrmHttpClient.name);
  private readonly lastRequestAt = new Map<number, number>();

  constructor(private readonly tokenProvider: AmoCrmTokenProvider) {}

  async request<T>(accountDbId: number, config: AxiosRequestConfig): Promise<T> {
    let attempt = 0;
    let forcedReauth = false;

    while (true) {
      await this.throttle(accountDbId);
      const { accessToken, baseUrl } = await this.tokenProvider.getValidAccessToken(accountDbId);

      try {
        const response = await axios.request<T>({
          ...config,
          baseURL: baseUrl,
          headers: {
            ...config.headers,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          validateStatus: (status) => status < 500,
        });

        if (response.status === 429) {
          attempt += 1;
          await this.handleRateLimit(response.headers['retry-after'], attempt);
          continue;
        }

        if (response.status === 401 && !forcedReauth) {
          forcedReauth = true;
          this.logger.warn(`Unexpected 401 for account ${accountDbId}; forcing token refresh`);
          continue;
        }

        if (response.status >= 400) {
          throw new AmoCrmApiError(response.status);
        }

        return response.data;
      } catch (error) {
        attempt += 1;
        if (attempt > MAX_RETRIES || !this.isRetryable(error)) {
          this.logger.error(`amoCRM request failed permanently: ${config.method ?? 'GET'} ${config.url ?? ''}`);
          throw new ServiceUnavailableException('amoCRM API request failed');
        }
        const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        this.logger.warn(`Retrying amoCRM request (attempt ${attempt}/${MAX_RETRIES}) after ${backoff}ms`);
        await sleep(backoff);
      }
    }
  }

  private async handleRateLimit(retryAfterHeader: unknown, attempt: number): Promise<void> {
    const retryAfterSeconds = Number(retryAfterHeader);
    const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : BASE_BACKOFF_MS * 2 ** attempt;
    this.logger.warn(`Rate limited by amoCRM; waiting ${delayMs}ms before retrying`);
    await sleep(delayMs);
  }

  private async throttle(accountDbId: number): Promise<void> {
    const last = this.lastRequestAt.get(accountDbId) ?? 0;
    const elapsed = Date.now() - last;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
    }
    this.lastRequestAt.set(accountDbId, Date.now());
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof AmoCrmApiError) {
      return error.status >= 500;
    }
    if (error instanceof AxiosError) {
      return !error.response; // network/timeout error
    }
    return false;
  }
}
