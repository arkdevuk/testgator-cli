import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService, ShapedCollection } from '../hydra/hydra.service';
import { PaginationFilters, paginationParams } from '../pagination';

export interface AnswerUpdateInput {
  /** pass | pass_with_bugs | failed | blocked | pending — see AnswerState.php. */
  state?: string;
  comment?: string;
  important?: boolean;
  /** Excludes the answer from stats/reporting. Dev-team (ROLE_USER) only. */
  ignored?: boolean;
}

export interface AnswerListFilters extends PaginationFilters {
  /** Maps to Answer.php's `question` exact SearchFilter. */
  question?: string;
  /**
   * Maps to Answer.php's `question.plan` exact SearchFilter — filters
   * answers down to every question in a given test plan in one call,
   * without the caller having to first list the plan's questions.
   */
  plan?: string;
  /** Maps to Answer.php's `state` exact SearchFilter (pass/pass_with_bugs/failed/blocked/pending). */
  state?: string;
}

/**
 * Resource layer for answers (`/api/answers`) — see Answer.php. Unlike
 * every other resource, Answer's #[ApiResource] sets no normalizationContext
 * group restriction at all, so every field (including systemInfos and
 * attachment metadata via `files`) always serializes.
 */
@Injectable()
export class AnswerService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  async list(filters: AnswerListFilters = {}): Promise<ShapedCollection> {
    const params = paginationParams(filters);
    if (filters.question) {
      params.question = filters.question;
    }
    if (filters.plan) {
      params['question.plan'] = filters.plan;
    }
    if (filters.state) {
      params.state = filters.state;
    }

    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/answers',
      params,
    );
    return this.hydra.shapeCollection(raw);
  }

  async get(id: string): Promise<Record<string, unknown>> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      `/api/answers/${id}`,
    );
    return this.hydra.shapeItem(raw);
  }

  /**
   * Updates dev-team review fields only (state/comment/important/ignored) —
   * answers themselves are created by testers (via the mobile/web client),
   * never by this CLI. Only the fields passed are sent (PATCH, merge
   * semantics). AnswerStateProcessor.php lets a ROLE_USER (dev-team) login
   * set all four freely; a tester login would have `important`/`ignored`
   * silently reset server-side, but this CLI only ever authenticates as
   * dev-team.
   */
  async update(
    id: string,
    input: AnswerUpdateInput,
  ): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {};
    if (input.state !== undefined) payload.state = input.state;
    if (input.comment !== undefined) payload.comment = input.comment;
    if (input.important !== undefined) payload.important = input.important;
    if (input.ignored !== undefined) payload.ignored = input.ignored;

    const raw = await this.apiClient.patch<Record<string, unknown>>(
      `/api/answers/${id}`,
      payload,
    );
    return this.hydra.shapeItem(raw);
  }

  /** Deletes an answer. Requires ROLE_USER (dev-team) — see Answer.php. */
  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/answers/${id}`);
  }
}
