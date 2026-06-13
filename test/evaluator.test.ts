/**
 * Unit tests for the pure decision-tree evaluator (`evaluateStep`).
 *
 * The evaluator does presence-based matching of performed vs. expected actions,
 * raises a fault per missing expected action and per performed prohibited action,
 * and merges in timing faults from `evaluateTiming`. These tests build small
 * synthetic ScenarioStep fixtures so each behaviour is isolated.
 */
import { describe, it, expect } from 'vitest';
import { evaluateStep } from '../src/core/evaluator';
import type { PerformedAction, ScenarioStep } from '../src/shared/types';

/** Minimal StreetView spec required by the ScenarioStep type. */
const STREET_VIEW = {
  label: 'Synthetic test scene',
  fallbackScene: 'straight',
} as const;

/**
 * A simple left-turn step with no timing rules so the evaluator's
 * missing/prohibited logic can be tested in isolation.
 */
function leftTurnStep(): ScenarioStep {
  return {
    id: 'step-left-turn',
    title: 'Left turn',
    situation: 'Synthetic left turn.',
    instruction: 'Turn left.',
    streetView: { ...STREET_VIEW },
    maneuver: 'left_turn',
    expected: [
      { action: 'mirror_left', skill: 'observation', order: 1, faultCode: 'MIRROR_CHECK_MISSED' },
      { action: 'signal_left', skill: 'communication', order: 2, faultCode: 'NO_SIGNAL' },
      { action: 'turn_left', skill: 'steering', order: 3, faultCode: 'WIDE_TURN' },
    ],
    prohibited: [{ action: 'accelerate', faultCode: 'FAILED_TO_YIELD' }],
  };
}

describe('evaluateStep — presence matching', () => {
  it('clean run: all expected performed, no prohibited → correct=true, score=0, no faults', () => {
    const step = leftTurnStep();
    const performed: PerformedAction[] = [
      { action: 'mirror_left', tMs: 100 },
      { action: 'signal_left', tMs: 200 },
      { action: 'turn_left', tMs: 4000 },
    ];

    const result = evaluateStep(step, performed);

    expect(result.correct).toBe(true);
    expect(result.score).toBe(0);
    expect(result.faults).toHaveLength(0);
    expect(result.stepId).toBe('step-left-turn');
    expect(result.matchedExpected).toEqual(['mirror_left', 'signal_left', 'turn_left']);
    expect(result.missedExpected).toEqual([]);
    // The evaluation echoes back the performed actions verbatim.
    expect(result.performed).toBe(performed);
  });

  it('missing expected action → that action\'s faultCode appears and correct=false', () => {
    const step = leftTurnStep();
    // Omit the shoulder/mirror check: drop mirror_left.
    const performed: PerformedAction[] = [
      { action: 'signal_left', tMs: 200 },
      { action: 'turn_left', tMs: 4000 },
    ];

    const result = evaluateStep(step, performed);

    expect(result.correct).toBe(false);
    expect(result.missedExpected).toEqual(['mirror_left']);
    expect(result.matchedExpected).toEqual(['signal_left', 'turn_left']);

    const codes = result.faults.map((f) => f.code);
    expect(codes).toContain('MIRROR_CHECK_MISSED');
    // Exactly one fault — the missing mirror check.
    expect(result.faults).toHaveLength(1);

    const fault = result.faults[0];
    expect(fault.stepId).toBe('step-left-turn');
    // MIRROR_CHECK_MISSED is a 'major' observation fault → 15 points.
    expect(fault.severity).toBe('major');
    expect(fault.skill).toBe('observation');
    expect(fault.points).toBe(15);
    expect(result.score).toBe(15);
  });

  it('prohibited action performed → its faultCode appears and correct=false', () => {
    const step = leftTurnStep();
    // Full correct procedure PLUS a prohibited accelerate.
    const performed: PerformedAction[] = [
      { action: 'mirror_left', tMs: 100 },
      { action: 'signal_left', tMs: 200 },
      { action: 'turn_left', tMs: 4000 },
      { action: 'accelerate', tMs: 4200 },
    ];

    const result = evaluateStep(step, performed);

    expect(result.correct).toBe(false);
    // No expected actions were missed.
    expect(result.missedExpected).toEqual([]);

    const codes = result.faults.map((f) => f.code);
    expect(codes).toContain('FAILED_TO_YIELD');
    expect(result.faults).toHaveLength(1);

    // FAILED_TO_YIELD is a 'dangerous' space fault → 25 points.
    const fault = result.faults.find((f) => f.code === 'FAILED_TO_YIELD')!;
    expect(fault.severity).toBe('dangerous');
    expect(fault.skill).toBe('space');
    expect(fault.points).toBe(25);
    expect(result.score).toBe(25);
  });

  it('several missing expected actions each raise their own fault', () => {
    const step = leftTurnStep();
    // Only the turn itself performed: both observation and signal missing.
    const performed: PerformedAction[] = [{ action: 'turn_left', tMs: 4000 }];

    const result = evaluateStep(step, performed);

    const codes = result.faults.map((f) => f.code).sort();
    expect(codes).toEqual(['MIRROR_CHECK_MISSED', 'NO_SIGNAL'].sort());
    expect(result.missedExpected.sort()).toEqual(['mirror_left', 'signal_left'].sort());
    expect(result.matchedExpected).toEqual(['turn_left']);
    expect(result.correct).toBe(false);
  });

  it('unknown faultCode falls back to a generic major fault (does not throw)', () => {
    const step: ScenarioStep = {
      id: 'step-unknown',
      title: 'Unknown code',
      situation: 'A step referencing a fault code not in the catalog.',
      instruction: 'Do the thing.',
      streetView: { ...STREET_VIEW },
      maneuver: 'straight',
      expected: [
        { action: 'go_straight', skill: 'steering', order: 1, faultCode: 'THIS_CODE_DOES_NOT_EXIST' },
      ],
    };
    // Perform nothing → the unknown-code expected action is missed.
    const result = evaluateStep(step, []);

    expect(result.faults).toHaveLength(1);
    const fault = result.faults[0];
    expect(fault.code).toBe('THIS_CODE_DOES_NOT_EXIST');
    // Fallback metadata per buildFault: major / observation / 15 points.
    expect(fault.severity).toBe('major');
    expect(fault.skill).toBe('observation');
    expect(fault.points).toBe(15);
    expect(fault.title).toBe('THIS_CODE_DOES_NOT_EXIST');
  });

  it('handles a step with no prohibited list', () => {
    const step: ScenarioStep = {
      id: 'step-no-prohibited',
      title: 'No prohibited',
      situation: 'Straight with no prohibited actions.',
      instruction: 'Continue.',
      streetView: { ...STREET_VIEW },
      maneuver: 'straight',
      expected: [
        { action: 'maintain_speed', skill: 'speed', order: 1, faultCode: 'SPEED_TOO_FAST' },
      ],
    };
    const result = evaluateStep(step, [{ action: 'maintain_speed', tMs: 500 }]);
    expect(result.correct).toBe(true);
    expect(result.faults).toHaveLength(0);
  });
});
