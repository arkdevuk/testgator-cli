import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface TesterListOptions {
  project?: string;
  page?: number;
  itemsPerPage?: number;
}

@SubCommand({
  name: 'list',
  description:
    'List testers, optionally filtered by --project (filtered client-side ' +
    '— see TesterService). Paginated: --items-per-page (default 20), --page ' +
    '— applied before the --project filter, so a page can return fewer than ' +
    '--items-per-page matches.',
})
export class TesterListCommand extends CommandRunner {
  constructor(private readonly testerService: TesterService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: TesterListOptions,
  ): Promise<void> {
    try {
      const { items } = await this.testerService.list(options);
      console.log(JSON.stringify(items));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to list testers.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--project <id>',
    description:
      'Only list testers enrolled in at least one plan for this project id.',
  })
  parseProject(value: string): string {
    return value;
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
    return '\nExample:\n  $ testgator-cli tester list --project 1 --page 2 --items-per-page 10\n';
  }
}
