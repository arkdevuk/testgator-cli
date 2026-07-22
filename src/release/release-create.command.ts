import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { ReleaseService } from './release.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface ReleaseCreateOptions {
  project: string;
  name: string;
  description?: string;
}

@SubCommand({
  name: 'create',
  description: 'Create a release under a project.',
})
export class ReleaseCreateCommand extends CommandRunner {
  constructor(private readonly releaseService: ReleaseService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: ReleaseCreateOptions,
  ): Promise<void> {
    try {
      const release = await this.releaseService.create(options);
      console.log(JSON.stringify(release));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to create release.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--project <id>',
    description: 'The project id the new release belongs to.',
    required: true,
  })
  parseProject(value: string): string {
    return value;
  }

  @Option({
    flags: '--name <name>',
    description: 'Name for the new release.',
    required: true,
  })
  parseName(value: string): string {
    return value;
  }

  @Option({
    flags: '--description <text>',
    description: 'Optional description for the release (defaults to "").',
  })
  parseDescription(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli release create --project 1 --name v1.4.0 --description "Adds the CLI-facing agent workflow."\n';
  }
}
