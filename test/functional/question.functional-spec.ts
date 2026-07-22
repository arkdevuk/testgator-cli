import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import { questionItemFixture, questionCollectionFixture } from '../fixtures';

const API_URL = 'https://testgator.example.test';

describe('question (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-question-'));
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

  it('question list prints the shaped collection as a plain JSON array', async () => {
    nock(API_URL)
      .get('/api/questions')
      .query({ itemsPerPage: '20' })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, questionCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['question', 'list']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ id: number }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: 101,
      name: 'Can you log in with a valid one-time code?',
    });

    logSpy.mockRestore();
  });

  it('question list --plan <id> filters via the plan query param', async () => {
    nock(API_URL)
      .get('/api/questions')
      .query({ plan: '12', itemsPerPage: '20' })
      .reply(200, questionCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'question',
      'list',
      '--plan',
      '12',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ id: number }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ id: 101 });

    logSpy.mockRestore();
  });

  it('question list --page/--items-per-page passes both through as query params', async () => {
    const scope = nock(API_URL)
      .get('/api/questions')
      .query({ page: '2', itemsPerPage: '5' })
      .reply(200, questionCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'question',
      'list',
      '--page',
      '2',
      '--items-per-page',
      '5',
    ]);

    expect(scope.isDone()).toBe(true);

    logSpy.mockRestore();
  });

  it('question get <id> prints the shaped item as plain JSON', async () => {
    nock(API_URL)
      .get('/api/questions/101')
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, questionItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['question', 'get', '101']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({ id: 101, plan: '/api/test_plans/12' });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('question get <id> prints a clear error and sets a non-zero exit code on 404', async () => {
    nock(API_URL).get('/api/questions/999').reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['question', 'get', '999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
