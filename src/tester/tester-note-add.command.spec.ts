import { TesterNoteAddCommand } from './tester-note-add.command';
import { TesterNoteService } from './tester-note.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TesterNoteAddCommand', () => {
  let testerNoteService: { add: jest.Mock };
  let command: TesterNoteAddCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    testerNoteService = { add: jest.fn() };
    command = new TesterNoteAddCommand(
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

  it('adds the note and prints a success line', async () => {
    testerNoteService.add.mockResolvedValueOnce({ id: 'note-1' });

    await command.run([
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      'Very responsive tester',
    ]);

    expect(testerNoteService.add).toHaveBeenCalledWith(
      '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      'Very responsive tester',
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Added note to tester 8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f.',
      ),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    testerNoteService.add.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['unknown-id', 'hello']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
