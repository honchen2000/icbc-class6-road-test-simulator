/**
 * Local persistence for practice sessions (localStorage). The whole app is
 * single-user and offline, so a session — including each evaluated step and its
 * faults — is stored in full; analytics is aggregated from these records on read.
 */
import type { DetectedFault, PerformedAction, SessionStatus } from '../../shared/types';

export interface StoredStep {
  stepId: string;
  stepIndex: number;
  correct: boolean;
  score: number;
  performed: PerformedAction[];
  faults: DetectedFault[];
  createdAt: string; // ISO
}

export interface StoredSession {
  id: string;
  scenarioId: string;
  scenarioName: string;
  userId: string;
  status: SessionStatus;
  currentStepIndex: number;
  totalSteps: number;
  totalPoints: number;
  startedAt: string; // ISO
  completedAt: string | null; // ISO
  steps: StoredStep[];
}

const KEY = 'icbc-class6:sessions:v1';
const MAX_SESSIONS = 200;

function readAll(): StoredSession[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredSession[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: StoredSession[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_SESSIONS)));
  } catch {
    /* storage full or disabled — ignore */
  }
}

export function allSessions(): StoredSession[] {
  return readAll();
}

export function getSessionRecord(id: string): StoredSession | undefined {
  return readAll().find((s) => s.id === id);
}

export function saveSessionRecord(session: StoredSession): void {
  const list = readAll();
  const idx = list.findIndex((s) => s.id === session.id);
  if (idx >= 0) list[idx] = session;
  else list.unshift(session);
  writeAll(list);
}

export function clearSessions(): void {
  writeAll([]);
}

/** crypto.randomUUID() in a secure context, with a non-crypto fallback (file://). */
export function genId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through */
  }
  return `sess-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
