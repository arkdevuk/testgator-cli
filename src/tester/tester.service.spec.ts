import { TesterService } from './tester.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import {
  testerItemFixture,
  testerCollectionFixture,
} from '../../test/fixtures';

describe('TesterService', () => {
  let apiClient: { get: jest.Mock };
  let hydra: HydraService;
  let service: TesterService;

  beforeEach(() => {
    apiClient = { get: jest.fn() };
    hydra = new HydraService();
    service = new TesterService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  describe('list', () => {
    it('fetches the testers collection, defaulting itemsPerPage to 20', async () => {
      apiClient.get.mockResolvedValueOnce(testerCollectionFixture);

      const result = await service.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/testers', {
        itemsPerPage: '20',
      });
      expect(result.totalItems).toBe(2);
      expect(result.items.map((i) => i.email)).toEqual([
        'tester@example.com',
        'other-tester@example.com',
      ]);
    });

    it('filters client-side by the resolved id in each project IRI', async () => {
      apiClient.get.mockResolvedValueOnce(testerCollectionFixture);

      const result = await service.list({ project: '2' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/testers', {
        itemsPerPage: '20',
      });
      expect(result.totalItems).toBe(1);
      expect(result.items[0]).toMatchObject({
        email: 'other-tester@example.com',
      });
    });

    it('returns an empty result when no tester matches the project filter', async () => {
      apiClient.get.mockResolvedValueOnce(testerCollectionFixture);

      const result = await service.list({ project: '999' });

      expect(result).toEqual({ items: [], totalItems: 0 });
    });

    it('maps --page and --items-per-page to query params sent to the server', async () => {
      apiClient.get.mockResolvedValueOnce(testerCollectionFixture);

      await service.list({ page: 2, itemsPerPage: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/testers', {
        page: '2',
        itemsPerPage: '5',
      });
    });
  });

  describe('get', () => {
    it('fetches a single tester by UUID id and shapes it', async () => {
      apiClient.get.mockResolvedValueOnce(testerItemFixture);

      const result = await service.get('8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f');

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      );
      expect(result).toMatchObject({
        id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        email: 'tester@example.com',
      });
      expect(result).not.toHaveProperty('@id');
    });
  });
});
