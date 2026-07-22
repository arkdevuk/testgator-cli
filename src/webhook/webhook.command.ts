import { Command, CommandRunner, Help } from 'nest-commander';
import { WebhookEnableCommand } from './webhook-enable.command';
import { WebhookDisableCommand } from './webhook-disable.command';
import { WebhookSetUrlCommand } from './webhook-set-url.command';
import { printError } from '../cli-output';

@Command({
  name: 'webhook',
  description:
    'Manage the outbound webhook integration (admin only — see subcommand help).',
  subCommands: [
    WebhookEnableCommand,
    WebhookDisableCommand,
    WebhookSetUrlCommand,
  ],
})
export class WebhookCommand extends CommandRunner {
  // Reached only when `webhook` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `webhook enable`, `webhook disable`, or `webhook set-url <url>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli webhook enable\n';
  }
}
