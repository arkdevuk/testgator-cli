import { SubCommand, CommandRunner, Help } from 'nest-commander';
import { WebhookService } from './webhook.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

@SubCommand({
  name: 'set-url',
  arguments: '<url>',
  argsDescription: { url: 'The outbound webhook target URL' },
  description:
    'Set the outbound webhook target URL. Requires ROLE_ADMIN — a ' +
    'non-admin login fails with a 403 error (non-zero exit code). The ' +
    'server rejects private/loopback/link-local URLs and non-http(s) ' +
    'schemes (SSRF guard) with a validation error.',
})
export class WebhookSetUrlCommand extends CommandRunner {
  constructor(private readonly webhookService: WebhookService) {
    super();
  }

  async run(passedParams: string[]): Promise<void> {
    const [url] = passedParams;

    try {
      const setting = await this.webhookService.setUrl(url);
      console.log(JSON.stringify(setting));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to set webhook URL.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli webhook set-url https://example.com/hooks/testgator\n';
  }
}
