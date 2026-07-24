// Sourced from testgator_server/src/Entity/TesterTag.php
// (`tester_tag:read` + `timestampable:read` groups).

export const tagItemFixture = {
  '@context': '/api/contexts/TesterTag',
  '@id': '/api/tester_tags/vip',
  '@type': 'TesterTag',
  id: 'vip',
  label: 'VIP',
  createdBy: '/api/users/3fae8c1e-2b7a-4b0a-9c3d-9e2f1a6b7c8d',
  deleted: false,
  created: '2026-07-01T09:00:00+00:00',
  updated: '2026-07-01T09:00:00+00:00',
};

export const tagItemFixture2 = {
  '@context': '/api/contexts/TesterTag',
  '@id': '/api/tester_tags/mobile',
  '@type': 'TesterTag',
  id: 'mobile',
  label: 'Mobile',
  createdBy: '/api/users/3fae8c1e-2b7a-4b0a-9c3d-9e2f1a6b7c8d',
  deleted: false,
  created: '2026-07-02T09:00:00+00:00',
  updated: '2026-07-02T09:00:00+00:00',
};

export const tagCollectionFixture = {
  '@context': '/api/contexts/TesterTag',
  '@id': '/api/tester_tags',
  '@type': 'Collection',
  totalItems: 2,
  member: [tagItemFixture, tagItemFixture2],
};
