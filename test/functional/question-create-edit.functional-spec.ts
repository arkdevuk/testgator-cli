import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

const API_URL = 'https://testgator.example.test';

const createdQuestionRaw = {
  '@context': '/api/contexts/Question',
  '@id': '/api/questions/101',
  '@type': 'Question',
  id: 101,
  name: 'Can you log in with a valid one-time code?',
  plan: '/api/test_plans/12',
  content: null,
  displayOrder: 0,
  answers: [],
  files: [],
};

const editedQuestionRaw = {
  ...createdQuestionRaw,
  name: 'Updated question name',
};

describe('question create/edit (functional)', () => {
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

  it('creates a question and prints it as compact JSON', async () => {
    const scope = nock(API_URL)
      .post('/api/questions', {
        name: 'Can you log in with a valid one-time code?',
        plan: '/api/test_plans/12',
      })
      .reply(201, createdQuestionRaw);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'question',
      'create',
      '--plan',
      '12',
      '--name',
      'Can you log in with a valid one-time code?',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({
      id: 101,
      name: 'Can you log in with a valid one-time code?',
    });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code when creation fails validation', async () => {
    nock(API_URL)
      .post('/api/questions')
      .reply(422, { detail: 'name: This value should not be blank.' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'question',
      'create',
      '--plan',
      '12',
      '--name',
      '',
    ]);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: name: This value should not be blank.',
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('edits a question with only the passed fields and prints it as compact JSON', async () => {
    const scope = nock(API_URL)
      .patch('/api/questions/101', { name: 'Updated question name' })
      .reply(200, editedQuestionRaw);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'question',
      'edit',
      '101',
      '--name',
      'Updated question name',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({ id: 101, name: 'Updated question name' });

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code when editing a nonexistent question', async () => {
    nock(API_URL)
      .patch('/api/questions/999', { name: 'x' })
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'question',
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
