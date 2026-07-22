import { PlanDuplicateService } from './plan-duplicate.service';
import { PlanDuplicateError } from './plan-duplicate.error';
import { ApiClientService } from '../api-client/api-client.service';
import { ApiClientError } from '../api-client/api-client.error';
import { HydraService } from '../hydra/hydra.service';

const releaseRaw = {
  '@context': '/api/contexts/Release',
  '@id': '/api/releases/5',
  '@type': 'Release',
  id: 5,
  name: 'v2.0.0',
  project: '/api/projects/3',
  plans: [],
  description: '',
};

const sourcePlanRaw = {
  '@context': '/api/contexts/TestPlan',
  '@id': '/api/test_plans/12',
  '@type': 'TestPlan',
  id: 12,
  name: 'Sprint 42 regression',
  description: 'Regression pass for sprint 42.',
  state: 'published',
  release: '/api/releases/3',
  // Deliberately reversed vs. natural id order, to prove the service sorts
  // by this instead of by collection order.
  questionsOrder: ['/api/questions/102', '/api/questions/101'],
};

const sourceQuestionsCollectionRaw = {
  '@context': '/api/contexts/Question',
  '@id': '/api/questions',
  '@type': 'Collection',
  totalItems: 2,
  member: [
    {
      '@id': '/api/questions/101',
      '@type': 'Question',
      id: 101,
      name: 'Question A',
      content: 'Content A',
      plan: '/api/test_plans/12',
      displayOrder: 0,
    },
    {
      '@id': '/api/questions/102',
      '@type': 'Question',
      id: 102,
      name: 'Question B',
      content: 'Content B',
      plan: '/api/test_plans/12',
      displayOrder: 1,
    },
  ],
};

const newPlanRaw = {
  '@context': '/api/contexts/TestPlan',
  '@id': '/api/test_plans/99',
  '@type': 'TestPlan',
  id: 99,
  name: 'Sprint 42 regression (copy)',
  description: 'Regression pass for sprint 42.',
  state: 'draft',
  release: '/api/releases/5',
  questionsOrder: [],
};

describe('PlanDuplicateService', () => {
  let apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock };
  let hydra: HydraService;
  let service: PlanDuplicateService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
    hydra = new HydraService();
    service = new PlanDuplicateService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  const baseOptions = {
    project: '3',
    release: '5',
    name: 'Sprint 42 regression (copy)',
    dueDate: '2026-09-01T00:00:00+00:00',
  };

  describe('happy path', () => {
    it('creates the plan, creates every question in questionsOrder order, then sets questionsOrder', async () => {
      apiClient.get
        .mockResolvedValueOnce(releaseRaw)
        .mockResolvedValueOnce(sourcePlanRaw)
        .mockResolvedValueOnce(sourceQuestionsCollectionRaw);
      apiClient.post
        .mockResolvedValueOnce(newPlanRaw)
        .mockResolvedValueOnce({
          '@id': '/api/questions/201',
          id: 201,
          name: 'Question B',
        })
        .mockResolvedValueOnce({
          '@id': '/api/questions/202',
          id: 202,
          name: 'Question A',
        });
      apiClient.patch.mockResolvedValueOnce({});

      const result = await service.duplicate('12', baseOptions);

      // 1. release/project validation
      expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/releases/5');
      // 2. source plan fetch
      expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/test_plans/12');
      // 3. source questions fetch
      expect(apiClient.get).toHaveBeenNthCalledWith(3, '/api/questions', {
        plan: '12',
      });

      // 4. new plan creation
      expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/test_plans', {
        name: 'Sprint 42 regression (copy)',
        description: 'Regression pass for sprint 42.',
        release: '/api/releases/5',
        state: 'draft',
        dueDate: '2026-09-01T00:00:00+00:00',
      });

      // 5. questions created in questionsOrder order (102 = "Question B" first)
      expect(apiClient.post).toHaveBeenNthCalledWith(2, '/api/questions', {
        name: 'Question B',
        content: 'Content B',
        plan: '/api/test_plans/99',
      });
      expect(apiClient.post).toHaveBeenNthCalledWith(3, '/api/questions', {
        name: 'Question A',
        content: 'Content A',
        plan: '/api/test_plans/99',
      });

      // 6. questionsOrder set on the new plan, in the same order
      expect(apiClient.patch).toHaveBeenCalledWith('/api/test_plans/99', {
        questionsOrder: ['/api/questions/201', '/api/questions/202'],
      });

      expect(result).toEqual({
        id: 99,
        name: 'Sprint 42 regression (copy)',
        release: '/api/releases/5',
        questionsCreated: 2,
        questionsTotal: 2,
      });
    });

    it('skips the questionsOrder patch when the source plan has no questions', async () => {
      apiClient.get
        .mockResolvedValueOnce(releaseRaw)
        .mockResolvedValueOnce({ ...sourcePlanRaw, questionsOrder: [] })
        .mockResolvedValueOnce({
          '@context': '/api/contexts/Question',
          '@id': '/api/questions',
          '@type': 'Collection',
          totalItems: 0,
          member: [],
        });
      apiClient.post.mockResolvedValueOnce(newPlanRaw);

      const result = await service.duplicate('12', baseOptions);

      expect(apiClient.post).toHaveBeenCalledTimes(1);
      expect(apiClient.patch).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 99,
        name: 'Sprint 42 regression (copy)',
        release: '/api/releases/5',
        questionsCreated: 0,
        questionsTotal: 0,
      });
    });
  });

  it('rejects with a clear error and makes no further calls when the release does not belong to the given project', async () => {
    apiClient.get.mockResolvedValueOnce(releaseRaw); // project 3

    await expect(
      service.duplicate('12', { ...baseOptions, project: '999' }),
    ).rejects.toMatchObject({
      message: 'Release 5 does not belong to project 999.',
    });

    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('reports partial progress and stops (no questionsOrder patch) when a question fails mid-sequence', async () => {
    apiClient.get
      .mockResolvedValueOnce(releaseRaw)
      .mockResolvedValueOnce(sourcePlanRaw)
      .mockResolvedValueOnce(sourceQuestionsCollectionRaw);
    apiClient.post
      .mockResolvedValueOnce(newPlanRaw)
      .mockResolvedValueOnce({
        '@id': '/api/questions/201',
        id: 201,
        name: 'Question B',
      })
      .mockRejectedValueOnce(new ApiClientError('Name is required.', 422));

    const call = service.duplicate('12', baseOptions);

    await expect(call).rejects.toBeInstanceOf(PlanDuplicateError);
    await expect(call).rejects.toMatchObject({
      newPlanId: 99,
      questionsCreated: 1,
      questionsTotal: 2,
    });
    await call.catch((error: unknown) => {
      expect(error).toBeInstanceOf(PlanDuplicateError);
      expect((error as PlanDuplicateError).message).toContain(
        '1/2 questions were created',
      );
    });

    expect(apiClient.patch).not.toHaveBeenCalled();
  });
});
