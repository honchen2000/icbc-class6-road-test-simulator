/**
 * Session scoring. PURE/deterministic.
 *
 * Required behaviour:
 *  - totalPoints = sum of fault points.
 *  - autoFail = any fault with severity 'auto_fail'.
 *  - passed = !autoFail && totalPoints < FAIL_POINT_THRESHOLD (../shared/catalog).
 *  - failReasons: human-readable strings (auto-fail titles, or "Exceeded demerit
 *    threshold (X/threshold)").
 *  - perSkill: points summed per GlobalSkillId (all five keys present, default 0).
 *  - faultCounts: occurrences keyed by fault code.
 *
 * Pure module: no DOM, storage, network, or I/O. Imports only shared types +
 * shared catalog.
 */
import type { DetectedFault, GlobalSkillId, SessionScore } from '../shared/types';
import { FAIL_POINT_THRESHOLD, GLOBAL_SKILLS } from '../shared/catalog';

/** Fresh per-skill accumulator with all five global-skill keys present at 0. */
function emptyPerSkill(): Record<GlobalSkillId, number> {
  const perSkill = {} as Record<GlobalSkillId, number>;
  for (const skill of GLOBAL_SKILLS) {
    perSkill[skill.id] = 0;
  }
  return perSkill;
}

export function scoreSession(allFaults: DetectedFault[]): SessionScore {
  const perSkill = emptyPerSkill();
  const faultCounts: Record<string, number> = {};

  let totalPoints = 0;
  let autoFail = false;
  // Auto-fail reasons first (most important), de-duplicated by title.
  const autoFailReasons: string[] = [];
  const seenAutoFailTitles = new Set<string>();

  for (const fault of allFaults) {
    totalPoints += fault.points;
    perSkill[fault.skill] += fault.points;
    faultCounts[fault.code] = (faultCounts[fault.code] ?? 0) + 1;

    if (fault.severity === 'auto_fail') {
      autoFail = true;
      if (!seenAutoFailTitles.has(fault.title)) {
        seenAutoFailTitles.add(fault.title);
        autoFailReasons.push(fault.title);
      }
    }
  }

  const exceededThreshold = totalPoints >= FAIL_POINT_THRESHOLD;
  const passed = !autoFail && !exceededThreshold;

  const failReasons = [...autoFailReasons];
  if (exceededThreshold) {
    failReasons.push(`Exceeded demerit threshold (${totalPoints}/${FAIL_POINT_THRESHOLD})`);
  }

  return {
    totalPoints,
    passed,
    autoFail,
    failReasons,
    perSkill,
    faultCounts,
  };
}
