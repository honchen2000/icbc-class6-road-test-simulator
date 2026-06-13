/**
 * App data client. The simulator is fully offline — these methods run the local
 * evaluation engine + bundled content and persist to localStorage (see
 * ../services/local-api). The async shape mirrors the previous HTTP client so
 * the pages and components are unchanged.
 */
import type {
  CreateSessionRequest,
  EvaluateStepRequest,
  ExaminerRequest,
} from '../../shared/types';
import * as local from '../services/local-api';

export { ApiError } from '../services/errors';

export const api = {
  health: async () => local.health(),
  config: async () => local.config(),
  skills: async () => local.skills(),
  faults: async () => local.faults(),

  scenarios: async () => local.scenarios(),
  scenario: async (id: string) => local.scenario(id),

  createSession: async (body: CreateSessionRequest) => local.createSession(body),
  getSession: async (id: string) => local.getSession(id),
  evaluateStep: async (sessionId: string, stepId: string, body: EvaluateStepRequest) =>
    local.evaluateStepOp(sessionId, stepId, body),
  completeSession: async (id: string) => local.completeSession(id),

  examiner: async (body: ExaminerRequest) => local.examiner(body),

  analytics: async (params?: { userId?: string; days?: number }) => local.analytics(params),
};
