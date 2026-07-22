import { SubCommand, CommandRunner, Help, Option } from 'nest-commander';
import { PlanService } from './plan.service';
import { ApiClientError } from '../api-client/api-client.error';
import { printError } from '../cli-output';

interface PlanEditOptions {
  name?: string;
  release?: string;
  dueDate?: string;
  description?: string;
  state?: string;
  content?: string;
}

@SubCommand({
  name: 'edit',
  arguments: '<id>',
  argsDescription: { id: 'The test plan id to edit' },
  description:
    'Edit a test plan. Only the fields you pass are updated (PATCH, merge semantics). ' +
    'Does not touch questionsOrder — that is set exclusively by `plan duplicate`.',
})
export class PlanEditCommand extends CommandRunner {
  constructor(private readonly planService: PlanService) {
    super();
  }

  async run(passedParams: string[], options: PlanEditOptions): Promise<void> {
    const [id] = passedParams;

    try {
      const plan = await this.planService.update(id, options);
      console.log(JSON.stringify(plan));
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to edit test plan.';
      printError(message);
      process.exitCode = 1;
    }
  }

  @Option({
    flags: '--name <name>',
    description: 'New name for the plan.',
  })
  parseName(value: string): string {
    return value;
  }

  @Option({
    flags: '--release <id>',
    description: 'Move the plan to this release id.',
  })
  parseRelease(value: string): string {
    return value;
  }

  @Option({
    flags: '--due-date <date>',
    description: 'New due date (ISO 8601) for the plan.',
  })
  parseDueDate(value: string): string {
    return value;
  }

  @Option({
    flags: '--description <text>',
    description: 'New description for the plan.',
  })
  parseDescription(value: string): string {
    return value;
  }

  @Option({
    flags: '--state <state>',
    description: 'New state (draft|published|archived) for the plan.',
  })
  parseState(value: string): string {
    return value;
  }

  @Option({
    flags: '--content <text>',
    description: 'New content/instructions for the plan.',
  })
  parseContent(value: string): string {
    return value;
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli plan edit 12 --state published\n';
  }
}
