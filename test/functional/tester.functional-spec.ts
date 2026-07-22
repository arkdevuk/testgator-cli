import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import { testerItemFixture, testerCollectionFixture } from '../fixtures';

const API_URL = 'https://testgator.example.test';

describe('tester (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-tester-'));
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

  it('tester list prints the shaped collection as a plain JSON array', async () => {
    nock(API_URL)
      .get('/api/testers')
      .query({ itemsPerPage: '20' })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, testerCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['tester', 'list']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ email: string }>;
    expect(parsed).toHaveLength(2);
    expect(parsed.map((t) => t.email)).toEqual([
      'tester@example.com',
      'other-tester@example.com',
    ]);

    logSpy.mockRestore();
  });

  it('tester list --project <id> filters client-side by the projects IRI array', async () => {
    nock(API_URL)
      .get('/api/testers')
      .query({ itemsPerPage: '20' })
      .reply(200, testerCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'list',
      '--project',
      '2',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ email: string }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ email: 'other-tester@example.com' });

    logSpy.mockRestore();
  });

  it('tester list --page/--items-per-page passes both through as query params', async () => {
    const scope = nock(API_URL)
      .get('/api/testers')
      .query({ page: '2', itemsPerPage: '5' })
      .reply(200, testerCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'list',
      '--page',
      '2',
      '--items-per-page',
      '5',
    ]);

    expect(scope.isDone()).toBe(true);

    logSpy.mockRestore();
  });

  it('tester get <id> prints the shaped item as plain JSON', async () => {
    nock(API_URL)
      .get('/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f')
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, testerItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'get',
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
    ]);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({
      id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      email: 'tester@example.com',
    });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('tester get <id> prints a clear error and sets a non-zero exit code on 404', async () => {
    nock(API_URL)
      .get('/api/testers/does-not-exist')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'get',
      'does-not-exist',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
