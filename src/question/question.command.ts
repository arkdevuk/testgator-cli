import { Command, CommandRunner, Help } from 'nest-commander';
import { QuestionListCommand } from './question-list.command';
import { QuestionGetCommand } from './question-get.command';
import { QuestionCreateCommand } from './question-create.command';
import { QuestionEditCommand } from './question-edit.command';
import { printError } from '../cli-output';

@Command({
  name: 'question',
  description: 'Work with questions.',
  subCommands: [
    QuestionListCommand,
    QuestionGetCommand,
    QuestionCreateCommand,
    QuestionEditCommand,
  ],
})
export class QuestionCommand extends CommandRunner {
  // Reached only when `question` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `question list`, `question get <id>`, `question create`, or `question edit <id>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli question list --plan 12\n';
  }
}
