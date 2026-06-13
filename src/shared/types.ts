/**
 * Shared domain types for the ICBC Class 6 Road Test Simulator.
 *
 * The single source of truth for the app's domain shapes. TYPES ONLY (no
 * runtime values). Runtime catalogs (skills, action palette, scoring constants)
 * live in `./catalog`.
 */

/* ------------------------------------------------------------------ */
/* Global skills (ICBC's 5 scored competencies)                        */
/* ------------------------------------------------------------------ */

export type GlobalSkillId =
  | 'observation' // mirror + shoulder checks
  | 'speed' // speed control vs. posted/appropriate limits
  | 'steering' // vehicle control, hand position, no neutral while moving
  | 'space' // space margins, lane positioning, following/clearance distance
  | 'communication'; // signal use AND signal cancellation timing

export interface GlobalSkill {
  id: GlobalSkillId;
  name: string;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Rider action palette                                                */
/* ------------------------------------------------------------------ */

export type ActionGroup = 'observation' | 'signal' | 'speed' | 'position' | 'maneuver';

export type ActionType =
  // observation (a motorcycle has left + right mirrors only — no centre mirror)
  | 'mirror_left'
  | 'mirror_right'
  | 'shoulder_left'
  | 'shoulder_right'
  // signal (communication)
  | 'signal_left'
  | 'signal_right'
  | 'signal_cancel'
  // speed
  | 'accelerate'
  | 'brake'
  | 'maintain_speed'
  | 'stop'
  // lane position (space / steering)
  | 'lane_left'
  | 'lane_center'
  | 'lane_right'
  // maneuver execution
  | 'turn_left'
  | 'turn_right'
  | 'go_straight'
  | 'proceed'
  | 'wait'
  | 'merge';

export interface ActionDef {
  type: ActionType;
  label: string;
  group: ActionGroup;
  skill: GlobalSkillId;
  /** Short hint shown on the control button. */
  hint?: string;
}

/* ------------------------------------------------------------------ */
/* Faults                                                              */
/* ------------------------------------------------------------------ */

export type FaultSeverity = 'minor' | 'major' | 'dangerous' | 'auto_fail';

/** Catalog entry describing a class of error (stored in `fault_types`). */
export interface FaultType {
  /** Stable machine code, e.g. 'SIGNAL_NOT_CANCELLED'. */
  code: string;
  skill: GlobalSkillId;
  severity: FaultSeverity;
  title: string;
  description: string;
  /** Actionable coaching tip surfaced to the learner. */
  coaching: string;
}

/** A concrete fault detected during a session step. */
export interface DetectedFault {
  code: string;
  skill: GlobalSkillId;
  severity: FaultSeverity;
  /** Demerit points for this occurrence (from SEVERITY_POINTS). */
  points: number;
  title: string;
  /** Human explanation specific to this occurrence. */
  detail: string;
  stepId: string;
}

/* ------------------------------------------------------------------ */
/* Scenarios (decision-tree routes)                                    */
/* ------------------------------------------------------------------ */

export type SceneKind =
  | 'intersection'
  | 'residential'
  | 'highway_onramp'
  | 'straight'
  | 'curve'
  | 'parking';

export interface StreetViewSpec {
  /** Optional reference coordinates ("lat,lng") or a place query. */
  location?: string;
  heading?: number;
  pitch?: number;
  fov?: number;
  /** Human-facing caption, e.g. "No. 3 Rd & Westminster Hwy, facing north". */
  label: string;
  /** Illustration used by the built-in scene renderer. */
  fallbackScene: SceneKind;
}

export type ManeuverType =
  | 'left_turn'
  | 'right_turn'
  | 'lane_change_left'
  | 'lane_change_right'
  | 'straight'
  | 'stop'
  | 'start'
  | 'merge'
  | 'u_turn'
  | 'park';

/** An action expected as part of the correct procedure for a step. */
export interface ExpectedAction {
  action: ActionType;
  skill: GlobalSkillId;
  /** 1-based sequence index. Equal orders form an order-insensitive group. */
  order: number;
  /** Fault raised if this action is missing. */
  faultCode: string;
  /** Critical procedural actions weigh into observation-sequence checks. */
  critical?: boolean;
}

export interface ProhibitedAction {
  action: ActionType;
  faultCode: string;
}

export type TimingKind =
  | 'signal_before' // signal must be ON at least minMs before the maneuver
  | 'signal_cancel_after' // signal must be cancelled within maxMs after the maneuver
  | 'observation_before'; // an observation must occur before the maneuver

export interface TimingRule {
  kind: TimingKind;
  /** The action being timed (e.g. 'signal_left', 'signal_cancel'). */
  action: ActionType;
  /** Reference point: the step's maneuver, or another action. */
  relativeTo: 'maneuver' | ActionType;
  minMs?: number;
  maxMs?: number;
  /** Fault raised when the timing rule is violated. */
  faultCode: string;
}

export interface ScenarioStep {
  id: string;
  title: string;
  /** What is happening in the scene (context shown + spoken). */
  situation: string;
  /** The examiner's spoken instruction (English). */
  instruction: string;
  streetView: StreetViewSpec;
  maneuver: ManeuverType;
  /** Posted limit (km/h) for speed-control checks, if relevant. */
  speedZoneKph?: number;
  expected: ExpectedAction[];
  prohibited?: ProhibitedAction[];
  timing?: TimingRule[];
  hint?: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Scenario {
  id: string;
  name: string;
  area: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  steps: ScenarioStep[];
  tags?: string[];
}

export interface ScenarioSummary {
  id: string;
  name: string;
  area: string;
  description: string;
  difficulty: Difficulty;
  estimatedMinutes: number;
  stepCount: number;
  tags?: string[];
}

/**
 * A grouping of scenarios for one test centre / area. Adding a new region is the
 * primary way to extend the app: drop a `Scenario[]` file under
 * `src/content/routes.<region>.ts` and register it in `src/content/regions.ts`.
 */
export interface Region {
  id: string;
  name: string;
  scenarios: Scenario[];
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

export interface PerformedAction {
  action: ActionType;
  /** Milliseconds since the step was presented (client clock). */
  tMs: number;
}

export interface StepEvaluation {
  stepId: string;
  performed: PerformedAction[];
  faults: DetectedFault[];
  matchedExpected: ActionType[];
  missedExpected: ActionType[];
  /** No faults detected for the step. */
  correct: boolean;
  /** Demerit points lost on this step. */
  score: number;
}

export interface SessionScore {
  totalPoints: number;
  passed: boolean;
  autoFail: boolean;
  failReasons: string[];
  /** Demerit points lost per global skill. */
  perSkill: Record<GlobalSkillId, number>;
  /** Occurrence count keyed by fault code. */
  faultCounts: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

export type SessionStatus = 'in_progress' | 'passed' | 'failed' | 'abandoned';

export interface SessionDTO {
  id: string;
  scenarioId: string;
  scenarioName: string;
  userId: string | null;
  status: SessionStatus;
  currentStepIndex: number;
  totalSteps: number;
  totalPoints: number;
  startedAt: string; // ISO
  completedAt: string | null; // ISO
}

export interface SessionStepResult {
  stepId: string;
  title: string;
  faults: DetectedFault[];
  score: number;
  correct: boolean;
}

/* ------------------------------------------------------------------ */
/* API request / response DTOs                                         */
/* ------------------------------------------------------------------ */

export interface HealthResponse {
  ok: true;
  environment: string;
  time: string;
}

export interface ConfigResponse {
  environment: string;
}

export interface ScenariosResponse {
  scenarios: ScenarioSummary[];
}
export interface ScenarioResponse {
  scenario: Scenario;
}
export interface FaultTypesResponse {
  faultTypes: FaultType[];
}
export interface SkillsResponse {
  skills: GlobalSkill[];
}

export interface CreateSessionRequest {
  scenarioId: string;
  userId?: string | null;
}
export interface CreateSessionResponse {
  session: SessionDTO;
  scenario: Scenario;
}

export interface EvaluateStepRequest {
  performed: PerformedAction[];
}
export interface EvaluateStepResponse {
  evaluation: StepEvaluation;
  session: SessionDTO;
  nextStepId: string | null;
}

export interface CompleteSessionResponse {
  session: SessionDTO;
  score: SessionScore;
}

export interface SessionDetailResponse {
  session: SessionDTO;
  steps: SessionStepResult[];
  score: SessionScore | null;
}

export type ExaminerMode = 'instruction' | 'feedback' | 'debrief';

export interface ExaminerRequest {
  mode: ExaminerMode;
  scenarioId: string;
  stepId?: string;
  faults?: DetectedFault[];
  score?: SessionScore;
}
export interface ExaminerResponse {
  /** Text to speak via SpeechSynthesis. */
  speech: string;
  /** Bullet-point corrections / coaching. */
  corrections: string[];
  source: 'fallback';
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export interface SkillBreakdown {
  skill: GlobalSkillId;
  name: string;
  pointsLost: number;
  faultCount: number;
}
export interface FaultFrequency {
  code: string;
  title: string;
  skill: GlobalSkillId;
  severity: FaultSeverity;
  count: number;
}
export interface DailyAggregate {
  date: string; // YYYY-MM-DD
  sessions: number;
  faults: number;
  passRate: number; // 0..1
}
export interface WeaknessReport {
  perSkill: SkillBreakdown[];
  topFaults: FaultFrequency[];
  daily: DailyAggregate[];
  summary: {
    totalSessions: number;
    passRate: number; // 0..1
    mostCommonFault: string | null;
    weakestSkill: GlobalSkillId | null;
  };
}
export interface AnalyticsResponse {
  report: WeaknessReport;
}

/** Standard error envelope returned by the API on failure. */
export interface ApiErrorResponse {
  error: string;
  code?: string;
}
