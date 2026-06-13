/**
 * Unit tests for the pure session scorer (`scoreSession`).
 *
 *   - totalPoints = sum of all fault points.
 *   - autoFail = any fault with severity 'auto_fail'.
 *   - passed = !autoFail && totalPoints < FAIL_POINT_THRESHOLD.
 *   - failReasons = auto-fail titles (de-duplicated) then a threshold message.
 *   - perSkill = points per global skill (all five keys present, default 0).
 *   - faultCounts = occurrence count keyed by fault code.
 */
import { describe, it, expect } from 'vitest';
import { scoreSession } from '../src/core/scoring';
import { FAIL_POINT_THRESHOLD, SEVERITY_POINTS } from '../src/shared/catalog';
import type { DetectedFault, FaultSeverity, GlobalSkillId } from '../src/shared/types';

let seq = 0;

/** Build a DetectedFault with points derived from severity (matching the engine). */
function fault(
  code: string,
  skill: GlobalSkillId,
  severity: FaultSeverity,
  stepId = `step-${seq++}`,
): DetectedFault {
  return {
    code,
    skill,
    severity,
    points: SEVERITY_POINTS[severity],
    title: `${code} title`,
    detail: `${code} detail`,
    stepId,
  };
}

describe('scoreSession — totals & per-skill', () => {
  it('sums fault points into totalPoints and per-skill buckets', () => {
    const faults: DetectedFault[] = [
      fault('MIRROR_CHECK_MISSED', 'observation', 'major'), // 15
      fault('SIGNAL_TOO_LATE', 'communication', 'minor'), // 5
      fault('WIDE_TURN', 'steering', 'major'), // 15
    ];
    const score = scoreSession(faults);

    expect(score.totalPoints).toBe(15 + 5 + 15);
    expect(score.perSkill.observation).toBe(15);
    expect(score.perSkill.communication).toBe(5);
    expect(score.perSkill.steering).toBe(15);
    // Untouched skills default to 0.
    expect(score.perSkill.speed).toBe(0);
    expect(score.perSkill.space).toBe(0);
  });

  it('always returns all five global-skill keys, even with no faults', () => {
    const score = scoreSession([]);
    expect(Object.keys(score.perSkill).sort()).toEqual(
      ['communication', 'observation', 'space', 'speed', 'steering'].sort(),
    );
    expect(score.perSkill.observation).toBe(0);
    expect(score.totalPoints).toBe(0);
  });

  it('faultCounts tallies occurrences by code', () => {
    const faults: DetectedFault[] = [
      fault('SIGNAL_NOT_CANCELLED', 'communication', 'major'),
      fault('SIGNAL_NOT_CANCELLED', 'communication', 'major'),
      fault('MIRROR_CHECK_MISSED', 'observation', 'major'),
    ];
    const score = scoreSession(faults);
    expect(score.faultCounts['SIGNAL_NOT_CANCELLED']).toBe(2);
    expect(score.faultCounts['MIRROR_CHECK_MISSED']).toBe(1);
  });
});

describe('scoreSession — pass / fail decisions', () => {
  it('a light / empty fault list → passed=true, autoFail=false, no fail reasons', () => {
    const empty = scoreSession([]);
    expect(empty.passed).toBe(true);
    expect(empty.autoFail).toBe(false);
    expect(empty.failReasons).toEqual([]);

    // A couple of minor faults — still well under threshold.
    const light = scoreSession([
      fault('SIGNAL_TOO_LATE', 'communication', 'minor'), // 5
      fault('ABRUPT_ACCELERATION', 'speed', 'minor'), // 5
    ]);
    expect(light.totalPoints).toBe(10);
    expect(light.passed).toBe(true);
    expect(light.autoFail).toBe(false);
    expect(light.failReasons).toEqual([]);
  });

  it('an auto_fail fault → passed=false, autoFail=true, title in failReasons', () => {
    const faults: DetectedFault[] = [
      fault('RAN_RED_LIGHT', 'observation', 'auto_fail'), // 1000
    ];
    const score = scoreSession(faults);
    expect(score.autoFail).toBe(true);
    expect(score.passed).toBe(false);
    expect(score.failReasons).toContain('RAN_RED_LIGHT title');
    // auto_fail alone (1000 pts) also exceeds threshold → both reasons present.
    expect(score.totalPoints).toBe(1000);
  });

  it('points >= FAIL_POINT_THRESHOLD (without auto_fail) → passed=false', () => {
    // Five 'major' faults = 75 points = exactly the threshold.
    const faults: DetectedFault[] = [
      fault('MIRROR_CHECK_MISSED', 'observation', 'major'),
      fault('SHOULDER_CHECK_MISSED', 'observation', 'major'),
      fault('NO_SIGNAL', 'communication', 'major'),
      fault('WIDE_TURN', 'steering', 'major'),
      fault('FOLLOWING_TOO_CLOSE', 'space', 'major'),
    ];
    const score = scoreSession(faults);
    expect(score.totalPoints).toBe(FAIL_POINT_THRESHOLD); // 75
    expect(score.autoFail).toBe(false);
    expect(score.passed).toBe(false);
    expect(score.failReasons).toContain(
      `Exceeded demerit threshold (${FAIL_POINT_THRESHOLD}/${FAIL_POINT_THRESHOLD})`,
    );
  });

  it('points just BELOW threshold (without auto_fail) → passed=true', () => {
    // 70 points: below the 75 threshold (boundary is >= fail).
    const faults: DetectedFault[] = [
      fault('MIRROR_CHECK_MISSED', 'observation', 'major'), // 15
      fault('SHOULDER_CHECK_MISSED', 'observation', 'major'), // 15
      fault('NO_SIGNAL', 'communication', 'major'), // 15
      fault('WIDE_TURN', 'steering', 'major'), // 15
      fault('SIGNAL_TOO_LATE', 'communication', 'minor'), // 5
      fault('ABRUPT_ACCELERATION', 'speed', 'minor'), // 5
    ];
    const score = scoreSession(faults);
    expect(score.totalPoints).toBe(70);
    expect(score.passed).toBe(true);
    expect(score.failReasons).toEqual([]);
  });

  it('de-duplicates repeated auto-fail titles in failReasons', () => {
    const faults: DetectedFault[] = [
      fault('RAN_STOP_SIGN', 'observation', 'auto_fail'),
      fault('RAN_STOP_SIGN', 'observation', 'auto_fail'), // same title twice
    ];
    const score = scoreSession(faults);
    const stopTitleCount = score.failReasons.filter((r) => r === 'RAN_STOP_SIGN title').length;
    expect(stopTitleCount).toBe(1);
    // Still counted twice in faultCounts.
    expect(score.faultCounts['RAN_STOP_SIGN']).toBe(2);
    // autoFail points (2000) also breach the threshold → threshold reason present too.
    expect(score.failReasons).toContain(
      `Exceeded demerit threshold (2000/${FAIL_POINT_THRESHOLD})`,
    );
  });

  it('auto-fail reasons are listed before the threshold reason', () => {
    const faults: DetectedFault[] = [
      fault('DANGEROUS_ACTION', 'steering', 'auto_fail'),
    ];
    const score = scoreSession(faults);
    expect(score.failReasons[0]).toBe('DANGEROUS_ACTION title');
    expect(score.failReasons[score.failReasons.length - 1]).toBe(
      `Exceeded demerit threshold (1000/${FAIL_POINT_THRESHOLD})`,
    );
  });
});
