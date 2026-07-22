import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { PlanDuplicateService } from './plan-duplicate.service';
import { PlanDuplicateError } from './plan-duplicate.error';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface PlanDuplicateOptions {
  project: string;
  release: string;
  name: string;
  dueDate: string;
}

@SubCommand({
  name: 'duplicate',
  arguments: '<sourceId>',
  argsDescription: { sourceId: 'The id of the test plan to duplicate' },
  description:
    'Duplicate a test plan (and all its questions) into another release.',
})
export class PlanDuplicateCommand extends CommandRunner {
  constructor(private readonly planDuplicateService: PlanDuplicateService) {
    super();
  }

  async run(
    passedParams: string[],
    options: PlanDuplicateOptions,
  ): Promise<void> {
    const [sourceId] = passedParams;

    try {
      const result = await this.planDuplicateService.duplicate(
        sourceId,
        options,
      );
      console.log(JSON.stringify(result));
    } catch (error) {
      if (error instanceof PlanDuplicateError) {
        printError(error.message);
        process.exitCode = 1;
        return;
      }

      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to duplicate plan.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--project <id>',
    description:
      'The project the new release belongs to (validated against --release).',
    required: true,
  })
  parseProject(value: string): string {
    return value;
  }

  @Option({
    flags: '--release <id>',
    description: 'The release the duplicated plan will belong to.',
    required: true,
  })
  parseRelease(value: string): string {
    return value;
  }

  @Option({
    flags: '--name <name>',
    description: 'Name for the duplicated plan.',
    required: true,
  })
  parseName(value: string): string {
    return value;
  }

  @Option({
    flags: '--due-date <date>',
    description: 'Due date (ISO 8601) for the duplicated plan.',
    required: true,
  })
  parseDueDate(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return (
      '\nExample:\n' +
      '  $ testgator-cli plan duplicate 12 --project 3 --release 5 --name "Sprint 42 regression (copy)" --due-date 2026-09-01T00:00:00+00:00\n'
    );
  }
}
