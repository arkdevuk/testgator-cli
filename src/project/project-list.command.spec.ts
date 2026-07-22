import { ProjectListCommand } from './project-list.command';
import { ProjectService } from './project.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('ProjectListCommand', () => {
  let projectService: { list: jest.Mock };
  let command: ProjectListCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    projectService = { list: jest.fn() };
    command = new ProjectListCommand(
      projectService as unknown as ProjectService,
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

  it('prints the shaped items as compact JSON', async () => {
    projectService.list.mockResolvedValueOnce({
      items: [{ id: 1, name: 'TestGator' }],
      totalItems: 1,
    });

    await command.run([], {});

    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify([{ id: 1, name: 'TestGator' }]),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints an empty array for an empty collection', async () => {
    projectService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], {});

    expect(logSpy).toHaveBeenCalledWith('[]');
  });

  it('passes --page and --items-per-page through to the service', async () => {
    projectService.list.mockResolvedValueOnce({ items: [], totalItems: 0 });

    await command.run([], { page: 2, itemsPerPage: 5 });

    expect(projectService.list).toHaveBeenCalledWith({
      page: 2,
      itemsPerPage: 5,
    });
  });

  it('prints a clear error and sets a non-zero exit code on failure', async () => {
    projectService.list.mockRejectedValueOnce(
      new ApiClientError('Session expired — run `testgator-cli login` again.'),
    );

    await command.run([], {});

    expect(errorSpy).toHaveBeenCalledWith(
      'Error: Session expired — run `testgator-cli login` again.',
    );
    expect(process.exitCode).toBe(1);
  });
});
