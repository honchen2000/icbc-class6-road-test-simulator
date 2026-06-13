/**
 * Unit tests for the pure signal/observation timing engine (`evaluateTiming`).
 *
 * Timing rules are evaluated relative to a reference time — usually the step's
 * maneuver execution action (e.g. `turn_left` for a `left_turn`). Each fixture
 * gives every action an explicit `tMs` so the timing maths is deterministic.
 *
 *   - signal_before:        signal must be ON >= minMs before the maneuver.
 *   - signal_cancel_after:  signal_cancel must occur within maxMs AFTER the maneuver.
 *   - observation_before:   observation must occur strictly BEFORE the maneuver.
 *
 * If the reference (maneuver) action was never performed, the rule is skipped
 * (the missing maneuver is the evaluator's concern, not the timing engine's).
 */
import { describe, it, expect } from 'vitest';
import { evaluateTiming, maneuverExecutionAction } from '../src/core/signal';
import type { PerformedAction, ScenarioStep, TimingRule } from '../src/shared/types';

const STREET_VIEW = {
  label: 'Synthetic timing scene',
  fallbackScene: 'intersection',
} as const;

/** Build a left-turn step (maneuver executes via `turn_left`) with given timing rules. */
function timingStep(timing: TimingRule[]): ScenarioStep {
  return {
    id: 'timing-step',
    title: 'Timed left turn',
    situation: 'Synthetic timed left turn.',
    instruction: 'Turn left with correct signal timing.',
    streetView: { ...STREET_VIEW },
    maneuver: 'left_turn',
    // expected is irrelevant to evaluateTiming; keep one entry for validity.
    expected: [
      { action: 'turn_left', skill: 'steering', order: 1, faultCode: 'WIDE_TURN' },
    ],
    timing,
  };
}

const SIGNAL_BEFORE: TimingRule = {
  kind: 'signal_before',
  action: 'signal_left',
  relativeTo: 'maneuver',
  minMs: 3000,
  faultCode: 'SIGNAL_TOO_LATE',
};

const CANCEL_AFTER: TimingRule = {
  kind: 'signal_cancel_after',
  action: 'signal_cancel',
  relativeTo: 'maneuver',
  maxMs: 3000,
  faultCode: 'SIGNAL_NOT_CANCELLED',
};

const OBSERVE_BEFORE: TimingRule = {
  kind: 'observation_before',
  action: 'shoulder_left',
  relativeTo: 'maneuver',
  faultCode: 'SHOULDER_CHECK_MISSED',
};

describe('maneuverExecutionAction', () => {
  it('maps maneuvers to the executing rider action', () => {
    expect(maneuverExecutionAction('left_turn')).toBe('turn_left');
    expect(maneuverExecutionAction('right_turn')).toBe('turn_right');
    expect(maneuverExecutionAction('straight')).toBe('go_straight');
    expect(maneuverExecutionAction('merge')).toBe('merge');
    expect(maneuverExecutionAction('lane_change_left')).toBe('lane_left');
    expect(maneuverExecutionAction('lane_change_right')).toBe('lane_right');
    expect(maneuverExecutionAction('stop')).toBe('stop');
    expect(maneuverExecutionAction('start')).toBe('proceed');
  });
});

describe('evaluateTiming — signal_cancel_after (the headline drill)', () => {
  it('NO cancel performed → SIGNAL_NOT_CANCELLED fault present', () => {
    const step = timingStep([CANCEL_AFTER]);
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 0 },
      { action: 'turn_left', tMs: 4000 }, // maneuver reference
      // no signal_cancel
    ];
    const faults = evaluateTiming(step, performed);
    const codes = faults.map((f) => f.code);
    expect(codes).toContain('SIGNAL_NOT_CANCELLED');
    expect(faults).toHaveLength(1);
    expect(faults[0].severity).toBe('major'); // SIGNAL_NOT_CANCELLED is major
    expect(faults[0].stepId).toBe('timing-step');
  });

  it('cancel within maxMs after the maneuver → no SIGNAL_NOT_CANCELLED fault', () => {
    const step = timingStep([CANCEL_AFTER]);
    const performed: PerformedAction[] = [
      { action: 'turn_left', tMs: 4000 },
      { action: 'signal_cancel', tMs: 6000 }, // 2000ms after maneuver, within 3000 limit
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).not.toContain('SIGNAL_NOT_CANCELLED');
    expect(faults).toHaveLength(0);
  });

  it('cancel exactly at maxMs boundary → no fault (uses strictly-greater comparison)', () => {
    const step = timingStep([CANCEL_AFTER]);
    const performed: PerformedAction[] = [
      { action: 'turn_left', tMs: 1000 },
      { action: 'signal_cancel', tMs: 4000 }, // exactly 3000ms after → cancel.tMs - refTime == maxMs
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults).toHaveLength(0);
  });

  it('cancel later than maxMs after the maneuver → SIGNAL_NOT_CANCELLED fault', () => {
    const step = timingStep([CANCEL_AFTER]);
    const performed: PerformedAction[] = [
      { action: 'turn_left', tMs: 1000 },
      { action: 'signal_cancel', tMs: 5000 }, // 4000ms after maneuver > 3000 limit
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).toContain('SIGNAL_NOT_CANCELLED');
    expect(faults).toHaveLength(1);
  });

  it('cancel that occurs BEFORE the maneuver does not count (must be >= refTime)', () => {
    const step = timingStep([CANCEL_AFTER]);
    const performed: PerformedAction[] = [
      { action: 'signal_cancel', tMs: 500 }, // cancelled before the turn — does not satisfy the rule
      { action: 'turn_left', tMs: 4000 },
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).toContain('SIGNAL_NOT_CANCELLED');
  });

  it('rule is skipped when the maneuver reference action was never performed', () => {
    const step = timingStep([CANCEL_AFTER]);
    const performed: PerformedAction[] = [{ action: 'signal_left', tMs: 0 }]; // no turn_left
    const faults = evaluateTiming(step, performed);
    expect(faults).toHaveLength(0);
  });
});

