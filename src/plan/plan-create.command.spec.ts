import { PlanCreateCommand } from './plan-create.command';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('PlanCreateCommand', () => {
  let planService: { create: jest.Mock };
  let command: PlanCreateCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    planService = { create: jest.fn() };
    command = new PlanCreateCommand(planService as unknown as PlanService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('creates a plan and prints it as compact JSON', async () => {
    planService.create.mockResolvedValueOnce({
      id: 12,
      name: 'Sprint 42 regression',
    });

    const options = {
      release: '3',
      name: 'Sprint 42 regression',
      dueDate: '2026-08-01T00:00:00+00:00',
    };
    await command.run([], options);

    expect(planService.create).toHaveBeenCalledWith(options);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 12, name: 'Sprint 42 regression' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code on validation failure', async () => {
    planService.create.mockRejectedValueOnce(
      new ApiClientError('dueDate: This value should not be null.', 422),
    );

    await command.run([], { release: '3', name: 'x', dueDate: '' });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: dueDate: This value should not be null.',
    );
    expect(process.exitCode).toBe(1);
  });
});
