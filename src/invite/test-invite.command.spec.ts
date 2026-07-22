import { TestInviteCommand } from './test-invite.command';
import { InviteService } from './invite.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TestInviteCommand', () => {
  let inviteService: { inviteToTestPlan: jest.Mock };
  let command: TestInviteCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    inviteService = { inviteToTestPlan: jest.fn() };
    command = new TestInviteCommand(inviteService as unknown as InviteService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('invites and enrolls the email on the given plan, printing JSON', async () => {
    inviteService.inviteToTestPlan.mockResolvedValueOnce({
      email: 'alice@example.com',
      testerId: 'abc-123',
      created: true,
      alreadyEnrolled: false,
    });

    await command.run(['alice@example.com'], { plan: '12' });

    expect(inviteService.inviteToTestPlan).toHaveBeenCalledWith(
      'alice@example.com',
      '12',
    );
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        email: 'alice@example.com',
        testerId: 'abc-123',
        created: true,
        alreadyEnrolled: false,
      }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code for a nonexistent plan', async () => {
    inviteService.inviteToTestPlan.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['alice@example.com'], { plan: '999' });

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });

  it('parses --plan as a plain string', () => {
    expect(command.parsePlan('12')).toBe('12');
  });
});
