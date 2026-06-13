/**
 * Content-integrity tests: the scenarios and fault catalog must be internally
 * consistent so the engine never references a fault code or action that does not
 * exist. These are pure data checks over FAULT_TYPES and SCENARIOS.
 */
import { describe, it, expect } from 'vitest';
import { FAULT_TYPES, SCENARIOS, FAULT_TYPE_BY_CODE, SCENARIO_BY_ID } from '../src/content/index';
import { ACTIONS } from '../src/shared/catalog';
import type { ActionType, FaultSeverity } from '../src/shared/types';

const VALID_ACTIONS = new Set<ActionType>(ACTIONS.map((a) => a.type));
const VALID_SEVERITIES = new Set<FaultSeverity>(['minor', 'major', 'dangerous', 'auto_fail']);
const VALID_SKILLS = new Set(['observation', 'speed', 'steering', 'space', 'communication']);
const FAULT_CODES = new Set(FAULT_TYPES.map((f) => f.code));

describe('FAULT_TYPES catalog integrity', () => {
  it('has at least one fault type', () => {
    expect(FAULT_TYPES.length).toBeGreaterThan(0);
  });

  it('every fault code is unique', () => {
    const codes = FAULT_TYPES.map((f) => f.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('every fault has a valid severity and skill, and non-empty copy', () => {
    for (const f of FAULT_TYPES) {
      expect(VALID_SEVERITIES.has(f.severity), `${f.code} severity ${f.severity}`).toBe(true);
      expect(VALID_SKILLS.has(f.skill), `${f.code} skill ${f.skill}`).toBe(true);
      expect(f.title.length, `${f.code} title`).toBeGreaterThan(0);
      expect(f.description.length, `${f.code} description`).toBeGreaterThan(0);
      expect(f.coaching.length, `${f.code} coaching`).toBeGreaterThan(0);
    }
  });

  it('FAULT_TYPE_BY_CODE index covers every fault and resolves correctly', () => {
    expect(FAULT_TYPE_BY_CODE.size).toBe(FAULT_TYPES.length);
    for (const f of FAULT_TYPES) {
      expect(FAULT_TYPE_BY_CODE.get(f.code)).toBe(f);
    }
  });
});

describe('SCENARIOS integrity', () => {
  it('has at least one scenario', () => {
    expect(SCENARIOS.length).toBeGreaterThan(0);
  });

  it('scenario ids are unique', () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('SCENARIO_BY_ID index covers every scenario and resolves correctly', () => {
    expect(SCENARIO_BY_ID.size).toBe(SCENARIOS.length);
    for (const s of SCENARIOS) {
      expect(SCENARIO_BY_ID.get(s.id)).toBe(s);
    }
  });

  it('every scenario has required metadata and at least one step', () => {
    const validDifficulty = new Set(['easy', 'medium', 'hard']);
    for (const s of SCENARIOS) {
      expect(s.id.length, `${s.id} id`).toBeGreaterThan(0);
      expect(s.name.length, `${s.id} name`).toBeGreaterThan(0);
      expect(s.area.length, `${s.id} area`).toBeGreaterThan(0);
      expect(s.description.length, `${s.id} description`).toBeGreaterThan(0);
      expect(validDifficulty.has(s.difficulty), `${s.id} difficulty`).toBe(true);
      expect(s.estimatedMinutes, `${s.id} estimatedMinutes`).toBeGreaterThan(0);
      expect(s.steps.length, `${s.id} steps`).toBeGreaterThan(0);
    }
  });

  it('every step id is unique across all scenarios', () => {
    const stepIds = SCENARIOS.flatMap((s) => s.steps.map((st) => st.id));
    expect(new Set(stepIds).size).toBe(stepIds.length);
  });

  it('every step has >= 1 expected action', () => {
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        expect(step.expected.length, `${s.id}/${step.id} expected`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('every step has a non-empty title, situation, instruction, and street-view label', () => {
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        expect(step.title.length, `${step.id} title`).toBeGreaterThan(0);
        expect(step.situation.length, `${step.id} situation`).toBeGreaterThan(0);
        expect(step.instruction.length, `${step.id} instruction`).toBeGreaterThan(0);
        expect(step.streetView.label.length, `${step.id} streetView.label`).toBeGreaterThan(0);
      }
    }
  });
});

describe('Scenario ↔ catalog cross-references', () => {
  it('every faultCode referenced by any step exists in FAULT_TYPES', () => {
    const missing: string[] = [];
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        for (const exp of step.expected) {
          if (!FAULT_CODES.has(exp.faultCode)) {
            missing.push(`${step.id} expected ${exp.action} → ${exp.faultCode}`);
          }
        }
        for (const pro of step.prohibited ?? []) {
          if (!FAULT_CODES.has(pro.faultCode)) {
            missing.push(`${step.id} prohibited ${pro.action} → ${pro.faultCode}`);
          }
        }
        for (const t of step.timing ?? []) {
          if (!FAULT_CODES.has(t.faultCode)) {
            missing.push(`${step.id} timing ${t.kind} → ${t.faultCode}`);
          }
        }
      }
    }
    expect(missing, `unknown fault codes: ${missing.join('; ')}`).toEqual([]);
  });

  it('every referenced action value is a valid ActionType (present in ACTIONS)', () => {
    const bad: string[] = [];
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        for (const exp of step.expected) {
          if (!VALID_ACTIONS.has(exp.action)) bad.push(`${step.id} expected ${exp.action}`);
        }
        for (const pro of step.prohibited ?? []) {
          if (!VALID_ACTIONS.has(pro.action)) bad.push(`${step.id} prohibited ${pro.action}`);
        }
        for (const t of step.timing ?? []) {
          if (!VALID_ACTIONS.has(t.action)) bad.push(`${step.id} timing action ${t.action}`);
          // relativeTo is either 'maneuver' or itself an ActionType.
          if (t.relativeTo !== 'maneuver' && !VALID_ACTIONS.has(t.relativeTo)) {
            bad.push(`${step.id} timing relativeTo ${t.relativeTo}`);
          }
        }
      }
    }
    expect(bad, `invalid actions: ${bad.join('; ')}`).toEqual([]);
  });

  it('every expected-action skill is a valid GlobalSkillId', () => {
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        for (const exp of step.expected) {
          expect(VALID_SKILLS.has(exp.skill), `${step.id} ${exp.action} skill ${exp.skill}`).toBe(
            true,
          );
        }
      }
    }
  });

  it('every expected action has a positive order index', () => {
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        for (const exp of step.expected) {
          expect(exp.order, `${step.id} ${exp.action} order`).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('all severities used by referenced fault codes resolve to valid severities', () => {
    // Indirectly confirms every referenced fault has a sane severity for scoring.
    for (const s of SCENARIOS) {
      for (const step of s.steps) {
        const codes = [
          ...step.expected.map((e) => e.faultCode),
          ...(step.prohibited ?? []).map((p) => p.faultCode),
          ...(step.timing ?? []).map((t) => t.faultCode),
        ];
        for (const code of codes) {
          const meta = FAULT_TYPE_BY_CODE.get(code);
          expect(meta, `${step.id} → ${code}`).toBeDefined();
          expect(VALID_SEVERITIES.has(meta!.severity), `${code} severity`).toBe(true);
        }
      }
    }
  });
});
