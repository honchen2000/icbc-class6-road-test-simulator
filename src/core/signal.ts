/**
 * Signal-timing and observation-timing rules. Pure module: no DOM, storage,
 * network, or I/O. For each TimingRule in `step.timing`:
 *  - 'signal_before': the signal must be ON at least `minMs` before the maneuver.
 *    Lateness is measured from the latest signal at/before the maneuver. If the
 *    signal was never given at all, this rule stays silent (the missing-signal
 *    fault is raised by the expected-action check instead).
 *  - 'signal_cancel_after': after the maneuver, `signal_cancel` must occur within
 *    `maxMs`. If missing or too late, emit a fault — the headline "forgot to
 *    cancel the turn signal" case.
 *  - 'observation_before': the timed observation must occur before the maneuver.
 */
import type {
  ActionType,
  DetectedFault,
  FaultSeverity,
  GlobalSkillId,
  ManeuverType,
  PerformedAction,
  ScenarioStep,
  TimingRule,
} from '../shared/types';
import { SEVERITY_POINTS } from '../shared/catalog';
import { FAULT_TYPE_BY_CODE } from '../content';

/**
 * Map a step's maneuver to the rider ActionType that actually executes it.
 * Used to resolve a timing rule whose `relativeTo` is the abstract "maneuver".
 */
const MANEUVER_EXECUTION_ACTION: Record<ManeuverType, ActionType> = {
  left_turn: 'turn_left',
  right_turn: 'turn_right',
  straight: 'go_straight',
  u_turn: 'turn_left',
  merge: 'merge',
  lane_change_left: 'lane_left',
  lane_change_right: 'lane_right',
  start: 'proceed',
  stop: 'stop',
  park: 'stop',
};

/** The ActionType that executes a given maneuver. */
export function maneuverExecutionAction(maneuver: ManeuverType): ActionType {
  return MANEUVER_EXECUTION_ACTION[maneuver];
}

/**
 * Build a DetectedFault for a code, looking up shared fault metadata. Falls back
 * to a generic 'major' fault when the code is not present in the catalog so the
 * engine never throws on unknown codes. Shared with the evaluator via re-export.
 */
export function buildFault(code: string, stepId: string, detail: string): DetectedFault {
  const meta = FAULT_TYPE_BY_CODE.get(code);
  const severity: FaultSeverity = meta?.severity ?? 'major';
  const skill: GlobalSkillId = meta?.skill ?? 'observation';
  const title: string = meta?.title ?? code;
  return { code, skill, severity, points: SEVERITY_POINTS[severity], title, detail, stepId };
}

/** First performed action of the given type, or undefined. */
function firstPerformed(performed: PerformedAction[], action: ActionType): PerformedAction | undefined {
  return performed.find((p) => p.action === action);
}

/** Latest performed action of `action` whose tMs is at or before `at`, or undefined. */
function latestAtOrBefore(
  performed: PerformedAction[],
  action: ActionType,
  at: number,
): PerformedAction | undefined {
  let best: PerformedAction | undefined;
  for (const p of performed) {
    if (p.action === action && p.tMs <= at && (!best || p.tMs > best.tMs)) best = p;
  }
  return best;
}

/**
 * Resolve the reference time for a timing rule. When `relativeTo` is the abstract
 * "maneuver", the reference is the first performed action that executes the
 * step's maneuver; otherwise `relativeTo` is itself an ActionType. Returns the
 * `tMs` of that reference action, or undefined when it was never performed.
 */
function resolveReferenceTime(
  step: ScenarioStep,
  performed: PerformedAction[],
  rule: TimingRule,
): number | undefined {
  const refAction: ActionType =
    rule.relativeTo === 'maneuver' ? maneuverExecutionAction(step.maneuver) : rule.relativeTo;
  return firstPerformed(performed, refAction)?.tMs;
}

export function evaluateTiming(step: ScenarioStep, performed: PerformedAction[]): DetectedFault[] {
  const faults: DetectedFault[] = [];
  const rules = step.timing;
  if (!rules || rules.length === 0) return faults;

  for (const rule of rules) {
    const refTime = resolveReferenceTime(step, performed, rule);
    // If the reference action was never performed we cannot evaluate timing; the
    // missing maneuver/reference is already captured as a missed-expected fault.
    if (refTime === undefined) continue;

    switch (rule.kind) {
      case 'signal_before': {
        const minMs = rule.minMs ?? 0;
        // If the signal was never given at all, stay silent — the expected-action
        // check raises the "no signal" fault; this rule only judges lateness.
        if (!firstPerformed(performed, rule.action)) break;
        // Judge the signal that is actually on going into the maneuver: the latest
        // one at/before the maneuver. If every signal is after it, it was too late.
        const signal = latestAtOrBefore(performed, rule.action, refTime);
        if (!signal) {
          faults.push(
            buildFault(rule.faultCode, step.id, `Signalled only after starting the maneuver — far too late.`),
          );
        } else if (refTime - signal.tMs < minMs) {
          const lead = Math.max(0, Math.round(refTime - signal.tMs));
          faults.push(
            buildFault(
              rule.faultCode,
              step.id,
              `Signalled only ${lead}ms before the maneuver; at least ${minMs}ms of advance warning is required.`,
            ),
          );
        }
        break;
      }

      case 'signal_cancel_after': {
        const maxMs = rule.maxMs ?? Number.POSITIVE_INFINITY;
        // The cancel must come at or after the maneuver reference time.
        const cancel = performed.find((p) => p.action === rule.action && p.tMs >= refTime);
        if (!cancel) {
          faults.push(
            buildFault(rule.faultCode, step.id, 'Forgot to cancel the signal after completing the maneuver.'),
          );
        } else if (cancel.tMs - refTime > maxMs) {
          const late = Math.round(cancel.tMs - refTime);
          faults.push(
            buildFault(
              rule.faultCode,
              step.id,
              `Cancelled the signal too late — ${late}ms after the maneuver (limit ${maxMs}ms).`,
            ),
          );
        }
        break;
      }

      case 'observation_before': {
        // A valid observation must occur strictly before the maneuver reference.
        const observedBefore = performed.some((p) => p.action === rule.action && p.tMs < refTime);
        if (!observedBefore) {
          const performedAtAll = firstPerformed(performed, rule.action);
          const detail = performedAtAll
            ? `Observation (${rule.action}) came too late — only after the maneuver had begun.`
            : `Missing observation (${rule.action}) before the maneuver.`;
          faults.push(buildFault(rule.faultCode, step.id, detail));
        }
        break;
      }
    }
  }

  return faults;
}
