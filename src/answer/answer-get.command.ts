import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { AnswerService } from './answer.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'get',
  arguments: '<id>',
  argsDescription: { id: 'The answer id' },
  description:
    'Get a single answer by id, including its comment, systemInfos, and attachment (files) metadata.',
})
export class AnswerGetCommand extends CommandRunner {
  constructor(private readonly answerService: AnswerService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [id] = passedParams;

    try {
      const answer = await this.answerService.get(id);
      console.log(JSON.stringify(answer));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to get answer.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli answer get 501\n';
  }
}
