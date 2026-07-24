import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { TagService } from './tag.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface TagCreateOptions {
  label: string;
}

@SubCommand({
  name: 'create',
  arguments: '<id>',
  argsDescription: { id: 'The tag id — must match [a-z0-9_-]+' },
  description:
    'Create a tag in the catalog. --label is required; the id is rejected ' +
    'client-side before the request if it contains anything outside [a-z0-9_-]+.',
})
export class TagCreateCommand extends CommandRunner {
  constructor(private readonly tagService: TagService) {
    super();
  }

  async run(passedParams: string[], options: TagCreateOptions): Promise<void> {
    const [id] = passedParams;

    try {
      const tag = await this.tagService.create(id, options.label);
      console.log(JSON.stringify(tag));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to create tag.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--label <label>',
    description: 'Display label for the tag (required, max 128 chars).',
    required: true,
  })
  parseLabel(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli tag create vip --label "VIP"\n';
  }
}
