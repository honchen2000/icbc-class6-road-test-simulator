// Focused signal-cancellation drill (client-only — no backend calls).
//
// Trains the headline weakness: forgetting to cancel the turn signal after a
// maneuver. Each round derives a left/right turn prompt from a deterministic,
// incrementing round counter (no module-scope randomness). The rider must tap,
// in order: Signal (matching side) -> Shoulder check -> Execute turn -> Cancel
// signal. We time the gap between Execute and Cancel with performance.now() and
// grade against the same rule the exam engine uses (cancel within 3000 ms).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isSpeechSupported, speak, cancelSpeech } from '../lib/speech';
import '../components/signal-drill.css';

/** Cancel-window the rider must beat, mirroring the exam timing rule. */
const CANCEL_WINDOW_MS = 3000;

type Side = 'left' | 'right';

/** The four ordered phases of one repetition. */
type Phase = 'signal' | 'shoulder' | 'execute' | 'cancel';

const PHASE_ORDER: Phase[] = ['signal', 'shoulder', 'execute', 'cancel'];

interface Round {
  /** 1-based round number (drives the deterministic prompt). */
  n: number;
  side: Side;
  instruction: string;
}

interface Verdict {
  pass: boolean;
  /** Headline line, e.g. "Cancelled in 1.8s ✓". */
  headline: string;
  /** Supporting detail line. */
  detail: string;
}

interface Stats {
  attempts: number;
  passes: number;
  streak: number;
  /** Best (lowest) cancel time in ms across passing rounds, or null. */
  bestCancelMs: number | null;
  /** Sum of cancel times over passing rounds, for the running average. */
  cancelSumMs: number;
  cancelCount: number;
}

const INITIAL_STATS: Stats = {
  attempts: 0,
  passes: 0,
  streak: 0,
  bestCancelMs: null,
  cancelSumMs: 0,
  cancelCount: 0,
};

/** Deterministic round builder: side alternates with the round counter. */
function buildRound(n: number): Round {
  const side: Side = n % 2 === 1 ? 'left' : 'right';
  const where = side === 'left' ? 'left' : 'right';
  return {
    n,
    side,
    instruction: `Approaching the intersection — prepare to turn ${where}.`,
  };
}

function fmtSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function SignalDrill() {
  const speechOn = useMemo(() => isSpeechSupported(), []);

  const [round, setRound] = useState<Round>(() => buildRound(1));
  /** Phases completed so far this round, in tap order. */
  const [progress, setProgress] = useState<Phase[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);

  /** performance.now() timestamp captured the instant Execute was tapped. */
  const executeAtRef = useRef<number | null>(null);

  const nextPhase: Phase | null = verdict ? null : (PHASE_ORDER[progress.length] ?? null);
  const sideLabel = round.side === 'left' ? 'Left' : 'Right';

  /* Speak each new prompt once it is shown (and after a reset to round 1). */
  useEffect(() => {
    if (speechOn) speak(round.instruction);
    // Cancel any in-flight utterance when leaving the page.
    return () => cancelSpeech();
  }, [round, speechOn]);

  /* Advance to the next round, resetting per-round state. */
  const goNext = useCallback(() => {
    executeAtRef.current = null;
    setProgress([]);
    setVerdict(null);
    setRound((r) => buildRound(r.n + 1));
  }, []);

  /* Reset the whole session back to round 1 with cleared stats. */
  const reset = useCallback(() => {
    executeAtRef.current = null;
    setProgress([]);
    setVerdict(null);
    setStats(INITIAL_STATS);
    setRound(buildRound(1));
  }, []);

  /* Grade the completed repetition and fold the result into the stats. */
  const finish = useCallback(
    (cancelGapMs: number) => {
      // By construction of the tap handler, reaching here means the rider
      // signalled and shoulder-checked before executing, then cancelled. The
      // only remaining question is whether the cancel beat the window.
      const onTime = cancelGapMs <= CANCEL_WINDOW_MS;
      const v: Verdict = onTime
        ? {
            pass: true,
            headline: `Cancelled in ${fmtSeconds(cancelGapMs)} ✓`,
            detail: 'Signalled, shoulder-checked, turned, then cancelled. Clean repetition.',
          }
        : {
            pass: false,
            headline: 'Cancel was late ✗',
            detail: `You cancelled after ${fmtSeconds(
              cancelGapMs,
            )} — the examiner expects it within ${CANCEL_WINDOW_MS / 1000}s of completing the turn.`,
          };

      setVerdict(v);
      setStats((s) => {
        const passes = s.passes + (onTime ? 1 : 0);
        const streak = onTime ? s.streak + 1 : 0;
        const bestCancelMs = onTime
          ? s.bestCancelMs === null
            ? cancelGapMs
            : Math.min(s.bestCancelMs, cancelGapMs)
          : s.bestCancelMs;
        return {
          attempts: s.attempts + 1,
          passes,
          streak,
          bestCancelMs,
          // Average tracks how quickly the rider cancels on good reps.
          cancelSumMs: onTime ? s.cancelSumMs + cancelGapMs : s.cancelSumMs,
          cancelCount: onTime ? s.cancelCount + 1 : s.cancelCount,
        };
      });
      if (speechOn) speak(v.headline);
    },
    [speechOn],
  );

  /* Fail the repetition immediately (out-of-order tap) with a spoken reason. */
  const failNow = useCallback(
    (headline: string, detail: string) => {
      const v: Verdict = { pass: false, headline, detail };
      setVerdict(v);
      setStats((s) => ({
        ...s,
        attempts: s.attempts + 1,
        streak: 0,
      }));
      if (speechOn) speak(headline);
    },
    [speechOn],
  );

  /* Tap handlers — each verifies it is the expected next phase. */
  const tapSignal = useCallback(
    (side: Side) => {
      if (verdict || nextPhase !== 'signal') return;
      if (side !== round.side) {
        failNow(
          'Wrong signal side ✗',
          `The turn is to the ${round.side}. Signal ${round.side}, not ${side}.`,
        );
        return;
      }
      setProgress((p) => [...p, 'signal']);
    },
    [verdict, nextPhase, round.side, failNow],
  );

  const tapShoulder = useCallback(() => {
    if (verdict || nextPhase !== 'shoulder') return;
    setProgress((p) => [...p, 'shoulder']);
  }, [verdict, nextPhase]);

  const tapExecute = useCallback(() => {
    if (verdict || nextPhase !== 'execute') return;
    executeAtRef.current = performance.now();
    setProgress((p) => [...p, 'execute']);
  }, [verdict, nextPhase]);

  const tapCancel = useCallback(() => {
    if (verdict || nextPhase !== 'cancel') return;
    const start = executeAtRef.current;
    if (start === null) return; // defensive: cannot happen given ordering
    const gap = performance.now() - start;
    setProgress((p) => [...p, 'cancel']);
    finish(gap);
  }, [verdict, nextPhase, finish]);

  const avgCancelMs = stats.cancelCount > 0 ? stats.cancelSumMs / stats.cancelCount : null;
  const passRate = stats.attempts > 0 ? Math.round((stats.passes / stats.attempts) * 100) : 0;

  // Per-step status for the ordered checklist.
  const stepStatus = (phase: Phase): 'done' | 'active' | 'todo' => {
    if (progress.includes(phase)) return 'done';
    if (nextPhase === phase) return 'active';
    return 'todo';
  };

  const steps: { phase: Phase; label: string }[] = [
    { phase: 'signal', label: `Signal ${sideLabel.toLowerCase()}` },
    { phase: 'shoulder', label: `${sideLabel} shoulder check` },
    { phase: 'execute', label: `Turn ${sideLabel.toLowerCase()}` },
    { phase: 'cancel', label: 'Cancel signal' },
  ];

  const signalDone = progress.includes('signal');

  return (
    <div className="drill">
      <div className="stack-sm">
        <div className="spread">
          <h1 style={{ margin: 0 }}>Signal-Cancel Drill</h1>
          <span className="badge badge-info">Round {round.n}</span>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Tap the four steps in order. The clock starts when you complete the turn — cancel within{' '}
          {CANCEL_WINDOW_MS / 1000}s. Builds the habit of clearing your signal every single time.
        </p>
      </div>

      {/* Spoken prompt */}
      <div className="card drill-prompt">
        <div className="drill-round">Round {round.n}</div>
        <div className="drill-instruction">{round.instruction}</div>
        <span className={`badge drill-side ${round.side === 'left' ? 'badge-info' : 'badge-warn'}`}>
          Turning {sideLabel}
        </span>
        {!speechOn && (
          <div>
            <small className="faint">Voice prompts unavailable on this device.</small>
          </div>
        )}
      </div>

      {/* Ordered checklist */}
      <div className="panel">
        <div className="tag mb-1">Procedure</div>
        <div className="drill-steps">
          {steps.map((s, i) => {
            const status = stepStatus(s.phase);
            return (
              <div
                key={s.phase}
                className={`drill-step ${status === 'done' ? 'is-done' : ''} ${
                  status === 'active' ? 'is-active' : ''
                }`}
              >
                <span className="drill-step-num">{status === 'done' ? '✓' : i + 1}</span>
                <span className="drill-step-label">{s.label}</span>
                {status === 'active' && <span className="drill-step-meta">tap now</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Verdict */}
      {verdict && (
        <div
          className={`card drill-verdict ${verdict.pass ? 'is-pass' : 'is-fail'}`}
          role="status"
          aria-live="polite"
        >
          {verdict.headline}
          <span className="drill-verdict-detail">{verdict.detail}</span>
        </div>
      )}

      {/* Tap pad */}
      <div className="drill-pad">
        <button
          type="button"
          className={`btn btn-lg drill-tap ${nextPhase === 'signal' ? 'is-next btn-primary' : ''}`}
          onClick={() => tapSignal(round.side)}
          disabled={!!verdict || nextPhase !== 'signal'}
          aria-label={`Signal ${sideLabel}`}
        >
          Signal {sideLabel}
          <span className="drill-tap-sub">Step 1 · matching side</span>
        </button>

        <button
          type="button"
          className={`btn btn-lg drill-tap ${nextPhase === 'shoulder' ? 'is-next btn-primary' : ''}`}
          onClick={tapShoulder}
          disabled={!!verdict || nextPhase !== 'shoulder'}
          aria-label={`${sideLabel} shoulder check`}
        >
          {sideLabel} Shoulder Check
          <span className="drill-tap-sub">Step 2 · blind spot</span>
        </button>

        <button
          type="button"
          className={`btn btn-lg drill-tap ${nextPhase === 'execute' ? 'is-next btn-primary' : ''}`}
          onClick={tapExecute}
          disabled={!!verdict || nextPhase !== 'execute'}
          aria-label={`Execute turn ${sideLabel}`}
        >
          Execute Turn {sideLabel}
          <span className="drill-tap-sub">Step 3 · starts the clock</span>
        </button>

        <button
          type="button"
          className={`btn btn-lg drill-tap ${
            nextPhase === 'cancel' ? 'is-next btn-danger' : ''
          }`}
          onClick={tapCancel}
          disabled={!!verdict || nextPhase !== 'cancel'}
          aria-label="Cancel signal"
        >
          Cancel Signal
          <span className="drill-tap-sub">
            {signalDone ? 'Step 4 · do not forget!' : 'Step 4'}
          </span>
        </button>
      </div>

      {/* Controls */}
      <div className="row-wrap">
        <button type="button" className="btn btn-primary btn-lg" onClick={goNext}>
          {verdict ? 'Next round →' : 'Skip round →'}
        </button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={reset}>
          Reset
        </button>
      </div>

      {/* Stats */}
      <div className="drill-stats">
        <div className="card drill-stat">
          <div className="drill-stat-value">{stats.streak}</div>
          <div className="drill-stat-label">Streak</div>
        </div>
        <div className="card drill-stat">
          <div className="drill-stat-value">
            {stats.passes}/{stats.attempts}
          </div>
          <div className="drill-stat-label">Clean reps</div>
        </div>
        <div className="card drill-stat">
          <div className="drill-stat-value">
            {stats.bestCancelMs === null ? '—' : fmtSeconds(stats.bestCancelMs)}
          </div>
          <div className="drill-stat-label">Best cancel</div>
        </div>
        <div className="card drill-stat">
          <div className="drill-stat-value">{avgCancelMs === null ? '—' : fmtSeconds(avgCancelMs)}</div>
          <div className="drill-stat-label">Avg cancel</div>
        </div>
      </div>

      <p className="faint center" style={{ margin: 0 }}>
        Pass rate {passRate}% over {stats.attempts} {stats.attempts === 1 ? 'attempt' : 'attempts'}.
      </p>
    </div>
  );
}
