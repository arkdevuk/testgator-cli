import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import { ApiClientService } from './api-client.service';
import { ApiConfigService } from './api-config.service';
import { ApiClientError } from './api-client.error';
import { TokenCacheService } from '../token-cache/token-cache.service';

function axiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as AxiosResponse['config'],
  };
}

function axiosError(message: string, response?: AxiosResponse): AxiosError {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.toJSON = () => ({});
  if (response) {
    error.response = response;
  }
  return error;
}

describe('ApiClientService', () => {
  let httpService: { request: jest.Mock };
  let apiConfig: ApiConfigService;
  let tokenCache: {
    read: jest.Mock;
    clear: jest.Mock;
    readApiUrl: jest.Mock;
  };
  let service: ApiClientService;

  beforeEach(() => {
    httpService = { request: jest.fn() };
    tokenCache = {
      read: jest.fn().mockReturnValue('a-cached-jwt'),
      clear: jest.fn(),
      readApiUrl: jest.fn().mockReturnValue(null),
    };
    apiConfig = new ApiConfigService(
      tokenCache as unknown as TokenCacheService,
    );
    process.env.TESTGATOR_API_URL = 'https://testgator.example.com';
    service = new ApiClientService(
      httpService as unknown as HttpService,
      apiConfig,
      tokenCache as unknown as TokenCacheService,
    );
  });

  afterEach(() => {
    delete process.env.TESTGATOR_API_URL;
  });

  it('performs a successful GET and returns the response data', async () => {
    httpService.request.mockReturnValueOnce(
      of(axiosResponse({ id: 12, name: 'Sprint 42 regression' })),
    );

    const result = await service.get('/api/test_plans/12');

    expect(result).toEqual({ id: 12, name: 'Sprint 42 regression' });
    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: '/api/test_plans/12',
        baseURL: 'https://testgator.example.com',
        // Jest's `expect.objectContaining` types as `any` — a known false
        // positive for typescript-eslint's strict rules, not a real bug.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        headers: expect.objectContaining({
          Accept: 'application/ld+json',
          Authorization: 'Bearer a-cached-jwt',
        }),
      }),
    );
  });

  it('performs a successful POST and returns the response data', async () => {
    httpService.request.mockReturnValueOnce(of(axiosResponse({ id: 15 }, 201)));

    const result = await service.post('/api/test_plans', { name: 'New plan' });

    expect(result).toEqual({ id: 15 });
    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: '/api/test_plans',
        data: { name: 'New plan' },
      }),
    );
  });

  it('throws an ApiClientError with status + detail on a 4xx response', async () => {
    httpService.request.mockReturnValueOnce(
      throwError(() =>
        axiosError(
          'Request failed with status code 404',
          axiosResponse({ detail: 'Test plan not found.' }, 404),
        ),
      ),
    );

    await expect(service.get('/api/test_plans/999')).rejects.toMatchObject({
      status: 404,
      detail: 'Test plan not found.',
      message: 'Test plan not found.',
    });
  });

  it('throws an ApiClientError with status + detail on a 5xx response', async () => {
    httpService.request.mockReturnValueOnce(
      throwError(() =>
        axiosError(
          'Request failed with status code 500',
          axiosResponse({ 'hydra:description': 'Internal server error.' }, 500),
        ),
      ),
    );

    await expect(service.get('/api/test_plans/12')).rejects.toMatchObject({
      status: 500,
      detail: 'Internal server error.',
    });
  });

  it('throws an ApiClientError with no status on a network-level failure', async () => {
    httpService.request.mockReturnValueOnce(
      throwError(() => axiosError('connect ECONNREFUSED 127.0.0.1:80')),
    );

    const call = service.get('/api/test_plans/12');

    await expect(call).rejects.toBeInstanceOf(ApiClientError);
    await expect(call).rejects.toMatchObject({ status: undefined });
  });

  describe('auth attachment', () => {
    it('attaches the cached token as a Bearer Authorization header', async () => {
      httpService.request.mockReturnValueOnce(of(axiosResponse({ ok: true })));

      await service.get('/api/test_plans');

      const [callArg] = httpService.request.mock.calls[0] as [
        { headers: Record<string, unknown> },
      ];
      expect(callArg.headers.Authorization).toBe('Bearer a-cached-jwt');
    });

    it('fails fast with a clear message when no token is cached, making no HTTP call', async () => {
      tokenCache.read.mockReturnValueOnce(null);

      await expect(service.get('/api/test_plans')).rejects.toMatchObject({
        message: 'Not logged in — run `testgator-cli login` first.',
      });
      expect(httpService.request).not.toHaveBeenCalled();
    });

    it('translates a 401 into a session-expired message and clears the stale token', async () => {
      httpService.request.mockReturnValueOnce(
        throwError(() =>
          axiosError(
            'Request failed with status code 401',
            axiosResponse({ detail: 'Expired JWT Token' }, 401),
          ),
        ),
      );

      await expect(service.get('/api/test_plans')).rejects.toMatchObject({
        status: 401,
        message: 'Session expired — run `testgator-cli login` again.',
      });
      expect(tokenCache.clear).toHaveBeenCalledTimes(1);
    });

    it('skipAuth bypasses token attachment, the fail-fast check, and the 401 translation', async () => {
      tokenCache.read.mockReturnValueOnce(null);
      httpService.request.mockReturnValueOnce(
        throwError(() =>
          axiosError(
            'Request failed with status code 401',
            axiosResponse({ detail: 'Invalid credentials.' }, 401),
          ),
        ),
      );

      await expect(
        service.post(
          '/api/auth/login',
          { username: 'dev', password: 'wrong' },
          { skipAuth: true },
        ),
      ).rejects.toMatchObject({
        status: 401,
        message: 'Invalid credentials.',
      });
      expect(tokenCache.clear).not.toHaveBeenCalled();
    });
  });
});
