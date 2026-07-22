import { TesterListCommand } from './tester-list.command';
import { TesterService } from './tester.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TesterListCommand', () => {
  let testerService: { list: jest.Mock };
  let command: TesterListCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    testerService = { list: jest.fn() };
    command = new TesterListCommand(testerService as unknown as TesterService);
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
    testerService.list.mockResolvedValueOnce({
      items: [{ id: 'abc', email: 'tester@example.com' }],
      totalItems: 1,
    });

    await command.run([], {});

    expect(testerService.list).toHaveBeenCalledWith({});
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ id: 'abc', email: 'tester@example.com' }]),
    );
  });

  it('passes the --project option through to the service', async () => {
    testerService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { project: '2' });

    expect(testerService.list).toHaveBeenCalledWith({ project: '2' });
  });

  it('passes --page and --items-per-page through to the service', async () => {
    testerService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { page: 2, itemsPerPage: 5 });

    expect(testerService.list).toHaveBeenCalledWith({
      page: 2,
      itemsPerPage: 5,
    });
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    testerService.list.mockRejectedValueOnce(
      new ApiClientError('Not logged in — run `testgator-cli login` first.'),
    );

    await command.run([], {});

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Not logged in — run `testgator-cli login` first.',
    );
    expect(process.exitCode).toBe(1);
  });
});
