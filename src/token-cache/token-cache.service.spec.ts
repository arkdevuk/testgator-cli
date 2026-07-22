import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TokenCacheService } from './token-cache.service';

describe('TokenCacheService', () => {
  let tempDir: string;
  let service: TokenCacheService;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-'));
    process.env.TESTGATOR_CONFIG_DIR = tempDir;
    service = new TokenCacheService();
  });

  afterEach(() => {
    delete process.env.TESTGATOR_CONFIG_DIR;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns null when nothing is cached yet', () => {
    expect(service.read()).toBeNull();
  });

  it('writes then reads back the same token, creating the directory as needed', () => {
    // TESTGATOR_CONFIG_DIR itself exists (mkdtemp), but write() must still
    // work if a deeper, not-yet-created dir were configured.
    const deeperDir = path.join(tempDir, 'nested');
    process.env.TESTGATOR_CONFIG_DIR = deeperDir;
    service = new TokenCacheService();

    service.write('a-jwt-value');

    expect(fs.existsSync(deeperDir)).toBe(true);
    expect(service.read()).toBe('a-jwt-value');
  });

  it('overwrites a previously cached token', () => {
    service.write('first-token');
    service.write('second-token');

    expect(service.read()).toBe('second-token');
  });

  it('trims trailing whitespace/newlines from the cached file', () => {
    fs.writeFileSync(path.join(tempDir, 'token'), 'a-jwt-value\n');

    expect(service.read()).toBe('a-jwt-value');
  });

  it('clear() removes the cached token', () => {
    service.write('a-jwt-value');
    service.clear();

    expect(service.read()).toBeNull();
  });

  it('clear() is a no-op when nothing is cached', () => {
    expect(() => service.clear()).not.toThrow();
  });

  describe('API URL cache', () => {
    it('returns null when no API URL is cached yet', () => {
      expect(service.readApiUrl()).toBeNull();
    });

    it('writes then reads back the same API URL, independently of the token', () => {
      service.writeApiUrl('https://testgator.example.com');

      expect(service.readApiUrl()).toBe('https://testgator.example.com');
      expect(service.read()).toBeNull();
    });

    it('overwrites a previously cached API URL', () => {
      service.writeApiUrl('https://first.example.com');
      service.writeApiUrl('https://second.example.com');

      expect(service.readApiUrl()).toBe('https://second.example.com');
    });

    it('does not affect the cached token when writing the API URL', () => {
      service.write('a-jwt-value');
      service.writeApiUrl('https://testgator.example.com');

      expect(service.read()).toBe('a-jwt-value');
      expect(service.readApiUrl()).toBe('https://testgator.example.com');
    });
  });
});
