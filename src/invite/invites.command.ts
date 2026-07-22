import { Command, CommandRunner, Help } from 'nest-commander';
import { InviteService } from './invite.service';
import { parseEmailList } from './email-list.util';
import { printError } from '../cli-output';

@Command({
  name: 'invites',
  arguments: '<emails>',
  argsDescription: {
    emails: 'Comma-separated list of email addresses to invite',
  },
  description:
    'Invite multiple people to TestGator as testers in one call (comma-separated ' +
    "emails), creating each account if it doesn't exist yet. Continues past " +
    'individual failures — check each entry\'s "success" field rather than ' +
    'assuming all-or-nothing.',
})
export class InvitesCommand extends CommandRunner {
  constructor(private readonly inviteService: InviteService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [rawEmails] = passedParams;
    const emails = parseEmailList(rawEmails);

    if (emails.length === 0) {
      printError('no email addresses given.');
      process.exitCode = 1;
      return;
    }

    const outcomes = await this.inviteService.inviteMany(emails);
    console.log(JSON.stringify(outcomes));

    if (outcomes.some((outcome) => !outcome.success)) {
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli invites alice@example.com,bob@example.com\n';
  }
}
