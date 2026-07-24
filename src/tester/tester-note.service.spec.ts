import { TesterNoteService } from './tester-note.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import {
  testerAnnotationItemFixture,
  testerAnnotationCollectionFixture,
} from '../../test/fixtures';

describe('TesterNoteService', () => {
  let apiClient: { get: jest.Mock; post: jest.Mock };
  let hydra: HydraService;
  let service: TesterNoteService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), post: jest.fn() };
    hydra = new HydraService();
    service = new TesterNoteService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  describe('list', () => {
    it('queries relateTo + order[created]=desc, defaulting itemsPerPage to 20, and compacts each item', async () => {
      apiClient.get.mockResolvedValueOnce(testerAnnotationCollectionFixture);

      const testerId = '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f';
      const result = await service.list(testerId);

      expect(apiClient.get).toHaveBeenCalledWith('/api/tester_annotations', {
        itemsPerPage: '20',
        relateTo: `/api/testers/${testerId}`,
        'order[created]': 'desc',
      });
      expect(result.totalItems).toBe(2);
      expect(result.items[0]).toEqual({
        id: '7a3d2b5f-9c4e-4f6b-8a2d-3e4f5a6b7c8d',
        content: 'Reported a bug in checkout flow',
        createdBy: '/api/users/3fae8c1e-2b7a-4b0a-9c3d-9e2f1a6b7c8d',
        created: '2026-07-21T09:00:00+00:00',
      });
      // updated is bookkeeping, not printed.
      expect(result.items[0]).not.toHaveProperty('updated');
    });

    it('maps --page and --items-per-page to query params', async () => {
      apiClient.get.mockResolvedValueOnce(testerAnnotationCollectionFixture);

      await service.list('8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f', {
        page: 2,
        itemsPerPage: 5,
      });

      expect(apiClient.get).toHaveBeenCalledWith('/api/tester_annotations', {
        page: '2',
        itemsPerPage: '5',
        relateTo: '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        'order[created]': 'desc',
      });
    });
  });

  describe('add', () => {
    it('posts relateTo + content and shapes the result', async () => {
      apiClient.post.mockResolvedValueOnce(testerAnnotationItemFixture);

      const testerId = '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f';
      const result = await service.add(testerId, 'Very responsive tester');

      expect(apiClient.post).toHaveBeenCalledWith('/api/tester_annotations', {
        relateTo: `/api/testers/${testerId}`,
        content: 'Very responsive tester',
      });
      expect(result).toMatchObject({ content: 'Very responsive tester' });
      expect(result).not.toHaveProperty('@id');
      // createdBy is server-derived — never sent client-side.
      const [, body] = apiClient.post.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];
      expect(body).not.toHaveProperty('createdBy');
    });

    it('rejects blank content before the request', async () => {
      await expect(
        service.add('8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f', '   '),
      ).rejects.toThrow(ApiClientError);
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });
});
