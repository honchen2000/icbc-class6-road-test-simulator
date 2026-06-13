/**
 * Score summary: a radial demerit-points gauge (accumulated points vs the
 * FAIL_POINT_THRESHOLD) plus per-skill demerit bars derived from
 * `score.perSkill`. Colour shifts from accent -> warn -> danger as points climb
 * toward the failing threshold.
 */
import { useMemo } from 'react';
import { FAIL_POINT_THRESHOLD, GLOBAL_SKILLS } from '../../shared/catalog';
import type { SessionScore } from '../../shared/types';
import './score-card.css';

interface ScoreCardProps {
  score: SessionScore;
}

export default function ScoreCard({ score }: ScoreCardProps) {
  const ratio = useMemo(
    () => Math.min(score.totalPoints / FAIL_POINT_THRESHOLD, 1),
    [score.totalPoints],
  );
  const gaugeColor = score.autoFail
    ? 'var(--danger)'
    : ratio >= 1
      ? 'var(--danger)'
      : ratio >= 0.66
        ? 'var(--warn)'
        : 'var(--accent)';

  const maxSkillPoints = useMemo(() => {
    const vals = Object.values(score.perSkill);
    const max = vals.length ? Math.max(...vals) : 0;
    return Math.max(max, FAIL_POINT_THRESHOLD, 1);
  }, [score.perSkill]);

  const deg = Math.round(ratio * 360);

  return (
    <div className="score-card panel">
      <div className="score-gauge-wrap">
        <div
          className="score-gauge"
          style={{ background: `conic-gradient(${gaugeColor} ${deg}deg, var(--bg-elev) 0deg)` }}
          role="img"
          aria-label={`${score.totalPoints} demerit points out of ${FAIL_POINT_THRESHOLD} to fail`}
        >
          <div className="score-gauge-inner">
            <span className="score-gauge-num">{score.totalPoints}</span>
            <span className="score-gauge-cap">/ {FAIL_POINT_THRESHOLD} pts</span>
          </div>
        </div>
        <div className="score-gauge-meta">
          <span className={`badge ${score.passed ? 'badge-ok' : 'badge-danger'}`}>
            {score.passed ? 'Within limit' : score.autoFail ? 'Auto-fail' : 'Over limit'}
          </span>
          <small>Demerit points accumulate; {FAIL_POINT_THRESHOLD}+ fails the test.</small>
        </div>
      </div>

      <div className="score-skills stack-sm">
        <span className="tag">Per-skill demerits</span>
        {GLOBAL_SKILLS.map((skill) => {
          const pts = score.perSkill[skill.id] ?? 0;
          const pct = Math.round((pts / maxSkillPoints) * 100);
          return (
            <div key={skill.id} className="score-skill">
              <div className="spread score-skill-head">
                <span className="score-skill-name">{skill.name}</span>
                <span className="score-skill-pts">{pts} pts</span>
              </div>
              <div className="bar" role="img" aria-label={`${skill.name}: ${pts} demerit points`}>
                <span
                  style={{
                    width: `${pct}%`,
                    background: pts === 0 ? 'var(--ok)' : 'linear-gradient(90deg, var(--warn), var(--danger))',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
