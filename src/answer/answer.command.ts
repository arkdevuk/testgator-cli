import { Command, CommandRunner, Help } from 'nest-commander';
import { AnswerListCommand } from './answer-list.command';
import { AnswerGetCommand } from './answer-get.command';
import { AnswerEditCommand } from './answer-edit.command';
import { AnswerDeleteCommand } from './answer-delete.command';
import { printError } from '../cli-output';

@Command({
  name: 'answer',
  description: 'Work with answers.',
  subCommands: [
    AnswerListCommand,
    AnswerGetCommand,
    AnswerEditCommand,
    AnswerDeleteCommand,
  ],
})
export class AnswerCommand extends CommandRunner {
  // Reached only when `answer` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `answer list`, `answer get <id>`, `answer edit <id>`, or `answer delete <id>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli answer list --plan 12 --state failed\n';
  }
}
