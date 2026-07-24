import { TesterEnableCommand } from './tester-enable.command';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TesterEnableCommand', () => {
  let testerService: { enable: jest.Mock };
  let command: TesterEnableCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    testerService = { enable: jest.fn() };
    command = new TesterEnableCommand(
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

  it('enables the tester and prints the resulting state', async () => {
    testerService.enable.mockResolvedValueOnce({
      id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      active: true,
    });

    await command.run(['8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f']);

    expect(testerService.enable).toHaveBeenCalledWith(
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
    );
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        active: true,
      }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    testerService.enable.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['does-not-exist']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
