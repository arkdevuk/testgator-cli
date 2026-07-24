import { Command, CommandRunner, Help } from 'nest-commander';
import { TagListCommand } from './tag-list.command';
import { TagCreateCommand } from './tag-create.command';
import { TagDeleteCommand } from './tag-delete.command';
import { printError } from '../cli-output';

@Command({
  name: 'tag',
  description:
    "Work with the tester tag catalog (TesterTag — task 23's `tester tag` assigns these to individual testers).",
  subCommands: [TagListCommand, TagCreateCommand, TagDeleteCommand],
})
export class TagCommand extends CommandRunner {
  // Reached only when `tag` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `tag list`, `tag create <id> --label <label>`, or `tag delete <id>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tag list\n';
  }
}
