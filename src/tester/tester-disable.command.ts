import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'disable',
  arguments: '<testerId>',
  argsDescription: { testerId: 'The tester id (a UUID, not a number)' },
  description:
    'Deactivate a tester account (sets active=false). Any logged-in team ' +
    'member can do this — testgator_server does not restrict it to ' +
    "ROLE_ADMIN (see User.php's testers:write comment). Existing answers " +
    'and enrollments are untouched; use `tester enable` to reactivate.',
})
export class TesterDisableCommand extends CommandRunner {
  constructor(private readonly testerService: TesterService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [testerId] = passedParams;

    try {
      const result = await this.testerService.disable(testerId);
      console.log(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to disable tester.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester disable 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f\n';
  }
}
