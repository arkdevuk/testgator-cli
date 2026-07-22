import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { ProjectService } from './project.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface ProjectListOptions {
  page?: number;
  itemsPerPage?: number;
}

@SubCommand({
  name: 'list',
  description:
    'List all projects. Omits allTesters (a bulky IRI array); totalTesters ' +
    '(a plain count) is kept — use `tester list --project <id>` for the roster. ' +
    'Paginated: --items-per-page (default 20), --page.',
})
export class ProjectListCommand extends CommandRunner {
  constructor(private readonly projectService: ProjectService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: ProjectListOptions,
  ): Promise<void> {
    try {
      const { items } = await this.projectService.list(options);
      console.log(JSON.stringify(items));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to list projects.';
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
    return '\nExample:\n  $ testgator-cli project list --page 2 --items-per-page 10\n';
  }
}
