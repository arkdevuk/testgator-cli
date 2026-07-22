import { WebhookDisableCommand } from './webhook-disable.command';
import { WebhookService } from './webhook.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('WebhookDisableCommand', () => {
  let webhookService: { disable: jest.Mock };
  let command: WebhookDisableCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    webhookService = { disable: jest.fn() };
    command = new WebhookDisableCommand(
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

  it('disables the webhook and prints the setting as compact JSON', async () => {
    webhookService.disable.mockResolvedValueOnce({
      id: 'webhook.enable_webhook',
      value: 'false',
    });

    await command.run();

    expect(webhookService.disable).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 'webhook.enable_webhook', value: 'false' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and a non-zero exit code on a 403 (insufficient permissions)', async () => {
    webhookService.disable.mockRejectedValueOnce(
      new ApiClientError('Access Denied.', 403),
    );

    await command.run();

    expect(errorSpy).toHaveBeenCalledWith('Error: Access Denied.');
    expect(process.exitCode).toBe(1);
  });
});
