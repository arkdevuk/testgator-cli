import { TestInvitesCommand } from './test-invites.command';
import { InviteService } from './invite.service';

describe('TestInvitesCommand', () => {
  let inviteService: { inviteManyToTestPlan: jest.Mock };
  let command: TestInvitesCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    inviteService = { inviteManyToTestPlan: jest.fn() };
    command = new TestInvitesCommand(inviteService as unknown as InviteService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('parses the comma-separated list and enrolls everyone on the given plan', async () => {
    inviteService.inviteManyToTestPlan.mockResolvedValueOnce([
      { email: 'alice@example.com', success: true, result: {} },
      { email: 'bob@example.com', success: true, result: {} },
    ]);

    await command.run(['alice@example.com,bob@example.com'], { plan: '12' });

    expect(inviteService.inviteManyToTestPlan).toHaveBeenCalledWith(
      ['alice@example.com', 'bob@example.com'],
      '12',
    );
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  it('sets a non-zero exit code when any outcome failed', async () => {
    inviteService.inviteManyToTestPlan.mockResolvedValueOnce([
      { email: 'alice@example.com', success: true, result: {} },
      { email: 'bad', success: false, error: 'Invalid email.' },
    ]);

    await command.run(['alice@example.com,bad'], { plan: '12' });

    expect(process.exitCode).toBe(1);
  });

  it('errors without calling the service when the list is empty', async () => {
    await command.run(['   ,  ,'], { plan: '12' });

    expect(inviteService.inviteManyToTestPlan).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('no email addresses given'),
    );
    expect(process.exitCode).toBe(1);
  });
});
