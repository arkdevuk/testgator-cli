import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'get',
  arguments: '<id>',
  argsDescription: { id: 'The tester id (a UUID, not a number)' },
  description: 'Get a single tester by id.',
})
export class TesterGetCommand extends CommandRunner {
  constructor(private readonly testerService: TesterService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [id] = passedParams;

    try {
      const tester = await this.testerService.get(id);
      console.log(JSON.stringify(tester));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to get tester.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester get 3fae8c1e-2b7a-4b0a-9c3d-9e2f1a6b7c8d\n';
  }
}
