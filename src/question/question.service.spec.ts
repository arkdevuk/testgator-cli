import { QuestionService } from './question.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import {
  questionItemFixture,
  questionCollectionFixture,
} from '../../test/fixtures';

describe('QuestionService', () => {
  let apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock };
  let hydra: HydraService;
  let service: QuestionService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
    hydra = new HydraService();
    service = new QuestionService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  describe('list', () => {
    it('fetches the questions collection with no filters by default, defaulting itemsPerPage to 20', async () => {
      apiClient.get.mockResolvedValueOnce(questionCollectionFixture);

      const result = await service.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/questions', {
        itemsPerPage: '20',
      });
      expect(result.totalItems).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 101,
        name: 'Can you log in with a valid one-time code?',
      });
    });

    it('maps the plan filter to the plan query param', async () => {
      apiClient.get.mockResolvedValueOnce(questionCollectionFixture);

      await service.list({ plan: '12' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/questions', {
        itemsPerPage: '20',
        plan: '12',
      });
    });

    it('maps --page and --items-per-page to query params', async () => {
      apiClient.get.mockResolvedValueOnce(questionCollectionFixture);

      await service.list({ page: 2, itemsPerPage: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/questions', {
        page: '2',
        itemsPerPage: '5',
      });
    });
  });

  describe('get', () => {
    it('fetches a single question by id and shapes it', async () => {
      apiClient.get.mockResolvedValueOnce(questionItemFixture);

      const result = await service.get('101');

      expect(apiClient.get).toHaveBeenCalledWith('/api/questions/101');
      expect(result).toMatchObject({
        id: 101,
        plan: '/api/test_plans/12',
        displayOrder: 0,
      });
      expect(result).not.toHaveProperty('@id');
    });
  });

  describe('create', () => {
    it('posts the minimal question payload', async () => {
      apiClient.post.mockResolvedValueOnce(questionItemFixture);

      const result = await service.create({
        plan: '12',
        name: 'Can you log in with a valid one-time code?',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/questions', {
        name: 'Can you log in with a valid one-time code?',
        plan: '/api/test_plans/12',
      });
      expect(result).toMatchObject({
        id: 101,
        name: 'Can you log in with a valid one-time code?',
      });
      expect(result).not.toHaveProperty('@id');
    });

    it('includes content/displayOrder when passed', async () => {
      apiClient.post.mockResolvedValueOnce(questionItemFixture);

      await service.create({
        plan: '12',
        name: 'Can you log in with a valid one-time code?',
        content: 'Request a code, enter it, confirm you land on your plan.',
        displayOrder: 3,
      });

      expect(apiClient.post).toHaveBeenCalledWith('/api/questions', {
        name: 'Can you log in with a valid one-time code?',
        plan: '/api/test_plans/12',
        content: 'Request a code, enter it, confirm you land on your plan.',
        displayOrder: 3,
      });
    });

    it('propagates server-side validation errors', async () => {
      apiClient.post.mockRejectedValueOnce(
        new ApiClientError('name: This value should not be blank.', 422),
      );

      await expect(
        service.create({ plan: '12', name: '' }),
      ).rejects.toBeInstanceOf(ApiClientError);
    });
  });

  describe('update', () => {
    it('patches only the fields that were passed', async () => {
      apiClient.patch.mockResolvedValueOnce({
        ...questionItemFixture,
        name: 'Updated question name',
      });

      const result = await service.update('101', {
        name: 'Updated question name',
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/questions/101', {
        name: 'Updated question name',
      });
      expect(result).toMatchObject({ id: 101, name: 'Updated question name' });
    });

    it('maps a --plan edit to the plan IRI', async () => {
      apiClient.patch.mockResolvedValueOnce(questionItemFixture);

      await service.update('101', { plan: '13' });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/questions/101', {
        plan: '/api/test_plans/13',
      });
    });

    it('propagates a 404 for a nonexistent question', async () => {
      apiClient.patch.mockRejectedValueOnce(
        new ApiClientError('Not Found', 404),
      );

      await expect(service.update('999', { name: 'x' })).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
  });
});
