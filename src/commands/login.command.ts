import { Command, CommandRunner, Help, Option } from 'nest-commander';
import { AuthService } from '../auth/auth.service';
import { TokenCacheService } from '../token-cache/token-cache.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError, printSuccess } from '../cli-output';

interface LoginOptions {
  username: string;
  password: string;
}

@Command({
  name: 'login',
  description:
    'Authenticate against testgator_server (dev-team login) and cache the JWT locally.',
})
export class LoginCommand extends CommandRunner {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenCache: TokenCacheService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: LoginOptions): Promise<void> {
    try {
      const jwt = await this.authService.login(
        options.username,
        options.password,
      );
      this.tokenCache.write(jwt);
      printSuccess('Logged in. Token cached for future commands.');
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Login failed.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '-u, --username <username>',
    description: 'testgator_server team username or email',
    required: true,
  })
  parseUsername(value: string): string {
    return value;
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'testgator_server team password',
    required: true,
  })
  parsePassword(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli login --username alice --password secret\n';
  }
}
