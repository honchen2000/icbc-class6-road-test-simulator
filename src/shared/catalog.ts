/**
 * Runtime catalogs shared by the Worker and the SPA: the 5 global skills, the
 * rider action palette, and the scoring constants. Pure data + tiny helpers, so
 * it is safe to import from either side and from Node (tests, seed generator).
 */
import type {
  ActionDef,
  ActionType,
  FaultSeverity,
  GlobalSkill,
  GlobalSkillId,
} from './types';

/* ICBC's five scored global skills. */
export const GLOBAL_SKILLS: GlobalSkill[] = [
  {
    id: 'observation',
    name: 'Observation',
    description:
      'Mirror and shoulder checks before every change of speed, position, or direction.',
  },
  {
    id: 'speed',
    name: 'Speed Control',
    description: 'Selecting and maintaining a speed appropriate to limits and conditions.',
  },
  {
    id: 'steering',
    name: 'Steering / Vehicle Control',
    description: 'Smooth control, correct hand position, never coasting in neutral while moving.',
  },
  {
    id: 'space',
    name: 'Space Margins',
    description: 'Lane positioning and safe following / clearance distances.',
  },
  {
    id: 'communication',
    name: 'Communication',
    description: 'Correct, timely signalling — and cancelling the signal after the maneuver.',
  },
];

export const GLOBAL_SKILL_BY_ID: Record<GlobalSkillId, GlobalSkill> = Object.fromEntries(
  GLOBAL_SKILLS.map((s) => [s.id, s]),
) as Record<GlobalSkillId, GlobalSkill>;

/* The fixed palette of actions a rider can perform during a step. */
export const ACTIONS: ActionDef[] = [
  // Observation
  { type: 'mirror_left', label: 'Left Mirror', group: 'observation', skill: 'observation' },
  { type: 'mirror_right', label: 'Right Mirror', group: 'observation', skill: 'observation' },
  {
    type: 'shoulder_left',
    label: 'Left Shoulder',
    group: 'observation',
    skill: 'observation',
    hint: 'Blind-spot check',
  },
  {
    type: 'shoulder_right',
    label: 'Right Shoulder',
    group: 'observation',
    skill: 'observation',
    hint: 'Blind-spot check',
  },
  // Signal
  { type: 'signal_left', label: 'Signal Left', group: 'signal', skill: 'communication' },
  { type: 'signal_right', label: 'Signal Right', group: 'signal', skill: 'communication' },
  {
    type: 'signal_cancel',
    label: 'Cancel Signal',
    group: 'signal',
    skill: 'communication',
    hint: 'Do not forget!',
  },
  // Speed
  { type: 'accelerate', label: 'Accelerate', group: 'speed', skill: 'speed' },
  { type: 'brake', label: 'Brake', group: 'speed', skill: 'speed' },
  { type: 'maintain_speed', label: 'Hold Speed', group: 'speed', skill: 'speed' },
  { type: 'stop', label: 'Full Stop', group: 'speed', skill: 'speed' },
  // Lane position
  { type: 'lane_left', label: 'Lane Left', group: 'position', skill: 'space' },
  { type: 'lane_center', label: 'Lane Center', group: 'position', skill: 'space' },
  { type: 'lane_right', label: 'Lane Right', group: 'position', skill: 'space' },
  // Maneuver
  { type: 'turn_left', label: 'Turn Left', group: 'maneuver', skill: 'steering' },
  { type: 'turn_right', label: 'Turn Right', group: 'maneuver', skill: 'steering' },
  { type: 'go_straight', label: 'Go Straight', group: 'maneuver', skill: 'steering' },
  { type: 'proceed', label: 'Proceed', group: 'maneuver', skill: 'steering' },
  { type: 'wait', label: 'Wait / Yield', group: 'maneuver', skill: 'space' },
  { type: 'merge', label: 'Merge', group: 'maneuver', skill: 'space' },
];

export const ACTION_BY_TYPE: Record<ActionType, ActionDef> = Object.fromEntries(
  ACTIONS.map((a) => [a.type, a]),
) as Record<ActionType, ActionDef>;

/* Scoring model. Demerit points accumulate; an auto-fail ends the test. */
export const SEVERITY_POINTS: Record<FaultSeverity, number> = {
  minor: 5,
  major: 15,
  dangerous: 25,
  auto_fail: 1000,
};

/** A session fails once accumulated demerit points reach this threshold. */
export const FAIL_POINT_THRESHOLD = 75;

export function pointsForSeverity(severity: FaultSeverity): number {
  return SEVERITY_POINTS[severity];
}
