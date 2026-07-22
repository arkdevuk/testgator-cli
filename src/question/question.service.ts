import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService, ShapedCollection } from '../hydra/hydra.service';
import { PaginationFilters, paginationParams } from '../pagination';

export interface QuestionCreateInput {
  plan: string;
  name: string;
  content?: string;
  displayOrder?: number;
}

export interface QuestionUpdateInput {
  name?: string;
  plan?: string;
  content?: string;
  displayOrder?: number;
}

export interface QuestionListFilters extends PaginationFilters {
  /**
   * Filters questions down to a single test plan. Question.php's `plan`
   * field carries its own `#[ApiFilter(SearchFilter::class, strategy:
   * 'exact')]` — a plain numeric id works, matching the convention already
   * confirmed for plan/project filters (task 08).
   */
  plan?: string;
}

/**
 * Resource layer for questions (`/api/questions`), following the pattern
 * established in src/project/project.service.ts (task 07).
 */
@Injectable()
export class QuestionService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  async list(filters: QuestionListFilters = {}): Promise<ShapedCollection> {
    const params = paginationParams(filters);
    if (filters.plan) {
      params.plan = filters.plan;
    }

    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/questions',
      params,
    );
    return this.hydra.shapeCollection(raw);
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      `/api/questions/${id}`,
    );
    return this.hydra.shapeItem(raw);
  }

  /**
   * Per Question.php: `plan` and `name` are required (non-nullable);
   * `content` is a nullable text column and `displayOrder` defaults to `0`
   * server-side (`options: ['default' => 0]`), so both are safe to omit
   * entirely — unlike TestPlan's `description` (task 18), there's no NOT
   * NULL trap here.
   *
   * Note: this does NOT append the new question to its plan's
   * questionsOrder — that array is only ever written by `plan duplicate`'s
   * orchestration (task 12). The command's --help says so explicitly.
   */
  async create(input: QuestionCreateInput): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      name: input.name,
      plan: `/api/test_plans/${input.plan}`,
    };
    if (input.content !== undefined) {
      payload.content = input.content;
    }
    if (input.displayOrder !== undefined) {
      payload.displayOrder = input.displayOrder;
    }

    const raw = await this.apiClient.post<Record<string, unknown>>(
      '/api/questions',
      payload,
    );
    return this.hydra.shapeItem(raw);
  }

  async update(
    id: string,
    input: QuestionUpdateInput,
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {};
    if (input.name !== undefined) {
      payload.name = input.name;
    }
    if (input.plan !== undefined) {
      payload.plan = `/api/test_plans/${input.plan}`;
    }
    if (input.content !== undefined) {
      payload.content = input.content;
    }
    if (input.displayOrder !== undefined) {
      payload.displayOrder = input.displayOrder;
    }

    const raw = await this.apiClient.patch<Record<string, unknown>>(
      `/api/questions/${id}`,
      payload,
    );
    return this.hydra.shapeItem(raw);
  }
}
