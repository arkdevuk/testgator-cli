import { Command, CommandRunner, Help, Option } from 'nest-commander';
import { InviteService } from './invite.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface TestInviteOptions {
  plan: string;
}

@Command({
  name: 'test-invite',
  arguments: '<email>',
  argsDescription: { email: 'Email address to invite to the test plan' },
  description:
    'Invite someone to test a specific test plan (--plan), creating their tester ' +
    "account if it doesn't exist yet, and enrolling them on the plan " +
    '(testersEnrolled) if not already enrolled.',
})
export class TestInviteCommand extends CommandRunner {
  constructor(private readonly inviteService: InviteService) {
    super();
  }

  async run(passedParams: string[], options: TestInviteOptions): Promise<void> {
    const [email] = passedParams;

    try {
      const result = await this.inviteService.inviteToTestPlan(
        email,
        options.plan,
      );
      console.log(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to invite to test plan.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--plan <id>',
    description: 'The test plan id to enroll the tester on.',
    required: true,
  })
  parsePlan(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli test-invite alice@example.com --plan 12\n';
  }
}
