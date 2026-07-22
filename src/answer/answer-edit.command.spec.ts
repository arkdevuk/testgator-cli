import { AnswerEditCommand } from './answer-edit.command';
import { AnswerService } from './answer.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('AnswerEditCommand', () => {
  let answerService: { update: jest.Mock };
  let command: AnswerEditCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    answerService = { update: jest.fn() };
    command = new AnswerEditCommand(answerService as unknown as AnswerService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('edits an answer with only the passed fields and prints it as compact JSON', async () => {
    answerService.update.mockResolvedValueOnce({ id: 501, state: 'failed' });

    await command.run(['501'], { state: 'failed' });

    expect(answerService.update).toHaveBeenCalledWith('501', {
      state: 'failed',
    });
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 501, state: 'failed' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code for a nonexistent answer', async () => {
    answerService.update.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999'], { state: 'failed' });

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });

  describe('option parsing', () => {
    it('parses --important true/false into booleans', () => {
      expect(command.parseImportant('true')).toBe(true);
      expect(command.parseImportant('false')).toBe(false);
    });

    it('parses --ignored true/false into booleans', () => {
      expect(command.parseIgnored('true')).toBe(true);
      expect(command.parseIgnored('false')).toBe(false);
    });

    it('parses --state and --comment as plain strings', () => {
      expect(command.parseState('failed')).toBe('failed');
      expect(command.parseComment('Reproduces every time.')).toBe(
        'Reproduces every time.',
      );
    });
  });
});
