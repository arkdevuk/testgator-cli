import { Command, CommandRunner, Help } from 'nest-commander';
import { ProjectListCommand } from './project-list.command';
import { ProjectGetCommand } from './project-get.command';
import { printError } from '../cli-output';

@Command({
  name: 'project',
  description: 'Work with projects.',
  subCommands: [ProjectListCommand, ProjectGetCommand],
})
export class ProjectCommand extends CommandRunner {
  // Reached only when `project` is run with no subcommand — nest-commander
  // still requires a run() implementation on the parent.
  run(): Promise<void> {
    printError('specify a subcommand — `project list` or `project get <id>`.');
    process.exitCode = 1;
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli project list\n  $ testgator-cli project get 1\n';
  }
}
