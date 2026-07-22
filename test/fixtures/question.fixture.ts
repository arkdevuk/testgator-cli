// Sourced from testgator_server/src/Entity/Question.php (`question:read` group).

export const questionItemFixture = {
  '@context': '/api/contexts/Question',
  '@id': '/api/questions/101',
  '@type': 'Question',
  id: 101,
  name: 'Can you log in with a valid one-time code?',
  plan: '/api/test_plans/12',
  content: 'Request a code, enter it, confirm you land on your assigned plan.',
  displayOrder: 0,
  answers: ['/api/answers/501'],
  files: [],
};

export const questionCollectionFixture = {
  '@context': '/api/contexts/Question',
  '@id': '/api/questions',
  '@type': 'Collection',
  totalItems: 1,
  member: [questionItemFixture],
};
