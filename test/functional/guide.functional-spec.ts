import { CommandTestFactory } from 'nest-commander-testing';
import { AppModule } from '../../src/app.module';

describe('guide (functional)', () => {
  it('runs with no auth/network configured and prints non-empty output', async () => {
    // Deliberately no token cache file, no TESTGATOR_API_URL, no nock
    // interceptors registered — `guide` must work without any of that,
    // since it's static content and never touches ApiClientService.
    process.exitCode = undefined;

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const commandInstance = await CommandTestFactory.createTestingCommand({
      imports: [AppModule],
    }).compile();

    await CommandTestFactory.run(commandInstance, ['guide']);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [printed] = logSpy.mock.calls[0] as [string];
    expect(printed.length).toBeGreaterThan(0);
    expect(process.exitCode).toBeUndefined();

    logSpy.mockRestore();
  });
});
