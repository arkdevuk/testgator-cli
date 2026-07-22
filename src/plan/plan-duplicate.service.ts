import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { HydraService } from '../hydra/hydra.service';
import { ApiClientError } from '../api-client/api-client.error';
import { PlanDuplicateError } from './plan-duplicate.error';

export interface PlanDuplicateOptions {
  project: string;
  release: string;
  name: string;
  dueDate: string;
}

export interface PlanDuplicateResult {
  id: number;
  name: string;
  release: string;
  questionsCreated: number;
  questionsTotal: number;
}

/**
 * Orchestrates duplicating a test plan into another release — the
 * canonical "composite command" from project.md: what would otherwise be
 * several raw API calls (create the plan, create each question, set
 * questionsOrder) collapsed into one CLI invocation.
 *
 * Mirrors testgator_client's DuplicateTestingPlan.jsx `handleDuplicate`
 * step by step (see that file's git history / agent_data/tasks/12 for the
 * reference implementation this was modeled on), with one addition: before
 * doing anything, it verifies the given --release actually belongs to the
 * given --project. The wizard doesn't need this check because its UI only
 * ever lets you pick a release *from* the selected project; a CLI caller
 * can pass any two ids, so this catches that mistake with a clear error
 * instead of silently creating a plan under an unrelated project's release.
 *
 * Unlike the wizard (which lets a human pick a subset of questions to
 * copy), this CLI command duplicates every question on the source plan —
 * there's no `--questions` selection flag in task 12's scope.
 *
 * Talks to ApiClientService/HydraService directly rather than going
 * through PlanService/QuestionService — this orchestration reads and
 * writes three different resources (release, test plan, question) in a
 * specific sequence, so keeping it self-contained here makes that sequence
 * easy to read and easy to unit test call-by-call.
 */
@Injectable()
export class PlanDuplicateService {
  constructor(
    private readonly apiClient: ApiClientService,
    private readonly hydra: HydraService,
  ) {}

  async duplicate(
    sourceId: string,
    options: PlanDuplicateOptions,
  ): Promise<PlanDuplicateResult> {
    await this.assertReleaseBelongsToProject(options.release, options.project);

    const sourcePlan = await this.getSourcePlan(sourceId);
    const orderedQuestions = await this.getSourceQuestionsInOrder(
      sourceId,
      sourcePlan.questionsOrder,
    );

    const newPlan = await this.apiClient.post<Record<string, unknown>>(
      '/api/test_plans',
      {
        name: options.name,
        description: sourcePlan.description ?? '',
        release: `/api/releases/${options.release}`,
        state: 'draft',
        dueDate: options.dueDate,
      },
    );
    const shapedNewPlan = this.hydra.shapeItem(newPlan);
    const newPlanId = shapedNewPlan.id as number;
    const newPlanIriForQuestions = `/api/test_plans/${newPlanId}`;

    const newQuestionIris: string[] = [];
    for (const question of orderedQuestions) {
      try {
        const created = await this.apiClient.post<Record<string, unknown>>(
          '/api/questions',
          {
            name: question.name,
            content: question.content ?? '',
            plan: newPlanIriForQuestions,
          },
        );
        const shapedCreated = this.hydra.shapeItem(created);
        newQuestionIris.push(`/api/questions/${shapedCreated.id as number}`);
      } catch (error) {
        const detail =
          error instanceof ApiClientError ? error.message : 'an unknown error';
        throw new PlanDuplicateError(
          `Plan ${newPlanId} was created, but question "${String(
            question.name,
          )}" failed to duplicate (${detail}). ${newQuestionIris.length}/${orderedQuestions.length} questions were created before this failure; questionsOrder was not set.`,
          newPlanId,
          newQuestionIris.length,
          orderedQuestions.length,
        );
      }
    }

    if (newQuestionIris.length > 0) {
      await this.apiClient.patch(`/api/test_plans/${newPlanId}`, {
        questionsOrder: newQuestionIris,
      });
    }

    return {
      id: newPlanId,
      name: options.name,
      release: `/api/releases/${options.release}`,
      questionsCreated: newQuestionIris.length,
      questionsTotal: orderedQuestions.length,
    };
  }

  private async assertReleaseBelongsToProject(
    releaseId: string,
    projectId: string,
  ): Promise<void> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      `/api/releases/${releaseId}`,
    );
    const release = this.hydra.shapeItem(raw);
    const releaseProjectId = this.hydra.resolveIriId(release.project as string);

    if (String(releaseProjectId) !== projectId) {
      throw new ApiClientError(
        `Release ${releaseId} does not belong to project ${projectId}.`,
      );
    }
  }

  private async getSourcePlan(
    sourceId: string,
  ): Promise<Record<string, unknown>> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      `/api/test_plans/${sourceId}`,
    );
    return this.hydra.shapeItem(raw);
  }

  private async getSourceQuestionsInOrder(
    sourceId: string,
    questionsOrder: unknown,
  ): Promise<Record<string, unknown>[]> {
    const raw = await this.apiClient.get<Record<string, unknown>>(
      '/api/questions',
      { plan: sourceId },
    );
    const { items } = this.hydra.shapeCollection(raw);

    const orderIris = Array.isArray(questionsOrder)
      ? (questionsOrder as string[])
      : [];
    const orderMap = new Map(
      orderIris.map((iri, index) => [
        String(this.hydra.resolveIriId(iri)),
        index,
      ]),
    );

    return [...items].sort((a, b) => {
      const aIndex = orderMap.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }
}
