import { WebhookEnableCommand } from './webhook-enable.command';
import { WebhookService } from './webhook.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('WebhookEnableCommand', () => {
  let webhookService: { enable: jest.Mock };
  let command: WebhookEnableCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    webhookService = { enable: jest.fn() };
    command = new WebhookEnableCommand(
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

  it('enables the webhook and prints the setting as compact JSON', async () => {
    webhookService.enable.mockResolvedValueOnce({
      id: 'webhook.enable_webhook',
      value: 'true',
    });

    await command.run();

    expect(webhookService.enable).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 'webhook.enable_webhook', value: 'true' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and a non-zero exit code on a 403 (insufficient permissions)', async () => {
    webhookService.enable.mockRejectedValueOnce(
      new ApiClientError('Access Denied.', 403),
    );

    await command.run();

    expect(errorSpy).toHaveBeenCalledWith('Error: Access Denied.');
    expect(process.exitCode).toBe(1);
  });
});
