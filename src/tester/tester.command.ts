import { Command, CommandRunner, Help } from 'nest-commander';
import { TesterListCommand } from './tester-list.command';
import { TesterGetCommand } from './tester-get.command';
import { TesterTagCommand } from './tester-tag.command';
import { TesterNoteCommand } from './tester-note.command';
import { TesterDisableCommand } from './tester-disable.command';
import { TesterEnableCommand } from './tester-enable.command';
import { printError } from '../cli-output';

@Command({
  name: 'tester',
  description: 'Work with testers.',
  subCommands: [
    TesterListCommand,
    TesterGetCommand,
    TesterTagCommand,
    TesterNoteCommand,
    TesterDisableCommand,
    TesterEnableCommand,
  ],
})
export class TesterCommand extends CommandRunner {
  // Reached only when `tester` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `tester list`, `tester get <id>`, `tester tag add|remove <testerId> <tag...>`, `tester note list|add <testerId> ...`, or `tester disable|enable <testerId>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester list --project 1\n';
  }
}
