import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

const API_URL = 'https://testgator.example.test';

describe('login (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-login-'));
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

  it('caches the JWT on the token file on valid credentials', async () => {
    nock(API_URL)
      .get('/api/auth/mode')
      .reply(200, { mode: 'ldap', usernameIsEmail: false });
    nock(API_URL)
      .post('/api/auth/login', {
        username: 'dev@example.com',
        password: 'hunter2',
        authMode: 'ldap',
        mode: 'team',
      })
      .reply(200, { jwt: 'a-jwt-value' });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'login',
      '--username',
      'dev@example.com',
      '--password',
      'hunter2',
    ]);

    expect(logSpy).toHaveBeenCalledWith(
      'Logged in. Token cached for future commands.',
    );
    expect(fs.readFileSync(path.join(tempDir, 'token'), 'utf-8')).toBe(
      'a-jwt-value',
    );

    logSpy.mockRestore();
  });

  it('prints an error and writes no token file on bad credentials', async () => {
    nock(API_URL)
      .get('/api/auth/mode')
      .reply(200, { mode: 'ldap', usernameIsEmail: false });
    nock(API_URL)
      .post('/api/auth/login')
      .reply(401, { detail: 'Invalid credentials.' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'login',
      '--username',
      'dev@example.com',
      '--password',
      'wrong',
    ]);

    expect(errorSpy).toHaveBeenCalledWith('Error: Invalid credentials.');
    expect(fs.existsSync(path.join(tempDir, 'token'))).toBe(false);
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
