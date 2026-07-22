// Sourced from testgator_server/src/Entity/User.php, exposed under the
// `Tester` short name for /api/testers (`testers:read` group).
//
// IMPORTANT: unlike every other resource here, a tester's id is a UUID
// string (User.php: `#[ORM\Column(type: 'uuid')]`), not a Doctrine
// auto-increment int — hence the non-numeric @id below. This is exactly
// the case src/hydra/hydra.service.spec.ts's "GUID" resolveIriId test
// exists for.
//
// `projects` (a list of Project IRIs the tester is enrolled in via at
// least one test plan) is part of the testers:read group too — included
// here because src/tester/tester.service.ts's --project filter reads it
// (see that file's comment for why the filtering has to happen client-side).

export const testerItemFixture = {
  '@context': '/api/contexts/Tester',
  '@id': '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
  '@type': 'Tester',
  id: '8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
  email: 'tester@example.com',
  nickname: 'Jamie',
  profilePictureUrl: '/assets/gator_avatar.png',
  tags: ['non-technical', 'mobile'],
  type: 'TESTER',
  active: true,
  activeProjects: 1,
  projects: ['/api/projects/1'],
  lastActive: '2026-07-18T12:00:00+00:00',
};

export const testerItemFixture2 = {
  '@context': '/api/contexts/Tester',
  '@id': '/api/testers/2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10',
  '@type': 'Tester',
  id: '2b6f0c3a-2d9a-4b7a-8b8b-0f2b6a5f9e10',
  email: 'other-tester@example.com',
  nickname: 'Sam',
  profilePictureUrl: '/assets/gator_avatar.png',
  tags: [],
  type: 'TESTER',
  active: true,
  activeProjects: 1,
  projects: ['/api/projects/2'],
  lastActive: null,
};

export const testerCollectionFixture = {
  '@context': '/api/contexts/Tester',
  '@id': '/api/testers',
  '@type': 'Collection',
  totalItems: 2,
  member: [testerItemFixture, testerItemFixture2],
};
