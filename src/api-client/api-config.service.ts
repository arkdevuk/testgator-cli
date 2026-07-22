import { Injectable } from '@nestjs/common';
import { TokenCacheService } from '../token-cache/token-cache.service';

const DEFAULT_API_URL = 'http://localhost';

/**
 * Resolves testgator_server's base URL, following the same
 * env-var-with-local-dev-fallback pattern testgator_client's Http.js uses,
 * with one addition since task 15: TESTGATOR_API_URL stays the explicit
 * override it always was, but when it's unset this now falls back to the
 * API URL cached by `testgator-cli setup` (see TokenCacheService) before
 * falling back further to the localhost default — so a user who's run
 * `setup` doesn't have to keep exporting the env var for every command.
 */
@Injectable()
export class ApiConfigService {
  constructor(private readonly tokenCache: TokenCacheService) {}

  get apiUrl(): string {
    return (
      process.env.TESTGATOR_API_URL ||
      this.tokenCache.readApiUrl() ||
      DEFAULT_API_URL
    );
  }

  /**
   * True when the API URL has been explicitly configured (via
   * TESTGATOR_API_URL or `testgator-cli setup`), as opposed to `apiUrl`
   * silently resolving to the localhost dev fallback. `ping` uses this to
   * refuse to probe a URL nobody actually configured, instead of quietly
   * pinging localhost and reporting a misleading connection error.
   */
  get isConfigured(): boolean {
    return Boolean(
      process.env.TESTGATOR_API_URL || this.tokenCache.readApiUrl(),
    );
  }
}
