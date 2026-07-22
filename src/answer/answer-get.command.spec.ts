import { AnswerGetCommand } from './answer-get.command';
import { AnswerService } from './answer.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('AnswerGetCommand', () => {
  let answerService: { get: jest.Mock };
  let command: AnswerGetCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    answerService = { get: jest.fn() };
    command = new AnswerGetCommand(answerService as unknown as AnswerService);
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
    answerService.get.mockResolvedValueOnce({
      id: 501,
      state: 'pass_with_bugs',
      files: ['/api/files/abc'],
    });

    await command.run(['501']);

    expect(answerService.get).toHaveBeenCalledWith('501');
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        id: 501,
        state: 'pass_with_bugs',
        files: ['/api/files/abc'],
      }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    answerService.get.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
