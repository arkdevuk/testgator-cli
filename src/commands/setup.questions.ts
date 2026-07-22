import { Injectable } from '@nestjs/common';
import { Question, QuestionSet } from 'nest-commander';

export interface SetupAnswers {
  apiUrl: string;
  username: string;
  password: string;
}

export const SETUP_QUESTION_SET_NAME = 'setup';

/**
 * Interactive prompts for `testgator-cli setup` (task 15). Defaults for
 * `apiUrl` read TESTGATOR_API_URL at prompt time so re-running `setup`
 * (e.g. to rotate credentials) doesn't force retyping an unchanged URL.
 *
 * Each @Question-decorated method is inquirer's `filter` for that question
 * (same role @Option's parse methods play for CLI flags elsewhere in this
 * codebase) — it runs on the raw answer before it's returned.
 */
@Injectable()
@QuestionSet({ name: SETUP_QUESTION_SET_NAME })
export class SetupQuestions {
  @Question({
    type: 'input',
    name: 'apiUrl',
    message: 'testgator_server API URL:',
    default: process.env.TESTGATOR_API_URL || 'http://localhost',
  })
  parseApiUrl(value: string): string {
    return value.trim();
  }

  @Question({
    type: 'input',
    name: 'username',
    message: 'Username or email:',
  })
  parseUsername(value: string): string {
    return value.trim();
  }

  @Question({
    type: 'password',
    name: 'password',
    message: 'Password:',
    mask: '*',
  })
  parsePassword(value: string): string {
    return value;
  }
}
