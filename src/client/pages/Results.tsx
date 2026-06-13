/**
 * Results / debrief screen.
 *
 * Loads the completed session (api.getSession), shows a pass/fail hero, the
 * demerit-points gauge + per-skill breakdown (ScoreCard), a grouped fault list
 * with coaching tips (enriched from api.faults), and a scripted examiner debrief
 * (api.examiner, mode "debrief"). The debrief can be replayed/spoken. Buttons
 * let the rider retry the same scenario or jump to analytics.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type {
  DetectedFault,
  ExaminerResponse,
  SessionDetailResponse,
  SessionScore,
} from '../../shared/types';
import FaultList from '../components/FaultList';
import ScoreCard from '../components/ScoreCard';
import { useSpeech } from '../hooks/useSpeech';
import './results.css';

export default function Results() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { supported: speechSupported, say } = useSpeech();

  const [boot, setBoot] = useState<
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'ready'; detail: SessionDetailResponse }
  >({ status: 'loading' });

  const [coachingByCode, setCoachingByCode] = useState<Record<string, string>>({});
  const [debrief, setDebrief] = useState<ExaminerResponse | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);

  /* ----- load session + fault catalog ----- */
  useEffect(() => {
    let active = true;
    if (!sessionId) {
      setBoot({ status: 'error', message: 'No session specified.' });
      return;
    }
    setBoot({ status: 'loading' });
    api
      .getSession(sessionId)
      .then((detail) => {
        if (!active) return;
        setBoot({ status: 'ready', detail });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : 'Failed to load your results.';
        setBoot({ status: 'error', message });
      });
    // Coaching tips are best-effort; failure simply omits the extra tip line.
    api
      .faults()
      .then((res) => {
        if (!active) return;
        const map: Record<string, string> = {};
        for (const ft of res.faultTypes) map[ft.code] = ft.coaching;
        setCoachingByCode(map);
      })
      .catch(() => {
        /* ignore — fault detail still shown */
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const detail = boot.status === 'ready' ? boot.detail : null;
  const score: SessionScore | null = detail?.score ?? null;

  const allFaults: DetectedFault[] = useMemo(() => {
    if (!detail) return [];
    return detail.steps.flatMap((s) => s.faults);
  }, [detail]);

  /* ----- AI debrief (once the session + score are known) ----- */
  useEffect(() => {
    let active = true;
    if (!detail || !score) return;
    setDebriefLoading(true);
    api
      .examiner({
        mode: 'debrief',
        scenarioId: detail.session.scenarioId,
        score,
        faults: allFaults,
      })
      .then((res) => {
        if (!active) return;
        setDebrief(res);
      })
      .catch(() => {
        if (!active) return;
        setDebrief(null);
      })
      .finally(() => {
        if (active) setDebriefLoading(false);
      });
    return () => {
      active = false;
    };
  }, [detail, score, allFaults]);

  const speakDebrief = useCallback(() => {
    if (debrief?.speech) say(debrief.speech, { rate: 0.98 });
  }, [debrief, say]);

  /* ----- boot states ----- */
  if (boot.status === 'loading') {
    return (
      <div className="panel center results-boot">
        <div className="results-spinner" aria-hidden="true" />
        <p className="muted" style={{ margin: 0 }}>
          Tallying your run…
        </p>
      </div>
    );
  }
  if (boot.status === 'error') {
    return (
      <div className="panel results-error">
        <strong>Could not load results.</strong>
        <p className="muted" style={{ margin: '6px 0 12px' }}>
          {boot.message}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          Back to scenarios
        </button>
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="panel">
        <strong>No results found for this session.</strong>
        <button
          type="button"
          className="btn btn-primary mt-2"
          onClick={() => navigate('/')}
        >
          Back to scenarios
        </button>
      </div>
    );
  }

  const passed = detail.session.status === 'passed';
  const failed = detail.session.status === 'failed';
  const heroClass = passed ? 'results-hero-pass' : failed ? 'results-hero-fail' : 'results-hero-neutral';

  return (
    <div className="results stack">
      <section className={`card results-hero ${heroClass}`}>
        <span className="results-hero-badge">
          {passed ? 'PASS' : failed ? 'FAIL' : statusLabel(detail.session.status)}
        </span>
        <h1 className="results-hero-title">
          {passed
            ? 'You passed this run'
            : failed
              ? 'Not a pass this time'
              : 'Run complete'}
        </h1>
        <p className="results-hero-sub muted">
          {detail.session.scenarioName} · {detail.session.totalSteps} step
          {detail.session.totalSteps === 1 ? '' : 's'}
        </p>
        {score && score.failReasons.length > 0 ? (
          <ul className="results-fail-reasons">
            {score.failReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {score ? (
        <ScoreCard score={score} />
      ) : (
        <div className="panel muted">Scoring is still being finalized for this session.</div>
      )}

      <section className="stack">
        <h2 style={{ margin: 0 }}>Examiner debrief</h2>
        <div className="panel results-debrief">
          {debriefLoading ? (
            <p className="muted" style={{ margin: 0 }}>
              Preparing your debrief…
            </p>
          ) : debrief ? (
            <>
              <div className="spread results-debrief-head">
                <span className="badge badge-info">Examiner</span>
                {speechSupported ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={speakDebrief}
                    aria-label="Speak the debrief"
                  >
                    <span aria-hidden="true">▶</span> Speak
                  </button>
                ) : null}
              </div>
              <p className="results-debrief-speech">{debrief.speech}</p>
              {debrief.corrections.length > 0 ? (
                <ul className="results-debrief-list">
                  {debrief.corrections.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No debrief available for this run.
            </p>
          )}
        </div>
      </section>

      <section className="stack">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Faults</h2>
          {allFaults.length > 0 ? <span className="badge">{allFaults.length}</span> : null}
        </div>
        <FaultList
          faults={allFaults}
          coachingByCode={coachingByCode}
          emptyText="No faults across the whole route — excellent control."
        />
      </section>

      <section className="row-wrap results-cta">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => navigate(`/exam/${detail.session.scenarioId}`)}
        >
          Retry this scenario
        </button>
        <button type="button" className="btn btn-lg" onClick={() => navigate('/analytics')}>
          View analytics
        </button>
        <button type="button" className="btn btn-ghost btn-lg" onClick={() => navigate('/')}>
          All scenarios
        </button>
      </section>
    </div>
  );
}

function statusLabel(status: SessionDetailResponse['session']['status']): string {
  switch (status) {
    case 'in_progress':
      return 'IN PROGRESS';
    case 'abandoned':
      return 'ABANDONED';
    case 'passed':
      return 'PASS';
    case 'failed':
      return 'FAIL';
    default:
      return String(status).toUpperCase();
  }
}
