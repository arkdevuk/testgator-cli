import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';
import { projectItemFixture, projectCollectionFixture } from '../fixtures';

const API_URL = 'https://testgator.example.test';

describe('project (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-project-'));
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

  it('project list prints the shaped collection as a plain JSON array', async () => {
    nock(API_URL)
      .get('/api/projects')
      .query({ itemsPerPage: '20' })
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, projectCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['project', 'list']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toEqual([
      {
        id: projectItemFixture.id,
        name: projectItemFixture.name,
        description: projectItemFixture.description,
        releases: projectItemFixture.releases,
        picture: projectItemFixture.picture,
        projectPictureUrl: projectItemFixture.projectPictureUrl,
        projectBannerUrl: projectItemFixture.projectBannerUrl,
        totalTesters: projectItemFixture.totalTesters,
      },
    ]);
    expect((parsed as Array<Record<string, unknown>>)[0]).not.toHaveProperty(
      'allTesters',
    );

    logSpy.mockRestore();
  });

  it('project list prints an empty array for an empty collection', async () => {
    nock(API_URL)
      .get('/api/projects')
      .query({ itemsPerPage: '20' })
      .reply(200, {
        '@context': '/api/contexts/Project',
        '@id': '/api/projects',
        '@type': 'Collection',
        totalItems: 0,
        member: [],
      });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['project', 'list']);

    expect(logSpy).toHaveBeenCalledWith('[]');

    logSpy.mockRestore();
  });

  it('project list --page/--items-per-page passes both through as query params', async () => {
    const scope = nock(API_URL)
      .get('/api/projects')
      .query({ page: '2', itemsPerPage: '5' })
      .reply(200, projectCollectionFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'project',
      'list',
      '--page',
      '2',
      '--items-per-page',
      '5',
    ]);

    expect(scope.isDone()).toBe(true);

    logSpy.mockRestore();
  });

  it('project get <id> prints the shaped item as plain JSON', async () => {
    nock(API_URL)
      .get('/api/projects/1')
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, projectItemFixture);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['project', 'get', '1']);

    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({ id: 1, name: 'TestGator', totalTesters: 2 });
    expect(parsed).not.toHaveProperty('@id');
    expect(parsed).not.toHaveProperty('allTesters');

    logSpy.mockRestore();
  });

  it('project get <id> prints a clear error and sets a non-zero exit code on 404', async () => {
    nock(API_URL).get('/api/projects/999').reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['project', 'get', '999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
