import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { ReleaseService } from './release.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'get',
  arguments: '<id>',
  argsDescription: { id: 'The release id' },
  description: 'Get a single release by id, including its plans (IRIs).',
})
export class ReleaseGetCommand extends CommandRunner {
  constructor(private readonly releaseService: ReleaseService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [id] = passedParams;

    try {
      const release = await this.releaseService.get(id);
      console.log(JSON.stringify(release));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to get release.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli release get 3\n';
  }
}
