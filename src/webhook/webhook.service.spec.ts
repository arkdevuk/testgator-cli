import { WebhookService } from './webhook.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('WebhookService', () => {
  let apiClient: { patch: jest.Mock; post: jest.Mock };
  let hydra: HydraService;
  let service: WebhookService;

  beforeEach(() => {
    apiClient = { patch: jest.fn(), post: jest.fn() };
    hydra = new HydraService();
    service = new WebhookService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  describe('enable', () => {
    it('PATCHes enable_webhook to "true" when the row already exists', async () => {
      apiClient.patch.mockResolvedValueOnce({
        '@id': '/api/settings/webhook.enable_webhook',
        id: 'webhook.enable_webhook',
        section: 'webhook',
        name: 'enable_webhook',
        value: 'true',
      });

      const result = await service.enable();

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/settings/webhook.enable_webhook',
        { value: 'true' },
      );
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'webhook.enable_webhook',
        value: 'true',
      });
    });

    it('falls back to POST when the row does not exist yet (PATCH 404s)', async () => {
      apiClient.patch.mockRejectedValueOnce(
        new ApiClientError('Not Found', 404),
      );
      apiClient.post.mockResolvedValueOnce({
        '@id': '/api/settings/webhook.enable_webhook',
        id: 'webhook.enable_webhook',
        section: 'webhook',
        name: 'enable_webhook',
        value: 'true',
      });

      const result = await service.enable();

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/settings/webhook.enable_webhook',
        { value: 'true' },
      );
      expect(apiClient.post).toHaveBeenCalledWith('/api/settings', {
        section: 'webhook',
        name: 'enable_webhook',
        value: 'true',
        autoload: false,
        public: false,
      });
      expect(result).toMatchObject({ value: 'true' });
    });

    it('propagates a 403 (insufficient permissions) without retrying or falling back', async () => {
      apiClient.patch.mockRejectedValueOnce(
        new ApiClientError('Access Denied.', 403),
      );

      await expect(service.enable()).rejects.toBeInstanceOf(ApiClientError);
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('disable', () => {
    it('PATCHes enable_webhook to "false"', async () => {
      apiClient.patch.mockResolvedValueOnce({
        id: 'webhook.enable_webhook',
        value: 'false',
      });

      await service.disable();

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/settings/webhook.enable_webhook',
        { value: 'false' },
      );
    });
  });

  describe('setUrl', () => {
    it('PATCHes webhook_url to the given value', async () => {
      apiClient.patch.mockResolvedValueOnce({
        id: 'webhook.webhook_url',
        value: 'https://example.test/hook',
      });

      const result = await service.setUrl('https://example.test/hook');

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/settings/webhook.webhook_url',
        { value: 'https://example.test/hook' },
      );
      expect(result).toMatchObject({ value: 'https://example.test/hook' });
    });

    it('falls back to POST for webhook_url when the row does not exist yet', async () => {
      apiClient.patch.mockRejectedValueOnce(
        new ApiClientError('Not Found', 404),
      );
      apiClient.post.mockResolvedValueOnce({
        id: 'webhook.webhook_url',
        value: 'https://example.test/hook',
      });

      await service.setUrl('https://example.test/hook');

      expect(apiClient.post).toHaveBeenCalledWith('/api/settings', {
        section: 'webhook',
        name: 'webhook_url',
        value: 'https://example.test/hook',
        autoload: false,
        public: false,
      });
    });

    it('propagates a server-side SafeUrl validation error', async () => {
      apiClient.patch.mockRejectedValueOnce(
        new ApiClientError('value: This URL is not allowed.', 422),
      );

      await expect(
        service.setUrl('http://169.254.169.254/'),
      ).rejects.toBeInstanceOf(ApiClientError);
    });
  });
});
