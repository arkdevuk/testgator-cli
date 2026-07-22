import { WebhookSetUrlCommand } from './webhook-set-url.command';
import { WebhookService } from './webhook.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('WebhookSetUrlCommand', () => {
  let webhookService: { setUrl: jest.Mock };
  let command: WebhookSetUrlCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    webhookService = { setUrl: jest.fn() };
    command = new WebhookSetUrlCommand(
      webhookService as unknown as WebhookService,
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('sets the webhook URL and prints the setting as compact JSON', async () => {
    webhookService.setUrl.mockResolvedValueOnce({
      id: 'webhook.webhook_url',
      value: 'https://example.test/hook',
    });

    await command.run(['https://example.test/hook']);

    expect(webhookService.setUrl).toHaveBeenCalledWith(
      'https://example.test/hook',
    );
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        id: 'webhook.webhook_url',
        value: 'https://example.test/hook',
      }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and a non-zero exit code on an SSRF-rejected URL', async () => {
    webhookService.setUrl.mockRejectedValueOnce(
      new ApiClientError('value: This URL is not allowed.', 422),
    );

    await command.run(['http://169.254.169.254/']);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: value: This URL is not allowed.',
    );
    expect(process.exitCode).toBe(1);
  });
});
