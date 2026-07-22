import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { AnswerService } from './answer.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface AnswerEditOptions {
  state?: string;
  comment?: string;
  important?: boolean;
  ignored?: boolean;
}

@SubCommand({
  name: 'edit',
  arguments: '<id>',
  argsDescription: { id: 'The answer id to edit' },
  description:
    'Edit an answer — dev-team review fields only (state/comment/important/ignored). ' +
    'Only the fields you pass are updated (PATCH, merge semantics). Answers are ' +
    'created by testers, not this CLI — there is no `answer create`.',
})
export class AnswerEditCommand extends CommandRunner {
  constructor(private readonly answerService: AnswerService) {
    super();
  }

  async run(passedParams: string[], options: AnswerEditOptions): Promise<void> {
    const [id] = passedParams;

    try {
      const answer = await this.answerService.update(id, options);
      console.log(JSON.stringify(answer));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to edit answer.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--state <state>',
    description:
      'New review state: pass, pass_with_bugs, failed, blocked, or pending.',
  })
  parseState(value: string): string {
    return value;
  }

  @Option({
    flags: '--comment <text>',
    description: 'New comment/review note for the answer.',
  })
  parseComment(value: string): string {
    return value;
  }

  @Option({
    flags: '--important <bool>',
    description: 'Flag this answer as important: true or false.',
  })
  parseImportant(value: string): boolean {
    return value === 'true';
  }

  @Option({
    flags: '--ignored <bool>',
    description: 'Exclude this answer from stats/reporting: true or false.',
  })
  parseIgnored(value: string): boolean {
    return value === 'true';
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli answer edit 501 --state failed --comment "Reproduces every time."\n';
  }
}
