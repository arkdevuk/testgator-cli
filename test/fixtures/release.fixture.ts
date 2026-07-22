// Sourced from testgator_server/src/Entity/Release.php (`release:read` group).

export const releaseItemFixture = {
  '@context': '/api/contexts/Release',
  '@id': '/api/releases/3',
  '@type': 'Release',
  id: 3,
  name: 'v1.4.0',
  project: '/api/projects/1',
  plans: ['/api/test_plans/12', '/api/test_plans/13'],
  description: 'Adds the CLI-facing agent workflow.',
};

export const releaseCollectionFixture = {
  '@context': '/api/contexts/Release',
  '@id': '/api/releases',
  '@type': 'Collection',
  totalItems: 1,
  member: [releaseItemFixture],
};
