import {
  Command,
  CommandRunner,
  Help,
  InquirerService,
  Option,
} from 'nest-commander';
import { AuthService } from '../auth/auth.service';
import { TokenCacheService } from '../token-cache/token-cache.service';
import { ApiClientError } from '../api-client/api-client.error';
import { SETUP_QUESTION_SET_NAME, SetupAnswers } from './setup.questions';
import { printError, printSuccess } from '../cli-output';

interface SetupOptions {
  apiUrl?: string;
  username?: string;
  password?: string;
}

@Command({
  name: 'setup',
  description:
    'Configure the API URL and log in, caching the session for future commands. ' +
    'Prompts interactively for whichever of --api-url/--username/--password is not ' +
    'passed (or not resolvable from TESTGATOR_API_URL) — pass all three to run ' +
    'fully non-interactively, e.g. from an agent or script.',
})
export class SetupCommand extends CommandRunner {
  constructor(
    private readonly inquirer: InquirerService,
    private readonly authService: AuthService,
    private readonly tokenCache: TokenCacheService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: SetupOptions): Promise<void> {
    // Anything already known — from a flag, or from TESTGATOR_API_URL for
    // apiUrl specifically — is pre-filled into the answers hash handed to
    // inquirer. inquirer.js's own PromptUI.filterIfRunnable() skips a
    // question outright whenever `answers[question.name]` is already
    // defined (see node_modules/inquirer/lib/ui/prompt.js), with no need
    // for a custom `when` here — so passing all three flags (or two flags
    // plus an exported TESTGATOR_API_URL) makes this command run with zero
    // prompts, and passing a subset prompts only for what's still missing.
    const providedAnswers: Partial<SetupAnswers> = {};
    if (options.apiUrl !== undefined) {
      providedAnswers.apiUrl = options.apiUrl;
    } else if (process.env.TESTGATOR_API_URL) {
      providedAnswers.apiUrl = process.env.TESTGATOR_API_URL;
    }
    if (options.username !== undefined) {
      providedAnswers.username = options.username;
    }
    if (options.password !== undefined) {
      providedAnswers.password = options.password;
    }

    const answers = await this.inquirer.ask<SetupAnswers>(
      SETUP_QUESTION_SET_NAME,
      providedAnswers,
    );

    // Point every downstream call (getAuthMode/login, both via
    // ApiConfigService.apiUrl) at the URL just resolved, not whatever was
    // previously cached — this process only lives for the duration of this
    // command, so this can't leak into other invocations.
    process.env.TESTGATOR_API_URL = answers.apiUrl;

    try {
      const jwt = await this.authService.login(
        answers.username,
        answers.password,
      );
      // Only persist anything once login has actually succeeded — a failed
      // attempt below must not leave a partial/corrupt cache behind.
      this.tokenCache.write(jwt);
      this.tokenCache.writeApiUrl(answers.apiUrl);
      printSuccess(
        `Logged in to ${answers.apiUrl} as ${answers.username}. Session cached for future commands.`,
      );
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Setup failed.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--api-url <url>',
    description:
      'testgator_server API URL. Omit to be prompted for it (or to fall back to TESTGATOR_API_URL, if set).',
  })
  parseApiUrl(value: string): string {
    return value.trim();
  }

  @Option({
    flags: '-u, --username <username>',
    description:
      'testgator_server team username or email. Omit to be prompted for it.',
  })
  parseUsername(value: string): string {
    return value.trim();
  }

  @Option({
    flags: '-p, --password <password>',
    description: 'testgator_server team password. Omit to be prompted for it.',
  })
  parsePassword(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return (
      '\nExample:\n' +
      '  $ testgator-cli setup\n' +
      '  $ testgator-cli setup --api-url https://testgator.example.com --username alice --password secret\n'
    );
  }
}
