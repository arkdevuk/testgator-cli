import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

const API_URL = 'https://testgator.example.test';

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
  questionsOrder: ['/api/questions/101', '/api/questions/102'],
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

describe('plan duplicate (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'testgator-cli-plan-duplicate-'),
    );
    fs.writeFileSync(path.join(tempDir, 'token'), 'a-cached-jwt');
    process.env.TESTGATOR_API_URL = API_URL;
    process.env.TESTGATOR_CONFIG_DIR = tempDir;
    process.exitCode = undefined;
    nock.cleanAll();
  });

  afterEach(() => {
    delete process.env.TESTGATOR_API_URL;
    delete process.env.TESTGATOR_CONFIG_DIR;
    process.exitCode = undefined;
    fs.rmSync(tempDir, { recursive: true, force: true });
    nock.cleanAll();
  });

  it('runs the full create-plan → create-questions → set-questionsOrder sequence in order', async () => {
    const scope = nock(API_URL)
      .get('/api/releases/5')
      .reply(200, releaseRaw)
      .get('/api/test_plans/12')
      .reply(200, sourcePlanRaw)
      .get('/api/questions')
      .query({ plan: '12' })
      .reply(200, sourceQuestionsCollectionRaw)
      .post('/api/test_plans', {
        name: 'Sprint 42 regression (copy)',
        description: 'Regression pass for sprint 42.',
        release: '/api/releases/5',
        state: 'draft',
        dueDate: '2026-09-01T00:00:00+00:00',
      })
      .reply(201, newPlanRaw)
      .post('/api/questions', {
        name: 'Question A',
        content: 'Content A',
        plan: '/api/test_plans/99',
      })
      .reply(201, { '@id': '/api/questions/201', id: 201, name: 'Question A' })
      .post('/api/questions', {
        name: 'Question B',
        content: 'Content B',
        plan: '/api/test_plans/99',
      })
      .reply(201, { '@id': '/api/questions/202', id: 202, name: 'Question B' })
      .patch('/api/test_plans/99', {
        questionsOrder: ['/api/questions/201', '/api/questions/202'],
      })
      .reply(200, {
        ...newPlanRaw,
        questionsOrder: ['/api/questions/201', '/api/questions/202'],
      });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'duplicate',
      '12',
      '--project',
      '3',
      '--release',
      '5',
      '--name',
      'Sprint 42 regression (copy)',
      '--due-date',
      '2026-09-01T00:00:00+00:00',
    ]);

    expect(scope.isDone()).toBe(true);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toEqual({
      id: 99,
      name: 'Sprint 42 regression (copy)',
      release: '/api/releases/5',
      questionsCreated: 2,
      questionsTotal: 2,
    });

    logSpy.mockRestore();
  });

  it('prints a clear error and does not touch the API when --release does not belong to --project', async () => {
    const scope = nock(API_URL).get('/api/releases/5').reply(200, releaseRaw); // project 3

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'duplicate',
      '12',
      '--project',
      '999',
      '--release',
      '5',
      '--name',
      'Copy',
      '--due-date',
      '2026-09-01T00:00:00+00:00',
    ]);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Release 5 does not belong to project 999.',
    );
    expect(process.exitCode).toBe(1);
    expect(scope.isDone()).toBe(true);

    errorSpy.mockRestore();
  });

  it('reports partial progress and does not set questionsOrder when a question fails mid-sequence', async () => {
    nock(API_URL)
      .get('/api/releases/5')
      .reply(200, releaseRaw)
      .get('/api/test_plans/12')
      .reply(200, sourcePlanRaw)
      .get('/api/questions')
      .query({ plan: '12' })
      .reply(200, sourceQuestionsCollectionRaw)
      .post('/api/test_plans')
      .reply(201, newPlanRaw)
      .post('/api/questions', {
        name: 'Question A',
        content: 'Content A',
        plan: '/api/test_plans/99',
      })
      .reply(201, { '@id': '/api/questions/201', id: 201, name: 'Question A' })
      .post('/api/questions', {
        name: 'Question B',
        content: 'Content B',
        plan: '/api/test_plans/99',
      })
      .reply(422, { detail: 'Name is required.' });
    // deliberately no PATCH interceptor — it must not be called

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'duplicate',
      '12',
      '--project',
      '3',
      '--release',
      '5',
      '--name',
      'Sprint 42 regression (copy)',
      '--due-date',
      '2026-09-01T00:00:00+00:00',
    ]);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message] = errorSpy.mock.calls[0] as [string];
    expect(message).toContain('Plan 99 was created');
    expect(message).toContain('1/2 questions were created');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
