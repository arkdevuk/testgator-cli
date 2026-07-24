import { TesterNoteListCommand } from './tester-note-list.command';
import { TesterNoteService } from './tester-note.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TesterNoteListCommand', () => {
  let testerNoteService: { list: jest.Mock };
  let command: TesterNoteListCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    testerNoteService = { list: jest.fn() };
    command = new TesterNoteListCommand(
      testerNoteService as unknown as TesterNoteService,
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

  it('prints the compact item array and forwards testerId + options to the service', async () => {
    testerNoteService.list.mockResolvedValueOnce({
      items: [{ id: 'note-1', content: 'Very responsive tester' }],
      totalItems: 1,
    });

    await command.run(['8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f'], {
      page: 2,
      itemsPerPage: 5,
    });

    expect(testerNoteService.list).toHaveBeenCalledWith(
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      { page: 2, itemsPerPage: 5 },
    );
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ id: 'note-1', content: 'Very responsive tester' }]),
    );
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    testerNoteService.list.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['unknown-id'], {});

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
