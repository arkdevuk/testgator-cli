import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Reads/writes the locally cached JWT (and, since task 15, the API URL
 * configured via `testgator-cli setup`) so a `testgator-cli` session only
 * has to authenticate once, not on every command.
 *
 * Lives in its own module (rather than under auth/) because both AuthModule
 * (writes, on login) and ApiClientModule (reads, to attach the Authorization
 * header — see task 05 — and now, to resolve the cached API URL — see task
 * 15) need it, and auth already depends on api-client.
 *
 * Defaults to ~/.testgator/{token,api-url}, matching agent_data/tasks/04's
 * brief. Overridable via TESTGATOR_CONFIG_DIR (used by tests to avoid
 * touching the real home directory).
 *
 * The token and API URL are deliberately two separate flat files rather than
 * one JSON blob — every prior task's tests write/read the bare `token` file
 * directly, and this keeps that format completely untouched.
 */
@Injectable()
export class TokenCacheService {
  private get configDir(): string {
    return (
      process.env.TESTGATOR_CONFIG_DIR || path.join(os.homedir(), '.testgator')
    );
  }

  private get tokenPath(): string {
    return path.join(this.configDir, 'token');
  }

  private get apiUrlPath(): string {
    return path.join(this.configDir, 'api-url');
  }

  /** Returns the cached JWT, or null if none is cached. */
  read(): string | null {
    return this.readFile(this.tokenPath);
  }

  /** Persists the JWT, creating the cache directory if it doesn't exist yet. */
  write(token: string): void {
    this.writeFile(this.tokenPath, token);
  }

  /** Removes the cached JWT, if any (used on a 401 — see ApiClientService). */
  clear(): void {
    this.removeFile(this.tokenPath);
  }

  /** Returns the cached API URL (set via `setup`), or null if none is cached. */
  readApiUrl(): string | null {
    return this.readFile(this.apiUrlPath);
  }

  /** Persists the API URL, creating the cache directory if it doesn't exist yet. */
  writeApiUrl(apiUrl: string): void {
    this.writeFile(this.apiUrlPath, apiUrl);
  }

  private readFile(filePath: string): string | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      return content.length > 0 ? content : null;
    } catch {
      return null;
    }
  }

  private writeFile(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, { mode: 0o600 });
  }

  private removeFile(filePath: string): void {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Nothing cached — fine.
    }
  }
}
