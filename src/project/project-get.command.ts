import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { ProjectService } from './project.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'get',
  arguments: '<id>',
  argsDescription: { id: 'The project id' },
  description:
    'Get a single project by id. Omits allTesters (a bulky IRI array); ' +
    'totalTesters (a plain count) is kept — use `tester list --project <id>` ' +
    'for the roster.',
})
export class ProjectGetCommand extends CommandRunner {
  constructor(private readonly projectService: ProjectService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [id] = passedParams;

    try {
      const project = await this.projectService.get(id);
      console.log(JSON.stringify(project));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to get project.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli project get 1\n';
  }
}
