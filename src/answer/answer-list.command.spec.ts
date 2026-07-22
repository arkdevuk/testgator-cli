import { AnswerListCommand } from './answer-list.command';
import { AnswerService } from './answer.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('AnswerListCommand', () => {
  let answerService: { list: jest.Mock };
  let command: AnswerListCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    answerService = { list: jest.fn() };
    command = new AnswerListCommand(answerService as unknown as AnswerService);
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
    answerService.list.mockResolvedValueOnce({
      items: [{ id: 501, state: 'pass_with_bugs' }],
      totalItems: 1,
    });

    await command.run([], {});

    expect(answerService.list).toHaveBeenCalledWith({});
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ id: 501, state: 'pass_with_bugs' }]),
    );
  });

  it('passes --question, --plan, and --state through to the service', async () => {
    answerService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { question: '101', plan: '12', state: 'failed' });

    expect(answerService.list).toHaveBeenCalledWith({
      question: '101',
      plan: '12',
      state: 'failed',
    });
  });

  it('passes --page and --items-per-page through to the service', async () => {
    answerService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { page: 2, itemsPerPage: 5 });

    expect(answerService.list).toHaveBeenCalledWith({
      page: 2,
      itemsPerPage: 5,
    });
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    answerService.list.mockRejectedValueOnce(
      new ApiClientError('Not logged in — run `testgator-cli login` first.'),
    );

    await command.run([], {});

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Not logged in — run `testgator-cli login` first.',
    );
    expect(process.exitCode).toBe(1);
  });
});
