import { PlanService } from './plan.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import {
  testPlanItemFixture,
  testPlanCollectionFixture,
} from '../../test/fixtures';

describe('PlanService', () => {
  let apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock };
  let hydra: HydraService;
  let service: PlanService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
    hydra = new HydraService();
    service = new PlanService(apiClient as unknown as ApiClientService, hydra);
  });

  describe('list', () => {
    it('fetches the test plans collection with no filters by default, defaulting itemsPerPage to 20', async () => {
      apiClient.get.mockResolvedValueOnce(testPlanCollectionFixture);

      const result = await service.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/test_plans', {
        itemsPerPage: '20',
      });
      expect(result.totalItems).toBe(2);
      expect(result.items[0]).toMatchObject({
        id: 12,
        name: 'Sprint 42 regression',
      });
    });

    it('maps the project filter to the release.project query param', async () => {
      apiClient.get.mockResolvedValueOnce(testPlanCollectionFixture);

      await service.list({ project: '5' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/test_plans', {
        itemsPerPage: '20',
        'release.project': '5',
      });
    });

    it('maps the release filter to the release query param', async () => {
      apiClient.get.mockResolvedValueOnce(testPlanCollectionFixture);

      await service.list({ release: '3' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/test_plans', {
        itemsPerPage: '20',
        release: '3',
      });
    });

    it('combines both filters when both are given', async () => {
      apiClient.get.mockResolvedValueOnce(testPlanCollectionFixture);

      await service.list({ project: '5', release: '3' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/test_plans', {
        itemsPerPage: '20',
        'release.project': '5',
        release: '3',
      });
    });

    it('maps --page and --items-per-page to query params', async () => {
      apiClient.get.mockResolvedValueOnce(testPlanCollectionFixture);

      await service.list({ page: 2, itemsPerPage: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/test_plans', {
        page: '2',
        itemsPerPage: '5',
      });
    });
  });

  describe('get', () => {
    it('fetches a single plan by id and shapes it, keeping state and questionsOrder', async () => {
      apiClient.get.mockResolvedValueOnce(testPlanItemFixture);

      const result = await service.get('12');

      expect(apiClient.get).toHaveBeenCalledWith('/api/test_plans/12');
      expect(result).toMatchObject({
        id: 12,
        state: 'published',
        questionsOrder: ['/api/questions/101', '/api/questions/102'],
      });
      expect(result).not.toHaveProperty('@id');
    });
  });

  describe('create', () => {
    it('posts the plan payload, defaulting description to an empty string', async () => {
      apiClient.post.mockResolvedValueOnce(testPlanItemFixture);

      const result = await service.create({
        release: '3',
        name: 'Sprint 42 regression',
        dueDate: '2026-08-01T00:00:00+00:00',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/test_plans', {
        name: 'Sprint 42 regression',
        release: '/api/releases/3',
        dueDate: '2026-08-01T00:00:00+00:00',
        description: '',
      });
      expect(result).toMatchObject({ id: 12, name: 'Sprint 42 regression' });
      expect(result).not.toHaveProperty('@id');
    });

    it('includes description/state/content when passed', async () => {
      apiClient.post.mockResolvedValueOnce(testPlanItemFixture);

      await service.create({
        release: '3',
        name: 'Sprint 42 regression',
        dueDate: '2026-08-01T00:00:00+00:00',
        description: 'Regression pass.',
        state: 'published',
        content: 'Read the runbook first.',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/test_plans', {
        name: 'Sprint 42 regression',
        release: '/api/releases/3',
        dueDate: '2026-08-01T00:00:00+00:00',
        description: 'Regression pass.',
        state: 'published',
        content: 'Read the runbook first.',
      });
    });

    it('propagates server-side validation errors', async () => {
      apiClient.post.mockRejectedValueOnce(
        new ApiClientError('dueDate: This value should not be null.', 422),
      );

      await expect(
        service.create({ release: '3', name: '', dueDate: '' }),
      ).rejects.toBeInstanceOf(ApiClientError);
    });
  });

  describe('update', () => {
    it('patches only the fields that were passed', async () => {
      apiClient.patch.mockResolvedValueOnce({
        ...testPlanItemFixture,
        name: 'Sprint 42 regression (updated)',
      });

      const result = await service.update('12', {
        name: 'Sprint 42 regression (updated)',
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/test_plans/12', {
        name: 'Sprint 42 regression (updated)',
      });
      expect(result).toMatchObject({
        id: 12,
        name: 'Sprint 42 regression (updated)',
      });
    });

    it('maps a --release edit to the release IRI', async () => {
      apiClient.patch.mockResolvedValueOnce(testPlanItemFixture);

      await service.update('12', { release: '5' });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/test_plans/12', {
        release: '/api/releases/5',
      });
    });

    it('propagates a 404 for a nonexistent plan', async () => {
      apiClient.patch.mockRejectedValueOnce(
        new ApiClientError('Not Found', 404),
      );

      await expect(service.update('999', { name: 'x' })).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
  });
});
