interface DesignerHistoryEntry {
  id: string;
  label: string;
  relativeTime: string;
  timeLabel: string;
  icon: string;
  restoreIndex: number;
}

interface DesignerHistoryPanelProps {
  statusLabel: string;
  templateName: string;
  hasUnsavedChanges: boolean;
  undoCount: number;
  redoCount: number;
  entries: DesignerHistoryEntry[];
  onUndo: () => void;
  onRedo: () => void;
  onRestore: (restoreIndex: number) => void;
  onClear: () => void;
}

export const DesignerHistoryPanel = ({
  statusLabel,
  templateName,
  hasUnsavedChanges,
  undoCount,
  redoCount,
  entries,
  onUndo,
  onRedo,
  onRestore,
  onClear
}: DesignerHistoryPanelProps) => (
  <article className="panel panel--tight panel--navigator panel--sidebar panel--utility stitch-history-panel">
    <div className="navigator-topbar stitch-history-panel__topbar">
      <div>
        <strong>History</strong>
        <p>Recent session changes and restore points.</p>
      </div>
      <div className="stitch-history-panel__actions">
        <button type="button" className="icon-button" aria-label="Undo" title="Undo" onClick={onUndo} disabled={undoCount === 0}>
          <span className="material-symbols-outlined" aria-hidden="true">
            undo
          </span>
        </button>
        <button type="button" className="icon-button" aria-label="Redo" title="Redo" onClick={onRedo} disabled={redoCount === 0}>
          <span className="material-symbols-outlined" aria-hidden="true">
            redo
          </span>
        </button>
      </div>
    </div>

    <div className="stitch-history-panel__meta">
      <div className="kv-item">
        <strong>Status</strong>
        <span>{statusLabel}</span>
      </div>
      <div className="kv-item">
        <strong>Template</strong>
        <span>{templateName}</span>
      </div>
      <div className="kv-item">
        <strong>Unsaved</strong>
        <span>{hasUnsavedChanges ? "Yes" : "No"}</span>
      </div>
      <div className="kv-item">
        <strong>Undo stack</strong>
        <span>{undoCount}</span>
      </div>
      <div className="kv-item">
        <strong>Redo stack</strong>
        <span>{redoCount}</span>
      </div>
    </div>

    <div className="navigator-panel__body stitch-history-panel__body">
      <div className={`stitch-history-current ${hasUnsavedChanges ? "stitch-history-current--dirty" : ""}`}>
        <span className="material-symbols-outlined" aria-hidden="true">
          edit_document
        </span>
        <div className="stitch-history-current__content">
          <strong>Current draft</strong>
          <span>{hasUnsavedChanges ? "Unsaved changes are still in progress." : "Everything in this session is saved."}</span>
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state stitch-history-panel__empty">
          No local changes yet. Add text, place an image, or adjust a layer to start the session history.
        </div>
      ) : (
        <div className="stitch-history-list">
          {entries.map((entry, index) => (
            <article
              key={entry.id}
              className={`stitch-history-item ${index === 0 ? "stitch-history-item--active" : ""}`}
            >
              <span className="stitch-history-item__icon">
                <span className="material-symbols-outlined" aria-hidden="true">
                  {entry.icon}
                </span>
              </span>
              <span className="stitch-history-item__content">
                <strong>{entry.label}</strong>
                <span>{entry.relativeTime}</span>
              </span>
              <span className="stitch-history-item__time">{entry.timeLabel}</span>
              <span className="stitch-history-item__restore">
                <button type="button" className="button button--ghost button--compact" onClick={() => onRestore(entry.restoreIndex)}>
                  Restore
                </button>
              </span>
            </article>
          ))}
        </div>
      )}
    </div>

    <div className="navigator-panel__footer stitch-history-panel__footer">
      <button type="button" className="stitch-history-panel__clear" onClick={onClear} disabled={entries.length === 0}>
        <span className="material-symbols-outlined" aria-hidden="true">
          delete_sweep
        </span>
        <span>Clear History</span>
      </button>
    </div>
  </article>
);
