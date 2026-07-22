import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosRequestConfig, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ApiConfigService } from './api-config.service';
import { ApiClientError } from './api-client.error';
import { TokenCacheService } from '../token-cache/token-cache.service';

export interface RequestOptions {
  /**
   * Skips reading/attaching the cached JWT and the 401 -> "session expired"
   * translation below. Only the pre-auth endpoints AuthService calls
   * (/api/auth/mode, /api/auth/login) should ever set this — everything
   * else needs a token (see agent_data/tasks/05-auth-token-attachment).
   */
  skipAuth?: boolean;
}

const NOT_LOGGED_IN_MESSAGE =
  'Not logged in — run `testgator-cli login` first.';
const SESSION_EXPIRED_MESSAGE =
  'Session expired — run `testgator-cli login` again.';

/**
 * Thin shared HTTP client wrapping @nestjs/axios, pointed at
 * testgator_server. Attaches the cached JWT to every request by default (see
 * TokenCacheService) and translates auth failures into actionable messages
 * — everything else is just "make the call, get data back or a typed
 * ApiClientError". No Hydra unwrapping here — task 02's HydraService is a
 * separate, composable step.
 */
@Injectable()
export class ApiClientService {
  constructor(
    private readonly httpService: HttpService,
    private readonly apiConfig: ApiConfigService,
    private readonly tokenCache: TokenCacheService,
  ) {}

  get<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>({ method: 'GET', url: path, params }, options);
  }

  post<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>({ method: 'POST', url: path, data }, options);
  }

  patch<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(
      {
        method: 'PATCH',
        url: path,
        data,
        headers: { 'Content-Type': 'application/merge-patch+json' },
      },
      options,
    );
  }

  put<T = unknown>(
    path: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>({ method: 'PUT', url: path, data }, options);
  }

  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'DELETE', url: path }, options);
  }

  private async request<T>(
    config: AxiosRequestConfig,
    options: RequestOptions = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/ld+json',
      ...(config.headers as Record<string, string> | undefined),
    };

    if (!options.skipAuth) {
      const token = this.tokenCache.read();
      if (!token) {
        // Fail fast — no point making a request we know will 401.
        throw new ApiClientError(NOT_LOGGED_IN_MESSAGE);
      }
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          baseURL: this.apiConfig.apiUrl,
          ...config,
          headers,
        }),
      );
      return response.data;
    } catch (error) {
      throw this.toApiClientError(error, options);
    }
  }

  private toApiClientError(
    error: unknown,
    options: RequestOptions,
  ): ApiClientError {
    if (isAxiosError(error)) {
      if (error.response) {
        if (!options.skipAuth && error.response.status === 401) {
          // The cached token is stale/revoked — drop it so the next command
          // fails fast with NOT_LOGGED_IN_MESSAGE instead of repeating this
          // same round trip.
          this.tokenCache.clear();
          return new ApiClientError(SESSION_EXPIRED_MESSAGE, 401);
        }

        const body = error.response.data as Record<string, unknown> | undefined;
        const detail = (body?.['detail'] ?? body?.['hydra:description']) as
          string | undefined;

        return new ApiClientError(
          detail ?? error.message,
          error.response.status,
          detail,
        );
      }

      return new ApiClientError(
        `Could not reach testgator_server: ${error.message}`,
      );
    }

    return new ApiClientError(
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
