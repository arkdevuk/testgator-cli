import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

const API_URL = 'https://testgator.example.test';

describe('ping (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-ping-'));
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
  });

  it('errors and makes no request when nothing is configured', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['ping']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not set up'),
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('errors and makes no request when the API URL is configured but no token is cached', async () => {
    process.env.TESTGATOR_API_URL = API_URL;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['ping']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Not logged in'),
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('prints apiUrl/status/ttr for a healthy backend, attaching the cached token', async () => {
    fs.writeFileSync(path.join(tempDir, 'token'), 'a-cached-jwt');
    process.env.TESTGATOR_API_URL = API_URL;
    const scope = nock(API_URL)
      .get('/')
      .matchHeader('authorization', 'Bearer a-cached-jwt')
      .reply(200, { healthcheck: 'ok', version: '1.0.0', error: false });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['ping']);

    expect(scope.isDone()).toBe(true);
    const printed = JSON.parse(logSpy.mock.calls[0][0] as string) as {
      apiUrl: string;
      status: number;
      ttrMs: number;
      healthcheck: string;
      version: string;
    };
    expect(printed).toMatchObject({
      apiUrl: API_URL,
      status: 200,
      healthcheck: 'ok',
      version: '1.0.0',
    });
    expect(printed.ttrMs).toBeGreaterThanOrEqual(0);
    expect(process.exitCode).toBeUndefined();

    logSpy.mockRestore();
  });

  it('clears the cached token and reports session-expired on a 401', async () => {
    fs.writeFileSync(path.join(tempDir, 'token'), 'a-stale-jwt');
    process.env.TESTGATOR_API_URL = API_URL;
    nock(API_URL).get('/').reply(401, { detail: 'Expired JWT Token' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['ping']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Session expired'),
    );
    expect(process.exitCode).toBe(1);
    expect(fs.existsSync(path.join(tempDir, 'token'))).toBe(false);

    errorSpy.mockRestore();
  });

  it('reports a clear error when the backend is unreachable', async () => {
    fs.writeFileSync(path.join(tempDir, 'token'), 'a-cached-jwt');
    process.env.TESTGATOR_API_URL = API_URL;
    nock(API_URL)
      .get('/')
      .replyWithError(
        Object.assign(new Error('connect ECONNREFUSED'), {
          code: 'ECONNREFUSED',
        }),
      );

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['ping']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Could not reach ${API_URL}`),
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('reports a non-2xx healthcheck response as an error', async () => {
    fs.writeFileSync(path.join(tempDir, 'token'), 'a-cached-jwt');
    process.env.TESTGATOR_API_URL = API_URL;
    nock(API_URL).get('/').reply(503, { error: 'Service unavailable' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['ping']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`${API_URL} responded with 503`),
    );
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });

  it('uses the API URL cached by `setup` when TESTGATOR_API_URL is unset', async () => {
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'api-url'), API_URL);
    fs.writeFileSync(path.join(tempDir, 'token'), 'a-cached-jwt');
    nock(API_URL)
      .get('/')
      .reply(200, { healthcheck: 'ok', version: '1.0.0', error: false });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['ping']);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();

    logSpy.mockRestore();
  });
});
