import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface PlanCreateOptions {
  release: string;
  name: string;
  dueDate: string;
  description?: string;
  state?: string;
  content?: string;
}

@SubCommand({
  name: 'create',
  description:
    'Create a test plan under a release. The new plan starts with an ' +
    'empty questionsOrder — there is no flag here to set it; only ' +
    '`plan duplicate` populates questionsOrder automatically.',
})
export class PlanCreateCommand extends CommandRunner {
  constructor(private readonly planService: PlanService) {
    super();
  }

  async run(
    _passedParams: string[],
    options: PlanCreateOptions,
  ): Promise<void> {
    try {
      const plan = await this.planService.create(options);
      console.log(JSON.stringify(plan));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to create test plan.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--release <id>',
    description: 'The release id the new plan belongs to.',
    required: true,
  })
  parseRelease(value: string): string {
    return value;
  }

  @Option({
    flags: '--name <name>',
    description: 'Name for the new plan.',
    required: true,
  })
  parseName(value: string): string {
    return value;
  }

  @Option({
    flags: '--due-date <date>',
    description: 'Due date (ISO 8601) for the new plan.',
    required: true,
  })
  parseDueDate(value: string): string {
    return value;
  }

  @Option({
    flags: '--description <text>',
    description: 'Optional description for the plan (defaults to "").',
  })
  parseDescription(value: string): string {
    return value;
  }

  @Option({
    flags: '--state <state>',
    description: 'Plan state (draft|published|archived); defaults to draft.',
  })
  parseState(value: string): string {
    return value;
  }

  @Option({
    flags: '--content <text>',
    description: 'Optional content/instructions for the plan.',
  })
  parseContent(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return (
      '\nExample:\n' +
      '  $ testgator-cli plan create --release 5 --name "Regression — Sprint 42" --due-date 2026-08-01T00:00:00+00:00\n'
    );
  }
}
