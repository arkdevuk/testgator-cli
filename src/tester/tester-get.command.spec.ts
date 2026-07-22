import { TesterGetCommand } from './tester-get.command';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TesterGetCommand', () => {
  let testerService: { get: jest.Mock };
  let command: TesterGetCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    testerService = { get: jest.fn() };
    command = new TesterGetCommand(testerService as unknown as TesterService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('fetches by the passed UUID and prints the shaped item as compact JSON', async () => {
    testerService.get.mockResolvedValueOnce({
      id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      email: 'tester@example.com',
    });

    await command.run(['8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f']);

    expect(testerService.get).toHaveBeenCalledWith(
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
    );
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
        email: 'tester@example.com',
      }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    testerService.get.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['does-not-exist']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