describe('evaluateTiming — signal_before', () => {
  it('signal too late (lead < minMs) → SIGNAL_TOO_LATE fault present', () => {
    const step = timingStep([SIGNAL_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 3000 },
      { action: 'turn_left', tMs: 4000 }, // only 1000ms of lead, need 3000
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).toContain('SIGNAL_TOO_LATE');
    expect(faults).toHaveLength(1);
    expect(faults[0].severity).toBe('minor'); // SIGNAL_TOO_LATE is minor
  });

  it('signal with sufficient lead (>= minMs) → no fault', () => {
    const step = timingStep([SIGNAL_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 0 },
      { action: 'turn_left', tMs: 4000 }, // 4000ms of lead, exceeds 3000
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults).toHaveLength(0);
  });

  it('signal lead exactly minMs → no fault (boundary, strictly-less comparison)', () => {
    const step = timingStep([SIGNAL_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 1000 },
      { action: 'turn_left', tMs: 4000 }, // exactly 3000ms lead == minMs
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults).toHaveLength(0);
  });

  it('signal missing entirely → signal_before stays silent (absence is the expected-action check\'s job)', () => {
    const step = timingStep([SIGNAL_BEFORE]);
    const performed: PerformedAction[] = [{ action: 'turn_left', tMs: 4000 }];
    const faults = evaluateTiming(step, performed);
    // signal_before only judges lateness; a never-given signal is reported by the
    // missing expected-action (NO_SIGNAL), not duplicated here.
    expect(faults.map((f) => f.code)).not.toContain('SIGNAL_TOO_LATE');
    expect(faults).toHaveLength(0);
  });
});

describe('evaluateTiming — observation_before', () => {
  it('observation missing entirely → SHOULDER_CHECK_MISSED fault present', () => {
    const step = timingStep([OBSERVE_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 0 },
      { action: 'turn_left', tMs: 4000 }, // no shoulder_left at all
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).toContain('SHOULDER_CHECK_MISSED');
    expect(faults).toHaveLength(1);
    expect(faults[0].severity).toBe('major'); // SHOULDER_CHECK_MISSED is major
  });

  it('observation strictly before the maneuver → no fault', () => {
    const step = timingStep([OBSERVE_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'shoulder_left', tMs: 1500 },
      { action: 'turn_left', tMs: 4000 },
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults).toHaveLength(0);
  });

  it('observation only AFTER the maneuver → SHOULDER_CHECK_MISSED fault (too late)', () => {
    const step = timingStep([OBSERVE_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'turn_left', tMs: 4000 },
      { action: 'shoulder_left', tMs: 4500 }, // performed, but after the maneuver
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).toContain('SHOULDER_CHECK_MISSED');
    expect(faults).toHaveLength(1);
  });

  it('observation exactly AT the maneuver time → fault (must be strictly before)', () => {
    const step = timingStep([OBSERVE_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'shoulder_left', tMs: 4000 },
      { action: 'turn_left', tMs: 4000 }, // p.tMs < refTime is false → not observed-before
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults.map((f) => f.code)).toContain('SHOULDER_CHECK_MISSED');
  });
});

describe('evaluateTiming — combined & empty rule sets', () => {
  it('a fully correct turn satisfies all three timing rules → no faults', () => {
    const step = timingStep([SIGNAL_BEFORE, CANCEL_AFTER, OBSERVE_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 0 }, // 4000ms lead
      { action: 'shoulder_left', tMs: 2000 }, // before maneuver
      { action: 'turn_left', tMs: 4000 }, // maneuver reference
      { action: 'signal_cancel', tMs: 5000 }, // 1000ms after, within limit
    ];
    const faults = evaluateTiming(step, performed);
    expect(faults).toHaveLength(0);
  });

  it('all three rules violated at once → all three fault codes present', () => {
    const step = timingStep([SIGNAL_BEFORE, CANCEL_AFTER, OBSERVE_BEFORE]);
    const performed: PerformedAction[] = [
      { action: 'turn_left', tMs: 4000 }, // maneuver reference, but nothing else timed correctly
      { action: 'signal_left', tMs: 3500 }, // only 500ms lead → too late
      // no shoulder_left, no signal_cancel
    ];
    const faults = evaluateTiming(step, performed);
    const codes = faults.map((f) => f.code).sort();
    expect(codes).toEqual(
      ['SIGNAL_TOO_LATE', 'SIGNAL_NOT_CANCELLED', 'SHOULDER_CHECK_MISSED'].sort(),
    );
  });

  it('no timing rules → empty fault list', () => {
    const step = timingStep([]);
    const faults = evaluateTiming(step, [{ action: 'turn_left', tMs: 4000 }]);
    expect(faults).toEqual([]);
  });

  it('undefined timing block → empty fault list', () => {
    const step = timingStep([]);
    // Remove the timing property entirely.
    delete (step as { timing?: TimingRule[] }).timing;
    const faults = evaluateTiming(step, [{ action: 'turn_left', tMs: 4000 }]);
    expect(faults).toEqual([]);
  });
});
