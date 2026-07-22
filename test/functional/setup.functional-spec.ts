import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

const API_URL = 'https://testgator.example.test';

describe('setup (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-setup-'));
    process.env.TESTGATOR_CONFIG_DIR = tempDir;
    delete process.env.TESTGATOR_API_URL;
    process.exitCode = undefined;
    nock.cleanAll();
  });

  afterEach(() => {
    delete process.env.TESTGATOR_API_URL;
    delete process.env.TESTGATOR_CONFIG_DIR;
    process.exitCode = undefined;
    fs.rmSync(tempDir, { recursive: true, force: true });
    nock.cleanAll();
    CommandTestFactory.setAnswers([]);
  });

  it('caches the API URL and JWT on a successful interactive setup', async () => {
    CommandTestFactory.setAnswers([API_URL, 'dev@example.com', 'hunter2']);

    nock(API_URL)
      .get('/api/auth/mode')
      .reply(200, { mode: 'db', usernameIsEmail: true })
      .post('/api/auth/login', {
        username: 'dev@example.com',
        password: 'hunter2',
        authMode: 'db',
        mode: 'team',
      })
      .reply(200, { jwt: 'a-jwt-value' });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['setup']);

    expect(logSpy).toHaveBeenCalledWith(
      `Logged in to ${API_URL} as dev@example.com. Session cached for future commands.`,
    );
    expect(fs.readFileSync(path.join(tempDir, 'token'), 'utf-8')).toBe(
      'a-jwt-value',
    );
    expect(fs.readFileSync(path.join(tempDir, 'api-url'), 'utf-8')).toBe(
      API_URL,
    );

    logSpy.mockRestore();
  });

  it('prints an error and caches nothing on bad credentials', async () => {
    CommandTestFactory.setAnswers([API_URL, 'dev@example.com', 'wrong']);

    nock(API_URL)
      .get('/api/auth/mode')
      .reply(200, { mode: 'db', usernameIsEmail: true })
      .post('/api/auth/login')
      .reply(401, { detail: 'Invalid credentials.' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['setup']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Invalid credentials.');
    expect(process.exitCode).toBe(1);
    expect(fs.existsSync(path.join(tempDir, 'token'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'api-url'))).toBe(false);

    errorSpy.mockRestore();
  });

  it('runs with zero prompts when --api-url/--username/--password are all passed', async () => {
    // Deliberately no CommandTestFactory.setAnswers() call — if this mode
    // actually prompted for anything, the mock would have nothing to answer
    // with and the command would hang/fail.
    nock(API_URL)
      .get('/api/auth/mode')
      .reply(200, { mode: 'db', usernameIsEmail: true })
      .post('/api/auth/login', {
        username: 'dev@example.com',
        password: 'hunter2',
        authMode: 'db',
        mode: 'team',
      })
      .reply(200, { jwt: 'a-jwt-value' });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'setup',
      '--api-url',
      API_URL,
      '--username',
      'dev@example.com',
      '--password',
      'hunter2',
    ]);

    expect(logSpy).toHaveBeenCalledWith(
      `Logged in to ${API_URL} as dev@example.com. Session cached for future commands.`,
    );
    expect(fs.readFileSync(path.join(tempDir, 'token'), 'utf-8')).toBe(
      'a-jwt-value',
    );
    expect(fs.readFileSync(path.join(tempDir, 'api-url'), 'utf-8')).toBe(
      API_URL,
    );

    logSpy.mockRestore();
  });

  it('prompts only for the password when --api-url and --username are passed', async () => {
    // Positions 0 (apiUrl) and 1 (username) are pre-filled via flags and
    // therefore skipped regardless of what's here; only position 2
    // (password) is actually consulted.
    CommandTestFactory.setAnswers([API_URL, 'dev@example.com', 'hunter2']);

    nock(API_URL)
      .get('/api/auth/mode')
      .reply(200, { mode: 'db', usernameIsEmail: true })
      .post('/api/auth/login', {
        username: 'dev@example.com',
        password: 'hunter2',
        authMode: 'db',
        mode: 'team',
      })
      .reply(200, { jwt: 'a-jwt-value' });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'setup',
      '--api-url',
      API_URL,
      '--username',
      'dev@example.com',
    ]);

    expect(logSpy).toHaveBeenCalledWith(
      `Logged in to ${API_URL} as dev@example.com. Session cached for future commands.`,
    );

    logSpy.mockRestore();
  });

  it('resolves apiUrl from TESTGATOR_API_URL when --api-url is not passed', async () => {
    process.env.TESTGATOR_API_URL = API_URL;

    nock(API_URL)
      .get('/api/auth/mode')
      .reply(200, { mode: 'db', usernameIsEmail: true })
      .post('/api/auth/login', {
        username: 'dev@example.com',
        password: 'hunter2',
        authMode: 'db',
        mode: 'team',
      })
      .reply(200, { jwt: 'a-jwt-value' });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'setup',
      '--username',
      'dev@example.com',
      '--password',
      'hunter2',
    ]);

    expect(logSpy).toHaveBeenCalledWith(
      `Logged in to ${API_URL} as dev@example.com. Session cached for future commands.`,
    );
    expect(fs.readFileSync(path.join(tempDir, 'api-url'), 'utf-8')).toBe(
      API_URL,
    );

    logSpy.mockRestore();
  });
});
