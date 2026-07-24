import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import {
  testerItemFixture,
  testerCollectionFixture,
  testerAnnotationItemFixture,
  testerAnnotationCollectionFixture,
} from '../fixtures';

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

  it('tester tag add reads current tags, PATCHes the deduped union, and prints it', async () => {
    nock(API_URL)
      .get('/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f')
      .reply(200, testerItemFixture); // tags: ['non-technical', 'mobile']

    const scope = nock(API_URL)
      .patch('/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f', {
        tags: ['non-technical', 'mobile', 'vip'],
      })
      .matchHeader('content-type', 'application/merge-patch+json')
      .reply(200, {});

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'tag',
      'add',
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      'vip',
    ]);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify(['non-technical', 'mobile', 'vip']),
    );

    logSpy.mockRestore();
  });

  it('tester tag remove reads current tags, PATCHes the remainder, and prints it', async () => {
    nock(API_URL)
      .get('/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f')
      .reply(200, testerItemFixture); // tags: ['non-technical', 'mobile']

    const scope = nock(API_URL)
      .patch('/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f', {
        tags: ['non-technical'],
      })
      .reply(200, {});

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'tag',
      'remove',
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      'mobile',
    ]);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(['non-technical']));

    logSpy.mockRestore();
  });

  it('tester tag remove skips the PATCH entirely when the tag is not present', async () => {
    nock(API_URL)
      .get('/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f')
      .reply(200, testerItemFixture); // tags: ['non-technical', 'mobile']

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'tag',
      'remove',
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      'not-a-real-tag',
    ]);

    // No PATCH was registered with nock at all — if one had been sent,
    // it would error with "no match for request" since nothing intercepts it.
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify(['non-technical', 'mobile']),
    );

    logSpy.mockRestore();
  });

  it('tester note list queries relateTo + order[created]=desc and prints the compact array', async () => {
    const testerId = '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f';
    const scope = nock(API_URL)
      .get('/api/tester_annotations')
      .query({
        itemsPerPage: '20',
        relateTo: `/api/testers/${testerId}`,
        'order[created]': 'desc',
      })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, testerAnnotationCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'note',
      'list',
      testerId,
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ content: string }>;
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      content: 'Reported a bug in checkout flow',
    });
    expect(parsed[0]).not.toHaveProperty('updated');

    logSpy.mockRestore();
  });

  it('tester note add posts relateTo + content and prints a success line', async () => {
    const testerId = '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f';
    const scope = nock(API_URL)
      .post('/api/tester_annotations', {
        relateTo: `/api/testers/${testerId}`,
        content: 'Very responsive tester',
      })
      .reply(201, testerAnnotationItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'note',
      'add',
      testerId,
      'Very responsive tester',
    ]);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Added note to tester ${testerId}.`),
    );

    logSpy.mockRestore();
  });

  it('tester note add on an unknown tester prints a clear error and sets a non-zero exit code', async () => {
    nock(API_URL)
      .post('/api/tester_annotations')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'note',
      'add',
      'does-not-exist',
      'hello',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('tester disable PATCHes active: false and prints the resulting state', async () => {
    const testerId = '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f';
    const scope = nock(API_URL)
      .patch(`/api/testers/${testerId}`, { active: false })
      .matchHeader('content-type', 'application/merge-patch+json')
      .reply(200, { ...testerItemFixture, active: false });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'disable',
      testerId,
    ]);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: testerId, active: false }),
    );

    logSpy.mockRestore();
  });

  it('tester disable on an unknown tester prints a clear error and sets a non-zero exit code', async () => {
    nock(API_URL)
      .patch('/api/testers/does-not-exist')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'disable',
      'does-not-exist',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('tester enable PATCHes active: true and prints the resulting state', async () => {
    const testerId = '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f';
    const scope = nock(API_URL)
      .patch(`/api/testers/${testerId}`, { active: true })
      .matchHeader('content-type', 'application/merge-patch+json')
      .reply(200, testerItemFixture); // active: true

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'enable',
      testerId,
    ]);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: testerId, active: true }),
    );

    logSpy.mockRestore();
  });

  it('tester enable on an unknown tester prints a clear error and sets a non-zero exit code', async () => {
    nock(API_URL)
      .patch('/api/testers/does-not-exist')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tester',
      'enable',
      'does-not-exist',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
