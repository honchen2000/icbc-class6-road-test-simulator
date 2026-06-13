/**
 * Regression tests pinning three engine bugs that were fixed pre-release:
 *
 *   A) DEDUP — `evaluateStep` de-duplicates faults by code per step, so a code
 *      referenced by BOTH an expected action AND a timing rule is charged once.
 *   B) SIGNAL_BEFORE LATEST — `signal_before` measures lateness from the LATEST
 *      signal at/before the maneuver, and stays silent when the signal was never
 *      given at all (the missing-signal fault comes from the expected-action
 *      check, not the timing rule).
 *   C) PARK MAPPING — `MANEUVER_EXECUTION_ACTION.park` is 'stop' (was 'wrong'),
 *      so park-step timing rules resolve a reference action.
 *
 * Fixtures are synthetic `ScenarioStep`s with explicit `tMs` so the maths is
 * deterministic.
 */
import { describe, it, expect } from 'vitest';
import { evaluateStep } from '../src/core/evaluator';
import { evaluateTiming, maneuverExecutionAction } from '../src/core/signal';
import { scoreSession } from '../src/core/scoring';
import type { PerformedAction, ScenarioStep, TimingRule } from '../src/shared/types';

const STREET_VIEW = {
  label: 'Synthetic regression scene',
  fallbackScene: 'intersection',
} as const;

/** A left-turn step (maneuver executes via `turn_left`) with the given parts. */
function leftTurnStep(parts: Partial<ScenarioStep>): ScenarioStep {
  return {
    id: 'regression-step',
    title: 'Regression left turn',
    situation: 'Synthetic regression left turn.',
    instruction: 'Turn left correctly.',
    streetView: { ...STREET_VIEW },
    maneuver: 'left_turn',
    expected: [],
    ...parts,
  };
}

describe('A) DEDUP — same fault code from expected action + timing rule charged once', () => {
  it('omitting signal_cancel yields EXACTLY ONE SIGNAL_NOT_CANCELLED fault (15 pts, not 30)', () => {
    const step = leftTurnStep({
      // SIGNAL_NOT_CANCELLED from the missing expected action ...
      expected: [
        { action: 'turn_left', skill: 'steering', order: 1, faultCode: 'WIDE_TURN' },
        { action: 'signal_cancel', skill: 'communication', order: 2, faultCode: 'SIGNAL_NOT_CANCELLED' },
      ],
      // ... AND SIGNAL_NOT_CANCELLED from the timing rule.
      timing: [
        {
          kind: 'signal_cancel_after',
          action: 'signal_cancel',
          relativeTo: 'maneuver',
          maxMs: 3000,
          faultCode: 'SIGNAL_NOT_CANCELLED',
        },
      ],
    });
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 0 },
      { action: 'turn_left', tMs: 4000 }, // maneuver performed; signal_cancel omitted
    ];

    const evaluation = evaluateStep(step, performed);
    const cancelFaults = evaluation.faults.filter((f) => f.code === 'SIGNAL_NOT_CANCELLED');

    expect(cancelFaults).toHaveLength(1); // de-duplicated, not charged twice
    expect(evaluation.faults).toHaveLength(1);
    expect(cancelFaults[0].points).toBe(15); // SIGNAL_NOT_CANCELLED is 'major' = 15
    expect(evaluation.score).toBe(15); // one fault's points, NOT 30
    expect(evaluation.correct).toBe(false);

    // And the session score agrees — counted once, 15 points.
    const session = scoreSession(evaluation.faults);
    expect(session.totalPoints).toBe(15);
    expect(session.faultCounts.SIGNAL_NOT_CANCELLED).toBe(1);
  });
});

describe('B) SIGNAL_BEFORE — lateness from the LATEST signal at/before the maneuver', () => {
  it('signal at 0, cancel at 1000, signal again at 3500, turn at 4000 → SIGNAL_TOO_LATE (lead 500ms)', () => {
    const rule: TimingRule = {
      kind: 'signal_before',
      action: 'signal_left',
      relativeTo: 'maneuver',
      minMs: 3000,
      faultCode: 'SIGNAL_TOO_LATE',
    };
    const step = leftTurnStep({ timing: [rule] });
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 0 }, // early signal ...
      { action: 'signal_cancel', tMs: 1000 }, // ... then cancelled
      { action: 'signal_left', tMs: 3500 }, // re-signalled late: latest at/before maneuver
      { action: 'turn_left', tMs: 4000 }, // maneuver — lead is 500ms, not 4000ms
    ];

    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).toContain('SIGNAL_TOO_LATE');
    expect(faults).toHaveLength(1);
    // Lead is measured from the LATEST signal (3500), giving 500ms < minMs 3000.
    expect(faults[0].detail).toContain('500ms');
  });

  it('signal never given at all → timing rule stays SILENT (no SIGNAL_TOO_LATE)', () => {
    const rule: TimingRule = {
      kind: 'signal_before',
      action: 'signal_left',
      relativeTo: 'maneuver',
      minMs: 3000,
      faultCode: 'SIGNAL_TOO_LATE',
    };
    const step = leftTurnStep({ timing: [rule] });
    const performed: PerformedAction[] = [
      { action: 'turn_left', tMs: 4000 }, // maneuver performed; signal_left never given
    ];

    const faults = evaluateTiming(step, performed);
    // The missing-signal fault is the expected-action check's concern, not this rule's.
    expect(faults).toHaveLength(0);
    expect(faults.map((f) => f.code)).not.toContain('SIGNAL_TOO_LATE');
  });
});

describe('C) PARK MAPPING — park resolves to the stop action', () => {
  it("maneuverExecutionAction('park') === 'stop'", () => {
    expect(maneuverExecutionAction('park')).toBe('stop');
  });

  it('a park-step timing rule relative to the maneuver now resolves against the stop action', () => {
    const step = leftTurnStep({
      id: 'park-step',
      maneuver: 'park',
      timing: [
        {
          kind: 'signal_cancel_after',
          action: 'signal_cancel',
          relativeTo: 'maneuver',
          maxMs: 3000,
          faultCode: 'SIGNAL_NOT_CANCELLED',
        },
      ],
    });
    const performed: PerformedAction[] = [
      { action: 'stop', tMs: 2000 }, // executes the park maneuver → resolves reference time
      // no signal_cancel after the stop → rule fires
    ];

    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).toContain('SIGNAL_NOT_CANCELLED');
  });
});
