import { ApiConfigService } from './api-config.service';
import { TokenCacheService } from '../token-cache/token-cache.service';

describe('ApiConfigService', () => {
  const originalEnv = process.env.TESTGATOR_API_URL;
  let tokenCache: { readApiUrl: jest.Mock };
  let service: ApiConfigService;

  beforeEach(() => {
    tokenCache = { readApiUrl: jest.fn().mockReturnValue(null) };
    service = new ApiConfigService(tokenCache as unknown as TokenCacheService);
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TESTGATOR_API_URL;
    } else {
      process.env.TESTGATOR_API_URL = originalEnv;
    }
  });

  it('defaults to http://localhost when TESTGATOR_API_URL is unset and nothing is cached', () => {
    delete process.env.TESTGATOR_API_URL;

    expect(service.apiUrl).toBe('http://localhost');
  });

  it('is overridable via the TESTGATOR_API_URL env var', () => {
    process.env.TESTGATOR_API_URL = 'https://testgator.example.com';

    expect(service.apiUrl).toBe('https://testgator.example.com');
  });

  it('falls back to the cached API URL (from `setup`) when the env var is unset', () => {
    delete process.env.TESTGATOR_API_URL;
    tokenCache.readApiUrl.mockReturnValue('https://cached.example.com');

    expect(service.apiUrl).toBe('https://cached.example.com');
  });

  it('prefers the env var over the cached API URL when both are present', () => {
    process.env.TESTGATOR_API_URL = 'https://env.example.com';
    tokenCache.readApiUrl.mockReturnValue('https://cached.example.com');

    expect(service.apiUrl).toBe('https://env.example.com');
  });

  describe('isConfigured', () => {
    it('is false when neither TESTGATOR_API_URL nor a cached API URL is set', () => {
      delete process.env.TESTGATOR_API_URL;

      expect(service.isConfigured).toBe(false);
    });

    it('is true when TESTGATOR_API_URL is set', () => {
      process.env.TESTGATOR_API_URL = 'https://env.example.com';

      expect(service.isConfigured).toBe(true);
    });

    it('is true when an API URL is cached (from `setup`), even without the env var', () => {
      delete process.env.TESTGATOR_API_URL;
      tokenCache.readApiUrl.mockReturnValue('https://cached.example.com');

      expect(service.isConfigured).toBe(true);
    });
  });
});
