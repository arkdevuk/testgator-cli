import { ReleaseListCommand } from './release-list.command';
import { ReleaseService } from './release.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('ReleaseListCommand', () => {
  let releaseService: { list: jest.Mock };
  let command: ReleaseListCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    releaseService = { list: jest.fn() };
    command = new ReleaseListCommand(
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

  it('prints the shaped items as compact JSON with no filters', async () => {
    releaseService.list.mockResolvedValueOnce({
      items: [{ id: 3, name: 'v1.4.0' }],
      totalItems: 1,
    });

    await command.run([], {});

    expect(releaseService.list).toHaveBeenCalledWith({});
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ id: 3, name: 'v1.4.0' }]),
    );
  });

  it('passes the --project option through to the service', async () => {
    releaseService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { project: '1' });

    expect(releaseService.list).toHaveBeenCalledWith({ project: '1' });
  });

  it('passes --page and --items-per-page through to the service', async () => {
    releaseService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { page: 2, itemsPerPage: 5 });

    expect(releaseService.list).toHaveBeenCalledWith({
      page: 2,
      itemsPerPage: 5,
    });
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    releaseService.list.mockRejectedValueOnce(
      new ApiClientError('Not logged in — run `testgator-cli login` first.'),
    );

    await command.run([], {});

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Not logged in — run `testgator-cli login` first.',
    );
    expect(process.exitCode).toBe(1);
  });
});
