/**
 * Thrown by PlanDuplicateService when duplication fails partway through
 * question creation. Unlike a plain ApiClientError, this carries enough
 * state for the caller to know exactly what already happened server-side —
 * the new plan does exist (it's created before any questions are), so
 * silently reporting "failed" would leave an agent with an orphaned,
 * incompletely-described plan and no idea what to do next.
 */
export class PlanDuplicateError extends Error {
  constructor(
    message: string,
    /** The new plan's id — always set, since the plan is created first. */
    public readonly newPlanId: number,
    /** How many of the source plan's questions were successfully created before the failure. */
    public readonly questionsCreated: number,
    /** Total number of questions the source plan had. */
    public readonly questionsTotal: number,
  ) {
    super(message);
    this.name = 'PlanDuplicateError';
  }
}
