import { ReleaseGetCommand } from './release-get.command';
import { ReleaseService } from './release.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('ReleaseGetCommand', () => {
  let releaseService: { get: jest.Mock };
  let command: ReleaseGetCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    releaseService = { get: jest.fn() };
    command = new ReleaseGetCommand(
      releaseService as unknown as ReleaseService,
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

  it('fetches by the passed id and prints the shaped item as compact JSON', async () => {
    releaseService.get.mockResolvedValueOnce({ id: 3, name: 'v1.4.0' });

    await command.run(['3']);

    expect(releaseService.get).toHaveBeenCalledWith('3');
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 3, name: 'v1.4.0' }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    releaseService.get.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
