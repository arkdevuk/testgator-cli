import { PlanEditCommand } from './plan-edit.command';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('PlanEditCommand', () => {
  let planService: { update: jest.Mock };
  let command: PlanEditCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    planService = { update: jest.fn() };
    command = new PlanEditCommand(planService as unknown as PlanService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('edits a plan with only the passed fields and prints it as compact JSON', async () => {
    planService.update.mockResolvedValueOnce({
      id: 12,
      name: 'Sprint 42 regression (updated)',
    });

    await command.run(['12'], { name: 'Sprint 42 regression (updated)' });

    expect(planService.update).toHaveBeenCalledWith('12', {
      name: 'Sprint 42 regression (updated)',
    });
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 12, name: 'Sprint 42 regression (updated)' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code for a nonexistent plan', async () => {
    planService.update.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999'], { name: 'x' });

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
