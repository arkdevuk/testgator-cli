import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { TagService } from './tag.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface TagListOptions {
  search?: string;
  page?: number;
  itemsPerPage?: number;
}

@SubCommand({
  name: 'list',
  description:
    'List the tag catalog, optionally filtered by --search (partial match ' +
    'on label). Paginated: --items-per-page (default 20), --page.',
})
export class TagListCommand extends CommandRunner {
  constructor(private readonly tagService: TagService) {
    super();
  }

  async run(_passedParams: string[], options: TagListOptions): Promise<void> {
    try {
      const { items } = await this.tagService.list(options);
      console.log(JSON.stringify(items));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to list tags.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--search <text>',
    description: 'Only list tags whose label partially matches this text.',
  })
  parseSearch(value: string): string {
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
    return '\nExample:\n  $ testgator-cli tag list --search vip\n';
  }
}
