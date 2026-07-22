import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { AnswerService } from './answer.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface AnswerListOptions {
  question?: string;
  plan?: string;
  state?: string;
  page?: number;
  itemsPerPage?: number;
}

@SubCommand({
  name: 'list',
  description:
    'List answers, optionally filtered by --question, --plan, and/or ' +
    '--state. Paginated: --items-per-page (default 20), --page.',
})
export class AnswerListCommand extends CommandRunner {
  constructor(private readonly answerService: AnswerService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: AnswerListOptions,
  ): Promise<void> {
    try {
      const { items } = await this.answerService.list(options);
      console.log(JSON.stringify(items));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to list answers.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--question <id>',
    description: 'Only list answers to this question id.',
  })
  parseQuestion(value: string): string {
    return value;
  }

  @Option({
    flags: '--plan <id>',
    description: 'Only list answers belonging to this test plan id.',
  })
  parsePlan(value: string): string {
    return value;
  }

  @Option({
    flags: '--state <state>',
    description:
      'Only list answers with this state (pass|pass_with_bugs|failed|blocked|pending).',
  })
  parseState(value: string): string {
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
    return '\nExample:\n  $ testgator-cli answer list --plan 12 --state failed --page 2 --items-per-page 10\n';
  }
}
