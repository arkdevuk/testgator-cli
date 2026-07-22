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
}
