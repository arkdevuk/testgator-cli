import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

const API_URL = 'https://testgator.example.test';

const createdPlanRaw = {
  '@context': '/api/contexts/TestPlan',
  '@id': '/api/test_plans/12',
  '@type': 'TestPlan',
  id: 12,
  name: 'Sprint 42 regression',
  state: 'draft',
  dueDate: '2026-08-01T00:00:00+00:00',
  release: '/api/releases/3',
  questionsOrder: [],
  description: '',
};

const editedPlanRaw = {
  ...createdPlanRaw,
  name: 'Sprint 42 regression (updated)',
};

describe('plan create/edit (functional)', () => {
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

  it('creates a plan and prints it as compact JSON', async () => {
    const scope = nock(API_URL)
      .post('/api/test_plans', {
        name: 'Sprint 42 regression',
        release: '/api/releases/3',
        dueDate: '2026-08-01T00:00:00+00:00',
        description: '',
      })
      .reply(201, createdPlanRaw);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'create',
      '--release',
      '3',
      '--name',
      'Sprint 42 regression',
      '--due-date',
      '2026-08-01T00:00:00+00:00',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({ id: 12, name: 'Sprint 42 regression' });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code when creation fails validation', async () => {
    nock(API_URL)
      .post('/api/test_plans')
      .reply(422, { detail: 'dueDate: This value should not be null.' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'create',
      '--release',
      '3',
      '--name',
      'x',
      '--due-date',
      '',
    ]);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: dueDate: This value should not be null.',
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('edits a plan with only the passed fields and prints it as compact JSON', async () => {
    const scope = nock(API_URL)
      .patch('/api/test_plans/12', {
        name: 'Sprint 42 regression (updated)',
      })
      .reply(200, editedPlanRaw);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
      'edit',
      '12',
      '--name',
      'Sprint 42 regression (updated)',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({
      id: 12,
      name: 'Sprint 42 regression (updated)',
    });

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code when editing a nonexistent plan', async () => {
    nock(API_URL)
      .patch('/api/test_plans/999', { name: 'x' })
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'plan',
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
