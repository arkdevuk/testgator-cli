import { TagService } from './tag.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import { tagItemFixture, tagCollectionFixture } from '../../test/fixtures';

describe('TagService', () => {
  let apiClient: { get: jest.Mock; post: jest.Mock; delete: jest.Mock };
  let hydra: HydraService;
  let service: TagService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), post: jest.fn(), delete: jest.fn() };
    hydra = new HydraService();
    service = new TagService(apiClient as unknown as ApiClientService, hydra);
  });

  describe('list', () => {
    it('fetches the catalog, defaulting itemsPerPage to 20, and compacts each item', async () => {
      apiClient.get.mockResolvedValueOnce(tagCollectionFixture);

      const result = await service.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/tester_tags', {
        itemsPerPage: '20',
      });
      expect(result.totalItems).toBe(2);
      expect(result.items).toEqual([
        { id: 'vip', label: 'VIP', deleted: false },
        { id: 'mobile', label: 'Mobile', deleted: false },
      ]);
      // createdBy/created/updated are dev-team bookkeeping, not printed.
      expect(result.items[0]).not.toHaveProperty('createdBy');
      expect(result.items[0]).not.toHaveProperty('created');
    });

    it('maps --search to the label query param', async () => {
      apiClient.get.mockResolvedValueOnce(tagCollectionFixture);

      await service.list({ search: 'vi' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/tester_tags', {
        itemsPerPage: '20',
        label: 'vi',
      });
    });

    it('maps --page and --items-per-page to query params', async () => {
      apiClient.get.mockResolvedValueOnce(tagCollectionFixture);

      await service.list({ page: 2, itemsPerPage: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/tester_tags', {
        page: '2',
        itemsPerPage: '5',
      });
    });
  });

  describe('create', () => {
    it('creates a tag and shapes the result', async () => {
      apiClient.post.mockResolvedValueOnce(tagItemFixture);

      const result = await service.create('vip', 'VIP');

      expect(apiClient.post).toHaveBeenCalledWith('/api/tester_tags', {
        id: 'vip',
        label: 'VIP',
      });
      expect(result).toMatchObject({ id: 'vip', label: 'VIP' });
      expect(result).not.toHaveProperty('@id');
    });

    it('rejects an id with characters outside [a-z0-9_-]+ before the request', async () => {
      await expect(service.create('Not Valid!', 'VIP')).rejects.toThrow(
        ApiClientError,
      );
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('sends a DELETE to the tag id', async () => {
      apiClient.delete.mockResolvedValueOnce(undefined);

      await service.delete('vip');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/tester_tags/vip');
    });
  });
});
