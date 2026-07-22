jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn() },
  isAxiosError: jest.fn(),
}));

import axios, { isAxiosError } from 'axios';
import { PingCommand, PING_TIMEOUT_MS } from './ping.command';
import { ApiConfigService } from '../api-client/api-config.service';
import { TokenCacheService } from '../token-cache/token-cache.service';

// axios.get/isAxiosError are jest-mocked module exports, not real bound
// methods — typescript-eslint's unbound-method check is a false positive
// here since nothing is ever called with a detached `this`.
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedGet = axios.get as jest.Mock;
const mockedIsAxiosError = isAxiosError as unknown as jest.Mock;

describe('PingCommand', () => {
  let apiConfig: { isConfigured: boolean; apiUrl: string };
  let tokenCache: { read: jest.Mock; clear: jest.Mock };
  let command: PingCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    apiConfig = { isConfigured: true, apiUrl: 'https://testgator.example.com' };
    tokenCache = {
      read: jest.fn().mockReturnValue('a-cached-jwt'),
      clear: jest.fn(),
    };
    command = new PingCommand(
      apiConfig as unknown as ApiConfigService,
      tokenCache as unknown as TokenCacheService,
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
    mockedGet.mockReset();
    mockedIsAxiosError.mockReset();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('errors without making a request when the API URL is not configured', async () => {
    apiConfig.isConfigured = false;

    await command.run();

    expect(mockedGet).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not set up'),
    );
    expect(process.exitCode).toBe(1);
  });

  it('errors without making a request when no token is cached', async () => {
    tokenCache.read.mockReturnValue(null);

    await command.run();

    expect(mockedGet).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not logged in'),
    );
    expect(process.exitCode).toBe(1);
  });

  it('prints the apiUrl, status, and ttr on a healthy response, attaching the cached token', async () => {
    mockedGet.mockResolvedValueOnce({
      status: 200,
      data: { healthcheck: 'ok', version: '1.0.0', error: false },
    });

    await command.run();

    expect(mockedGet).toHaveBeenCalledWith('https://testgator.example.com', {
      timeout: PING_TIMEOUT_MS,
      headers: { Authorization: 'Bearer a-cached-jwt' },
    });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const printed = JSON.parse(logSpy.mock.calls[0][0] as string) as {
      apiUrl: string;
      status: number;
      ttrMs: number;
      healthcheck: string;
      version: string;
    };
    expect(printed.apiUrl).toBe('https://testgator.example.com');
    expect(printed.status).toBe(200);
    expect(printed.healthcheck).toBe('ok');
    expect(printed.version).toBe('1.0.0');
    expect(typeof printed.ttrMs).toBe('number');
    expect(printed.ttrMs).toBeGreaterThanOrEqual(0);
    expect(process.exitCode).toBeUndefined();
  });

  it('errors when the response body itself reports error: true', async () => {
    mockedGet.mockResolvedValueOnce({
      status: 200,
      data: { healthcheck: 'ok', version: '1.0.0', error: true },
    });

    await command.run();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('reported an error'),
    );
    expect(process.exitCode).toBe(1);
  });

  it('clears the cached token and reports a session-expired error on 401', async () => {
    const unauthorizedError = Object.assign(
      new Error('Request failed with status code 401'),
      {
        isAxiosError: true,
        response: { status: 401 },
      },
    );
    mockedGet.mockRejectedValueOnce(unauthorizedError);
    mockedIsAxiosError.mockReturnValue(true);

    await command.run();

    expect(tokenCache.clear).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Session expired'),
    );
    expect(process.exitCode).toBe(1);
  });

  it('reports a clear timeout error on ECONNABORTED', async () => {
    const timeoutError = Object.assign(
      new Error('timeout of 30000ms exceeded'),
      {
        isAxiosError: true,
        code: 'ECONNABORTED',
      },
    );
    mockedGet.mockRejectedValueOnce(timeoutError);
    mockedIsAxiosError.mockReturnValue(true);

    await command.run();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Timed out waiting for https://testgator.example.com`,
      ),
    );
    expect(process.exitCode).toBe(1);
  });

  it('reports connection errors (DNS/refused) clearly', async () => {
    const connError = Object.assign(new Error('getaddrinfo ENOTFOUND'), {
      isAxiosError: true,
      code: 'ENOTFOUND',
    });
    mockedGet.mockRejectedValueOnce(connError);
    mockedIsAxiosError.mockReturnValue(true);

    await command.run();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not reach https://testgator.example.com'),
    );
    expect(process.exitCode).toBe(1);
  });

  it('reports a non-2xx HTTP response as an error', async () => {
    const httpError = Object.assign(
      new Error('Request failed with status code 503'),
      {
        isAxiosError: true,
        response: { status: 503 },
      },
    );
    mockedGet.mockRejectedValueOnce(httpError);
    mockedIsAxiosError.mockReturnValue(true);

    await command.run();

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('responded with 503'),
    );
    expect(process.exitCode).toBe(1);
  });

  it('falls back to a generic message for non-axios errors', async () => {
    mockedGet.mockRejectedValueOnce(new Error('boom'));
    mockedIsAxiosError.mockReturnValue(false);

    await command.run();

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(process.exitCode).toBe(1);
  });
});
