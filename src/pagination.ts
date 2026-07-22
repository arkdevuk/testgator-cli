/**
 * Shared page/itemsPerPage support for every `list` command.
 *
 * testgator_server (API Platform) paginates every collection endpoint by
 * default — `pagination_client_items_per_page: true` in api_platform.yaml
 * means the client-supplied `itemsPerPage` query param is honored, and
 * `page` (1-based) is always accepted. Left unset, the server falls back to
 * its own default page size (30). This CLI instead always sends an explicit
 * `itemsPerPage`, defaulting to 20 when `--items-per-page` isn't passed, so
 * behavior is the same regardless of server-side config.
 *
 * Every `*ListFilters` interface extends this, and every `list()` method
 * merges `paginationParams(filters)` into its query params alongside its
 * own resource-specific filters (see release.service.ts, plan.service.ts,
 * etc.).
 *
 * Note on detecting the last page: list commands print a plain JSON array
 * (see the "Output convention" in README.md) rather than an envelope with
 * `totalItems`, so there's no in-band page count. An agent paginating
 * through results should keep incrementing `--page` until a response comes
 * back with fewer than `--items-per-page` items.
 */
export interface PaginationFilters {
  /** API Platform's `page` query param (1-based). Omit for page 1. */
  page?: number;
  /** API Platform's `itemsPerPage` query param. Defaults to 20 here. */
  itemsPerPage?: number;
}

export const DEFAULT_ITEMS_PER_PAGE = 20;

export function paginationParams(
  filters: PaginationFilters = {},
): Record<string, string> {
  const params: Record<string, string> = {
    itemsPerPage: String(filters.itemsPerPage ?? DEFAULT_ITEMS_PER_PAGE),
  };
  if (filters.page !== undefined) {
    params.page = String(filters.page);
  }
  return params;
}
