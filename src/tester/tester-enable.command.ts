import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'enable',
  arguments: '<testerId>',
  argsDescription: { testerId: 'The tester id (a UUID, not a number)' },
  description:
    'Reactivate a previously disabled tester account (sets active=true). ' +
    'Any logged-in team member can do this — testgator_server does not ' +
    "restrict it to ROLE_ADMIN (see User.php's testers:write comment).",
})
export class TesterEnableCommand extends CommandRunner {
  constructor(private readonly testerService: TesterService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [testerId] = passedParams;

    try {
      const result = await this.testerService.enable(testerId);
      console.log(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to enable tester.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester enable 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f\n';
  }
}
