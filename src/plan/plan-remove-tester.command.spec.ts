import { PlanRemoveTesterCommand } from './plan-remove-tester.command';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('PlanRemoveTesterCommand', () => {
  let planService: { removeTesters: jest.Mock };
  let command: PlanRemoveTesterCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    planService = { removeTesters: jest.fn() };
    command = new PlanRemoveTesterCommand(
      planService as unknown as PlanService,
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

  it('forwards the plan id and tester ids, printing the resulting roster', async () => {
    planService.removeTesters.mockResolvedValueOnce({
      testersEnrolled: ['/api/testers/8'],
      enrolledCount: 1,
    });

    await command.run(['12', '7', '9']);

    expect(planService.removeTesters).toHaveBeenCalledWith('12', ['7', '9']);
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ testersEnrolled: ['/api/testers/8'], enrolledCount: 1 }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    planService.removeTesters.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['does-not-exist', '7']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
