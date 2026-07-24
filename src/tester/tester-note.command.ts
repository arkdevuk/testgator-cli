import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TesterNoteListCommand } from './tester-note-list.command';
import { TesterNoteAddCommand } from './tester-note-add.command';
import { printError } from '../cli-output';

@SubCommand({
  name: 'note',
  description: 'Work with free-text notes on a tester.',
  subCommands: [TesterNoteListCommand, TesterNoteAddCommand],
})
export class TesterNoteCommand extends CommandRunner {
  // Reached only when `tester note` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `tester note list <testerId>` or `tester note add <testerId> <content>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester note list 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f\n';
  }
}
