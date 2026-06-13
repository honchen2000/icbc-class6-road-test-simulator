/**
 * Grouped list of detected faults. Faults are grouped by global skill; each row
 * shows a severity dot, title, demerit points, the per-occurrence detail, and —
 * when a coaching lookup (from the fault catalog) is provided — an actionable
 * coaching tip. Renders a "clean" empty state when there are no faults.
 */
import { useMemo } from 'react';
import { GLOBAL_SKILL_BY_ID } from '../../shared/catalog';
import type { DetectedFault, FaultSeverity, GlobalSkillId } from '../../shared/types';
import './fault-list.css';

interface FaultListProps {
  faults: DetectedFault[];
  /** Optional map fault code -> coaching tip (from api.faults()). */
  coachingByCode?: Record<string, string>;
  emptyText?: string;
}

const SEVERITY_LABEL: Record<FaultSeverity, string> = {
  minor: 'Minor',
  major: 'Major',
  dangerous: 'Dangerous',
  auto_fail: 'Auto-fail',
};

export default function FaultList({
  faults,
  coachingByCode,
  emptyText = 'No faults recorded.',
}: FaultListProps) {
  const groups = useMemo(() => groupBySkill(faults), [faults]);

  if (faults.length === 0) {
    return (
      <div className="fault-empty panel">
        <span className="fault-empty-icon" aria-hidden="true">
          ✓
        </span>
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="fault-list stack">
      {groups.map(({ skill, items }) => (
        <div key={skill} className="fault-group">
          <div className="fault-group-head spread">
            <span className="tag">{GLOBAL_SKILL_BY_ID[skill]?.name ?? skill}</span>
            <span className="badge">{items.length}</span>
          </div>
          <ul className="fault-items">
            {items.map((f, i) => {
              const coaching = coachingByCode?.[f.code];
              return (
                <li key={`${f.code}-${f.stepId}-${i}`} className="fault-item">
                  <div className="fault-item-head">
                    <span className={`sev sev-${f.severity}`} aria-hidden="true" />
                    <span className="fault-item-title">{f.title}</span>
                    <span className={`badge ${severityBadge(f.severity)} fault-item-sev`}>
                      {SEVERITY_LABEL[f.severity]} · {f.points} pts
                    </span>
                  </div>
                  {f.detail ? <p className="fault-item-detail">{f.detail}</p> : null}
                  {coaching ? (
                    <p className="fault-item-coach">
                      <span className="fault-item-coach-tag">Coaching</span> {coaching}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function groupBySkill(faults: DetectedFault[]): Array<{ skill: GlobalSkillId; items: DetectedFault[] }> {
  const map = new Map<GlobalSkillId, DetectedFault[]>();
  for (const f of faults) {
    const list = map.get(f.skill);
    if (list) list.push(f);
    else map.set(f.skill, [f]);
  }
  return Array.from(map.entries()).map(([skill, items]) => ({ skill, items }));
}

function severityBadge(sev: FaultSeverity): string {
  switch (sev) {
    case 'minor':
      return 'badge-warn';
    case 'major':
      return 'badge-warn';
    case 'dangerous':
      return 'badge-danger';
    case 'auto_fail':
      return 'badge-danger';
    default:
      return 'badge-info';
  }
}
