import { PlanGetCommand } from './plan-get.command';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('PlanGetCommand', () => {
  let planService: { get: jest.Mock };
  let command: PlanGetCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    planService = { get: jest.fn() };
    command = new PlanGetCommand(planService as unknown as PlanService);
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
    planService.get.mockResolvedValueOnce({ id: 12, state: 'published' });

    await command.run(['12']);

    expect(planService.get).toHaveBeenCalledWith('12');
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 12, state: 'published' }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    planService.get.mockRejectedValueOnce(new ApiClientError('Not Found', 404));

    await command.run(['999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
