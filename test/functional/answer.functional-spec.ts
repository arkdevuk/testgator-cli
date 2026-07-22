import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import { answerItemFixture, answerCollectionFixture } from '../fixtures';

const API_URL = 'https://testgator.example.test';

describe('answer (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-answer-'));
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

  it('answer list prints the shaped collection as a plain JSON array', async () => {
    nock(API_URL)
      .get('/api/answers')
      .query({ itemsPerPage: '20' })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, answerCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['answer', 'list']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ id: number }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ id: 501, state: 'pass_with_bugs' });

    logSpy.mockRestore();
  });

  it('answer list --plan <id> filters via the question.plan query param', async () => {
    nock(API_URL)
      .get('/api/answers')
      .query({ 'question.plan': '12', itemsPerPage: '20' })
      .reply(200, answerCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'answer',
      'list',
      '--plan',
      '12',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ id: number }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ id: 501 });

    logSpy.mockRestore();
  });

  it('answer list --page/--items-per-page passes both through as query params', async () => {
    const scope = nock(API_URL)
      .get('/api/answers')
      .query({ page: '2', itemsPerPage: '5' })
      .reply(200, answerCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'answer',
      'list',
      '--page',
      '2',
      '--items-per-page',
      '5',
    ]);

    expect(scope.isDone()).toBe(true);

    logSpy.mockRestore();
  });

  it('answer get <id> prints the shaped item, including comment/systemInfos/files', async () => {
    nock(API_URL)
      .get('/api/answers/501')
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, answerItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['answer', 'get', '501']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      id: 501,
      state: 'pass_with_bugs',
      files: ['/api/files/3f9c2b1e-4a5d-4c8e-9f1a-2b3c4d5e6f70'],
    });
    expect(parsed.systemInfos).toMatchObject({ os: 'iOS' });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('answer get <id> prints a clear error and sets a non-zero exit code on 404', async () => {
    nock(API_URL).get('/api/answers/999').reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['answer', 'get', '999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
