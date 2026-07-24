import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService, ShapedCollection } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import { PaginationFilters, paginationParams } from '../pagination';

export type TesterNoteListFilters = PaginationFilters;

/**
 * Resource layer for free-text notes on a tester (`/api/tester_annotations`,
 * `TesterAnnotation.php`) — a separate API resource from `/api/testers`
 * itself (hence its own service, following the same call as task 24's
 * `TagService` rather than folding this into `TesterService`).
 *
 * `relateTo` is a `User` relation used generically to attach an annotation
 * to any account; for tester notes that's always `/api/testers/<testerId>`
 * (same IRI-construction pattern as InviteService's `testerIri`).
 * `createdBy` is set server-side by `TesterAnnotationStateProcessor` from
 * the authenticated user — never sent by this CLI.
 */
@Injectable()
export class TesterNoteService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  /** Newest-first by default (`order[created]=desc`) — matches how a note thread is naturally read. */
  async list(
    testerId: string,
    filters: TesterNoteListFilters = {},
  ): Promise<ShapedCollection> {
    const params = paginationParams(filters);
    params.relateTo = `/api/testers/${testerId}`;
    params['order[created]'] = 'desc';

    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/tester_annotations',
      params,
    );
    const shaped = this.hydra.shapeCollection(raw);

    return {
      items: shaped.items.map((item) => this.toCompact(item)),
      totalItems: shaped.totalItems,
    };
  }

  /**
   * TesterAnnotation.php has no server-side constraint on `content` (unlike
   * TesterTag's `label`, which has NotBlank) — a blank note would otherwise
   * round-trip successfully as a useless empty record, so this is rejected
   * client-side before the request.
   */
  async add(
    testerId: string,
    content: string,
  ): Promise<Record<string, unknown>> {
    if (content.trim() === '') {
      throw new ApiClientError('Note content cannot be empty.');
    }

    const raw = await this.apiClient.post<Record<string, unknown>>(
      '/api/tester_annotations',
      {
        relateTo: `/api/testers/${testerId}`,
        content,
      },
    );
    return this.hydra.shapeItem(raw);
  }

  /** `note list` only needs id/content/createdBy/created — updated is bookkeeping (notes aren't edited by this CLI, see task scope). */
  private toCompact(item: Record<string, unknown>): Record<string, unknown> {
    return {
      id: item.id,
      content: item.content,
      createdBy: item.createdBy,
      created: item.created,
    };
  }
}
