import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { ReleaseService } from './release.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface ReleaseEditOptions {
  name?: string;
  project?: string;
  description?: string;
}

@SubCommand({
  name: 'edit',
  arguments: '<id>',
  argsDescription: { id: 'The release id to edit' },
  description:
    'Edit a release. Only the fields you pass are updated (PATCH, merge semantics).',
})
export class ReleaseEditCommand extends CommandRunner {
  constructor(private readonly releaseService: ReleaseService) {
    super();
  }

  async run(
    passedParams: string[],
    options: ReleaseEditOptions,
  ): Promise<void> {
    const [id] = passedParams;

    try {
      const release = await this.releaseService.edit(id, options);
      console.log(JSON.stringify(release));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to edit release.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--name <name>',
    description: 'New name for the release.',
  })
  parseName(value: string): string {
    return value;
  }

  @Option({
    flags: '--project <id>',
    description: 'Move the release to this project id.',
  })
  parseProject(value: string): string {
    return value;
  }

  @Option({
    flags: '--description <text>',
    description: 'New description for the release.',
  })
  parseDescription(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli release edit 3 --name v1.4.1\n';
  }
}
