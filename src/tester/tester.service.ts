import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService, ShapedCollection } from '../hydra/hydra.service';
import { PaginationFilters, paginationParams } from '../pagination';

export interface TesterListFilters extends PaginationFilters {
  /** See the comment on `list()` below for why this is filtered client-side. */
  project?: string;
}

/**
 * Resource layer for testers (`/api/testers` — User.php exposed under the
 * `Tester` short name).
 */
@Injectable()
export class TesterService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  /**
   * Unlike project/plan/question's --project or --plan filters, this one
   * can't be pushed down to the API: User.php only declares SearchFilters
   * on `id`, `email`, and `active` (plus a custom email-only
   * TesterTestingPlanFilter) — there is no filter on the `projects`
   * relation. testgator_client's own useTestersQuery.js sends a `project`
   * query param anyway (see ListTesters.jsx), but since no filter is
   * registered for it server-side, API Platform silently ignores it and
   * the call returns every tester — that's a latent no-op in the frontend,
   * not a filter this CLI should imitate.
   *
   * So: fetch the (shaped) collection — one page of it, per --page/
   * --items-per-page — then filter client-side on each tester's `projects`
   * array (a list of Project IRIs, part of the testers:read group),
   * matching by the resolved plain id.
   *
   * Note this means --project composes awkwardly with pagination: the
   * page size/offset is applied server-side *before* the project filter,
   * so a page can come back with fewer matches than --items-per-page even
   * when more exist on other pages. There's no way around this without a
   * server-side filter on the `projects` relation.
   */
  async list(filters: TesterListFilters = {}): Promise<ShapedCollection> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/testers',
      paginationParams(filters),
    );
    const shaped = this.hydra.shapeCollection(raw);

    if (!filters.project) {
      return shaped;
    }

    const wantedId = filters.project;
    const items = shaped.items.filter((item) => {
      const projectIris = (item.projects ?? []) as string[];
      return projectIris.some(
        (iri) => String(this.hydra.resolveIriId(iri)) === wantedId,
      );
    });

    return { items, totalItems: items.length };
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      `/api/testers/${id}`,
    );
    return this.hydra.shapeItem(raw);
  }

  /**
   * Adds one or more tags to a tester's `tags` array (read-modify-write,
   * merge-patch). Deduped client-side against the tester's current tags
   * before sending — the server dedupes too (`User::setTags` does
   * `array_unique`), but this keeps the PATCH minimal and the call
   * idempotent (adding an already-present tag is a harmless no-op that
   * still round-trips, matching the union semantics of every other
   * read-then-PATCH command in this CLI).
   *
   * Not in scope: validating the tag id against the TesterTag catalog
   * (task 24) — any string is accepted.
   */
  async addTags(id: string, tags: string[]): Promise<string[]> {
    const tester = await this.get(id);
    const current = ((tester.tags as string[] | undefined) ?? []).slice();
    const union = Array.from(new Set([...current, ...tags]));

    await this.apiClient.patch(`/api/testers/${id}`, { tags: union });

    return union;
  }

  /**
   * Removes one or more tags from a tester's `tags` array. Mirrors
   * InviteService.inviteToTestPlan's "already enrolled" short-circuit:
   * if none of the given tags are actually present, the PATCH is skipped
   * entirely rather than sent as a redundant no-op.
   */
  async removeTags(id: string, tags: string[]): Promise<string[]> {
    const tester = await this.get(id);
    const current = ((tester.tags as string[] | undefined) ?? []).slice();
    const remaining = current.filter((tag) => !tags.includes(tag));

    if (remaining.length === current.length) {
      return current;
    }

    await this.apiClient.patch(`/api/testers/${id}`, { tags: remaining });

    return remaining;
  }

  /**
   * Sets a tester's `active` flag (merge-patch). Not admin-gated: despite
   * task 27's original assumption, User.php's Patch operation on
   * `/api/testers/{id}` only requires ROLE_USER — the field-level comment
   * there is explicit that this is intentional ("'testers:write' is
   * required so a team member (ROLE_USER) can PATCH {active: false}"). So
   * any logged-in team member can disable/enable a tester, matching that
   * design rather than a client-side admin check the server doesn't back up.
   */
  private async setActive(
    id: string,
    active: boolean,
  ): Promise<{ id: string; active: boolean }> {
    const raw = await this.apiClient.patch<Record<string, unknown>>(
      `/api/testers/${id}`,
      { active },
    );
    const shaped = this.hydra.shapeItem(raw);
    const shapedId =
      typeof shaped.id === 'string' || typeof shaped.id === 'number'
        ? String(shaped.id)
        : id;

    return { id: shapedId, active: Boolean(shaped.active) };
  }

  /** Deactivates a tester account. Existing answers and enrollments are untouched. */
  async disable(id: string): Promise<{ id: string; active: boolean }> {
    return this.setActive(id, false);
  }

  /** Reactivates a previously disabled tester account. */
  async enable(id: string): Promise<{ id: string; active: boolean }> {
    return this.setActive(id, true);
  }
}
