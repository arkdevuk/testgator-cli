import { TagListCommand } from './tag-list.command';
import { TagService } from './tag.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('TagListCommand', () => {
  let tagService: { list: jest.Mock };
  let command: TagListCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    tagService = { list: jest.fn() };
    command = new TagListCommand(tagService as unknown as TagService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it('prints the compact item array and forwards options to the service', async () => {
    tagService.list.mockResolvedValueOnce({
      items: [{ id: 'vip', label: 'VIP', deleted: false }],
      totalItems: 1,
    });

    await command.run([], { search: 'vi', page: 2, itemsPerPage: 5 });

    expect(tagService.list).toHaveBeenCalledWith({
      search: 'vi',
      page: 2,
      itemsPerPage: 5,
    });
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ id: 'vip', label: 'VIP', deleted: false }]),
    );
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    tagService.list.mockRejectedValueOnce(new ApiClientError('Boom', 500));

    await command.run([], {});

    expect(errorSpy).toHaveBeenCalledWith('Error: Boom');
    expect(process.exitCode).toBe(1);
  });
});
