import { PlanListCommand } from './plan-list.command';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('PlanListCommand', () => {
  let planService: { list: jest.Mock };
  let command: PlanListCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    planService = { list: jest.fn() };
    command = new PlanListCommand(planService as unknown as PlanService);
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
    planService.list.mockResolvedValueOnce({
      items: [{ id: 12, name: 'Sprint 42 regression' }],
      totalItems: 1,
    });

    await command.run([], {});

    expect(planService.list).toHaveBeenCalledWith({});
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ id: 12, name: 'Sprint 42 regression' }]),
    );
  });

  it('passes the --project and --release options through to the service', async () => {
    planService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { project: '5', release: '3' });

    expect(planService.list).toHaveBeenCalledWith({
      project: '5',
      release: '3',
    });
  });

  it('passes --page and --items-per-page through to the service', async () => {
    planService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { page: 2, itemsPerPage: 5 });

    expect(planService.list).toHaveBeenCalledWith({
      page: 2,
      itemsPerPage: 5,
    });
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    planService.list.mockRejectedValueOnce(
      new ApiClientError('Not logged in — run `testgator-cli login` first.'),
    );

    await command.run([], {});

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Not logged in — run `testgator-cli login` first.',
    );
    expect(process.exitCode).toBe(1);
  });
});
