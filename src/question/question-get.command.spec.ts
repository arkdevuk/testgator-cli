import { QuestionGetCommand } from './question-get.command';
import { QuestionService } from './question.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('QuestionGetCommand', () => {
  let questionService: { get: jest.Mock };
  let command: QuestionGetCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    questionService = { get: jest.fn() };
    command = new QuestionGetCommand(
      questionService as unknown as QuestionService,
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
    questionService.get.mockResolvedValueOnce({
      id: 101,
      name: 'Can you log in?',
    });

    await command.run(['101']);

    expect(questionService.get).toHaveBeenCalledWith('101');
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 101, name: 'Can you log in?' }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    questionService.get.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
