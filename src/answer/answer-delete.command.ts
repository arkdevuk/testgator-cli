import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { AnswerService } from './answer.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError, printSuccess } from '../cli-output';

@SubCommand({
  name: 'delete',
  arguments: '<id>',
  argsDescription: { id: 'The answer id to delete' },
  description:
    'Delete an answer. Requires ROLE_USER (dev-team) — see Answer.php.',
})
export class AnswerDeleteCommand extends CommandRunner {
  constructor(private readonly answerService: AnswerService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [id] = passedParams;

    try {
      await this.answerService.delete(id);
      printSuccess(`Deleted answer ${id}.`);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to delete answer.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli answer delete 501\n';
  }
}
