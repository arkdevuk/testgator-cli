import { QuestionEditCommand } from './question-edit.command';
import { QuestionService } from './question.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('QuestionEditCommand', () => {
  let questionService: { update: jest.Mock };
  let command: QuestionEditCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    questionService = { update: jest.fn() };
    command = new QuestionEditCommand(
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

  it('edits a question with only the passed fields and prints it as compact JSON', async () => {
    questionService.update.mockResolvedValueOnce({
      id: 101,
      name: 'Updated question name',
    });

    await command.run(['101'], { name: 'Updated question name' });

    expect(questionService.update).toHaveBeenCalledWith('101', {
      name: 'Updated question name',
    });
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 101, name: 'Updated question name' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code for a nonexistent question', async () => {
    questionService.update.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999'], { name: 'x' });

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
