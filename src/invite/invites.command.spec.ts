import { InvitesCommand } from './invites.command';
import { InviteService } from './invite.service';

describe('InvitesCommand', () => {
  let inviteService: { inviteMany: jest.Mock };
  let command: InvitesCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    inviteService = { inviteMany: jest.fn() };
    command = new InvitesCommand(inviteService as unknown as InviteService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('parses the comma-separated list, de-dupes, and prints outcomes as JSON', async () => {
    inviteService.inviteMany.mockResolvedValueOnce([
      { email: 'alice@example.com', success: true, result: {} },
      { email: 'bob@example.com', success: true, result: {} },
    ]);

    await command.run(['alice@example.com, bob@example.com,alice@example.com']);

    expect(inviteService.inviteMany).toHaveBeenCalledWith([
      'alice@example.com',
      'bob@example.com',
    ]);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBeUndefined();
  });

  it('sets a non-zero exit code when any outcome failed', async () => {
    inviteService.inviteMany.mockResolvedValueOnce([
      { email: 'alice@example.com', success: true, result: {} },
      { email: 'bad', success: false, error: 'Invalid email.' },
    ]);

    await command.run(['alice@example.com,bad']);

    expect(process.exitCode).toBe(1);
  });

  it('errors without calling the service when the list is empty', async () => {
    await command.run(['   ,  ,']);

    expect(inviteService.inviteMany).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('no email addresses given'),
    );
    expect(process.exitCode).toBe(1);
  });
});
