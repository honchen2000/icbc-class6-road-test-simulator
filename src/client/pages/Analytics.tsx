/**
 * Analytics — weakness dashboard.
 *
 * Reads the aggregated WeaknessReport and the fault catalog via
 * api/client.ts -> services/local-api.ts (computed locally from localStorage,
 * to surface per-fault coaching), then
 * renders: summary cards, per-skill demerit bars, a ranked top-faults list with
 * severity dots + coaching, and a lightweight inline-SVG daily trend chart (no
 * chart library). Reuses the design system in index.css; chart-specific styling
 * is inline only.
 */
import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api/client';
import type {
  FaultFrequency,
  FaultType,
  GlobalSkillId,
  WeaknessReport,
} from '../../shared/types';

const SEVERITY_LABEL: Record<FaultFrequency['severity'], string> = {
  minor: 'Minor',
  major: 'Major',
  dangerous: 'Dangerous',
  auto_fail: 'Auto-fail',
};

const SKILL_COLORS: Record<GlobalSkillId, string> = {
  observation: '#4f7cff',
  speed: '#22d3a6',
  steering: '#f5a524',
  space: '#a78bfa',
  communication: '#f472b6',
};

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function shortDay(date: string): string {
  // date is YYYY-MM-DD (UTC). Render as e.g. "Jun 3" without TZ drift.
  const [y, m, d] = date.split('-').map((n) => Number.parseInt(n, 10));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function Analytics() {
  const [report, setReport] = useState<WeaknessReport | null>(null);
  const [coachingByCode, setCoachingByCode] = useState<Record<string, FaultType>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    Promise.all([api.analytics({ days: 30 }), api.faults()])
      .then(([analytics, faults]) => {
        if (!alive) return;
        setReport(analytics.report);
        const map: Record<string, FaultType> = {};
        for (const f of faults.faultTypes) map[f.code] = f;
        setCoachingByCode(map);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setErr(e instanceof ApiError ? e.message : 'Failed to load analytics.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="stack">
        <h1>Your Weaknesses</h1>
        <div className="card muted">Loading your practice history…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="stack">
        <h1>Your Weaknesses</h1>
        <div className="card">
          <p className="mb-1">Couldn’t load analytics.</p>
          <small className="faint">{err}</small>
        </div>
      </div>
    );
  }

  if (!report || report.summary.totalSessions === 0) {
    return (
      <div className="stack">
        <h1>Your Weaknesses</h1>
        <div className="card center stack" style={{ padding: 36, alignItems: 'center' }}>
          <div style={{ fontSize: 40, lineHeight: 1 }} aria-hidden="true">
            🏍️
          </div>
          <h2 style={{ margin: 0 }}>No data yet</h2>
          <p className="muted" style={{ maxWidth: 420 }}>
            Complete a practice run to see your weaknesses — your most common faults, the skills
            that need work, and your trend over time.
          </p>
          <a className="btn btn-primary" href="#/">
            Start a practice run
          </a>
        </div>
      </div>
    );
  }

  return <Dashboard report={report} coachingByCode={coachingByCode} />;
}

function Dashboard({
  report,
  coachingByCode,
}: {
  report: WeaknessReport;
  coachingByCode: Record<string, FaultType>;
}) {
  const { summary, perSkill, topFaults, daily } = report;

  const weakestSkillName = useMemo(() => {
    if (!summary.weakestSkill) return '—';
    return perSkill.find((s) => s.skill === summary.weakestSkill)?.name ?? summary.weakestSkill;
  }, [summary.weakestSkill, perSkill]);

  const maxSkillPoints = useMemo(
    () => Math.max(1, ...perSkill.map((s) => s.pointsLost)),
    [perSkill],
  );

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="spread" style={{ flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Your Weaknesses</h1>
          <small className="faint">Rolling 30-day summary of your practice runs.</small>
        </div>
        <a className="btn btn-ghost" href="#/">
          New run
        </a>
      </div>

      {/* ---- summary cards ---- */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        <StatCard label="Practice runs" value={String(summary.totalSessions)} />
        <StatCard
          label="Pass rate"
          value={pct(summary.passRate)}
          accent={summary.passRate >= 0.75 ? 'ok' : summary.passRate >= 0.5 ? 'warn' : 'danger'}
        />
        <StatCard label="Weakest skill" value={weakestSkillName} />
        <StatCard label="Most common fault" value={summary.mostCommonFault ?? 'None'} small />
      </div>

      {/* ---- per-skill bars ---- */}
      <section className="card stack">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Demerit points by skill</h2>
          <span className="tag">Lower is better</span>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          {perSkill.map((s) => {
            const width = s.pointsLost > 0 ? Math.max(4, (s.pointsLost / maxSkillPoints) * 100) : 0;
            return (
              <div key={s.skill} className="stack-sm">
                <div className="spread">
                  <span style={{ fontWeight: 650 }}>{s.name}</span>
                  <small className="faint">
                    {s.pointsLost} pts · {s.faultCount} {s.faultCount === 1 ? 'fault' : 'faults'}
                  </small>
                </div>
                <div className="bar" role="img" aria-label={`${s.name}: ${s.pointsLost} demerit points`}>
                  <span
                    style={{ width: `${width}%`, background: SKILL_COLORS[s.skill] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- top faults ---- */}
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Most frequent faults</h2>
        {topFaults.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No faults recorded in this window — clean riding.
          </p>
        ) : (
          <div className="stack" style={{ gap: 10 }}>
            {topFaults.map((f) => {
              const coaching = coachingByCode[f.code]?.coaching;
              return (
                <div
                  key={f.code}
                  className="panel stack-sm"
                  style={{ background: 'var(--bg-elev)', padding: 12 }}
                >
                  <div className="spread" style={{ alignItems: 'flex-start' }}>
                    <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                      <span
                        className={`sev sev-${f.severity}`}
                        title={SEVERITY_LABEL[f.severity]}
                        aria-hidden="true"
                      />
                      <span style={{ fontWeight: 650 }}>{f.title}</span>
                    </div>
                    <span className="badge badge-info" style={{ flexShrink: 0 }}>
                      ×{f.count}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    <span className="tag">{SEVERITY_LABEL[f.severity]}</span>
                    <span className="tag">{f.skill}</span>
                  </div>
                  {coaching ? (
                    <small className="muted" style={{ lineHeight: 1.45 }}>
                      {coaching}
                    </small>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- daily trend ---- */}
      <section className="card stack">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Activity & pass rate</h2>
          <div className="row" style={{ gap: 14 }}>
            <Legend color="var(--primary)" label="Faults" />
            <Legend color="var(--accent)" label="Pass rate" line />
          </div>
        </div>
        <TrendChart daily={daily} />
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: 'ok' | 'warn' | 'danger';
  small?: boolean;
}) {
  const accentColor =
    accent === 'ok'
      ? 'var(--ok)'
      : accent === 'warn'
        ? 'var(--warn)'
        : accent === 'danger'
          ? 'var(--danger)'
          : 'var(--text)';
  return (
    <div className="card stack-sm" style={{ gap: 4 }}>
      <span className="tag">{label}</span>
      <span
        style={{
          fontSize: small ? '1.05rem' : '1.7rem',
          fontWeight: 800,
          color: accentColor,
          lineHeight: 1.2,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Legend({ color, label, line }: { color: string; label: string; line?: boolean }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span
        aria-hidden="true"
        style={{
          width: 14,
          height: line ? 3 : 10,
          borderRadius: line ? 2 : 3,
          background: color,
          display: 'inline-block',
        }}
      />
      <small className="faint">{label}</small>
    </span>
  );
}

/** Lightweight inline-SVG combo chart: faults as bars, pass rate as a line. */
function TrendChart({ daily }: { daily: WeaknessReport['daily'] }) {
  const W = 720;
  const H = 200;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const maxFaults = Math.max(1, ...daily.map((d) => d.faults));
  const n = daily.length;
  const slot = n > 0 ? innerW / n : innerW;
  const barW = Math.max(2, Math.min(22, slot * 0.6));

  const yForRate = (rate: number) => padT + innerH * (1 - Math.max(0, Math.min(1, rate)));
  const xForIndex = (i: number) => padL + slot * i + slot / 2;

  // Pass-rate polyline only over days that actually had sessions.
  const ratePoints = daily
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.sessions > 0)
    .map(({ d, i }) => `${xForIndex(i).toFixed(1)},${yForRate(d.passRate).toFixed(1)}`);

  // Sparse tick labels (first, middle, last) to avoid crowding on mobile.
  const tickIdx = new Set<number>([0, Math.floor((n - 1) / 2), n - 1].filter((i) => i >= 0));

  const totalFaults = daily.reduce((acc, d) => acc + d.faults, 0);

  return (
    <div className="stack-sm">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label="Daily faults and pass rate over the last 30 days"
        style={{ display: 'block' }}
        preserveAspectRatio="none"
      >
        {/* horizontal gridlines (0/50/100% of fault scale) */}
        {[0, 0.5, 1].map((g) => {
          const y = padT + innerH * (1 - g);
          return (
            <line
              key={g}
              x1={padL}
              x2={W - padR}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray={g === 0 ? undefined : '3 4'}
            />
          );
        })}

        {/* fault bars */}
        {daily.map((d, i) => {
          if (d.faults <= 0) return null;
          const h = (d.faults / maxFaults) * innerH;
          const x = xForIndex(i) - barW / 2;
          const y = padT + innerH - h;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barW}
              height={Math.max(1, h)}
              rx={2}
              fill="var(--primary)"
              opacity={0.85}
            >
              <title>
                {shortDay(d.date)}: {d.faults} {d.faults === 1 ? 'fault' : 'faults'},{' '}
                {d.sessions} {d.sessions === 1 ? 'run' : 'runs'}
              </title>
            </rect>
          );
        })}

        {/* pass-rate line + dots */}
        {ratePoints.length >= 2 ? (
          <polyline
            points={ratePoints.join(' ')}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        {daily.map((d, i) =>
          d.sessions > 0 ? (
            <circle
              key={`pt-${d.date}`}
              cx={xForIndex(i)}
              cy={yForRate(d.passRate)}
              r={3}
              fill="var(--accent)"
              stroke="var(--bg)"
              strokeWidth={1.5}
            >
              <title>
                {shortDay(d.date)}: {pct(d.passRate)} pass rate
              </title>
            </circle>
          ) : null,
        )}

        {/* x-axis tick labels */}
        {daily.map((d, i) =>
          tickIdx.has(i) ? (
            <text
              key={`tick-${d.date}`}
              x={xForIndex(i)}
              y={H - 8}
              fontSize={11}
              fill="var(--text-faint)"
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            >
              {shortDay(d.date)}
            </text>
          ) : null,
        )}
      </svg>
      <small className="faint">
        {totalFaults} {totalFaults === 1 ? 'fault' : 'faults'} across the last {n} days. Bars =
        faults per day · line = that day’s pass rate.
      </small>
    </div>
  );
}
