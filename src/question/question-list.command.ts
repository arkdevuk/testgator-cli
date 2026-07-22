import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { QuestionService } from './question.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface QuestionListOptions {
  plan?: string;
  page?: number;
  itemsPerPage?: number;
}

@SubCommand({
  name: 'list',
  description:
    'List questions, optionally filtered by --plan. Paginated: ' +
    '--items-per-page (default 20), --page.',
})
export class QuestionListCommand extends CommandRunner {
  constructor(private readonly questionService: QuestionService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: QuestionListOptions,
  ): Promise<void> {
    try {
      const { items } = await this.questionService.list(options);
      console.log(JSON.stringify(items));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to list questions.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--plan <id>',
    description: 'Only list questions belonging to this test plan id.',
  })
  parsePlan(value: string): string {
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
    return '\nExample:\n  $ testgator-cli question list --plan 12 --page 2 --items-per-page 10\n';
  }
}
