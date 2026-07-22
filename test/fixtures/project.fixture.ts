// Sourced from testgator_server/src/Entity/Project.php (`project:read` group).

export const projectItemFixture = {
  '@context': '/api/contexts/Project',
  '@id': '/api/projects/1',
  '@type': 'Project',
  id: 1,
  name: 'TestGator',
  description:
    'The TestGator product itself, dogfooding its own testing plans.',
  releases: ['/api/releases/3', '/api/releases/4'],
  picture: null,
  projectPictureUrl: '/assets/projects/testgator.png',
  projectBannerUrl: null,
  // Real API responses include this (project:read group) — ProjectService
  // strips it before printing; see project.service.ts's hideAllTesters().
  allTesters: [
    '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
    '/api/testers/2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10',
  ],
  totalTesters: 2,
};

export const projectCollectionFixture = {
  '@context': '/api/contexts/Project',
  '@id': '/api/projects',
  '@type': 'Collection',
  totalItems: 1,
  member: [projectItemFixture],
};
