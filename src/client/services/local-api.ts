/**
 * Local, offline implementation of the app's data operations. It runs the pure
 * evaluation engine (src/core) directly in the browser, reads scenario/fault
 * content from src/content, and persists sessions in localStorage. It returns
 * exactly the same DTOs the UI already consumes, so pages are unchanged.
 */
import type {
  AnalyticsResponse,
  CompleteSessionResponse,
  ConfigResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  DailyAggregate,
  EvaluateStepRequest,
  EvaluateStepResponse,
  ExaminerRequest,
  ExaminerResponse,
  FaultFrequency,
  FaultTypesResponse,
  GlobalSkillId,
  HealthResponse,
  Scenario,
  ScenarioResponse,
  ScenariosResponse,
  ScenarioSummary,
  SessionDetailResponse,
  SessionDTO,
  SessionStepResult,
  SkillBreakdown,
  SkillsResponse,
  WeaknessReport,
} from '../../shared/types';
import { GLOBAL_SKILLS } from '../../shared/catalog';
import { FAULT_TYPES, FAULT_TYPE_BY_CODE, SCENARIO_BY_ID, SCENARIOS } from '../../content';
import { evaluateStep } from '../../core/evaluator';
import { scoreSession } from '../../core/scoring';
import { ApiError } from './errors';
import {
  allSessions,
  genId,
  getSessionRecord,
  saveSessionRecord,
  type StoredSession,
  type StoredStep,
} from './storage';
import { runExaminer } from './examiner';

const APP_ENV = 'static';
const DEFAULT_USER = 'local';

/* ---- simple reads ---- */

export function health(): HealthResponse {
  return { ok: true, environment: APP_ENV, time: new Date().toISOString() };
}

export function config(): ConfigResponse {
  return { environment: APP_ENV };
}

export function skills(): SkillsResponse {
  return { skills: GLOBAL_SKILLS };
}

export function faults(): FaultTypesResponse {
  return { faultTypes: FAULT_TYPES };
}

function toSummary(s: Scenario): ScenarioSummary {
  return {
    id: s.id,
    name: s.name,
    area: s.area,
    description: s.description,
    difficulty: s.difficulty,
    estimatedMinutes: s.estimatedMinutes,
    stepCount: s.steps.length,
    ...(s.tags ? { tags: s.tags } : {}),
  };
}

export function scenarios(): ScenariosResponse {
  return { scenarios: SCENARIOS.map(toSummary) };
}

export function scenario(id: string): ScenarioResponse {
  const s = SCENARIO_BY_ID.get(id);
  if (!s) throw new ApiError(`Scenario not found: ${id}`, 404);
  return { scenario: s };
}

/* ---- sessions ---- */

function toDTO(r: StoredSession): SessionDTO {
  return {
    id: r.id,
    scenarioId: r.scenarioId,
    scenarioName: r.scenarioName,
    userId: r.userId,
    status: r.status,
    currentStepIndex: r.currentStepIndex,
    totalSteps: r.totalSteps,
    totalPoints: r.totalPoints,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
  };
}

export function createSession(body: CreateSessionRequest): CreateSessionResponse {
  const sc = SCENARIO_BY_ID.get(body.scenarioId);
  if (!sc) throw new ApiError(`Scenario not found: ${body.scenarioId}`, 404);
  const rec: StoredSession = {
    id: genId(),
    scenarioId: sc.id,
    scenarioName: sc.name,
    userId: body.userId ?? DEFAULT_USER,
    status: 'in_progress',
    currentStepIndex: 0,
    totalSteps: sc.steps.length,
    totalPoints: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    steps: [],
  };
  saveSessionRecord(rec);
  return { session: toDTO(rec), scenario: sc };
}

export function evaluateStepOp(
  sessionId: string,
  stepId: string,
  body: EvaluateStepRequest,
): EvaluateStepResponse {
  const rec = getSessionRecord(sessionId);
  if (!rec) throw new ApiError(`Session not found: ${sessionId}`, 404);
  const sc = SCENARIO_BY_ID.get(rec.scenarioId);
  if (!sc) throw new ApiError(`Scenario not found: ${rec.scenarioId}`, 404);

  const idx = sc.steps.findIndex((s) => s.id === stepId);
  if (idx < 0) throw new ApiError(`Step not found: ${stepId}`, 404);
  const step = sc.steps[idx];

  const performed = Array.isArray(body?.performed) ? body.performed : [];
  const evaluation = evaluateStep(step, performed);

  const stepRec: StoredStep = {
    stepId,
    stepIndex: idx,
    correct: evaluation.correct,
    score: evaluation.score,
    performed,
    faults: evaluation.faults,
    createdAt: new Date().toISOString(),
  };
  const existing = rec.steps.findIndex((s) => s.stepId === stepId);
  if (existing >= 0) rec.steps[existing] = stepRec;
  else rec.steps.push(stepRec);

  const hasAutoFail = evaluation.faults.some((f) => f.severity === 'auto_fail');
  rec.currentStepIndex = idx + 1;
  rec.totalPoints = rec.steps.reduce((sum, s) => sum + s.score, 0);
  if (hasAutoFail) {
    rec.status = 'failed';
    rec.completedAt = rec.completedAt ?? new Date().toISOString();
  }
  saveSessionRecord(rec);

  const nextStep = sc.steps[idx + 1];
  return { evaluation, session: toDTO(rec), nextStepId: nextStep ? nextStep.id : null };
}

