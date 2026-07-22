import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { QuestionService } from './question.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface QuestionEditOptions {
  name?: string;
  plan?: string;
  content?: string;
  displayOrder?: number;
}

@SubCommand({
  name: 'edit',
  arguments: '<id>',
  argsDescription: { id: 'The question id to edit' },
  description:
    'Edit a question. Only the fields you pass are updated (PATCH, merge ' +
    "semantics). Does NOT update any plan's questionsOrder.",
})
export class QuestionEditCommand extends CommandRunner {
  constructor(private readonly questionService: QuestionService) {
    super();
  }

  async run(
    passedParams: string[],
    options: QuestionEditOptions,
  ): Promise<void> {
    const [id] = passedParams;

    try {
      const question = await this.questionService.update(id, options);
      console.log(JSON.stringify(question));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to edit question.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--name <name>',
    description: 'New name for the question.',
  })
  parseName(value: string): string {
    return value;
  }

  @Option({
    flags: '--plan <id>',
    description: 'Move the question to this test plan id.',
  })
  parsePlan(value: string): string {
    return value;
  }

  @Option({
    flags: '--content <text>',
    description: 'New content for the question.',
  })
  parseContent(value: string): string {
    return value;
  }

  @Option({
    flags: '--display-order <n>',
    description: 'New display order for the question.',
  })
  parseDisplayOrder(value: string): number {
    return Number(value);
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli question edit 101 --content "Updated instructions."\n';
  }
}
