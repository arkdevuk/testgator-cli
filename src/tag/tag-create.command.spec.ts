import { TagCreateCommand } from './tag-create.command';
import { TagService } from './tag.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TagCreateCommand', () => {
  let tagService: { create: jest.Mock };
  let command: TagCreateCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    tagService = { create: jest.fn() };
    command = new TagCreateCommand(tagService as unknown as TagService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('creates the tag with the passed id and --label, printing the shaped result', async () => {
    tagService.create.mockResolvedValueOnce({ id: 'vip', label: 'VIP' });

    await command.run(['vip'], { label: 'VIP' });

    expect(tagService.create).toHaveBeenCalledWith('vip', 'VIP');
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 'vip', label: 'VIP' }),
    );
  });

  it('prints a clear error and sets a non-zero exit code on an invalid id', async () => {
    tagService.create.mockRejectedValueOnce(
      new ApiClientError(
        'Invalid tag id "Not Valid!" — must match [a-z0-9_-]+.',
      ),
    );

    await command.run(['Not Valid!'], { label: 'VIP' });

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Invalid tag id "Not Valid!" — must match [a-z0-9_-]+.',
    );
    expect(process.exitCode).toBe(1);
  });
});
