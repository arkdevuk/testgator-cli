import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService, ShapedCollection } from '../hydra/hydra.service';
import { PaginationFilters, paginationParams } from '../pagination';

export interface ReleaseCreateInput {
  project: string;
  name: string;
  description?: string;
}

export interface ReleaseEditInput {
  name?: string;
  project?: string;
  description?: string;
}

export interface ReleaseListFilters extends PaginationFilters {
  /** Maps to Release.php's `project` exact SearchFilter. */
  project?: string;
}

/**
 * Resource layer for releases (`/api/releases`), following the pattern
 * established in src/project/project.service.ts (task 07) and
 * src/plan/plan.service.ts (task 08).
 *
 * Per Release.php: `name` and `project` are required (non-nullable columns),
 * `description` defaults to `''` server-side — so create() requires both but
 * only sends `description` when the caller actually passed one, and edit()
 * only ever sends the fields that were actually passed (PATCH via
 * `application/merge-patch+json`, handled by ApiClientService.patch()).
 */
@Injectable()
export class ReleaseService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  async list(filters: ReleaseListFilters = {}): Promise<ShapedCollection> {
    const params = paginationParams(filters);
    if (filters.project) {
      params.project = filters.project;
    }

    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/releases',
      params,
    );
    return this.hydra.shapeCollection(raw);
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      `/api/releases/${id}`,
    );
    return this.hydra.shapeItem(raw);
  }

  async create(input: ReleaseCreateInput): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      name: input.name,
      project: `/api/projects/${input.project}`,
    };
    if (input.description !== undefined) {
      payload.description = input.description;
    }

    const raw = await this.apiClient.post<Record<string, unknown>>(
      '/api/releases',
      payload,
    );
    return this.hydra.shapeItem(raw);
  }

  async edit(
    id: string,
    input: ReleaseEditInput,
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) {
      payload.name = input.name;
    }
    if (input.project !== undefined) {
      payload.project = `/api/projects/${input.project}`;
    }
    if (input.description !== undefined) {
      payload.description = input.description;
    }

    const raw = await this.apiClient.patch<Record<string, unknown>>(
      `/api/releases/${id}`,
      payload,
    );
    return this.hydra.shapeItem(raw);
  }
}
