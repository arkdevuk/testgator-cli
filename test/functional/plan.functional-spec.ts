import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import { testPlanItemFixture, testPlanCollectionFixture } from '../fixtures';

const API_URL = 'https://testgator.example.test';

describe('plan (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-plan-'));
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

  it('plan list prints the shaped collection as a plain JSON array', async () => {
    nock(API_URL)
      .get('/api/test_plans')
      .query({ itemsPerPage: '20' })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, testPlanCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['plan', 'list']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ id: number }>;
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ id: 12, name: 'Sprint 42 regression' });

    logSpy.mockRestore();
  });

  it('plan list --project <id> filters via the release.project query param', async () => {
    nock(API_URL)
      .get('/api/test_plans')
      .query({ 'release.project': '5', itemsPerPage: '20' })
      .reply(200, {
        '@context': '/api/contexts/TestPlan',
        '@id': '/api/test_plans',
        '@type': 'Collection',
        totalItems: 1,
        member: [testPlanItemFixture],
      });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'list',
      '--project',
      '5',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ id: number }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ id: 12 });

    logSpy.mockRestore();
  });

  it('plan list --page/--items-per-page passes both through as query params', async () => {
    const scope = nock(API_URL)
      .get('/api/test_plans')
      .query({ page: '2', itemsPerPage: '5' })
      .reply(200, testPlanCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'list',
      '--page',
      '2',
      '--items-per-page',
      '5',
    ]);

    expect(scope.isDone()).toBe(true);

    logSpy.mockRestore();
  });

  it('plan get <id> prints the shaped item, including state and questionsOrder', async () => {
    nock(API_URL)
      .get('/api/test_plans/12')
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, testPlanItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['plan', 'get', '12']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({
      id: 12,
      state: 'published',
      questionsOrder: ['/api/questions/101', '/api/questions/102'],
    });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('plan get <id> prints a clear error and sets a non-zero exit code on 404', async () => {
    nock(API_URL)
      .get('/api/test_plans/999')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['plan', 'get', '999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('plan remove-tester reads the roster, PATCHes the reduced set, and prints it', async () => {
    nock(API_URL).get('/api/test_plans/12').reply(200, testPlanItemFixture); // testersEnrolled: ['/api/testers/7']

    const scope = nock(API_URL)
      .patch('/api/test_plans/12', { testersEnrolled: [] })
      .matchHeader('content-type', 'application/merge-patch+json')
      .reply(200, {});

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'remove-tester',
      '12',
      '7',
    ]);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ testersEnrolled: [], enrolledCount: 0 }),
    );

    logSpy.mockRestore();
  });

  it('plan remove-tester skips the PATCH entirely when no given tester is enrolled', async () => {
    nock(API_URL).get('/api/test_plans/12').reply(200, testPlanItemFixture); // testersEnrolled: ['/api/testers/7']

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'remove-tester',
      '12',
      'not-enrolled',
    ]);

    // No PATCH was registered with nock at all — if one had been sent,
    // it would error with "no match for request" since nothing intercepts it.
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        testersEnrolled: ['/api/testers/7'],
        enrolledCount: 1,
      }),
    );

    logSpy.mockRestore();
  });

  it('plan remove-tester prints a clear error and sets a non-zero exit code for an unknown plan', async () => {
    nock(API_URL)
      .get('/api/test_plans/does-not-exist')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'remove-tester',
      'does-not-exist',
      '7',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
