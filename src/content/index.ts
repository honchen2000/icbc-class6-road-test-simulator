/** Aggregated, pure content + fast lookup indexes (UI + tests). */
import type { FaultType, Scenario } from '../shared/types';
import { FAULT_TYPES } from './faults';
import { REGIONS } from './regions';

export { FAULT_TYPES, REGIONS };

/** All scenarios across every region, flattened. */
export const SCENARIOS: Scenario[] = REGIONS.flatMap((r) => r.scenarios);

export const FAULT_TYPE_BY_CODE: Map<string, FaultType> = new Map(
  FAULT_TYPES.map((f) => [f.code, f]),
);

export const SCENARIO_BY_ID: Map<string, Scenario> = new Map(SCENARIOS.map((s) => [s.id, s]));
