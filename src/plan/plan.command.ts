import { Command, CommandRunner, Help } from 'nest-commander';
import { PlanListCommand } from './plan-list.command';
import { PlanGetCommand } from './plan-get.command';
import { PlanCreateCommand } from './plan-create.command';
import { PlanEditCommand } from './plan-edit.command';
import { PlanDuplicateCommand } from './plan-duplicate.command';
import { PlanRemoveTesterCommand } from './plan-remove-tester.command';
import { printError } from '../cli-output';

@Command({
  name: 'plan',
  description: 'Work with test plans.',
  subCommands: [
    PlanListCommand,
    PlanGetCommand,
    PlanCreateCommand,
    PlanEditCommand,
    PlanDuplicateCommand,
    PlanRemoveTesterCommand,
  ],
})
export class PlanCommand extends CommandRunner {
  // Reached only when `plan` is run with no subcommand.
  run(): Promise<void> {
    printError(
      'specify a subcommand — `plan list`, `plan get <id>`, `plan create`, `plan edit <id>`, `plan duplicate <sourceId>`, or `plan remove-tester <planId> <testerId...>`.',
    );
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli plan list --project 1\n';
  }
}
