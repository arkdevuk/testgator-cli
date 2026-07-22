import { Command, CommandRunner, Help, SubCommand } from 'nest-commander';
import { AppModule } from './app.module';

/**
 * nest-commander stores `@Command`/`@SubCommand` options (class decorators)
 * and `@Help` text (a method decorator) via `Reflect.defineMetadata` under
 * internal keys that aren't part of its public API surface, so they can't
 * be imported directly. Discovering each key by decorating a disposable
 * probe and reading back whatever metadata key actually got attached
 * avoids hardcoding those private strings — if nest-commander ever changes
 * how it stores this, these probes (and every test below) fail loudly
 * instead of silently no-op'ing.
 */
type AnyClass = new (...args: never[]) => object;

function discoverClassMetadataKey(
  decorate: (target: AnyClass) => void,
): string {
  class Probe {}
  decorate(Probe);
  const [key] = Reflect.getMetadataKeys(Probe) as string[];
  if (!key) {
    throw new Error(
      'Could not determine a nest-commander class metadata key — help-audit.spec.ts needs updating.',
    );
  }
  return key;
}

function discoverHelpMetadataKey(): string {
  class Probe {
    example(): string {
      return 'probe';
    }
  }
  const descriptor = Object.getOwnPropertyDescriptor(
    Probe.prototype,
    'example',
  )!;
  Help('after')(Probe.prototype, 'example', descriptor);
  const [key] = Reflect.getMetadataKeys(descriptor.value as object) as string[];
  if (!key) {
    throw new Error(
      "Could not determine nest-commander's @Help metadata key — help-audit.spec.ts needs updating.",
    );
  }
  return key;
}

interface CommandLikeMeta {
  name?: string;
  subCommands?: (new (...args: never[]) => CommandRunner)[];
}

describe('per-command --help audit (drift detection)', () => {
  const commandMetaKey = discoverClassMetadataKey((target) =>
    Command({ name: '__probe__' })(target),
  );
  const subCommandMetaKey = discoverClassMetadataKey((target) =>
    SubCommand({ name: '__probe__' })(target),
  );
  const helpMetaKey = discoverHelpMetadataKey();

  /**
   * Every top-level `@Command`-decorated provider registered anywhere in
   * AppModule's own providers or any directly imported module's providers.
   */
  function findRegisteredTopLevelCommandClasses(): (new (
    ...args: never[]
  ) => CommandRunner)[] {
    const importedModules = (Reflect.getMetadata('imports', AppModule) ??
      []) as unknown[];
    const modulesToScan: unknown[] = [AppModule, ...importedModules];

    const classes = new Set<new (...args: never[]) => CommandRunner>();
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
        if (Reflect.getMetadata(commandMetaKey, provider) !== undefined) {
          classes.add(provider as new (...args: never[]) => CommandRunner);
        }
      }
    }
    return [...classes];
  }

  /**
   * Starting from the top-level classes, follows each command's own
   * `subCommands` metadata (a direct class reference, not something that
   * needs a second module scan) recursively, so every list/get/create/edit
   * subcommand is picked up automatically as new ones are added.
   */
  function collectAllCommandClasses(): (new (
    ...args: never[]
  ) => CommandRunner)[] {
    const topLevel = findRegisteredTopLevelCommandClasses();
    const seen = new Set<new (...args: never[]) => CommandRunner>();
    const queue = [...topLevel];

    while (queue.length > 0) {
      const cls = queue.shift()!;
      if (seen.has(cls)) {
        continue;
      }
      seen.add(cls);

      const meta = (Reflect.getMetadata(commandMetaKey, cls) ??
        Reflect.getMetadata(subCommandMetaKey, cls)) as
        CommandLikeMeta | undefined;
      for (const subCommand of meta?.subCommands ?? []) {
        queue.push(subCommand);
      }
    }

    return [...seen];
  }

  function findHelpExampleText(
    cls: new (...args: never[]) => CommandRunner,
  ): string | undefined {
    const proto = cls.prototype as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === 'constructor') {
        continue;
      }
      const fn = proto[key];
      if (typeof fn !== 'function') {
        continue;
      }
      if (Reflect.getMetadata(helpMetaKey, fn) !== undefined) {
        const helpFn = fn as () => string;
        const text: string = helpFn();
        return text;
      }
    }
    return undefined;
  }

  it('discovers a realistic number of registered commands (sanity check on the walk itself)', () => {
    // 11 top-level groups x their subcommands, ~31 total as of this
    // writing. If this collapses to a handful, the reflection walk above
    // broke — not that the CLI genuinely shrank.
    expect(collectAllCommandClasses().length).toBeGreaterThan(20);
  });

  it("gives every registered command a non-empty @Help('after') example line", () => {
    const allCommands = collectAllCommandClasses();

    const missing: string[] = [];
    for (const cls of allCommands) {
      const meta = (Reflect.getMetadata(commandMetaKey, cls) ??
        Reflect.getMetadata(subCommandMetaKey, cls)) as
        CommandLikeMeta | undefined;
      const label = meta?.name ?? cls.name;

      const exampleText = findHelpExampleText(cls);
      if (!exampleText || exampleText.trim().length === 0) {
        missing.push(label);
      }
    }

    expect(missing).toEqual([]);
  });
});
