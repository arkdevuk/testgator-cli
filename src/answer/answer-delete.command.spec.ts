import { AnswerDeleteCommand } from './answer-delete.command';
import { AnswerService } from './answer.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('AnswerDeleteCommand', () => {
  let answerService: { delete: jest.Mock };
  let command: AnswerDeleteCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    answerService = { delete: jest.fn() };
    command = new AnswerDeleteCommand(
      answerService as unknown as AnswerService,
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

  it('deletes the answer and prints a success message', async () => {
    answerService.delete.mockResolvedValueOnce(undefined);

    await command.run(['501']);

    expect(answerService.delete).toHaveBeenCalledWith('501');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Deleted answer 501.'),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code for a nonexistent answer', async () => {
    answerService.delete.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error: Not Found'),
    );
    expect(process.exitCode).toBe(1);
  });

  it('falls back to a generic error message for a non-ApiClientError failure', async () => {
    answerService.delete.mockRejectedValueOnce(new Error('boom'));

    await command.run(['501']);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to delete answer.'),
    );
    expect(process.exitCode).toBe(1);
  });
});
