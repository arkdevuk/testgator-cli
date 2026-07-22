import { Command, CommandRunner, Help } from 'nest-commander';
import axios, { isAxiosError } from 'axios';
import { ApiConfigService } from '../api-client/api-config.service';
import { TokenCacheService } from '../token-cache/token-cache.service';
import { printError } from '../cli-output';

/**
 * Ceiling for the healthcheck request. Deliberately generous (30s) — this
 * command exists to answer "is the configured testgator_server reachable at
 * all", not to be a fast liveness probe.
 */
export const PING_TIMEOUT_MS = 30_000;

interface HealthcheckBody {
  healthcheck?: string;
  version?: string;
  error?: boolean;
}

const NOT_CONFIGURED_MESSAGE =
  'Not set up — run `testgator-cli setup` first (or set TESTGATOR_API_URL).';
const NOT_LOGGED_IN_MESSAGE =
  'Not logged in — run `testgator-cli login` first.';
const SESSION_EXPIRED_MESSAGE =
  'Session expired — run `testgator-cli login` again.';

/**
 * Hits testgator_server's healthcheck (`DefaultController::home()`, a bare
 * `GET /` returning `{healthcheck: "ok", version, error: false}`) directly
 * via axios — deliberately NOT through ApiClientService/HydraService's
 * JSON-LD stack, since this needs precise, self-contained control over the
 * timeout rather than whatever @nestjs/axios defaults to.
 *
 * IMPORTANT: unlike a typical healthcheck route, `/` is NOT anonymously
 * accessible on this server — security.yaml's catch-all `api` firewall
 * (`pattern: ^/`) requires a valid JWT for every path except a short
 * allowlist (`/api` exactly, `/public|docs/...`, the auth endpoints), and
 * `/` isn't on that allowlist. So this still needs the cached token
 * attached, same as every authenticated command — it just uses a raw axios
 * call instead of ApiClientService so the 30s timeout is exact and no Hydra
 * unwrapping happens on the plain JSON body.
 */
@Command({
  name: 'ping',
  description:
    'Check that the configured testgator_server is reachable and report its response time ("ttr").',
})
export class PingCommand extends CommandRunner {
  constructor(
    private readonly apiConfig: ApiConfigService,
    private readonly tokenCache: TokenCacheService,
  ) {
    super();
  }

  async run(): Promise<void> {
    if (!this.apiConfig.isConfigured) {
      printError(NOT_CONFIGURED_MESSAGE);
      process.exitCode = 1;
      return;
    }

    const token = this.tokenCache.read();
    if (!token) {
      printError(NOT_LOGGED_IN_MESSAGE);
      process.exitCode = 1;
      return;
    }

    const apiUrl = this.apiConfig.apiUrl;
    const startedAt = Date.now();

    try {
      const response = await axios.get<HealthcheckBody>(apiUrl, {
        timeout: PING_TIMEOUT_MS,
        headers: { Authorization: `Bearer ${token}` },
      });
      const ttrMs = Date.now() - startedAt;

      if (response.data?.error) {
        printError(
          `${apiUrl} reported an error after ${ttrMs}ms: ${JSON.stringify(response.data)}`,
        );
        process.exitCode = 1;
        return;
      }

      console.log(
        JSON.stringify({
          apiUrl,
          status: response.status,
          ttrMs,
          healthcheck: response.data?.healthcheck ?? null,
          version: response.data?.version ?? null,
        }),
      );
    } catch (error) {
      const ttrMs = Date.now() - startedAt;

      if (isAxiosError(error) && error.response?.status === 401) {
        // Stale/revoked token — same convention as ApiClientService: clear
        // it so the next command (of any kind) fails fast with a login
        // prompt instead of repeating this same round trip.
        this.tokenCache.clear();
        printError(SESSION_EXPIRED_MESSAGE);
        process.exitCode = 1;
        return;
      }

      printError(this.describeError(error, apiUrl, ttrMs));
      process.exitCode = 1;
    }
  }

  private describeError(error: unknown, apiUrl: string, ttrMs: number): string {
    if (isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return `Timed out waiting for ${apiUrl} after ${ttrMs}ms (limit ${PING_TIMEOUT_MS}ms).`;
      }
      if (error.response) {
        return `${apiUrl} responded with ${error.response.status} after ${ttrMs}ms.`;
      }
      return `Could not reach ${apiUrl}: ${error.message}`;
    }
    return error instanceof Error
      ? error.message
      : `Unknown error pinging ${apiUrl}.`;
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli ping\n';
  }
}
