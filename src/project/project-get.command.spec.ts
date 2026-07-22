import { ProjectGetCommand } from './project-get.command';
import { ProjectService } from './project.service';
import { ApiClientError } from '../api-client/api-client.error';

describe('ProjectGetCommand', () => {
  let projectService: { get: jest.Mock };
  let command: ProjectGetCommand;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    projectService = { get: jest.fn() };
    command = new ProjectGetCommand(
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

  it('fetches by the passed id and prints the shaped item as compact JSON', async () => {
    projectService.get.mockResolvedValueOnce({ id: 1, name: 'TestGator' });

    await command.run(['1']);

    expect(projectService.get).toHaveBeenCalledWith('1');
    expect(logSpy).toHaveBeenCalledWith(
      JSON.stringify({ id: 1, name: 'TestGator' }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a clear error and sets a non-zero exit code on a 404', async () => {
    projectService.get.mockRejectedValueOnce(
      new ApiClientError('Not Found', 404),
    );

    await command.run(['999']);

    expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    expect(process.exitCode).toBe(1);
  });
});
