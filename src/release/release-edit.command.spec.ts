import { ReleaseEditCommand } from './release-edit.command';
import { ReleaseService } from './release.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('ReleaseEditCommand', () => {
  let releaseService: { edit: jest.Mock };
  let command: ReleaseEditCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    releaseService = { edit: jest.fn() };
    command = new ReleaseEditCommand(
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

  it('edits a release with only the passed fields and prints it as compact JSON', async () => {
    releaseService.edit.mockResolvedValueOnce({ id: 3, name: 'v1.4.1' });

    await command.run(['3'], { name: 'v1.4.1' });

    expect(releaseService.edit).toHaveBeenCalledWith('3', {
      name: 'v1.4.1',
    });
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 3, name: 'v1.4.1' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code for a nonexistent release', async () => {
    releaseService.edit.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999'], { name: 'x' });

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
