import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'add',
  arguments: '<testerId> <tag...>',
  argsDescription: {
    testerId: 'The tester id (a UUID, not a number)',
    tag: 'One or more tag ids to add — any string is accepted',
  },
  description:
    "Add one or more tags to a tester's profile (read-modify-write on " +
    'User.tags). Adding a tag the tester already has is a harmless no-op.',
})
export class TesterTagAddCommand extends CommandRunner {
  constructor(private readonly testerService: TesterService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [testerId, ...tags] = passedParams;

    try {
      const result = await this.testerService.addTags(testerId, tags);
      console.log(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Failed to add tags.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester tag add 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f vip beta\n';
  }
}
