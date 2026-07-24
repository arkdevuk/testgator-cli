import { TesterTagRemoveCommand } from './tester-tag-remove.command';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TesterTagRemoveCommand', () => {
  let testerService: { removeTags: jest.Mock };
  let command: TesterTagRemoveCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    testerService = { removeTags: jest.fn() };
    command = new TesterTagRemoveCommand(
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
    testerService.removeTags.mockResolvedValueOnce(['beta']);

    await command.run(['8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f', 'vip']);

    expect(testerService.removeTags).toHaveBeenCalledWith(
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      ['vip'],
    );
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(['beta']));
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    testerService.removeTags.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['does-not-exist', 'vip']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
