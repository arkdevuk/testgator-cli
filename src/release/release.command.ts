import { Command, CommandRunner, Help } from 'nest-commander';
import { ReleaseListCommand } from './release-list.command';
import { ReleaseGetCommand } from './release-get.command';
import { ReleaseCreateCommand } from './release-create.command';
import { ReleaseEditCommand } from './release-edit.command';
import { printError } from '../cli-output';

@Command({
  name: 'release',
  description: 'Work with releases.',
  subCommands: [
    ReleaseListCommand,
    ReleaseGetCommand,
    ReleaseCreateCommand,
    ReleaseEditCommand,
  ],
})
export class ReleaseCommand extends CommandRunner {
  // Reached only when `release` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `release list`, `release get <id>`, `release create`, or `release edit <id>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli release list --project 1\n';
  }
}
