import { AnswerService } from './answer.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import {
  answerItemFixture,
  answerCollectionFixture,
} from '../../test/fixtures';

describe('AnswerService', () => {
  let apiClient: { get: jest.Mock; patch: jest.Mock; delete: jest.Mock };
  let hydra: HydraService;
  let service: AnswerService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), patch: jest.fn(), delete: jest.fn() };
    hydra = new HydraService();
    service = new AnswerService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  describe('list', () => {
    it('fetches the answers collection with no filters by default, defaulting itemsPerPage to 20', async () => {
      apiClient.get.mockResolvedValueOnce(answerCollectionFixture);

      const result = await service.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/answers', {
        itemsPerPage: '20',
      });
      expect(result.totalItems).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 501,
        state: 'pass_with_bugs',
      });
    });

    it('maps the question filter to the question query param', async () => {
      apiClient.get.mockResolvedValueOnce(answerCollectionFixture);

      await service.list({ question: '101' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/answers', {
        itemsPerPage: '20',
        question: '101',
      });
    });

    it('maps the plan filter to the question.plan query param', async () => {
      apiClient.get.mockResolvedValueOnce(answerCollectionFixture);

      await service.list({ plan: '12' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/answers', {
        itemsPerPage: '20',
        'question.plan': '12',
      });
    });

    it('maps the state filter to the state query param', async () => {
      apiClient.get.mockResolvedValueOnce(answerCollectionFixture);

      await service.list({ state: 'failed' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/answers', {
        itemsPerPage: '20',
        state: 'failed',
      });
    });

    it('combines all filters when given together', async () => {
      apiClient.get.mockResolvedValueOnce(answerCollectionFixture);

      await service.list({ question: '101', plan: '12', state: 'failed' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/answers', {
        itemsPerPage: '20',
        question: '101',
        'question.plan': '12',
        state: 'failed',
      });
    });

    it('maps --page and --items-per-page to query params', async () => {
      apiClient.get.mockResolvedValueOnce(answerCollectionFixture);

      await service.list({ page: 2, itemsPerPage: 5 });

      expect(apiClient.get).toHaveBeenCalledWith('/api/answers', {
        page: '2',
        itemsPerPage: '5',
      });
    });
  });

  describe('get', () => {
    it('fetches a single answer by id and shapes it, keeping comment/systemInfos/files', async () => {
      apiClient.get.mockResolvedValueOnce(answerItemFixture);

      const result = await service.get('501');

      expect(apiClient.get).toHaveBeenCalledWith('/api/answers/501');
      expect(result).toMatchObject({
        id: 501,
        comment:
          'Login works, but the OTP field auto-focus is flaky on Safari.',
        files: ['/api/files/3f9c2b1e-4a5d-4c8e-9f1a-2b3c4d5e6f70'],
      });
      expect(result.systemInfos).toMatchObject({ os: 'iOS' });
      expect(result).not.toHaveProperty('@id');
    });
  });

  describe('update', () => {
    it('patches only the fields that were passed', async () => {
      apiClient.patch.mockResolvedValueOnce({
        ...answerItemFixture,
        state: 'failed',
      });

      const result = await service.update('501', { state: 'failed' });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/answers/501', {
        state: 'failed',
      });
      expect(result).toMatchObject({ id: 501, state: 'failed' });
    });

    it('sends comment/important/ignored together when all are passed', async () => {
      apiClient.patch.mockResolvedValueOnce(answerItemFixture);

      await service.update('501', {
        comment: 'Re-tested — reproduces every time.',
        important: true,
        ignored: false,
      });

      expect(apiClient.patch).toHaveBeenCalledWith('/api/answers/501', {
        comment: 'Re-tested — reproduces every time.',
        important: true,
        ignored: false,
      });
    });

    it('sends an empty payload when no fields are passed', async () => {
      apiClient.patch.mockResolvedValueOnce(answerItemFixture);

      await service.update('501', {});

      expect(apiClient.patch).toHaveBeenCalledWith('/api/answers/501', {});
    });

    it('propagates a 404 for a nonexistent answer', async () => {
      apiClient.patch.mockRejectedValueOnce(
        new ApiClientError('Not Found', 404),
      );

      await expect(
        service.update('999', { state: 'failed' }),
      ).rejects.toBeInstanceOf(ApiClientError);
    });
  });

  describe('delete', () => {
    it('deletes an answer by id', async () => {
      apiClient.delete.mockResolvedValueOnce(undefined);

      await service.delete('501');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/answers/501');
    });

    it('propagates a 404 for a nonexistent answer', async () => {
      apiClient.delete.mockRejectedValueOnce(
        new ApiClientError('Not Found', 404),
      );

      await expect(service.delete('999')).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
  });
});
