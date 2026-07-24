import { TesterTagAddCommand } from './tester-tag-add.command';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TesterTagAddCommand', () => {
  let testerService: { addTags: jest.Mock };
  let command: TesterTagAddCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    testerService = { addTags: jest.fn() };
    command = new TesterTagAddCommand(
      testerService as unknown as TesterService,
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

  it('passes the tester id and every remaining arg as tags, printing the resulting array', async () => {
    testerService.addTags.mockResolvedValueOnce(['vip', 'beta']);

    await command.run(['8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f', 'vip', 'beta']);

    expect(testerService.addTags).toHaveBeenCalledWith(
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      ['vip', 'beta'],
    );
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(['vip', 'beta']));
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    testerService.addTags.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['does-not-exist', 'vip']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
