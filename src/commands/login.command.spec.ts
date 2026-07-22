import { LoginCommand } from './login.command';
import { AuthService } from '../auth/auth.service';
import { TokenCacheService } from '../token-cache/token-cache.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('LoginCommand', () => {
  let authService: { login: jest.Mock };
  let tokenCache: { write: jest.Mock };
  let command: LoginCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    authService = { login: jest.fn() };
    tokenCache = { write: jest.fn() };
    command = new LoginCommand(
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
  });

  it('caches the JWT and prints a success message on valid credentials', async () => {
    authService.login.mockResolvedValueOnce('a-jwt-value');

    await command.run([], { username: 'dev@example.com', password: 'hunter2' });

    expect(authService.login).toHaveBeenCalledWith(
      'dev@example.com',
      'hunter2',
    );
    expect(tokenCache.write).toHaveBeenCalledWith('a-jwt-value');
    expect(logSpy).toHaveBeenCalledWith(
      'Logged in. Token cached for future commands.',
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and does not cache a token on bad credentials', async () => {
    authService.login.mockRejectedValueOnce(
      new ApiClientError('Invalid credentials.', 401, 'Invalid credentials.'),
    );

    await command.run([], { username: 'dev@example.com', password: 'wrong' });

    expect(tokenCache.write).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Error: Invalid credentials.');
    expect(process.exitCode).toBe(1);
  });

  it('never logs the password', async () => {
    authService.login.mockRejectedValueOnce(
      new ApiClientError('Invalid credentials.'),
    );

    await command.run([], {
      username: 'dev@example.com',
      password: 'super-secret',
    });

    const allLoggedText = [...logSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .join(' ');
    expect(allLoggedText).not.toContain('super-secret');
  });
});
