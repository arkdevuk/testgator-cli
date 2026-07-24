import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService, ShapedCollection } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import { PaginationFilters, paginationParams } from '../pagination';

export interface TagListFilters extends PaginationFilters {
  /** Maps to TesterTag.php's `label` partial SearchFilter. */
  search?: string;
}

/** `TesterTag.php`'s own id-format constraint — see class doc for why this is enforced client-side. */
const VALID_ID = /^[a-z0-9_-]+$/;

/**
 * Resource layer for the tester tag catalog (`/api/tester_tags`,
 * `TesterTag.php`) — the shared pool of {id, label} tags a team draws from
 * when tagging individual testers (task 23's `tester tag add`/`remove`).
 *
 * `id` is caller-supplied here (this CLI always sends it explicitly, rather
 * than relying on TesterTag::setLabel()'s server-side auto-slugify) so
 * output is deterministic and scriptable. Unlike `label` (which has
 * `#[Assert\NotBlank]`/`#[Assert\Length]`), TesterTag.php has *no* server-side
 * validation on `id` itself — only the Get/Delete route `requirements`
 * restrict which ids are reachable afterward (`[a-z0-9_-]+`). A POST with an
 * out-of-pattern id would silently create a tag no `get`/`delete` could ever
 * address again, so this CLI rejects it before the request instead.
 */
@Injectable()
export class TagService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  async list(filters: TagListFilters = {}): Promise<ShapedCollection> {
    const params = paginationParams(filters);
    if (filters.search) {
      params.label = filters.search;
    }

    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/tester_tags',
      params,
    );
    const shaped = this.hydra.shapeCollection(raw);

    return {
      items: shaped.items.map((item) => this.toCompact(item)),
      totalItems: shaped.totalItems,
    };
  }

  async create(id: string, label: string): Promise<Record<string, unknown>> {
    if (!VALID_ID.test(id)) {
      throw new ApiClientError(
        `Invalid tag id "${id}" — must match [a-z0-9_-]+.`,
      );
    }

    const raw = await this.apiClient.post<Record<string, unknown>>(
      '/api/tester_tags',
      { id, label },
    );
    return this.hydra.shapeItem(raw);
  }

  /** Soft-delete — see TesterTagStateProcessor::process(), sets `deleted = true` rather than removing the row. */
  async delete(id: string): Promise<void> {
    await this.apiClient.delete(`/api/tester_tags/${id}`);
  }

  /** `tag list` only needs id/label/deleted — createdBy and the timestampable fields are dev-team bookkeeping, not actionable from a list. */
  private toCompact(item: Record<string, unknown>): Record<string, unknown> {
    return {
      id: item.id,
      label: item.label,
      deleted: item.deleted,
    };
  }
}
