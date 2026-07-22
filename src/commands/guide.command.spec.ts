import { Command, CommandRunner } from 'nest-commander';
import { GuideCommand } from './guide.command';
import { AppModule } from '../app.module';

/**
 * nest-commander's @Command decorator stores its options
 * (`{ name, description, ... }`) via `Reflect.defineMetadata` under an
 * internal key that isn't part of its public API surface, so it can't be
 * imported directly. Discovering it by decorating a disposable probe class
 * and reading back whatever metadata key actually got attached avoids
 * hardcoding that private string — if nest-commander ever changes how it
 * stores this, this probe (and the drift-detection test below) fails loudly
 * instead of silently no-op'ing.
 */
function discoverCommandMetadataKey(): string {
  @Command({ name: '__guide_spec_probe__' })
  class ProbeCommand extends CommandRunner {
    run(): Promise<void> {
      return Promise.resolve();
    }
  }

  const [key] = Reflect.getMetadataKeys(ProbeCommand) as string[];
  if (!key) {
    throw new Error(
      "Could not determine nest-commander's @Command metadata key — " +
        'guide.command.spec.ts needs updating.',
    );
  }
  return key;
}

/**
 * Walks AppModule's own providers plus every directly imported module's
 * providers, and returns the `name` of every provider class carrying
 * top-level `@Command(...)` metadata (NOT `@SubCommand`, which is stored
 * under a different key — this naturally excludes list/get/create/edit
 * subcommands and only catches the parent command groups).
 */
function findRegisteredTopLevelCommandNames(): string[] {
  const commandMetaKey = discoverCommandMetadataKey();

  const importedModules = (Reflect.getMetadata('imports', AppModule) ??
    []) as unknown[];
  const modulesToScan: unknown[] = [AppModule, ...importedModules];

  const names = new Set<string>();
  for (const moduleClass of modulesToScan) {
    if (typeof moduleClass !== 'function') {
      continue;
    }
    const providers = (Reflect.getMetadata('providers', moduleClass) ??
      []) as unknown[];
    for (const provider of providers) {
      if (typeof provider !== 'function') {
        continue; // skip non-class providers (custom { provide, useValue } etc.)
      }
      const meta = Reflect.getMetadata(commandMetaKey, provider) as
        { name?: string } | undefined;
      if (meta?.name) {
        names.add(meta.name);
      }
    }
  }

  return [...names];
}

describe('GuideCommand', () => {
  it('prints non-empty, static text with no dependencies', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    const command = new GuideCommand();
    void command.run();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [printed] = logSpy.mock.calls[0] as [string];
    expect(printed.length).toBeGreaterThan(0);

    logSpy.mockRestore();
  });

  it('mentions every top-level command currently registered in AppModule (drift detection)', () => {
    const registeredNames = findRegisteredTopLevelCommandNames();

    // Sanity check on the probe itself — if this is ever 0 or 1, the
    // reflection walk above is broken (AppModule has ~10 top-level
    // commands as of this writing), not that the CLI genuinely shrank.
    expect(registeredNames.length).toBeGreaterThan(5);

    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    void new GuideCommand().run();
    const [guideText] = logSpy.mock.calls[0] as [string];
    logSpy.mockRestore();

    for (const name of registeredNames) {
      expect(guideText).toContain(name);
    }
  });
});
