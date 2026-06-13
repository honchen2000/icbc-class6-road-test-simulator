/**
 * The rider action palette + performed-actions tray. Actions from the shared
 * ACTIONS catalog are grouped by `group` with large, one-handed tap targets.
 * Tapping an action calls `onPerform(actionType)`; the parent stamps timing and
 * appends to the performed list, which renders here as ordered chips with
 * Undo-last and Clear controls.
 */
import { useMemo } from 'react';
import { ACTION_BY_TYPE, ACTIONS } from '../../shared/catalog';
import type { ActionGroup, ActionType, PerformedAction } from '../../shared/types';
import './action-panel.css';

interface ActionPanelProps {
  performed: PerformedAction[];
  disabled?: boolean;
  onPerform: (action: ActionType) => void;
  onUndo: () => void;
  onClear: () => void;
}

const GROUP_ORDER: ActionGroup[] = ['observation', 'signal', 'speed', 'position', 'maneuver'];

const GROUP_LABEL: Record<ActionGroup, string> = {
  observation: 'Observation',
  signal: 'Signal',
  speed: 'Speed',
  position: 'Lane Position',
  maneuver: 'Maneuver',
};

export default function ActionPanel({
  performed,
  disabled = false,
  onPerform,
  onUndo,
  onClear,
}: ActionPanelProps) {
  const grouped = useMemo(() => {
    return GROUP_ORDER.map((group) => ({
      group,
      actions: ACTIONS.filter((a) => a.group === group),
    })).filter((g) => g.actions.length > 0);
  }, []);

  // Spoken summary of the performed-action tray, so additions / undo / clear
  // are announced to screen-reader users (the chip list itself is silent).
  const liveSummary = useMemo(() => {
    if (performed.length === 0) return 'No actions performed yet.';
    const last = performed[performed.length - 1];
    const lastLabel = ACTION_BY_TYPE[last.action]?.label ?? last.action;
    return `${performed.length} action${performed.length === 1 ? '' : 's'} performed. Last: ${lastLabel}.`;
  }, [performed]);

  return (
    <div className="ap stack">
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {liveSummary}
      </span>
      <div className="ap-tray panel">
        <div className="spread">
          <span className="tag">Your actions ({performed.length})</span>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm-action"
              onClick={onUndo}
              disabled={disabled || performed.length === 0}
            >
              Undo
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm-action"
              onClick={onClear}
              disabled={disabled || performed.length === 0}
            >
              Clear
            </button>
          </div>
        </div>
        {performed.length === 0 ? (
          <p className="ap-empty muted">
            Tap the controls below in the order you would perform them.
          </p>
        ) : (
          <ol className="ap-chips">
            {performed.map((p, i) => {
              const def = ACTION_BY_TYPE[p.action];
              return (
                <li key={`${p.action}-${i}`} className="ap-chip">
                  <span className="ap-chip-idx">{i + 1}</span>
                  <span className="ap-chip-label">{def?.label ?? p.action}</span>
                  <span className="ap-chip-time">{formatMs(p.tMs)}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="ap-groups stack">
        {grouped.map(({ group, actions }) => (
          <div key={group} className="ap-group">
            <div className="ap-group-title tag">{GROUP_LABEL[group]}</div>
            <div className="ap-grid">
              {actions.map((a) => (
                <button
                  key={a.type}
                  type="button"
                  className={`btn ap-btn ap-btn-${a.group}`}
                  onClick={() => onPerform(a.type)}
                  disabled={disabled}
                  title={a.hint ?? a.label}
                >
                  <span className="ap-btn-label">{a.label}</span>
                  {a.hint ? <span className="ap-btn-hint">{a.hint}</span> : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
