import { PlanDuplicateCommand } from './plan-duplicate.command';
import { PlanDuplicateService } from './plan-duplicate.service';
import { PlanDuplicateError } from './plan-duplicate.error';
import { ApiClientError } from '../api-client/api-client.error';

describe('PlanDuplicateCommand', () => {
  let planDuplicateService: { duplicate: jest.Mock };
  let command: PlanDuplicateCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  const options = {
    project: '3',
    release: '5',
    name: 'Copy',
    dueDate: '2026-09-01T00:00:00+00:00',
  };

  beforeEach(() => {
    planDuplicateService = { duplicate: jest.fn() };
    command = new PlanDuplicateCommand(
      planDuplicateService as unknown as PlanDuplicateService,
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

  it('passes the source id and options through, and prints the result as compact JSON', async () => {
    planDuplicateService.duplicate.mockResolvedValueOnce({
      id: 99,
      name: 'Copy',
      release: '/api/releases/5',
      questionsCreated: 2,
      questionsTotal: 2,
    });

    await command.run(['12'], options);

    expect(planDuplicateService.duplicate).toHaveBeenCalledWith('12', options);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        id: 99,
        name: 'Copy',
        release: '/api/releases/5',
        questionsCreated: 2,
        questionsTotal: 2,
      }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints the PlanDuplicateError message as-is (it already carries partial-progress detail)', async () => {
    planDuplicateService.duplicate.mockRejectedValueOnce(
      new PlanDuplicateError(
        'Plan 99 was created, but question "B" failed to duplicate (Name is required.). 1/2 questions were created before this failure; questionsOrder was not set.',
        99,
        1,
        2,
      ),
    );

    await command.run(['12'], options);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Plan 99 was created, but question "B" failed to duplicate (Name is required.). 1/2 questions were created before this failure; questionsOrder was not set.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('prints a clear error and sets a non-zero exit code on validation failure', async () => {
    planDuplicateService.duplicate.mockRejectedValueOnce(
      new ApiClientError('Release 5 does not belong to project 999.'),
    );

    await command.run(['12'], { ...options, project: '999' });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Release 5 does not belong to project 999.',
    );
    expect(process.exitCode).toBe(1);
  });
});
