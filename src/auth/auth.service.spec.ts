import { AuthService } from './auth.service';
import { ApiClientService } from '../api-client/api-client.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('AuthService', () => {
  let apiClient: { get: jest.Mock; post: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    apiClient = { get: jest.fn(), post: jest.fn() };
    service = new AuthService(apiClient as unknown as ApiClientService);
  });

  it('discovers the auth mode via GET /api/auth/mode', async () => {
    apiClient.get.mockResolvedValueOnce({
      mode: 'ldap',
      usernameIsEmail: false,
    });

    const result = await service.getAuthMode();

    expect(apiClient.get).toHaveBeenCalledWith('/api/auth/mode', undefined, {
      skipAuth: true,
    });
    expect(result).toEqual({ mode: 'ldap', usernameIsEmail: false });
  });

  it('logs in with the discovered auth mode and returns the JWT', async () => {
    apiClient.get.mockResolvedValueOnce({ mode: 'db', usernameIsEmail: true });
    apiClient.post.mockResolvedValueOnce({ jwt: 'a-jwt-value' });

    const jwt = await service.login('dev@example.com', 'hunter2');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/auth/login',
      {
        username: 'dev@example.com',
        password: 'hunter2',
        authMode: 'db',
        mode: 'team',
      },
      { skipAuth: true },
    );
    expect(jwt).toBe('a-jwt-value');
  });

  it('throws when testgator_server responds without a jwt field', async () => {
    apiClient.get.mockResolvedValueOnce({
      mode: 'ldap',
      usernameIsEmail: false,
    });
    apiClient.post.mockResolvedValueOnce({});

    await expect(
      service.login('dev@example.com', 'wrong'),
    ).rejects.toBeInstanceOf(ApiClientError);
  });

  it('propagates the ApiClientError from a failed login call', async () => {
    apiClient.get.mockResolvedValueOnce({
      mode: 'ldap',
      usernameIsEmail: false,
    });
    const loginError = new ApiClientError(
      'Invalid credentials.',
      401,
      'Invalid credentials.',
    );
    apiClient.post.mockRejectedValueOnce(loginError);

    await expect(service.login('dev@example.com', 'wrong')).rejects.toBe(
      loginError,
    );
  });
});
