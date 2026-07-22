import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

const API_URL = 'https://testgator.example.test';

const editedAnswerRaw = {
  '@context': '/api/contexts/Answer',
  '@id': '/api/answers/501',
  '@type': 'Answer',
  id: 501,
  tester: '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
  question: '/api/questions/101',
  state: 'failed',
  comment: 'Reproduces every time.',
  systemInfos: null,
  files: [],
  important: true,
  ignored: false,
  created: '2026-07-10T14:00:00+00:00',
  updated: '2026-07-10T14:05:00+00:00',
};

describe('answer edit/delete (functional)', () => {
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

  it('edits an answer with only the passed fields and prints it as compact JSON', async () => {
    const scope = nock(API_URL)
      .patch('/api/answers/501', {
        state: 'failed',
        comment: 'Reproduces every time.',
        important: true,
      })
      .reply(200, editedAnswerRaw);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'answer',
      'edit',
      '501',
      '--state',
      'failed',
      '--comment',
      'Reproduces every time.',
      '--important',
      'true',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({
      id: 501,
      state: 'failed',
      comment: 'Reproduces every time.',
      important: true,
    });
    expect(parsed).not.toHaveProperty('@id');

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code when editing a nonexistent answer', async () => {
    nock(API_URL)
      .patch('/api/answers/999', { state: 'failed' })
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'answer',
      'edit',
      '999',
      '--state',
      'failed',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('deletes an answer and prints a success message', async () => {
    const scope = nock(API_URL).delete('/api/answers/501').reply(204);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['answer', 'delete', '501']);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Deleted answer 501.'),
    );
    expect(process.exitCode).toBeUndefined();

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code when deleting a nonexistent answer', async () => {
    nock(API_URL)
      .delete('/api/answers/999')
      .reply(404, { detail: 'Not Found' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['answer', 'delete', '999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
