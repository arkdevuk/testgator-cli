import { InviteService } from './invite.service';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import {
  testerItemFixture,
  testerItemFixture2,
  testerCollectionFixture,
} from '../../test/fixtures';

const emptyTesterCollection = {
  '@context': '/api/contexts/Tester',
  '@id': '/api/testers',
  '@type': 'Collection',
  totalItems: 0,
  member: [],
};

describe('InviteService', () => {
  let apiClient: { get: jest.Mock; post: jest.Mock; patch: jest.Mock };
  let hydra: HydraService;
  let service: InviteService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
    hydra = new HydraService();
    service = new InviteService(
      apiClient as unknown as ApiClientService,
      hydra,
    );
  });

  describe('invite', () => {
    it('creates a new tester when no exact email match exists', async () => {
      apiClient.get.mockResolvedValueOnce(emptyTesterCollection);
      apiClient.post.mockResolvedValueOnce(testerItemFixture);

      const result = await service.invite('tester@example.com');

      expect(apiClient.get).toHaveBeenCalledWith('/api/testers', {
        email: 'tester@example.com',
      });
      expect(apiClient.post).toHaveBeenCalledWith('/api/testers', {
        email: 'tester@example.com',
      });
      expect(result).toEqual({
        email: 'tester@example.com',
        testerId: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        created: true,
      });
    });

    it('reuses an existing tester on an exact email match (no POST)', async () => {
      apiClient.get.mockResolvedValueOnce(testerCollectionFixture);

      const result = await service.invite('tester@example.com');

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(result).toEqual({
        email: 'tester@example.com',
        testerId: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        created: false,
      });
    });

    it('ignores a partial-match false positive and creates a new tester', async () => {
      // email SearchFilter is `partial`, not `exact` — a substring match on
      // an unrelated tester must not be treated as "already invited".
      apiClient.get.mockResolvedValueOnce({
        ...emptyTesterCollection,
        totalItems: 1,
        member: [testerItemFixture2],
      });
      apiClient.post.mockResolvedValueOnce(testerItemFixture);

      const result = await service.invite('tester@example.com');

      expect(apiClient.post).toHaveBeenCalled();
      expect(result.created).toBe(true);
    });

    it('propagates a validation error from tester creation', async () => {
      apiClient.get.mockResolvedValueOnce(emptyTesterCollection);
      apiClient.post.mockRejectedValueOnce(
        new ApiClientError('email: This value is not a valid email.', 422),
      );

      await expect(service.invite('not-an-email')).rejects.toBeInstanceOf(
        ApiClientError,
      );
    });
  });

  describe('inviteMany', () => {
    it('invites every email and reports each as a successful outcome', async () => {
      apiClient.get
        .mockResolvedValueOnce(emptyTesterCollection)
        .mockResolvedValueOnce(emptyTesterCollection);
      apiClient.post
        .mockResolvedValueOnce(testerItemFixture)
        .mockResolvedValueOnce(testerItemFixture2);

      const outcomes = await service.inviteMany([
        'tester@example.com',
        'other-tester@example.com',
      ]);

      expect(outcomes).toEqual([
        {
          email: 'tester@example.com',
          success: true,
          result: {
            email: 'tester@example.com',
            testerId: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
            created: true,
          },
        },
        {
          email: 'other-tester@example.com',
          success: true,
          result: {
            email: 'other-tester@example.com',
            testerId: '2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10',
            created: true,
          },
        },
      ]);
    });

    it('continues past an individual failure and reports it in that outcome', async () => {
      apiClient.get
        .mockResolvedValueOnce(emptyTesterCollection)
        .mockResolvedValueOnce(emptyTesterCollection);
      apiClient.post
        .mockRejectedValueOnce(new ApiClientError('Invalid email.', 422))
        .mockResolvedValueOnce(testerItemFixture2);

      const outcomes = await service.inviteMany(['bad', 'good@example.com']);

      expect(outcomes[0]).toEqual({
        email: 'bad',
        success: false,
        error: 'Invalid email.',
      });
      expect(outcomes[1].success).toBe(true);
    });
  });

  describe('inviteToTestPlan', () => {
    it('invites and enrolls a new tester on the plan', async () => {
      apiClient.get
        .mockResolvedValueOnce(emptyTesterCollection) // tester lookup
        .mockResolvedValueOnce({
          // plan lookup
          '@id': '/api/test_plans/12',
          id: 12,
          testersEnrolled: [
            '/api/testers/2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10',
          ],
        });
      apiClient.post.mockResolvedValueOnce(testerItemFixture);

      const result = await service.inviteToTestPlan('tester@example.com', '12');

      expect(apiClient.patch).toHaveBeenCalledWith('/api/test_plans/12', {
        testersEnrolled: [
          '/api/testers/2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10',
          '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        ],
      });
      expect(result).toEqual({
        email: 'tester@example.com',
        testerId: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        created: true,
        alreadyEnrolled: false,
      });
    });

    it('is a no-op PATCH when the tester is already enrolled', async () => {
      apiClient.get
        .mockResolvedValueOnce(testerCollectionFixture) // tester already exists
        .mockResolvedValueOnce({
          '@id': '/api/test_plans/12',
          id: 12,
          testersEnrolled: [
            '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
          ],
        });

      const result = await service.inviteToTestPlan('tester@example.com', '12');

      expect(apiClient.patch).not.toHaveBeenCalled();
      expect(result).toEqual({
        email: 'tester@example.com',
        testerId: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        created: false,
        alreadyEnrolled: true,
      });
    });

    it('propagates a 404 for a nonexistent test plan', async () => {
      apiClient.get
        .mockResolvedValueOnce(emptyTesterCollection)
        .mockRejectedValueOnce(new ApiClientError('Not Found', 404));
      apiClient.post.mockResolvedValueOnce(testerItemFixture);

      await expect(
        service.inviteToTestPlan('tester@example.com', '999'),
      ).rejects.toBeInstanceOf(ApiClientError);
    });
  });

  describe('inviteManyToTestPlan', () => {
    it('fetches the plan once and issues a single PATCH for all new enrollments', async () => {
      apiClient.get
        .mockResolvedValueOnce({
          // plan lookup (fetched once, up front)
          '@id': '/api/test_plans/12',
          id: 12,
          testersEnrolled: [],
        })
        .mockResolvedValueOnce(emptyTesterCollection) // tester 1 lookup
        .mockResolvedValueOnce(emptyTesterCollection); // tester 2 lookup
      apiClient.post
        .mockResolvedValueOnce(testerItemFixture)
        .mockResolvedValueOnce(testerItemFixture2);

      const outcomes = await service.inviteManyToTestPlan(
        ['tester@example.com', 'other-tester@example.com'],
        '12',
      );

      expect(apiClient.get).toHaveBeenCalledTimes(3);
      expect(apiClient.patch).toHaveBeenCalledTimes(1);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/test_plans/12', {
        testersEnrolled: [
          '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
          '/api/testers/2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10',
        ],
      });
      expect(outcomes.every((outcome) => outcome.success)).toBe(true);
      expect(
        outcomes.every((outcome) => outcome.result?.alreadyEnrolled === false),
      ).toBe(true);
    });

    it('skips the PATCH entirely when everyone is already enrolled', async () => {
      apiClient.get
        .mockResolvedValueOnce({
          '@id': '/api/test_plans/12',
          id: 12,
          testersEnrolled: [
            '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
          ],
        })
        .mockResolvedValueOnce(testerCollectionFixture);

      const outcomes = await service.inviteManyToTestPlan(
        ['tester@example.com'],
        '12',
      );

      expect(apiClient.patch).not.toHaveBeenCalled();
      expect(outcomes[0].result?.alreadyEnrolled).toBe(true);
    });

    it('continues past an individual failure and still enrolls the rest', async () => {
      apiClient.get
        .mockResolvedValueOnce({
          '@id': '/api/test_plans/12',
          id: 12,
          testersEnrolled: [],
        })
        .mockResolvedValueOnce(emptyTesterCollection)
        .mockResolvedValueOnce(emptyTesterCollection);
      apiClient.post
        .mockRejectedValueOnce(new ApiClientError('Invalid email.', 422))
        .mockResolvedValueOnce(testerItemFixture2);

      const outcomes = await service.inviteManyToTestPlan(
        ['bad', 'good@example.com'],
        '12',
      );

      expect(outcomes[0]).toEqual({
        email: 'bad',
        success: false,
        error: 'Invalid email.',
      });
      expect(outcomes[1].success).toBe(true);
      expect(apiClient.patch).toHaveBeenCalledWith('/api/test_plans/12', {
        testersEnrolled: ['/api/testers/2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10'],
      });
    });
  });
});
