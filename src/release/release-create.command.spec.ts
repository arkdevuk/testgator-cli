import { ReleaseCreateCommand } from './release-create.command';
import { ReleaseService } from './release.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('ReleaseCreateCommand', () => {
  let releaseService: { create: jest.Mock };
  let command: ReleaseCreateCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    releaseService = { create: jest.fn() };
    command = new ReleaseCreateCommand(
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

  it('creates a release and prints it as compact JSON', async () => {
    releaseService.create.mockResolvedValueOnce({ id: 3, name: 'v1.4.0' });

    await command.run([], { project: '1', name: 'v1.4.0' });

    expect(releaseService.create).toHaveBeenCalledWith({
      project: '1',
      name: 'v1.4.0',
    });
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 3, name: 'v1.4.0' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code on validation failure', async () => {
    releaseService.create.mockRejectedValueOnce(
      new ApiClientError('name: This value should not be blank.', 422),
    );

    await command.run([], { project: '1', name: '' });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: name: This value should not be blank.',
    );
    expect(process.exitCode).toBe(1);
  });
});
