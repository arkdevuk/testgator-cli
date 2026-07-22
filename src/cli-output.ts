import { createColors } from 'picocolors';

/**
 * Colors are enabled only when stdout is a real interactive terminal.
 *
 * Deliberately narrower than picocolors' own default (which also lights up
 * under `CI=true` or `FORCE_COLOR`, even with no TTY attached) — this CLI's
 * primary consumer is an agent reading output through a tool call, which
 * never has a TTY, and this keeps every command's plain-text output
 * deterministic regardless of which environment (a developer's terminal,
 * CI, an agent) runs it.
 *
 * Recomputed per call rather than cached at module load — cheap (picocolors
 * just returns a small object of closures), and it's what makes this
 * testable without needing to reset the module between TTY/non-TTY cases.
 */
function colorsEnabled(): boolean {
  return process.stdout.isTTY === true;
}

/**
 * Prints a short human-readable success/status line — green on a real
 * terminal, plain text everywhere else. Every command's success path should
 * use this instead of a bare `console.log('...')` status message (data
 * payloads stay on `console.log(JSON.stringify(...))` directly — this is
 * only for the human-facing status line, never for JSON output).
 */
export function printSuccess(message: string): void {
  console.log(createColors(colorsEnabled()).green(message));
}

/**
 * Prints an `Error: ...`-prefixed line to stderr — red on a real terminal,
 * plain text everywhere else. Every command's catch block should call this
 * with just the underlying message, instead of hand-writing
 * `console.error(\`Error: ${message}\`)`.
 */
export function printError(message: string): void {
  console.error(createColors(colorsEnabled()).red(`Error: ${message}`));
}
