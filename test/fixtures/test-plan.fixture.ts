// Sourced from testgator_server/src/Entity/TestPlan.php
// (`testPlan:read` + `timestampable:read` groups). Field names `created`/
// `updated` (not createdAt/updatedAt) come from the shared TimeStampable
// trait — see src/Traits/Entity/TimeStampable.php.

export const testPlanItemFixture = {
  '@context': '/api/contexts/TestPlan',
  '@id': '/api/test_plans/12',
  '@type': 'TestPlan',
  id: 12,
  name: 'Sprint 42 regression',
  state: 'published',
  dueDate: '2026-08-01T00:00:00+00:00',
  release: '/api/releases/3',
  questionsOrder: ['/api/questions/101', '/api/questions/102'],
  testersEnrolled: ['/api/testers/7'],
  created: '2026-07-01T10:00:00+00:00',
  updated: '2026-07-15T09:30:00+00:00',
};

export const testPlanItemFixture2 = {
  '@context': '/api/contexts/TestPlan',
  '@id': '/api/test_plans/13',
  '@type': 'TestPlan',
  id: 13,
  name: 'Sprint 42 smoke test',
  state: 'draft',
  dueDate: null,
  release: '/api/releases/3',
  questionsOrder: [],
  testersEnrolled: [],
  created: '2026-07-02T10:00:00+00:00',
  updated: '2026-07-02T10:00:00+00:00',
};

export const testPlanCollectionFixture = {
  '@context': '/api/contexts/TestPlan',
  '@id': '/api/test_plans',
  '@type': 'Collection',
  totalItems: 2,
  member: [testPlanItemFixture, testPlanItemFixture2],
};
