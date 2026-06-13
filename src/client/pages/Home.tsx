/**
 * Home / scenario picker. Fetches the scenario summaries from the API and
 * renders them as a responsive grid of cards (name, area, difficulty badge,
 * estimated minutes, step count, tags) each with a Start button that routes to
 * the exam runner. Also surfaces a prominent signal-cancellation drill card and
 * a link into analytics. Handles loading and error states.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { Difficulty, ScenarioSummary } from '../../shared/types';
import './home.css';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; scenarios: ScenarioSummary[] };

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  easy: 'badge-ok',
  medium: 'badge-warn',
  hard: 'badge-danger',
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export default function Home() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    api
      .scenarios()
      .then((res) => {
        if (!active) return;
        setState({ status: 'ready', scenarios: res.scenarios });
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof ApiError ? err.message : 'Failed to load scenarios.';
        setState({ status: 'error', message });
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="stack">
      <section className="home-hero">
        <h1>Practice the Class 6 road test</h1>
        <p className="muted">
          Run guided motorcycle scenarios, perform each procedure with the action controls, and get
          examiner-style coaching on observation, signalling, speed, space, and control.
        </p>
      </section>

      <section className="grid home-feature-grid">
        <button
          type="button"
          className="card card-hover home-feature home-feature-drill"
          onClick={() => navigate('/drill/signal')}
        >
          <span className="home-feature-tag tag">Focused drill</span>
          <h2>Signal-cancellation drill</h2>
          <p className="muted">
            The most common Class 6 fault. Rapid reps on signalling before, and cancelling after,
            every maneuver.
          </p>
          <span className="home-feature-cta">Start drill →</span>
        </button>

        <button
          type="button"
          className="card card-hover home-feature home-feature-analytics"
          onClick={() => navigate('/analytics')}
        >
          <span className="home-feature-tag tag">Track progress</span>
          <h2>Your analytics</h2>
          <p className="muted">
            See your weakest skills, most frequent faults, and pass-rate trend over time.
          </p>
          <span className="home-feature-cta">View analytics →</span>
        </button>
      </section>

      <section className="stack">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Scenarios</h2>
          {state.status === 'ready' ? (
            <small>
              {state.scenarios.length} route{state.scenarios.length === 1 ? '' : 's'}
            </small>
          ) : null}
        </div>

        {state.status === 'loading' ? <ScenarioSkeletons /> : null}

        {state.status === 'error' ? (
          <div className="panel home-error">
            <strong>Could not load scenarios.</strong>
            <p className="muted" style={{ margin: '6px 0 12px' }}>
              {state.message}
            </p>
            <button type="button" className="btn" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        ) : null}

        {state.status === 'ready' && state.scenarios.length === 0 ? (
          <div className="panel center muted">No scenarios available yet.</div>
        ) : null}

        {state.status === 'ready' && state.scenarios.length > 0 ? (
          <div className="grid">
            {state.scenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} onStart={() => navigate(`/exam/${s.id}`)} />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ScenarioCard({
  scenario,
  onStart,
}: {
  scenario: ScenarioSummary;
  onStart: () => void;
}) {
  return (
    <div className="card scenario-card stack">
      <div className="spread scenario-card-top">
        <span className="tag">{scenario.area}</span>
        <span className={`badge ${DIFFICULTY_BADGE[scenario.difficulty]}`}>
          {DIFFICULTY_LABEL[scenario.difficulty]}
        </span>
      </div>
      <div>
        <h3 style={{ marginBottom: 6 }}>{scenario.name}</h3>
        <p className="muted scenario-card-desc">{scenario.description}</p>
      </div>
      <div className="row-wrap scenario-card-meta">
        <span className="badge badge-info">⏱ {scenario.estimatedMinutes} min</span>
        <span className="badge badge-info">
          {scenario.stepCount} step{scenario.stepCount === 1 ? '' : 's'}
        </span>
        {scenario.tags?.map((t) => (
          <span key={t} className="badge">
            {t}
          </span>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={onStart}>
        Start practice
      </button>
    </div>
  );
}

function ScenarioSkeletons() {
  return (
    <div className="grid" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card scenario-card scenario-skeleton">
          <div className="skeleton-line" style={{ width: '40%' }} />
          <div className="skeleton-line" style={{ width: '75%', height: 18 }} />
          <div className="skeleton-line" style={{ width: '100%' }} />
          <div className="skeleton-line" style={{ width: '60%' }} />
          <div className="skeleton-line" style={{ width: '100%', height: 40 }} />
        </div>
      ))}
    </div>
  );
}
