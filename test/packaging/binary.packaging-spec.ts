import { execFileSync, execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');

/**
 * This is the one test in the repo that actually runs the packaged binary a
 * real `npm install -g testgator-cli` user gets — every other test (unit and
 * functional) drives commands in-process via nest-commander-testing's
 * CommandTestFactory, which never touches package.json's `bin`/`files`
 * fields, dist/main.js's shebang, or file permissions at all.
 *
 * That gap let a real bug ship: `dist/main.js` had no `#!/usr/bin/env node`
 * line (nothing in src/main.ts ever had one), so a real global install
 * produced a `testgator-cli` executable that the shell tried to interpret as
 * a shell script instead of handing to node — "line 1: use strict: command
 * not found". `npm run build` succeeded, every unit/functional test passed,
 * and the four-gate verification this repo relies on never caught it.
 *
 * This test closes that gap by doing the real thing: `npm pack`, install the
 * resulting tarball into a scratch global prefix, run the installed binary.
 */
describe('packaged binary (smoke)', () => {
  let scratchDir: string;
  let prefixDir: string;

  beforeAll(() => {
    // Build once up front so the packed tarball reflects the current source,
    // not a stale dist/ left over from a previous run.
    execSync('npm run build', { cwd: REPO_ROOT, stdio: 'pipe' });
  });

  beforeEach(() => {
    scratchDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'testgator-cli-packaging-'),
    );
    prefixDir = path.join(scratchDir, 'prefix');
    fs.mkdirSync(prefixDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  });

  it('runs after a real `npm pack` + `npm install -g`, not just in-process command dispatch', () => {
    const packOutput = execSync(
      `npm pack --pack-destination "${scratchDir}" --json`,
      { cwd: REPO_ROOT, encoding: 'utf-8' },
    );
    const [{ filename }] = JSON.parse(packOutput) as Array<{
      filename: string;
    }>;
    const tarballPath = path.join(scratchDir, filename);

    execSync(`npm install -g "${tarballPath}" --prefix "${prefixDir}"`, {
      cwd: scratchDir,
      stdio: 'pipe',
    });

    const binPath = path.join(prefixDir, 'bin', 'testgator-cli');
    expect(fs.existsSync(binPath)).toBe(true);

    // Executed directly (not via `node <path>`) — this is what actually
    // exercises the shebang. Running it through node would pass even with
    // the bug this test exists to catch.
    const helpOutput = execFileSync(binPath, ['--help'], {
      encoding: 'utf-8',
    });

    expect(helpOutput).toContain('Usage: testgator-cli');
    expect(helpOutput).not.toContain('command not found');
    expect(helpOutput).not.toContain('syntax error');
  }, 60_000);
});
