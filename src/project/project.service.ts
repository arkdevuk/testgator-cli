import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService, ShapedCollection } from '../hydra/hydra.service';
import { PaginationFilters, paginationParams } from '../pagination';

export type ProjectListFilters = PaginationFilters;

/**
 * Thin resource layer over ApiClientService + HydraService for projects
 * (`/api/projects`). This is the pattern the other resource commands
 * (tasks 08–11) repeat: a `*.service.ts` that knows the resource's endpoint
 * and hands back shaped plain JSON, with the `*.command.ts` files doing
 * nothing but argument parsing and printing.
 */
@Injectable()
export class ProjectService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  async list(filters: ProjectListFilters = {}): Promise<ShapedCollection> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/projects',
      paginationParams(filters),
    );
    const shaped = this.hydra.shapeCollection(raw);
    return {
      items: shaped.items.map((item) => this.hideAllTesters(item)),
      totalItems: shaped.totalItems,
    };
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      `/api/projects/${id}`,
    );
    return this.hideAllTesters(this.hydra.shapeItem(raw));
  }

  /**
   * `allTesters` (Project.php: every tester ever assigned across any
   * release/plan, part of the `project:read` group) is a bulky IRI array
   * that isn't actionable from `project list`/`project get` — `totalTesters`
   * (a plain count) stays, and the actual roster is a `tester list
   * --project <id>` away. Stripped here rather than in HydraService since
   * this is project-specific display curation, not generic Hydra unwrapping.
   */
  private hideAllTesters(
    item: Record<string, unknown>,
  ): Record<string, unknown> {
    const rest = { ...item };
    delete rest.allTesters;
    return rest;
  }
}
