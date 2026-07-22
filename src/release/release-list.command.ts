import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { ReleaseService } from './release.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface ReleaseListOptions {
  project?: string;
  page?: number;
  itemsPerPage?: number;
}

@SubCommand({
  name: 'list',
  description:
    'List releases, optionally filtered by --project. Paginated: ' +
    '--items-per-page (default 20), --page.',
})
export class ReleaseListCommand extends CommandRunner {
  constructor(private readonly releaseService: ReleaseService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: ReleaseListOptions,
  ): Promise<void> {
    try {
      const { items } = await this.releaseService.list(options);
      console.log(JSON.stringify(items));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to list releases.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--project <id>',
    description: 'Only list releases belonging to this project id.',
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
    return '\nExample:\n  $ testgator-cli release list --project 1 --page 2 --items-per-page 10\n';
  }
}
