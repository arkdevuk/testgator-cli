import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService, ShapedCollection } from '../hydra/hydra.service';
import { PaginationFilters, paginationParams } from '../pagination';

export interface PlanCreateInput {
  release: string;
  name: string;
  dueDate: string;
  description?: string;
  state?: string;
  content?: string;
}

export interface PlanUpdateInput {
  name?: string;
  release?: string;
  dueDate?: string;
  description?: string;
  state?: string;
  content?: string;
}

export interface PlanRemoveTestersResult {
  testersEnrolled: string[];
  enrolledCount: number;
}

export interface PlanListFilters extends PaginationFilters {
  /**
   * Filters plans down to a single project. Maps to the `release.project`
   * query param — testgator_server's TestPlan entity has no direct `project`
   * relation (a plan belongs to a release, which belongs to a project), but
   * exposes an exact SearchFilter on that nested path (see TestPlan.php's
   * `#[ApiFilter(SearchFilter::class, properties: ['release.project' =>
   * 'exact', ...])]`). Confirmed against testgator_client's own usage
   * (Home.jsx: `'release.project': currentProject?.id`) — a plain numeric id
   * works, an IRI is not required.
   */
  project?: string;
  /**
   * Filters plans down to a single release. TestPlan.php's `release` field
   * carries its own `#[ApiFilter(SearchFilter::class, strategy: 'exact')]`.
   */
  release?: string;
}

/**
 * Resource layer for test plans (`/api/test_plans`), following the pattern
 * established in src/project/project.service.ts (task 07).
 */
@Injectable()
export class PlanService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  async list(filters: PlanListFilters = {}): Promise<ShapedCollection> {
    const params = paginationParams(filters);
    if (filters.project) {
      params['release.project'] = filters.project;
    }
    if (filters.release) {
      params.release = filters.release;
    }

    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/test_plans',
      params,
    );
    return this.hydra.shapeCollection(raw);
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      `/api/test_plans/${id}`,
    );
    return this.hydra.shapeItem(raw);
  }

  /**
   * Per TestPlan.php: `release`, `dueDate`, and `name` are required
   * (non-nullable columns). `state` defaults to `draft` server-side (the
   * entity's PHP property default survives denormalization when the field
   * is omitted from the payload), so it's optional here. `description` is
   * a NOT NULL text column with *no* server-side default though —
   * testgator_client's create wizard always sends `description: ''`
   * explicitly rather than relying on the server (see
   * ModalCreateTestPlan.jsx's handleSubmit) — mirrored here to avoid a
   * database-level NOT NULL failure when the caller doesn't pass one.
   * `content` is nullable, so it's safe to omit entirely.
   */
  async create(input: PlanCreateInput): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      name: input.name,
      release: `/api/releases/${input.release}`,
      dueDate: input.dueDate,
      description: input.description ?? '',
    };
    if (input.state !== undefined) {
      payload.state = input.state;
    }
    if (input.content !== undefined) {
      payload.content = input.content;
    }

    const raw = await this.apiClient.post<Record<string, unknown>>(
      '/api/test_plans',
      payload,
    );
    return this.hydra.shapeItem(raw);
  }

  async update(
    id: string,
    input: PlanUpdateInput,
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) {
      payload.name = input.name;
    }
    if (input.release !== undefined) {
      payload.release = `/api/releases/${input.release}`;
    }
    if (input.dueDate !== undefined) {
      payload.dueDate = input.dueDate;
    }
    if (input.description !== undefined) {
      payload.description = input.description;
    }
    if (input.state !== undefined) {
      payload.state = input.state;
    }
    if (input.content !== undefined) {
      payload.content = input.content;
    }

    const raw = await this.apiClient.patch<Record<string, unknown>>(
      `/api/test_plans/${id}`,
      payload,
    );
    return this.hydra.shapeItem(raw);
  }

  /**
   * Removes one or more testers from a plan's enrollment — the inverse of
   * InviteService.inviteToTestPlan. `testersEnrolled` is a full-replacement
   * array server-side (merge-patch replaces the whole field, it doesn't
   * merge array contents), so this reads the plan's current roster first
   * and PATCHes back the reduced set. Detaches enrollment only: it does not
   * delete the testers' existing answers or their accounts.
   *
   * Mirrors TesterService.removeTags' "already absent → skip the PATCH"
   * short-circuit: if none of the given tester ids are actually enrolled,
   * nothing is sent.
   */
  async removeTesters(
    id: string,
    testerIds: string[],
  ): Promise<PlanRemoveTestersResult> {
    const plan = await this.get(id);
    const current = (
      (plan.testersEnrolled as string[] | undefined) ?? []
    ).slice();
    const irisToRemove = testerIds.map(
      (testerId) => `/api/testers/${testerId}`,
    );
    const remaining = current.filter((iri) => !irisToRemove.includes(iri));

    if (remaining.length === current.length) {
      return { testersEnrolled: remaining, enrolledCount: remaining.length };
    }

    await this.apiClient.patch(`/api/test_plans/${id}`, {
      testersEnrolled: remaining,
    });

    return { testersEnrolled: remaining, enrolledCount: remaining.length };
  }
}
