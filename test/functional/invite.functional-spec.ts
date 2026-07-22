import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import { testerItemFixture, testerItemFixture2 } from '../fixtures';

const API_URL = 'https://testgator.example.test';

const emptyTesterCollection = {
  '@context': '/api/contexts/Tester',
  '@id': '/api/testers',
  '@type': 'Collection',
  totalItems: 0,
  member: [],
};

const testPlanFixture = (testersEnrolled: string[]) => ({
  '@context': '/api/contexts/TestPlan',
  '@id': '/api/test_plans/12',
  '@type': 'TestPlan',
  id: 12,
  name: 'Regression',
  testersEnrolled,
});

describe('invite commands (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-invite-'));
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

  it('invite creates a new tester when the email is not already registered', async () => {
    nock(API_URL)
      .get('/api/testers')
      .query({ email: 'tester@example.com' })
      .reply(200, emptyTesterCollection)
      .post('/api/testers', { email: 'tester@example.com' })
      .reply(201, testerItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'invite',
      'tester@example.com',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toEqual({
      email: 'tester@example.com',
      testerId: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      created: true,
    });

    logSpy.mockRestore();
  });

  it('invite reports created: false when the tester already exists', async () => {
    nock(API_URL)
      .get('/api/testers')
      .query({ email: 'tester@example.com' })
      .reply(200, {
        ...emptyTesterCollection,
        totalItems: 1,
        member: [testerItemFixture],
      });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'invite',
      'tester@example.com',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as { created: boolean };
    expect(parsed.created).toBe(false);

    logSpy.mockRestore();
  });

  it('invites (batch) processes multiple emails and prints per-email outcomes', async () => {
    nock(API_URL)
      .get('/api/testers')
      .query({ email: 'tester@example.com' })
      .reply(200, emptyTesterCollection)
      .post('/api/testers', { email: 'tester@example.com' })
      .reply(201, testerItemFixture)
      .get('/api/testers')
      .query({ email: 'other-tester@example.com' })
      .reply(200, emptyTesterCollection)
      .post('/api/testers', { email: 'other-tester@example.com' })
      .reply(201, testerItemFixture2);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'invites',
      'tester@example.com,other-tester@example.com',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{
      email: string;
      success: boolean;
    }>;
    expect(parsed).toHaveLength(2);
    expect(parsed.every((outcome) => outcome.success)).toBe(true);
    expect(process.exitCode).toBeUndefined();

    logSpy.mockRestore();
  });

  it('test-invite creates and enrolls a new tester on the given plan', async () => {
    nock(API_URL)
      .get('/api/testers')
      .query({ email: 'tester@example.com' })
      .reply(200, emptyTesterCollection)
      .post('/api/testers', { email: 'tester@example.com' })
      .reply(201, testerItemFixture)
      .get('/api/test_plans/12')
      .reply(200, testPlanFixture([]))
      .patch('/api/test_plans/12', {
        testersEnrolled: ['/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f'],
      })
      .reply(
        200,
        testPlanFixture(['/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f']),
      );

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'test-invite',
      'tester@example.com',
      '--plan',
      '12',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toEqual({
      email: 'tester@example.com',
      testerId: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      created: true,
      alreadyEnrolled: false,
    });

    logSpy.mockRestore();
  });

  it('test-invite prints a clear error for a nonexistent plan', async () => {
    nock(API_URL)
      .get('/api/testers')
      .query({ email: 'tester@example.com' })
      .reply(200, {
        ...emptyTesterCollection,
        totalItems: 1,
        member: [testerItemFixture],
      })
      .get('/api/test_plans/999')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'test-invite',
      'tester@example.com',
      '--plan',
      '999',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('test-invites (batch) fetches the plan once and issues a single PATCH', async () => {
    nock(API_URL)
      .get('/api/test_plans/12')
      .reply(200, testPlanFixture([]))
      .get('/api/testers')
      .query({ email: 'tester@example.com' })
      .reply(200, emptyTesterCollection)
      .post('/api/testers', { email: 'tester@example.com' })
      .reply(201, testerItemFixture)
      .get('/api/testers')
      .query({ email: 'other-tester@example.com' })
      .reply(200, emptyTesterCollection)
      .post('/api/testers', { email: 'other-tester@example.com' })
      .reply(201, testerItemFixture2)
      .patch('/api/test_plans/12', {
        testersEnrolled: [
          '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
          '/api/testers/2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10',
        ],
      })
      .reply(200, testPlanFixture([]));

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'test-invites',
      'tester@example.com,other-tester@example.com',
      '--plan',
      '12',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{
      email: string;
      success: boolean;
    }>;
    expect(parsed).toHaveLength(2);
    expect(parsed.every((outcome) => outcome.success)).toBe(true);
    expect(process.exitCode).toBeUndefined();

    logSpy.mockRestore();
  });
});
