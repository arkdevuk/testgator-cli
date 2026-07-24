// Sourced from testgator_server/src/Entity/TesterAnnotation.php
// (`tester_annotation:read` + `timestampable:read` groups).

export const testerAnnotationItemFixture = {
  '@context': '/api/contexts/TesterAnnotation',
  '@id': '/api/tester_annotations/6f2c1a4e-8b3d-4e5a-9f1c-2d3e4f5a6b7c',
  '@type': 'TesterAnnotation',
  id: '6f2c1a4e-8b3d-4e5a-9f1c-2d3e4f5a6b7c',
  relateTo: '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
  content: 'Very responsive tester',
  createdBy: '/api/users/3fae8c1e-2b7a-4b0a-9c3d-9e2f1a6b7c8d',
  created: '2026-07-20T09:00:00+00:00',
  updated: '2026-07-20T09:00:00+00:00',
};

export const testerAnnotationItemFixture2 = {
  '@context': '/api/contexts/TesterAnnotation',
  '@id': '/api/tester_annotations/7a3d2b5f-9c4e-4f6b-8a2d-3e4f5a6b7c8d',
  '@type': 'TesterAnnotation',
  id: '7a3d2b5f-9c4e-4f6b-8a2d-3e4f5a6b7c8d',
  relateTo: '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
  content: 'Reported a bug in checkout flow',
  createdBy: '/api/users/3fae8c1e-2b7a-4b0a-9c3d-9e2f1a6b7c8d',
  created: '2026-07-21T09:00:00+00:00',
  updated: '2026-07-21T09:00:00+00:00',
};

export const testerAnnotationCollectionFixture = {
  '@context': '/api/contexts/TesterAnnotation',
  '@id': '/api/tester_annotations',
  '@type': 'Collection',
  totalItems: 2,
  member: [testerAnnotationItemFixture2, testerAnnotationItemFixture],
};
