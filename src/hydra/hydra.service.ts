import { Injectable } from '@nestjs/common';

export interface ShapedCollection<T = Record<string, unknown>> {
  items: T[];
  totalItems: number;
}

/**
 * Turns testgator_server's Hydra/JSON-LD responses into plain JSON.
 *
 * testgator_server (API Platform) responses carry `@context`/`@id`/`@type` on
 * every object, and collections are wrapped as `{ totalItems, member: [...] }`
 * (hydra_prefix defaults to false in this project's API Platform config, so
 * the keys are bare `member`/`totalItems`, not `hydra:member`/`hydra:totalItems`
 * — see agent_data/tasks/02-hydra-response-shaping-utility-open.md for the
 * sourcing behind this). None of that envelope is useful to an agent — this
 * service strips it down to the fields that matter.
 *
 * Pure data transformation only — no HTTP here (see hydra.client.ts, task 03).
 */
@Injectable()
export class HydraService {
  /**
   * Resolves a resource IRI (e.g. `/api/test_plans/12`, `/api/test_plans/12/`)
   * down to its trailing id segment. Returns a number when that segment is
   * numeric (the common case — Doctrine auto-increment ids), otherwise
   * returns the raw string segment (e.g. a GUID-based id).
   */
  resolveIriId(iri: string): string | number {
    const trimmed = iri.replace(/\/+$/, '');
    const segment = trimmed.substring(trimmed.lastIndexOf('/') + 1);
    const asNumber = Number(segment);
    return segment !== '' && !Number.isNaN(asNumber) ? asNumber : segment;
  }

  /**
   * Strips `@context`/`@id`/`@type` from a single Hydra/JSON-LD object,
   * keeping every other field as-is. If the object doesn't already carry a
   * plain `id` field (testgator_server's resources generally do), one is
   * derived from `@id` via resolveIriId.
   *
   * Relation fields (e.g. `plan: "/api/test_plans/12"`) are left as IRI
   * strings — callers resolve those with resolveIriId themselves where it's
   * actually needed, rather than this shaper guessing which string fields
   * are relations.
   */
  shapeItem<T extends Record<string, unknown>>(
    raw: T,
  ): Record<string, unknown> {
    const rest: Record<string, unknown> = { ...raw };
    const atId = rest['@id'];
    delete rest['@context'];
    delete rest['@id'];
    delete rest['@type'];

    if (rest.id === undefined && typeof atId === 'string') {
      rest.id = this.resolveIriId(atId);
    }

    return rest;
  }

  /**
   * Unwraps a Hydra/JSON-LD collection response into `{ items, totalItems }`,
   * shaping each member via shapeItem. Falls back to the `hydra:`-prefixed
   * keys too, matching the defensive pattern already used in testgator_client
   * (see e.g. useTestersQuery.js), in case hydra_prefix is ever turned on.
   */
  shapeCollection(raw: Record<string, unknown>): ShapedCollection {
    const members = (raw['member'] ?? raw['hydra:member'] ?? []) as Record<
      string,
      unknown
    >[];
    const totalItems = (raw['totalItems'] ??
      raw['hydra:totalItems'] ??
      members.length) as number;

    return {
      items: members.map((item) => this.shapeItem(item)),
      totalItems,
    };
  }
}
