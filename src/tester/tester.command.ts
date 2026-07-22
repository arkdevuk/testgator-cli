import { Command, CommandRunner, Help } from 'nest-commander';
import { TesterListCommand } from './tester-list.command';
import { TesterGetCommand } from './tester-get.command';
import { printError } from '../cli-output';

@Command({
  name: 'tester',
  description: 'Work with testers.',
  subCommands: [TesterListCommand, TesterGetCommand],
})
export class TesterCommand extends CommandRunner {
  // Reached only when `tester` is run with no subcommand.
  run(): Promise<void> {
    printError('specify a subcommand — `tester list` or `tester get <id>`.');
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester list --project 1\n';
  }
}
