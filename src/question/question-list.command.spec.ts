import { QuestionListCommand } from './question-list.command';
import { QuestionService } from './question.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('QuestionListCommand', () => {
  let questionService: { list: jest.Mock };
  let command: QuestionListCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    questionService = { list: jest.fn() };
    command = new QuestionListCommand(
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

  it('prints the shaped items as compact JSON with no filters', async () => {
    questionService.list.mockResolvedValueOnce({
      items: [{ id: 101, name: 'Can you log in?' }],
      totalItems: 1,
    });

    await command.run([], {});

    expect(questionService.list).toHaveBeenCalledWith({});
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ id: 101, name: 'Can you log in?' }]),
    );
  });

  it('passes the --plan option through to the service', async () => {
    questionService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { plan: '12' });

    expect(questionService.list).toHaveBeenCalledWith({ plan: '12' });
  });

  it('passes --page and --items-per-page through to the service', async () => {
    questionService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { page: 2, itemsPerPage: 5 });

    expect(questionService.list).toHaveBeenCalledWith({
      page: 2,
      itemsPerPage: 5,
    });
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    questionService.list.mockRejectedValueOnce(
      new ApiClientError('Not logged in — run `testgator-cli login` first.'),
    );

    await command.run([], {});

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Not logged in — run `testgator-cli login` first.',
    );
    expect(process.exitCode).toBe(1);
  });
});
