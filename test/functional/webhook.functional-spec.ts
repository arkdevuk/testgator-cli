import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import nock from 'nock';
import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

const API_URL = 'https://testgator.example.test';

describe('webhook enable/disable/set-url (functional)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testgator-cli-webhook-'));
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

  it('enables the webhook via PATCH when the setting already exists', async () => {
    const scope = nock(API_URL)
      .patch('/api/settings/webhook.enable_webhook', { value: 'true' })
      .reply(200, {
        '@id': '/api/settings/webhook.enable_webhook',
        id: 'webhook.enable_webhook',
        section: 'webhook',
        name: 'enable_webhook',
        value: 'true',
      });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['webhook', 'enable']);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({
      id: 'webhook.enable_webhook',
      value: 'true',
    });

    logSpy.mockRestore();
  });

  it('disables the webhook, falling back to POST when the row does not exist yet', async () => {
    const scope = nock(API_URL)
      .patch('/api/settings/webhook.enable_webhook', { value: 'false' })
      .reply(404, { detail: 'Not Found' })
      .post('/api/settings', {
        section: 'webhook',
        name: 'enable_webhook',
        value: 'false',
        autoload: false,
        public: false,
      })
      .reply(201, {
        '@id': '/api/settings/webhook.enable_webhook',
        id: 'webhook.enable_webhook',
        section: 'webhook',
        name: 'enable_webhook',
        value: 'false',
      });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['webhook', 'disable']);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({
      id: 'webhook.enable_webhook',
      value: 'false',
    });

    logSpy.mockRestore();
  });

  it('sets the webhook URL via PATCH', async () => {
    const scope = nock(API_URL)
      .patch('/api/settings/webhook.webhook_url', {
        value: 'https://example.test/hook',
      })
      .reply(200, {
        '@id': '/api/settings/webhook.webhook_url',
        id: 'webhook.webhook_url',
        section: 'webhook',
        name: 'webhook_url',
        value: 'https://example.test/hook',
      });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, [
      'webhook',
      'set-url',
      'https://example.test/hook',
    ]);

    expect(scope.isDone()).toBe(true);
    const [printed] = logSpy.mock.calls[0] as [string];
    const parsed: unknown = JSON.parse(printed);
    expect(parsed).toMatchObject({
      id: 'webhook.webhook_url',
      value: 'https://example.test/hook',
    });

    logSpy.mockRestore();
  });

  it('prints a clear error and a non-zero exit code on a 403 (insufficient permissions)', async () => {
    nock(API_URL)
      .patch('/api/settings/webhook.enable_webhook', { value: 'true' })
      .reply(403, { detail: 'Access Denied.' });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['webhook', 'enable']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Access Denied.');
    expect(process.exitCode).toBe(1);

    errorSpy.mockRestore();
  });
});
