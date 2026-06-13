/**
 * Exam runner — the core procedural-practice experience.
 *
 * All data is read via api/client.ts -> services/local-api.ts (computed locally
 * from localStorage); there is no HTTP API.
 *
 * Flow:
 *  1. On mount, create a session (api.createSession) exactly once.
 *  2. For each step, present the scene (StreetView), the spoken examiner
 *     instruction (ExaminerBar), the situation + hint, a progress bar, and the
 *     action palette (ActionPanel).
 *  3. The rider taps actions; each is stamped with elapsed ms since the step was
 *     shown (performance.now()) and appended to a local performed list.
 *  4. Submit evaluates the step (api.evaluateStep) and shows the inline result;
 *     a one-line feedback is spoken.
 *  5. Next advances to nextStepId. When nextStepId is null OR the session has
 *     failed, the session is completed (api.completeSession) and we route to the
 *     results screen.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type {
  ActionType,
  PerformedAction,
  Scenario,
  ScenarioStep,
  SessionDTO,
  StepEvaluation,
} from '../../shared/types';
import ActionPanel from '../components/ActionPanel';
import ExaminerBar from '../components/ExaminerBar';
import FaultList from '../components/FaultList';
import Progress from '../components/Progress';
import StreetView from '../components/StreetView';
import Toast from '../components/Toast';
import { useSpeech } from '../hooks/useSpeech';
import { useToast } from '../hooks/useToast';
import './exam.css';

interface ReadyState {
  scenario: Scenario;
  session: SessionDTO;
}

export default function Exam() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const navigate = useNavigate();
  const { say } = useSpeech();
  const { message: toast, notify } = useToast();

  const [boot, setBoot] = useState<
    { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: ReadyState }
  >({ status: 'loading' });

  // Runtime exam state (only meaningful once booted).
  const [stepIndex, setStepIndex] = useState(0);
  const [performed, setPerformed] = useState<PerformedAction[]>([]);
  const [evaluation, setEvaluation] = useState<StepEvaluation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionDTO['status']>('in_progress');
  const [nextStepId, setNextStepId] = useState<string | null>(null);

  // Wall-clock origin for the current step (performance.now() at presentation).
  const stepShownAt = useRef<number>(0);

  /* ----- boot: create session once ----- */
  useEffect(() => {
    let active = true;
    if (!scenarioId) {
      setBoot({ status: 'error', message: 'No scenario specified.' });
      return;
    }
    setBoot({ status: 'loading' });
    api
      .createSession({ scenarioId })
      .then((sessionRes) => {
        if (!active) return;
        setBoot({
          status: 'ready',
          data: { scenario: sessionRes.scenario, session: sessionRes.session },
        });
        setSessionStatus(sessionRes.session.status);
        setStepIndex(0);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : 'Failed to start the session.';
        setBoot({ status: 'error', message });
      });
    return () => {
      active = false;
    };
  }, [scenarioId]);

  const data = boot.status === 'ready' ? boot.data : null;
  const steps: ScenarioStep[] = data?.scenario.steps ?? [];
  const step: ScenarioStep | undefined = steps[stepIndex];

  /* ----- reset per-step transient state whenever the step changes ----- */
  useEffect(() => {
    if (!step) return;
    setPerformed([]);
    setEvaluation(null);
    stepShownAt.current = performance.now();
  }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const perform = useCallback(
    (action: ActionType) => {
      if (evaluation) return; // locked after submit
      const tMs = Math.max(0, Math.round(performance.now() - stepShownAt.current));
      setPerformed((prev) => [...prev, { action, tMs }]);
    },
    [evaluation],
  );

  const undo = useCallback(() => {
    if (evaluation) return;
    setPerformed((prev) => prev.slice(0, -1));
  }, [evaluation]);

  const clear = useCallback(() => {
    if (evaluation) return;
    setPerformed([]);
  }, [evaluation]);

  const submit = useCallback(async () => {
    if (!data || !step || submitting || evaluation) return;
    setSubmitting(true);
    try {
      const res = await api.evaluateStep(data.session.id, step.id, { performed });
      setEvaluation(res.evaluation);
      setNextStepId(res.nextStepId);
      setSessionStatus(res.session.status);
      const line = feedbackLine(res.evaluation);
      say(line, { rate: 1 });
      notify(res.evaluation.correct ? 'Clean step!' : `${res.evaluation.faults.length} fault(s)`);
    } catch (err: unknown) {
      const message = err instanceof ApiError ? err.message : 'Could not evaluate this step.';
      notify(message, 3500);
    } finally {
      setSubmitting(false);
    }
  }, [data, step, performed, submitting, evaluation, say, notify]);

  const finish = useCallback(
    async (sessionId: string) => {
      setFinishing(true);
      try {
        await api.completeSession(sessionId);
      } catch {
        /* completion is best-effort; results screen re-fetches the session */
      } finally {
        navigate(`/results/${sessionId}`);
      }
    },
    [navigate],
  );

  const advance = useCallback(() => {
    if (!data) return;
    // End conditions: server says failed, or there is no next step.
    if (sessionStatus === 'failed' || nextStepId == null) {
      void finish(data.session.id);
      return;
    }
    const idx = steps.findIndex((s) => s.id === nextStepId);
    if (idx === -1) {
      // Defensive: unknown next step id -> treat as completion.
      void finish(data.session.id);
      return;
    }
    setStepIndex(idx);
  }, [data, sessionStatus, nextStepId, steps, finish]);

  const isLastByIndex = useMemo(
    () => (steps.length ? stepIndex >= steps.length - 1 : false),
    [steps.length, stepIndex],
  );
  const willFinish = evaluation != null && (sessionStatus === 'failed' || nextStepId == null);

  /* ----- render: boot states ----- */
  if (boot.status === 'loading') {
    return (
      <div className="panel center exam-boot">
        <div className="exam-spinner" aria-hidden="true" />
        <p className="muted" style={{ margin: 0 }}>
          Starting your session…
        </p>
      </div>
    );
  }
  if (boot.status === 'error') {
    return (
      <div className="panel exam-boot-error">
        <strong>Could not start the exam.</strong>
        <p className="muted" style={{ margin: '6px 0 12px' }}>
          {boot.message}
        </p>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
            Back to scenarios
          </button>
        </div>
      </div>
    );
  }
  if (!data || !step) {
    return (
      <div className="panel">
        <strong>This scenario has no steps.</strong>
        <p className="muted">Pick another scenario to practice.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Back to scenarios
        </button>
      </div>
    );
  }

  return (
    <div className="exam stack">
      <div className="spread exam-header">
        <div>
          <span className="tag">{data.scenario.area}</span>
          <h2 style={{ margin: '2px 0 0' }}>{data.scenario.name}</h2>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          Quit
        </button>
      </div>

      <Progress index={stepIndex} total={steps.length} />

      <StreetView spec={step.streetView} />

      <ExaminerBar instruction={step.instruction} speakKey={step.id} />

      <div className="panel exam-situation">
        <h3 style={{ marginBottom: 6 }}>{step.title}</h3>
        <p style={{ margin: 0 }}>{step.situation}</p>
        {step.speedZoneKph != null ? (
          <span className="badge badge-info" style={{ marginTop: 10 }}>
            Posted limit {step.speedZoneKph} km/h
          </span>
        ) : null}
        {step.hint ? (
          <p className="exam-hint">
            <span className="exam-hint-tag">Hint</span> {step.hint}
          </p>
        ) : null}
      </div>

      {evaluation ? (
        <div className="exam-result stack">
          <FaultList
            faults={evaluation.faults}
            emptyText="Clean! Every required action performed correctly."
          />
        </div>
      ) : (
        <ActionPanel
          performed={performed}
          disabled={submitting}
          onPerform={perform}
          onUndo={undo}
          onClear={clear}
        />
      )}

      <div className="exam-actions">
        {!evaluation ? (
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? 'Checking…' : 'Submit step'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-lg btn-block"
            onClick={advance}
            disabled={finishing}
          >
            {finishing
              ? 'Finishing…'
              : willFinish
                ? sessionStatus === 'failed'
                  ? 'See result'
                  : 'Finish & see result'
                : isLastByIndex
                  ? 'Finish & see result'
                  : 'Next step →'}
          </button>
        )}
      </div>

      <Toast message={toast} />
    </div>
  );
}

function feedbackLine(ev: StepEvaluation): string {
  if (ev.correct || ev.faults.length === 0) {
    return 'Good. That step was clean.';
  }
  const worst = [...ev.faults].sort((a, b) => b.points - a.points)[0];
  if (ev.faults.length === 1) {
    return worst.title + '.';
  }
  return `${ev.faults.length} faults. The most serious: ${worst.title}.`;
}
