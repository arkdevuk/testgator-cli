import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TesterNoteService } from './tester-note.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError, printSuccess } from '../cli-output';

@SubCommand({
  name: 'add',
  arguments: '<testerId> <content>',
  argsDescription: {
    testerId: 'The tester id (a UUID, not a number)',
    content: 'The note text (wrap in quotes if it contains spaces)',
  },
  description: 'Add a free-text note to a tester.',
})
export class TesterNoteAddCommand extends CommandRunner {
  constructor(private readonly testerNoteService: TesterNoteService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [testerId, content] = passedParams;

    try {
      await this.testerNoteService.add(testerId, content);
      printSuccess(`Added note to tester ${testerId}.`);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Failed to add note.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester note add 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f "Very responsive tester"\n';
  }
}
