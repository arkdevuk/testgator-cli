import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'remove-tester',
  arguments: '<planId> <testerId...>',
  argsDescription: {
    planId: 'The id of the test plan',
    testerId: 'One or more tester ids to remove from the plan',
  },
  description:
    "Remove one or more testers from a plan's enrollment " +
    '(read-modify-write on testersEnrolled). Skips the PATCH entirely if ' +
    'none of the given testers are currently enrolled. Detaches enrollment ' +
    'only — existing answers and the tester accounts are unaffected.',
})
export class PlanRemoveTesterCommand extends CommandRunner {
  constructor(private readonly planService: PlanService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [planId, ...testerIds] = passedParams;

    try {
      const result = await this.planService.removeTesters(planId, testerIds);
      console.log(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to remove tester(s) from plan.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli plan remove-tester 12 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f\n';
  }
}
