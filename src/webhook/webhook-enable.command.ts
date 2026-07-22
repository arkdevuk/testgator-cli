import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { WebhookService } from './webhook.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'enable',
  description:
    'Enable outbound webhooks. Requires ROLE_ADMIN — a non-admin login ' +
    'fails with a 403 error (non-zero exit code).',
})
export class WebhookEnableCommand extends CommandRunner {
  constructor(private readonly webhookService: WebhookService) {
    super();
  }

  async run(): Promise<void> {
    try {
      const setting = await this.webhookService.enable();
      console.log(JSON.stringify(setting));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to enable webhook.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli webhook enable\n';
  }
}
