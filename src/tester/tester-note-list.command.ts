import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { TesterNoteService } from './tester-note.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface TesterNoteListOptions {
  page?: number;
  itemsPerPage?: number;
}

@SubCommand({
  name: 'list',
  arguments: '<testerId>',
  argsDescription: { testerId: 'The tester id (a UUID, not a number)' },
  description:
    'List notes on a tester, newest first. Paginated: --items-per-page ' +
    '(default 20), --page.',
})
export class TesterNoteListCommand extends CommandRunner {
  constructor(private readonly testerNoteService: TesterNoteService) {
    super();
  }

  async run(
    passedParams: string[],
    options: TesterNoteListOptions,
  ): Promise<void> {
    const [testerId] = passedParams;

    try {
      const { items } = await this.testerNoteService.list(testerId, options);
      console.log(JSON.stringify(items));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to list notes.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--page <n>',
    description: 'Page number to fetch (1-based). Defaults to page 1.',
  })
  parsePage(value: string): number {
    return Number(value);
  }

  @Option({
    flags: '--items-per-page <n>',
    description: 'Results per page. Defaults to 20.',
  })
  parseItemsPerPage(value: string): number {
    return Number(value);
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester note list 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f\n';
  }
}
