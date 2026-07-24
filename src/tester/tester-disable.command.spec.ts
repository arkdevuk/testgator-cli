import { TesterDisableCommand } from './tester-disable.command';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TesterDisableCommand', () => {
  let testerService: { disable: jest.Mock };
  let command: TesterDisableCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    testerService = { disable: jest.fn() };
    command = new TesterDisableCommand(
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

  it('disables the tester and prints the resulting state', async () => {
    testerService.disable.mockResolvedValueOnce({
      id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      active: false,
    });

    await command.run(['8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f']);

    expect(testerService.disable).toHaveBeenCalledWith(
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
    );
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        active: false,
      }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    testerService.disable.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['does-not-exist']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
