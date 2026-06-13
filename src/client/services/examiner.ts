/**
 * Scripted examiner — fully offline, deterministic. Produces an English examiner
 * voice line (+ corrections) from the scenario/step/faults/score, in three modes:
 *   - "instruction": speak the step's instruction.
 *   - "feedback":    turn detected faults into <=4 corrections + an encouraging line.
 *   - "debrief":     summarise the final score + faults into a short verdict.
 *
 * (Earlier versions called a hosted LLM; the open-source build is offline-only,
 * so this scripted examiner is the single source. `source` stays 'fallback'.)
 */
import type {
  DetectedFault,
  ExaminerRequest,
  ExaminerResponse,
  ScenarioStep,
  SessionScore,
} from '../../shared/types';
import { GLOBAL_SKILL_BY_ID } from '../../shared/catalog';
import { SCENARIO_BY_ID } from '../../content';

function findStep(scenarioId: string, stepId?: string): ScenarioStep | null {
  if (!stepId) return null;
  const scenario = SCENARIO_BY_ID.get(scenarioId);
  return scenario?.steps.find((s) => s.id === stepId) ?? null;
}

/** Most-severe-first, de-duplicated by code, capped at 4: "Title: detail". */
function summariseFaults(faults: DetectedFault[]): string[] {
  const rank: Record<DetectedFault['severity'], number> = {
    auto_fail: 0,
    dangerous: 1,
    major: 2,
    minor: 3,
  };
  const seen = new Set<string>();
  const unique: DetectedFault[] = [];
  for (const f of [...faults].sort((a, b) => rank[a.severity] - rank[b.severity])) {
    if (seen.has(f.code)) continue;
    seen.add(f.code);
    unique.push(f);
  }
  return unique.slice(0, 4).map((f) => `${f.title}: ${f.detail}`);
}

function instruction(step: ScenarioStep | null): ExaminerResponse {
  return {
    speech: step ? step.instruction : 'Continue when you are ready, and ride safely.',
    corrections: [],
    source: 'fallback',
  };
}

function feedback(faults: DetectedFault[]): ExaminerResponse {
  if (faults.length === 0) {
    return { speech: 'Well done — that step was clean. Keep it up.', corrections: [], source: 'fallback' };
  }
  return {
    speech:
      'A few things to tighten up on that step. Review the corrections below, then carry on — you can do this.',
    corrections: summariseFaults(faults),
    source: 'fallback',
  };
}

function debrief(score: SessionScore | undefined, faults: DetectedFault[]): ExaminerResponse {
  if (!score) {
    return {
      speech: 'That concludes the session. Review your results and try again to improve.',
      corrections: summariseFaults(faults),
      source: 'fallback',
    };
  }

  const verdict = score.passed
    ? `You passed with ${score.totalPoints} demerit point${score.totalPoints === 1 ? '' : 's'}.`
    : score.autoFail
      ? 'Unfortunately that is a fail due to a critical safety error.'
      : `Unfortunately that is a fail — ${score.totalPoints} demerit points.`;

  // Weakest skill (most points lost) for an actionable closing tip.
  let weakest: { skill: string; points: number } | null = null;
  for (const [skill, points] of Object.entries(score.perSkill)) {
    if (points > 0 && (!weakest || points > weakest.points)) weakest = { skill, points };
  }
  const focus = weakest
    ? ` Focus your next ride on ${
        GLOBAL_SKILL_BY_ID[weakest.skill as keyof typeof GLOBAL_SKILL_BY_ID]?.name ?? weakest.skill
      }.`
    : '';

  const reasons = score.failReasons.length > 0 ? score.failReasons : summariseFaults(faults);
  return {
    speech: `${verdict}${focus} Keep practising and you will get there.`,
    corrections: reasons.slice(0, 4),
    source: 'fallback',
  };
}

export function runExaminer(req: ExaminerRequest): ExaminerResponse {
  const faults = req.faults ?? [];
  switch (req.mode) {
    case 'instruction':
      return instruction(findStep(req.scenarioId, req.stepId));
    case 'feedback':
      return feedback(faults);
    case 'debrief':
    default:
      return debrief(req.score, faults);
  }
}
