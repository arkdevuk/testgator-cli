import { HydraService } from './hydra.service';
import {
  testPlanItemFixture,
  testPlanCollectionFixture,
  testerItemFixture,
} from '../../test/fixtures';

const emptyCollectionFixture = {
  '@context': '/api/contexts/TestPlan',
  '@id': '/api/test_plans',
  '@type': 'Collection',
  totalItems: 0,
  member: [],
};

describe('HydraService', () => {
  let service: HydraService;

  beforeEach(() => {
    service = new HydraService();
  });

  describe('shapeItem', () => {
    it('strips @context/@id/@type from a typical object response', () => {
      const shaped = service.shapeItem(testPlanItemFixture);

      expect(shaped).not.toHaveProperty('@context');
      expect(shaped).not.toHaveProperty('@id');
      expect(shaped).not.toHaveProperty('@type');
      expect(shaped).toMatchObject({
        id: 12,
        name: 'Sprint 42 regression',
        state: 'published',
        release: '/api/releases/3',
        questionsOrder: ['/api/questions/101', '/api/questions/102'],
      });
    });

    it('derives a plain id from @id when the object has no id field', () => {
      const { id: _id, ...withoutId } = testPlanItemFixture;
      void _id;

      const shaped = service.shapeItem(withoutId);

      expect(shaped.id).toBe(12);
    });

    it('handles a response missing optional fields', () => {
      const minimal = {
        '@context': '/api/contexts/TestPlan',
        '@id': '/api/test_plans/14',
        '@type': 'TestPlan',
        id: 14,
        name: 'Minimal plan',
      };

      const shaped = service.shapeItem(minimal);

      expect(shaped).toEqual({ id: 14, name: 'Minimal plan' });
    });

    it('keeps a non-numeric plain id as-is (e.g. a tester UUID)', () => {
      const shaped = service.shapeItem(testerItemFixture);

      expect(shaped.id).toBe('8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f');
    });
  });

  describe('shapeCollection', () => {
    it('unwraps a typical collection response', () => {
      const shaped = service.shapeCollection(testPlanCollectionFixture);

      expect(shaped.totalItems).toBe(2);
      expect(shaped.items).toHaveLength(2);
      expect(shaped.items[0]).not.toHaveProperty('@id');
      expect(shaped.items[0]).toMatchObject({
        id: 12,
        name: 'Sprint 42 regression',
      });
      expect(shaped.items[1]).toMatchObject({
        id: 13,
        name: 'Sprint 42 smoke test',
      });
    });

    it('handles an empty collection', () => {
      const shaped = service.shapeCollection(emptyCollectionFixture);

      expect(shaped).toEqual({ items: [], totalItems: 0 });
    });

    it('falls back to hydra:-prefixed keys if hydra_prefix is ever enabled', () => {
      const prefixed = {
        '@context': '/api/contexts/TestPlan',
        '@id': '/api/test_plans',
        '@type': 'hydra:Collection',
        'hydra:totalItems': 1,
        'hydra:member': [testPlanItemFixture],
      };

      const shaped = service.shapeCollection(prefixed);

      expect(shaped.totalItems).toBe(1);
      expect(shaped.items[0]).toMatchObject({ id: 12 });
    });
  });

  describe('resolveIriId', () => {
    it('resolves a numeric id', () => {
      expect(service.resolveIriId('/api/test_plans/12')).toBe(12);
    });

    it('resolves a numeric id with a trailing slash', () => {
      expect(service.resolveIriId('/api/test_plans/12/')).toBe(12);
    });

    it('returns the raw segment for a non-numeric id (e.g. a GUID)', () => {
      const iri = '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f';

      expect(service.resolveIriId(iri)).toBe(
        '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
      );
    });

    it('resolves a relation-field IRI pulled off an already-shaped item', () => {
      const shaped = service.shapeItem(testPlanItemFixture);

      expect(service.resolveIriId(shaped.release as string)).toBe(3);
      expect(
        (shaped.questionsOrder as string[]).map((iri) =>
          service.resolveIriId(iri),
        ),
      ).toEqual([101, 102]);
    });
  });
});
