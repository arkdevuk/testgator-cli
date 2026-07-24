import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { TagService } from './tag.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError, printSuccess } from '../cli-output';

@SubCommand({
  name: 'delete',
  arguments: '<id>',
  argsDescription: { id: 'The tag id to delete' },
  description:
    'Delete a tag from the catalog. This is a SOFT delete server-side ' +
    '(TesterTag.deleted is set to true, the row is not removed) — testers ' +
    'already carrying this tag id keep it.',
})
export class TagDeleteCommand extends CommandRunner {
  constructor(private readonly tagService: TagService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [id] = passedParams;

    try {
      await this.tagService.delete(id);
      printSuccess(`Deleted tag ${id}.`);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to delete tag.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tag delete vip\n';
  }
}
