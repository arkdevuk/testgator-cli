import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { QuestionService } from './question.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'get',
  arguments: '<id>',
  argsDescription: { id: 'The question id' },
  description: 'Get a single question by id.',
})
export class QuestionGetCommand extends CommandRunner {
  constructor(private readonly questionService: QuestionService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [id] = passedParams;

    try {
      const question = await this.questionService.get(id);
      console.log(JSON.stringify(question));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to get question.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli question get 101\n';
  }
}
