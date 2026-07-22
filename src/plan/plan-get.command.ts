import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'get',
  arguments: '<id>',
  argsDescription: { id: 'The test plan id' },
  description:
    'Get a single test plan by id, including its state and questionsOrder.',
})
export class PlanGetCommand extends CommandRunner {
  constructor(private readonly planService: PlanService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [id] = passedParams;

    try {
      const plan = await this.planService.get(id);
      console.log(JSON.stringify(plan));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to get test plan.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli plan get 12\n';
  }
}
