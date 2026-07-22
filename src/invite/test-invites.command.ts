import { Command, CommandRunner, Help, Option } from 'nest-commander';
import { InviteService } from './invite.service';
import { parseEmailList } from './email-list.util';
import { printError } from '../cli-output';

interface TestInvitesOptions {
  plan: string;
}

@Command({
  name: 'test-invites',
  arguments: '<emails>',
  argsDescription: {
    emails:
      'Comma-separated list of email addresses to invite to the test plan',
  },
  description:
    'Invite multiple people to test a specific test plan (--plan) in one call ' +
    "(comma-separated emails), creating each tester account if it doesn't exist " +
    'yet, and enrolling everyone not already enrolled in a single PATCH. ' +
    'Continues past individual failures — check each entry\'s "success" field.',
})
export class TestInvitesCommand extends CommandRunner {
  constructor(private readonly inviteService: InviteService) {
    super();
  }

  async run(
    passedParams: string[],
    options: TestInvitesOptions,
  ): Promise<void> {
    const [rawEmails] = passedParams;
    const emails = parseEmailList(rawEmails);

    if (emails.length === 0) {
      printError('no email addresses given.');
      process.exitCode = 1;
      return;
    }

    const outcomes = await this.inviteService.inviteManyToTestPlan(
      emails,
      options.plan,
    );
    console.log(JSON.stringify(outcomes));

    if (outcomes.some((outcome) => !outcome.success)) {
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--plan <id>',
    description: 'The test plan id to enroll the testers on.',
    required: true,
  })
  parsePlan(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli test-invites alice@example.com,bob@example.com --plan 12\n';
  }
}
