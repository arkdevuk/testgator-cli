import { Command, CommandRunner, Help } from 'nest-commander';
import { InviteService } from './invite.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@Command({
  name: 'invite',
  arguments: '<email>',
  argsDescription: { email: 'Email address to invite' },
  description:
    "Invite someone to TestGator as a tester, creating their account if it doesn't " +
    'exist yet. testgator_server emails the welcome message automatically on ' +
    'account creation — inviting an already-invited email is a harmless no-op.',
})
export class InviteCommand extends CommandRunner {
  constructor(private readonly inviteService: InviteService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [email] = passedParams;

    try {
      const result = await this.inviteService.invite(email);
      console.log(JSON.stringify(result));
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Failed to invite.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli invite alice@example.com\n';
  }
}
