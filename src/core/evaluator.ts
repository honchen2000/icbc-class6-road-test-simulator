/**
 * Core evaluation engine. Pure and deterministic (no DOM, storage, network, or
 * I/O), so it is unit-testable in plain Node.
 *
 * For a step it emits faults from three sources, then de-duplicates them so a
 * single mistake is never charged twice:
 *  - a missing expected action  -> its `faultCode`
 *  - a performed prohibited action -> its `faultCode`
 *  - a violated timing rule (see ./signal): signal-before / signal-cancel-after /
 *    observation-before
 * `correct` is true iff there are zero faults; `score` is the sum of points.
 */
import type {
  ActionType,
  DetectedFault,
  PerformedAction,
  ScenarioStep,
  StepEvaluation,
} from '../shared/types';
import { ACTION_BY_TYPE } from '../shared/catalog';
import { buildFault, evaluateTiming } from './signal';

export function evaluateStep(step: ScenarioStep, performed: PerformedAction[]): StepEvaluation {
  // Set of action types the rider actually performed (presence-based matching).
  const performedTypes = new Set<ActionType>(performed.map((p) => p.action));

  // 1) Partition expected actions into matched vs. missed by presence.
  const matchedExpected: ActionType[] = [];
  const missedExpected: ActionType[] = [];
  for (const exp of step.expected) {
    if (performedTypes.has(exp.action)) matchedExpected.push(exp.action);
    else missedExpected.push(exp.action);
  }

  const raw: DetectedFault[] = [];

  // 2) One fault per missed expected action, using that action's faultCode.
  for (const exp of step.expected) {
    if (!performedTypes.has(exp.action)) {
      const label = ACTION_BY_TYPE[exp.action]?.label ?? exp.action;
      raw.push(buildFault(exp.faultCode, step.id, `Missing required action: ${label} (${exp.action}).`));
    }
  }

  // 3) One fault per prohibited action the rider performed.
  if (step.prohibited) {
    for (const pro of step.prohibited) {
      if (performedTypes.has(pro.action)) {
        const label = ACTION_BY_TYPE[pro.action]?.label ?? pro.action;
        raw.push(
          buildFault(pro.faultCode, step.id, `Performed a prohibited action: ${label} (${pro.action}).`),
        );
      }
    }
  }

  // 4) Merge in signal / observation timing faults.
  raw.push(...evaluateTiming(step, performed));

  // 5) De-duplicate by fault code: a code may be referenced by both an expected
  //    action and a timing rule for the same step (e.g. SIGNAL_NOT_CANCELLED), but
  //    one underlying mistake must only be charged once.
  const seen = new Set<string>();
  const faults: DetectedFault[] = raw.filter((f) => {
    if (seen.has(f.code)) return false;
    seen.add(f.code);
    return true;
  });

  const score = faults.reduce((sum, f) => sum + f.points, 0);
  const correct = faults.length === 0;

  return { stepId: step.id, performed, faults, matchedExpected, missedExpected, correct, score };
}
