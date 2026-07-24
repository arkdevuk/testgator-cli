import { TagDeleteCommand } from './tag-delete.command';
import { TagService } from './tag.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TagDeleteCommand', () => {
  let tagService: { delete: jest.Mock };
  let command: TagDeleteCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    tagService = { delete: jest.fn() };
    command = new TagDeleteCommand(tagService as unknown as TagService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('deletes the tag and prints a success line', async () => {
    tagService.delete.mockResolvedValueOnce(undefined);

    await command.run(['vip']);

    expect(tagService.delete).toHaveBeenCalledWith('vip');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Deleted tag vip.'),
    );
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    tagService.delete.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['does-not-exist']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
