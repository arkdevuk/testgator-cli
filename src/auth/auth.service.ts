import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { ApiClientError } from '../api-client/api-client.error';

interface AuthModeResponse {
  mode: 'db' | 'ldap';
  usernameIsEmail: boolean;
}

interface LoginResponse {
  jwt?: string;
}

/**
 * Mirrors testgator_client's own login flow exactly (see
 * src/Services/Authentication/AuthService.js and src/Store/auth.js):
 * discover the team auth mode (db vs LDAP) first, then log in with it.
 * Tester (OTP) login is explicitly out of scope here — this is for the
 * dev-team CLI operator.
 */
@Injectable()
export class AuthService {
  constructor(private readonly apiClient: ApiClientService) {}

  getAuthMode(): Promise<AuthModeResponse> {
    // Pre-auth endpoint — no token exists yet, and none is required.
    return this.apiClient.get<AuthModeResponse>('/api/auth/mode', undefined, {
      skipAuth: true,
    });
  }

  async login(username: string, password: string): Promise<string> {
    const { mode: authMode } = await this.getAuthMode();

    const response = await this.apiClient.post<LoginResponse>(
      '/api/auth/login',
      {
        username,
        password,
        authMode,
        mode: 'team',
      },
      { skipAuth: true },
    );

    if (!response.jwt) {
      throw new ApiClientError(
        'Login failed: testgator_server did not return a token.',
      );
    }

    return response.jwt;
  }
}
