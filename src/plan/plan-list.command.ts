import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface PlanListOptions {
  project?: string;
  release?: string;
  page?: number;
  itemsPerPage?: number;
}

@SubCommand({
  name: 'list',
  description:
    'List test plans, optionally filtered by --project and/or --release. ' +
    'Paginated: --items-per-page (default 20), --page.',
})
export class PlanListCommand extends CommandRunner {
  constructor(private readonly planService: PlanService) {
    super();
  }

  async run(_passedParams: string[], options: PlanListOptions): Promise<void> {
    try {
      const { items } = await this.planService.list(options);
      console.log(JSON.stringify(items));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to list test plans.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--project <id>',
    description: 'Only list plans belonging to this project id.',
  })
  parseProject(value: string): string {
    return value;
  }

  @Option({
    flags: '--release <id>',
    description: 'Only list plans belonging to this release id.',
  })
  parseRelease(value: string): string {
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
    return '\nExample:\n  $ testgator-cli plan list --project 1 --release 5 --page 2 --items-per-page 10\n';
  }
}
