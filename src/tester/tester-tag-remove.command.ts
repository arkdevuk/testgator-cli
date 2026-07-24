import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'remove',
  arguments: '<testerId> <tag...>',
  argsDescription: {
    testerId: 'The tester id (a UUID, not a number)',
    tag: 'One or more tag ids to remove',
  },
  description:
    "Remove one or more tags from a tester's profile (read-modify-write on " +
    'User.tags). Skips the PATCH entirely if none of the given tags are ' +
    'currently present.',
})
export class TesterTagRemoveCommand extends CommandRunner {
  constructor(private readonly testerService: TesterService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [testerId, ...tags] = passedParams;

    try {
      const result = await this.testerService.removeTags(testerId, tags);
      console.log(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to remove tags.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester tag remove 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f vip\n';
  }
}
