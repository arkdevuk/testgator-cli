import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import { releaseItemFixture, releaseCollectionFixture } from '../fixtures';

const API_URL = 'https://testgator.example.test';

const createdReleaseRaw = {
  '@context': '/api/contexts/Release',
  '@id': '/api/releases/3',
  '@type': 'Release',
  id: 3,
  name: 'v1.4.0',
  project: '/api/projects/1',
  plans: [],
  description: 'Adds the CLI-facing agent workflow.',
};

const editedReleaseRaw = {
  ...createdReleaseRaw,
  name: 'v1.4.1',
};

describe('release list/get/create/edit (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-release-'));
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

  it('release list prints the shaped collection as a plain JSON array', async () => {
    nock(API_URL)
      .get('/api/releases')
      .query({ itemsPerPage: '20' })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, releaseCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['release', 'list']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed = JSON.parse(printed) as Array<{ id: number; name: string }>;
    expect(parsed).toEqual([
      {
        id: releaseItemFixture.id,
        name: releaseItemFixture.name,
        project: releaseItemFixture.project,
        plans: releaseItemFixture.plans,
        description: releaseItemFixture.description,
      },
    ]);

    logSpy.mockRestore();
  });

  it('release list --project <id> passes the filter through as a query param', async () => {
    const scope = nock(API_URL)
      .get('/api/releases')
      .query({ project: '1', itemsPerPage: '20' })
      .reply(200, releaseCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'release',
      'list',
      '--project',
      '1',
    ]);

    expect(scope.isDone()).toBe(true);

    logSpy.mockRestore();
  });

  it('release list --page/--items-per-page passes both through as query params', async () => {
    const scope = nock(API_URL)
      .get('/api/releases')
      .query({ page: '2', itemsPerPage: '5' })
      .reply(200, releaseCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'release',
      'list',
      '--page',
      '2',
      '--items-per-page',
      '5',
    ]);

    expect(scope.isDone()).toBe(true);

    logSpy.mockRestore();
  });

  it('release get <id> prints the shaped item as plain JSON', async () => {
    nock(API_URL)
      .get('/api/releases/3')
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, releaseItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['release', 'get', '3']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({ id: 3, name: 'v1.4.0' });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('release get <id> prints a clear error and sets a non-zero exit code on 404', async () => {
    nock(API_URL).get('/api/releases/999').reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['release', 'get', '999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('creates a release and prints it as compact JSON', async () => {
    const scope = nock(API_URL)
      .post('/api/releases', {
        name: 'v1.4.0',
        project: '/api/projects/1',
        description: 'Adds the CLI-facing agent workflow.',
      })
      .reply(201, createdReleaseRaw);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'release',
      'create',
      '--project',
      '1',
      '--name',
      'v1.4.0',
      '--description',
      'Adds the CLI-facing agent workflow.',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({ id: 3, name: 'v1.4.0' });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code when creation fails validation', async () => {
    nock(API_URL)
      .post('/api/releases')
      .reply(422, { detail: 'name: This value should not be blank.' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'release',
      'create',
      '--project',
      '1',
      '--name',
      '',
    ]);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: name: This value should not be blank.',
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('edits a release with only the passed fields and prints it as compact JSON', async () => {
    const scope = nock(API_URL)
      .patch('/api/releases/3', { name: 'v1.4.1' })
      .reply(200, editedReleaseRaw);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'release',
      'edit',
      '3',
      '--name',
      'v1.4.1',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({ id: 3, name: 'v1.4.1' });

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code when editing a nonexistent release', async () => {
    nock(API_URL)
      .patch('/api/releases/999', { name: 'x' })
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'release',
      'edit',
      '999',
      '--name',
      'x',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