export function completeSession(sessionId: string): CompleteSessionResponse {
  const rec = getSessionRecord(sessionId);
  if (!rec) throw new ApiError(`Session not found: ${sessionId}`, 404);
  const allFaults = rec.steps.flatMap((s) => s.faults);
  const score = scoreSession(allFaults);
  rec.status = score.passed ? 'passed' : 'failed';
  rec.totalPoints = score.totalPoints;
  rec.completedAt = new Date().toISOString();
  saveSessionRecord(rec);
  return { session: toDTO(rec), score };
}

export function getSession(sessionId: string): SessionDetailResponse {
  const rec = getSessionRecord(sessionId);
  if (!rec) throw new ApiError(`Session not found: ${sessionId}`, 404);
  const sc = SCENARIO_BY_ID.get(rec.scenarioId);
  const titleById = new Map<string, string>((sc?.steps ?? []).map((s) => [s.id, s.title]));

  const steps: SessionStepResult[] = rec.steps
    .slice()
    .sort((a, b) => a.stepIndex - b.stepIndex)
    .map((s) => ({
      stepId: s.stepId,
      title: titleById.get(s.stepId) ?? s.stepId,
      faults: s.faults,
      score: s.score,
      correct: s.correct,
    }));

  const completed = rec.status === 'passed' || rec.status === 'failed';
  const score = completed ? scoreSession(rec.steps.flatMap((s) => s.faults)) : null;
  return { session: toDTO(rec), steps, score };
}

export function examiner(req: ExaminerRequest): ExaminerResponse {
  return runExaminer(req);
}

/* ---- analytics (aggregated from stored sessions) ---- */

const DAY_MS = 86_400_000;
const dateKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export function analytics(params?: { userId?: string; days?: number }): AnalyticsResponse {
  const days = params?.days && params.days > 0 ? Math.min(params.days, 365) : 30;
  const now = Date.now();
  const startKey = dateKey(now - (days - 1) * DAY_MS);
  const todayKey = dateKey(now);

  const dayKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) dayKeys.push(dateKey(now - i * DAY_MS));

  const sessions = allSessions().filter((s) => {
    const k = (s.startedAt ?? '').slice(0, 10);
    return k >= startKey && k <= todayKey;
  });
  // Only completed runs (passed/failed) count toward analytics; an in-progress
  // session is persisted the moment an exam starts and would otherwise pollute
  // run counts, pass rate and fault totals.
  const completedSessions = sessions.filter(
    (s) => s.status === 'passed' || s.status === 'failed',
  );

  // per-skill points + counts
  const points = {} as Record<GlobalSkillId, number>;
  const counts = {} as Record<GlobalSkillId, number>;
  for (const sk of GLOBAL_SKILLS) {
    points[sk.id] = 0;
    counts[sk.id] = 0;
  }
  const codeCount: Record<string, number> = {};
  for (const s of completedSessions) {
    for (const st of s.steps) {
      for (const f of st.faults) {
        points[f.skill] += f.points;
        counts[f.skill] += 1;
        codeCount[f.code] = (codeCount[f.code] ?? 0) + 1;
      }
    }
  }

  const perSkill: SkillBreakdown[] = GLOBAL_SKILLS.map((sk) => ({
    skill: sk.id,
    name: sk.name,
    pointsLost: points[sk.id],
    faultCount: counts[sk.id],
  }));

  const topFaults: FaultFrequency[] = Object.entries(codeCount)
    .map(([code, count]) => {
      const ft = FAULT_TYPE_BY_CODE.get(code);
      return {
        code,
        title: ft?.title ?? code,
        skill: ft?.skill ?? 'observation',
        severity: ft?.severity ?? 'major',
        count,
      } satisfies FaultFrequency;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // daily buckets — only completed sessions count toward sessions/passRate/faults.
  const byDay = new Map<string, { sessions: number; passed: number; faults: number }>();
  let totalPassed = 0;
  for (const s of completedSessions) {
    const k = s.startedAt.slice(0, 10);
    const b = byDay.get(k) ?? { sessions: 0, passed: 0, faults: 0 };
    b.sessions += 1;
    if (s.status === 'passed') {
      b.passed += 1;
      totalPassed += 1;
    }
    for (const st of s.steps) b.faults += st.faults.length;
    byDay.set(k, b);
  }
  const daily: DailyAggregate[] = dayKeys.map((date) => {
    const b = byDay.get(date);
    const count = b?.sessions ?? 0;
    return { date, sessions: count, faults: b?.faults ?? 0, passRate: count > 0 ? (b!.passed) / count : 0 };
  });

  const totalSessions = completedSessions.length;
  const mostCommonFault = topFaults.length > 0 ? topFaults[0].title : null;
  let weakestSkill: GlobalSkillId | null = null;
  let maxPoints = 0;
  for (const ps of perSkill) {
    if (ps.pointsLost > maxPoints) {
      maxPoints = ps.pointsLost;
      weakestSkill = ps.skill;
    }
  }

  const report: WeaknessReport = {
    perSkill,
    topFaults,
    daily,
    summary: {
      totalSessions,
      passRate: totalSessions > 0 ? totalPassed / totalSessions : 0,
      mostCommonFault,
      weakestSkill,
    },
  };
  return { report };
}
