import { QuestionCreateCommand } from './question-create.command';
import { QuestionService } from './question.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('QuestionCreateCommand', () => {
  let questionService: { create: jest.Mock };
  let command: QuestionCreateCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    questionService = { create: jest.fn() };
    command = new QuestionCreateCommand(
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

  it('creates a question and prints it as compact JSON', async () => {
    questionService.create.mockResolvedValueOnce({
      id: 101,
      name: 'Question A',
    });

    const options = { plan: '12', name: 'Question A' };
    await command.run([], options);

    expect(questionService.create).toHaveBeenCalledWith(options);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 101, name: 'Question A' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code on validation failure', async () => {
    questionService.create.mockRejectedValueOnce(
      new ApiClientError('name: This value should not be blank.', 422),
    );

    await command.run([], { plan: '12', name: '' });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: name: This value should not be blank.',
    );
    expect(process.exitCode).toBe(1);
  });
});
