import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';

export interface InviteResult {
  email: string;
  testerId: string;
  /** True when a new tester account was created; false if one already existed. */
  created: boolean;
}

export interface TestPlanInviteResult extends InviteResult {
  /** True when the tester was already enrolled on the plan before this call. */
  alreadyEnrolled: boolean;
}

export interface InviteOutcome {
  email: string;
  success: boolean;
  result?: InviteResult;
  error?: string;
}

export interface TestPlanInviteOutcome {
  email: string;
  success: boolean;
  result?: TestPlanInviteResult;
  error?: string;
}

/**
 * Orchestrates "inviting" someone to TestGator as a tester.
 *
 * testgator_server has no dedicated invite endpoint: a tester account
 * (`/api/testers`, User.php under the `Tester` short name) triggers the
 * server's own "tester-welcome" email automatically as soon as it's created
 * (see CreateTesterListener/TesterManager::handlePostCreation — a Doctrine
 * postPersist hook, not something this CLI calls directly). So "invite" here
 * just means "ensure a tester account exists for this email" — find it by
 * exact email match if it exists, otherwise create it (POST triggers the
 * email as a side effect on the server).
 *
 * `email` carries a `partial` SearchFilter server-side (not `exact` — see
 * User.php), so a lookup is always followed by a client-side exact-match
 * check to avoid a substring false positive (e.g. "leo@x.com" matching
 * "cleo@x.com").
 *
 * Talks to ApiClientService/HydraService directly rather than through
 * TesterService/PlanService — like PlanDuplicateService (task 12), this
 * orchestrates a specific sequence across two resources (tester + test
 * plan) that's easiest to read and test kept together in one place.
 */
@Injectable()
export class InviteService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  /** Ensures a tester account exists for `email` — the invite itself. */
  async invite(email: string): Promise<InviteResult> {
    const existing = await this.findTesterByEmail(email);
    if (existing) {
      return { email, testerId: String(existing.id), created: false };
    }

    const raw = await this.apiClient.post<Record<string, unknown>>(
      '/api/testers',
      { email },
    );
    const created = this.hydra.shapeItem(raw);
    return { email, testerId: String(created.id), created: true };
  }

  /**
   * Invites every email in `emails`, continuing past individual failures
   * (e.g. one malformed email shouldn't abort the rest of the batch) —
   * check each outcome's `success` field rather than assuming all-or-nothing.
   */
  async inviteMany(emails: string[]): Promise<InviteOutcome[]> {
    const outcomes: InviteOutcome[] = [];
    for (const email of emails) {
      try {
        const result = await this.invite(email);
        outcomes.push({ email, success: true, result });
      } catch (error) {
        outcomes.push({
          email,
          success: false,
          error: this.describeError(error),
        });
      }
    }
    return outcomes;
  }

  /**
   * Ensures a tester account exists for `email`, then enrolls them on the
   * given test plan. TestPlan.testersEnrolled is a full-replacement array
   * (merge-patch replaces the whole field, it doesn't merge array contents —
   * see TestPlan.php/TestPlanStateProcessor.php), so this reads the plan's
   * current roster first and PATCHes back the union, never dropping anyone
   * already enrolled.
   */
  async inviteToTestPlan(
    email: string,
    planId: string,
  ): Promise<TestPlanInviteResult> {
    const inviteResult = await this.invite(email);
    const currentIris = await this.getEnrolledTesterIris(planId);
    const testerIri = `/api/testers/${inviteResult.testerId}`;

    if (currentIris.includes(testerIri)) {
      return { ...inviteResult, alreadyEnrolled: true };
    }

    await this.apiClient.patch(`/api/test_plans/${planId}`, {
      testersEnrolled: [...currentIris, testerIri],
    });

    return { ...inviteResult, alreadyEnrolled: false };
  }

  /**
   * Batch version of inviteToTestPlan — fetches the plan's roster once,
   * invites every email (continuing past individual failures, same as
   * inviteMany), then issues a single PATCH with the accumulated union
   * instead of one PATCH per email.
   */
  async inviteManyToTestPlan(
    emails: string[],
    planId: string,
  ): Promise<TestPlanInviteOutcome[]> {
    const currentIris = await this.getEnrolledTesterIris(planId);
    const newIris: string[] = [];
    const outcomes: TestPlanInviteOutcome[] = [];

    for (const email of emails) {
      try {
        const inviteResult = await this.invite(email);
        const testerIri = `/api/testers/${inviteResult.testerId}`;
        const alreadyEnrolled =
          currentIris.includes(testerIri) || newIris.includes(testerIri);
        if (!alreadyEnrolled) {
          newIris.push(testerIri);
        }
        outcomes.push({
          email,
          success: true,
          result: { ...inviteResult, alreadyEnrolled },
        });
      } catch (error) {
        outcomes.push({
          email,
          success: false,
          error: this.describeError(error),
        });
      }
    }

    if (newIris.length > 0) {
      await this.apiClient.patch(`/api/test_plans/${planId}`, {
        testersEnrolled: [...currentIris, ...newIris],
      });
    }

    return outcomes;
  }

  private async findTesterByEmail(
    email: string,
  ): Promise<Record<string, unknown> | null> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/testers',
      { email },
    );
    const { items } = this.hydra.shapeCollection(raw);
    return items.find((item) => item.email === email) ?? null;
  }

  private async getEnrolledTesterIris(planId: string): Promise<string[]> {
    const rawPlan = await this.apiClient.get<Record<string, unknown>>(
      `/api/test_plans/${planId}`,
    );
    const plan = this.hydra.shapeItem(rawPlan);
    return ((plan.testersEnrolled as string[] | undefined) ?? []).slice();
  }

  private describeError(error: unknown): string {
    return error instanceof ApiClientError ? error.message : 'Unknown error.';
  }
}
