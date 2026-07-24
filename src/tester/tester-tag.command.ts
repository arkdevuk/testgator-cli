import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TesterTagAddCommand } from './tester-tag-add.command';
import { TesterTagRemoveCommand } from './tester-tag-remove.command';
import { printError } from '../cli-output';

@SubCommand({
  name: 'tag',
  description: "Manage a tester's tags (User.tags).",
  subCommands: [TesterTagAddCommand, TesterTagRemoveCommand],
})
export class TesterTagCommand extends CommandRunner {
  // Reached only when `tester tag` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `tester tag add <testerId> <tag...>` or `tester tag remove <testerId> <tag...>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tester tag add 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f vip\n';
  }
}
