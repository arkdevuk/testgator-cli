import { InquirerService } from 'nest-commander';
import { SetupCommand } from './setup.command';
import { AuthService } from '../auth/auth.service';
import { TokenCacheService } from '../token-cache/token-cache.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('SetupCommand', () => {
  let inquirer: { ask: jest.Mock };
  let authService: { login: jest.Mock };
  let tokenCache: { write: jest.Mock; writeApiUrl: jest.Mock };
  let command: SetupCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;
  const originalEnv = process.env.TESTGATOR_API_URL;

  beforeEach(() => {
    inquirer = { ask: jest.fn() };
    authService = { login: jest.fn() };
    tokenCache = { write: jest.fn(), writeApiUrl: jest.fn() };
    command = new SetupCommand(
      inquirer as unknown as InquirerService,
      authService as unknown as AuthService,
      tokenCache as unknown as TokenCacheService,
    );
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
    if (originalEnv === undefined) {
      delete process.env.TESTGATOR_API_URL;
    } else {
      process.env.TESTGATOR_API_URL = originalEnv;
    }
  });

  it('asks the setup questions, logs in with the answers, and caches the API URL + token on success', async () => {
    inquirer.ask.mockResolvedValueOnce({
      apiUrl: 'https://testgator.example.com',
      username: 'dev@example.com',
      password: 'hunter2',
    });
    authService.login.mockResolvedValueOnce('a-jwt-value');

    await command.run([], {});

    expect(inquirer.ask).toHaveBeenCalledWith('setup', {});
    expect(process.env.TESTGATOR_API_URL).toBe('https://testgator.example.com');
    expect(authService.login).toHaveBeenCalledWith(
      'dev@example.com',
      'hunter2',
    );
    expect(tokenCache.write).toHaveBeenCalledWith('a-jwt-value');
    expect(tokenCache.writeApiUrl).toHaveBeenCalledWith(
      'https://testgator.example.com',
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Logged in to https://testgator.example.com as dev@example.com. Session cached for future commands.',
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and caches nothing on bad credentials', async () => {
    inquirer.ask.mockResolvedValueOnce({
      apiUrl: 'https://testgator.example.com',
      username: 'dev@example.com',
      password: 'wrong',
    });
    authService.login.mockRejectedValueOnce(
      new ApiClientError('Invalid credentials.', 401, 'Invalid credentials.'),
    );

    await command.run([], {});

    expect(tokenCache.write).not.toHaveBeenCalled();
    expect(tokenCache.writeApiUrl).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Error: Invalid credentials.');
    expect(process.exitCode).toBe(1);
  });

  it('never logs the password', async () => {
    inquirer.ask.mockResolvedValueOnce({
      apiUrl: 'https://testgator.example.com',
      username: 'dev@example.com',
      password: 'super-secret',
    });
    authService.login.mockRejectedValueOnce(
      new ApiClientError('Invalid credentials.'),
    );

    await command.run([], {});

    const allLoggedText = [...logSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .join(' ');
    expect(allLoggedText).not.toContain('super-secret');
  });

  it('pre-fills all three answers (fully non-interactive) when all three flags are passed', async () => {
    inquirer.ask.mockResolvedValueOnce({
      apiUrl: 'https://testgator.example.com',
      username: 'alice',
      password: 'secret',
    });
    authService.login.mockResolvedValueOnce('a-jwt-value');

    await command.run([], {
      apiUrl: 'https://testgator.example.com',
      username: 'alice',
      password: 'secret',
    });

    expect(inquirer.ask).toHaveBeenCalledWith('setup', {
      apiUrl: 'https://testgator.example.com',
      username: 'alice',
      password: 'secret',
    });
    expect(authService.login).toHaveBeenCalledWith('alice', 'secret');
    expect(tokenCache.write).toHaveBeenCalledWith('a-jwt-value');
  });

  it('pre-fills only the flags that were passed (partial non-interactive)', async () => {
    inquirer.ask.mockResolvedValueOnce({
      apiUrl: 'https://testgator.example.com',
      username: 'alice',
      password: 'typed-at-prompt',
    });
    authService.login.mockResolvedValueOnce('a-jwt-value');

    await command.run([], {
      apiUrl: 'https://testgator.example.com',
      username: 'alice',
    });

    expect(inquirer.ask).toHaveBeenCalledWith('setup', {
      apiUrl: 'https://testgator.example.com',
      username: 'alice',
    });
  });

  it('falls back to TESTGATOR_API_URL for apiUrl when --api-url is not passed', async () => {
    process.env.TESTGATOR_API_URL = 'https://from-env.example.com';
    inquirer.ask.mockResolvedValueOnce({
      apiUrl: 'https://from-env.example.com',
      username: 'alice',
      password: 'secret',
    });
    authService.login.mockResolvedValueOnce('a-jwt-value');

    await command.run([], { username: 'alice', password: 'secret' });

    expect(inquirer.ask).toHaveBeenCalledWith('setup', {
      apiUrl: 'https://from-env.example.com',
      username: 'alice',
      password: 'secret',
    });
  });
});
