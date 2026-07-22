import { InviteCommand } from './invite.command';
import { InviteService } from './invite.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('InviteCommand', () => {
  let inviteService: { invite: jest.Mock };
  let command: InviteCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    inviteService = { invite: jest.fn() };
    command = new InviteCommand(inviteService as unknown as InviteService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('invites the email and prints the result as compact JSON', async () => {
    inviteService.invite.mockResolvedValueOnce({
      email: 'alice@example.com',
      testerId: 'abc-123',
      created: true,
    });

    await command.run(['alice@example.com']);

    expect(inviteService.invite).toHaveBeenCalledWith('alice@example.com');
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({
        email: 'alice@example.com',
        testerId: 'abc-123',
        created: true,
      }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    inviteService.invite.mockRejectedValueOnce(
      new ApiClientError('email: This value is not a valid email.', 422),
    );

    await command.run(['not-an-email']);

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: email: This value is not a valid email.',
    );
    expect(process.exitCode).toBe(1);
  });

  it('falls back to a generic error message for a non-ApiClientError failure', async () => {
    inviteService.invite.mockRejectedValueOnce(new Error('boom'));

    await command.run(['alice@example.com']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Failed to invite.');
    expect(process.exitCode).toBe(1);
  });
});
