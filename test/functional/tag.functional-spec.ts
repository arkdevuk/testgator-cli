import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import { tagItemFixture, tagCollectionFixture } from '../fixtures';

const API_URL = 'https://testgator.example.test';

describe('tag list/create/delete (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-tag-'));
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

  it('tag list prints the compact {id,label,deleted} array', async () => {
    nock(API_URL)
      .get('/api/tester_tags')
      .query({ itemsPerPage: '20' })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, tagCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['tag', 'list']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<Record<string, unknown>>;
    expect(parsed).toEqual([
      { id: 'vip', label: 'VIP', deleted: false },
      { id: 'mobile', label: 'Mobile', deleted: false },
    ]);

    logSpy.mockRestore();
  });

  it('tag list --search maps to the label query param', async () => {
    const scope = nock(API_URL)
      .get('/api/tester_tags')
      .query({ itemsPerPage: '20', label: 'vi' })
      .reply(200, tagCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tag',
      'list',
      '--search',
      'vi',
    ]);

    expect(scope.isDone()).toBe(true);

    logSpy.mockRestore();
  });

  it('tag create posts {id,label} and prints the shaped result', async () => {
    const scope = nock(API_URL)
      .post('/api/tester_tags', { id: 'vip', label: 'VIP' })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(201, tagItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tag',
      'create',
      'vip',
      '--label',
      'VIP',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Record<string, unknown>;
    expect(parsed).toMatchObject({ id: 'vip', label: 'VIP' });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('tag create rejects an invalid id client-side without making a request', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tag',
      'create',
      'Not Valid!',
      '--label',
      'VIP',
    ]);

    // No nock interceptor was registered — a real POST would error loudly,
    // which is exactly how we know the client-side check short-circuited it.
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('must match [a-z0-9_-]+'),
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('tag delete soft-deletes and prints a success line', async () => {
    const scope = nock(API_URL)
      .delete('/api/tester_tags/vip')
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(204);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['tag', 'delete', 'vip']);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Deleted tag vip.'),
    );

    logSpy.mockRestore();
  });

  it('tag delete prints a clear error and sets a non-zero exit code on 404', async () => {
    nock(API_URL)
      .delete('/api/tester_tags/does-not-exist')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'tag',
      'delete',
      'does-not-exist',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
