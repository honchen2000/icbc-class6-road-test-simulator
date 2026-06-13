/**
 * Step progress indicator: a label ("Step N of M") plus the shared `.progress`
 * bar filled to the completed fraction.
 */
interface ProgressProps {
  /** 0-based index of the current step. */
  index: number;
  total: number;
}

export default function Progress({ index, total }: ProgressProps) {
  const safeTotal = Math.max(total, 1);
  const current = Math.min(index + 1, safeTotal);
  const pct = Math.round((current / safeTotal) * 100);
  return (
    <div className="stack-sm" aria-label={`Step ${current} of ${safeTotal}`}>
      <div className="spread">
        <span className="tag">
          Step {current} / {safeTotal}
        </span>
        <small>{pct}%</small>
      </div>
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={safeTotal}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
