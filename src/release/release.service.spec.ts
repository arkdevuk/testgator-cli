import { ReleaseService } from './release.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import {
  releaseItemFixture,
  releaseCollectionFixture,
} from '../../test/fixtures';

describe('ReleaseService', () => {
  let apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock };
  let hydra: HydraService;
  let service: ReleaseService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
    hydra = new HydraService();
    service = new ReleaseService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  describe('list', () => {
    it('fetches the releases collection with no filters by default, defaulting itemsPerPage to 20', async () => {
      apiClient.get.mockResolvedValueOnce(releaseCollectionFixture);

      const result = await service.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/releases', {
        itemsPerPage: '20',
      });
      expect(result.totalItems).toBe(1);
      expect(result.items[0]).toMatchObject({ id: 3, name: 'v1.4.0' });
    });

    it('maps the project filter to the project query param', async () => {
      apiClient.get.mockResolvedValueOnce(releaseCollectionFixture);

      await service.list({ project: '1' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/releases', {
        itemsPerPage: '20',
        project: '1',
      });
    });

    it('maps --page and --items-per-page to query params', async () => {
      apiClient.get.mockResolvedValueOnce(releaseCollectionFixture);

      await service.list({ project: '1', page: 2, itemsPerPage: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/releases', {
        page: '2',
        itemsPerPage: '5',
        project: '1',
      });
    });
  });

  describe('get', () => {
    it('fetches a single release by id and shapes it', async () => {
      apiClient.get.mockResolvedValueOnce(releaseItemFixture);

      const result = await service.get('3');

      expect(apiClient.get).toHaveBeenCalledWith('/api/releases/3');
      expect(result).toMatchObject({ id: 3, name: 'v1.4.0' });
      expect(result).not.toHaveProperty('@id');
    });

    it('propagates a 404 for a nonexistent release', async () => {
      apiClient.get.mockRejectedValueOnce(new ApiClientError('Not Found', 404));

      await expect(service.get('999')).rejects.toBeInstanceOf(ApiClientError);
    });
  });

  describe('create', () => {
    it('posts the release payload and shapes the result', async () => {
      apiClient.post.mockResolvedValueOnce(releaseItemFixture);

      const result = await service.create({
        project: '1',
        name: 'v1.4.0',
        description: 'Adds the CLI-facing agent workflow.',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/releases', {
        name: 'v1.4.0',
        project: '/api/projects/1',
        description: 'Adds the CLI-facing agent workflow.',
      });
      expect(result).toMatchObject({ id: 3, name: 'v1.4.0' });
      expect(result).not.toHaveProperty('@id');
    });

    it('omits description from the payload when not provided', async () => {
      apiClient.post.mockResolvedValueOnce(releaseItemFixture);

      await service.create({ project: '1', name: 'v1.4.0' });

      expect(apiClient.post).toHaveBeenCalledWith('/api/releases', {
        name: 'v1.4.0',
        project: '/api/projects/1',
      });
    });

    it('propagates server-side validation errors', async () => {
      apiClient.post.mockRejectedValueOnce(
        new ApiClientError('name: This value should not be blank.', 422),
      );

      await expect(
        service.create({ project: '1', name: '' }),
      ).rejects.toBeInstanceOf(ApiClientError);
    });
  });

  describe('edit', () => {
    it('patches only the fields that were passed', async () => {
      apiClient.patch.mockResolvedValueOnce({
        ...releaseItemFixture,
        name: 'v1.4.1',
      });

      const result = await service.edit('3', { name: 'v1.4.1' });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/releases/3', {
        name: 'v1.4.1',
      });
      expect(result).toMatchObject({ id: 3, name: 'v1.4.1' });
      expect(result).not.toHaveProperty('@context');
    });

    it('maps a --project edit to the project IRI', async () => {
      apiClient.patch.mockResolvedValueOnce(releaseItemFixture);

      await service.edit('3', { project: '2' });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/releases/3', {
        project: '/api/projects/2',
      });
    });

    it('propagates a 404 for a nonexistent release', async () => {
      apiClient.patch.mockRejectedValueOnce(
        new ApiClientError('Not Found', 404),
      );

      await expect(service.edit('999', { name: 'x' })).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
  });
});
