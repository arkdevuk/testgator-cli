import { printSuccess, printError } from './cli-output';

describe('cli-output', () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;
  let originalIsTTY: boolean;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    originalIsTTY = process.stdout.isTTY === true;
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.stdout.isTTY = originalIsTTY;
  });

  describe('when stdout is not a TTY (Jest, piped output, an agent tool call)', () => {
    beforeEach(() => {
      process.stdout.isTTY = false;
    });

    it('printSuccess prints the message as plain, uncolored text', () => {
      printSuccess('Logged in.');

      expect(logSpy).toHaveBeenCalledWith('Logged in.');
    });

    it('printError prints a plain "Error: ..." line', () => {
      printError('Not Found');

      expect(errorSpy).toHaveBeenCalledWith('Error: Not Found');
    });
  });

  describe('when stdout is a real TTY', () => {
    beforeEach(() => {
      process.stdout.isTTY = true;
    });

    it('printSuccess wraps the message in ANSI color codes', () => {
      printSuccess('Logged in.');

      const [printed] = logSpy.mock.calls[0] as [string];
      expect(printed).not.toBe('Logged in.');
      expect(printed).toContain('Logged in.');
      // eslint-disable-next-line no-control-regex -- asserting an ANSI escape code is present
      expect(printed).toMatch(/\x1b\[/);
    });

    it('printError wraps the "Error: ..." line in ANSI color codes', () => {
      printError('Not Found');

      const [printed] = errorSpy.mock.calls[0] as [string];
      expect(printed).toContain('Error: Not Found');
      // eslint-disable-next-line no-control-regex -- asserting an ANSI escape code is present
      expect(printed).toMatch(/\x1b\[/);
    });
  });
});
