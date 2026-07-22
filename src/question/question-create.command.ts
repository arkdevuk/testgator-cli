import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { QuestionService } from './question.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface QuestionCreateOptions {
  plan: string;
  name: string;
  content?: string;
  displayOrder?: number;
}

@SubCommand({
  name: 'create',
  description:
    'Create a question under a test plan. Does NOT append it to the ' +
    "plan's questionsOrder — that array is only ever set by `plan duplicate`; " +
    'set it yourself via `plan edit` if you need explicit ordering.',
})
export class QuestionCreateCommand extends CommandRunner {
  constructor(private readonly questionService: QuestionService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: QuestionCreateOptions,
  ): Promise<void> {
    try {
      const question = await this.questionService.create(options);
      console.log(JSON.stringify(question));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to create question.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--plan <id>',
    description: 'The test plan id the new question belongs to.',
    required: true,
  })
  parsePlan(value: string): string {
    return value;
  }

  @Option({
    flags: '--name <name>',
    description: 'Name for the new question.',
    required: true,
  })
  parseName(value: string): string {
    return value;
  }

  @Option({
    flags: '--content <text>',
    description: 'Optional content for the question.',
  })
  parseContent(value: string): string {
    return value;
  }

  @Option({
    flags: '--display-order <n>',
    description: 'Optional display order for the question (defaults to 0).',
  })
  parseDisplayOrder(value: string): number {
    return Number(value);
  }

  @Help('after')
  example(): string {
    return (
      '\nExample:\n' +
      '  $ testgator-cli question create --plan 12 --name "Can you log in with a valid one-time code?"\n'
    );
  }
}
