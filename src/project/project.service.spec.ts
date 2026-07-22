import { ProjectService } from './project.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import {
  projectItemFixture,
  projectCollectionFixture,
} from '../../test/fixtures';

describe('ProjectService', () => {
  let apiClient: { get: jest.Mock };
  let hydra: HydraService;
  let service: ProjectService;

  beforeEach(() => {
    apiClient = { get: jest.fn() };
    hydra = new HydraService();
    service = new ProjectService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  describe('list', () => {
    it('fetches the projects collection and shapes it, defaulting itemsPerPage to 20', async () => {
      apiClient.get.mockResolvedValueOnce(projectCollectionFixture);

      const result = await service.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/projects', {
        itemsPerPage: '20',
      });
      expect(result.totalItems).toBe(1);
      expect(result.items[0]).toMatchObject({ id: 1, name: 'TestGator' });
      expect(result.items[0]).not.toHaveProperty('@id');
    });

    it('maps --page and --items-per-page to query params', async () => {
      apiClient.get.mockResolvedValueOnce(projectCollectionFixture);

      await service.list({ page: 2, itemsPerPage: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/projects', {
        page: '2',
        itemsPerPage: '5',
      });
    });

    it('strips allTesters but keeps totalTesters', async () => {
      apiClient.get.mockResolvedValueOnce(projectCollectionFixture);

      const result = await service.list();

      expect(result.items[0]).not.toHaveProperty('allTesters');
      expect(result.items[0]).toMatchObject({ totalTesters: 2 });
    });
  });

  describe('get', () => {
    it('fetches a single project by id and shapes it', async () => {
      apiClient.get.mockResolvedValueOnce(projectItemFixture);

      const result = await service.get('1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/projects/1');
      expect(result).toMatchObject({ id: 1, name: 'TestGator' });
      expect(result).not.toHaveProperty('@context');
    });

    it('strips allTesters but keeps totalTesters', async () => {
      apiClient.get.mockResolvedValueOnce(projectItemFixture);

      const result = await service.get('1');

      expect(result).not.toHaveProperty('allTesters');
      expect(result).toMatchObject({ totalTesters: 2 });
    });
  });
});
