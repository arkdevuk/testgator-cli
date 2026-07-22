// Sourced from testgator_server/src/Entity/Answer.php. Note: Answer's
// #[ApiResource] sets no normalizationContext group restriction at all
// (unlike Project/Release/TestPlan/Question/Tester), so in the real API
// every property is serialized regardless of #[Groups] — hence no fields
// omitted here.
//
// `files` (attachment metadata) is a ManyToMany to File.php, which itself
// has no GetCollection/embeddable normalization — like every other relation
// in these fixtures, it serializes as a list of IRIs, not embedded objects.
// Fetching an attachment's own metadata is a `GET /api/files/{uuid}` away
// (out of scope for task 11 — see agent_data/tasks/11).

export const answerItemFixture = {
  '@context': '/api/contexts/Answer',
  '@id': '/api/answers/501',
  '@type': 'Answer',
  id: 501,
  tester: '/api/testers/8f14e45f-ceea-467e-bd0e-8e6f4e2c1a3f',
  question: '/api/questions/101',
  state: 'pass_with_bugs',
  comment: 'Login works, but the OTP field auto-focus is flaky on Safari.',
  systemInfos: {
    os: 'iOS',
    os_version: '17.4',
    browser: 'Safari',
    browser_version: '17',
    touch_capability: true,
    screen_resolution: '390x844',
  },
  files: ['/api/files/3f9c2b1e-4a5d-4c8e-9f1a-2b3c4d5e6f70'],
  important: false,
  ignored: false,
  created: '2026-07-10T14:00:00+00:00',
  updated: '2026-07-10T14:05:00+00:00',
};

export const answerCollectionFixture = {
  '@context': '/api/contexts/Answer',
  '@id': '/api/answers',
  '@type': 'Collection',
  totalItems: 1,
  member: [answerItemFixture],
};
