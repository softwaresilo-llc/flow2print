interface FinishArtifact {
  id: string;
  label: string;
  href: string;
}

interface DesignerFinishPanelProps {
  artifacts: FinishArtifact[];
  syncingCommerce: boolean;
  commerceStatusClassName: string;
  commerceStatusLabel: string;
  quoteRef: string;
  orderRef: string;
  sessionLabel: string;
  onLinkQuote: () => void;
  onLinkOrder: () => void;
}

export const DesignerFinishPanel = ({
  artifacts,
  syncingCommerce,
  commerceStatusClassName,
  commerceStatusLabel,
  quoteRef,
  orderRef,
  sessionLabel,
  onLinkQuote,
  onLinkOrder
}: DesignerFinishPanelProps) => (
  <>
    <div className="section-heading">
      <div>
        <h3>Files</h3>
        <p>Generated after you create print files.</p>
      </div>
      <span className="badge badge--neutral">{artifacts.length}</span>
    </div>
    <div className="artifact-list">
      {artifacts.length === 0 ? <div className="empty-state">No files yet. Create print files to generate them.</div> : null}
      {artifacts.map((artifact) => (
        <div className="artifact-item" key={artifact.id}>
          <strong>{artifact.label}</strong>
          <a className="button-link button-link--ghost" href={artifact.href} target="_blank" rel="noreferrer">
            Open
          </a>
        </div>
      ))}
    </div>
    <div className="section-heading">
      <div>
        <h3>External references</h3>
        <p>Optional links for the next system step.</p>
      </div>
    </div>
    <div className="stack-actions stack-actions--secondary">
      <button type="button" className="button--ghost" onClick={onLinkQuote} disabled={syncingCommerce}>
        {syncingCommerce ? "Syncing..." : "Link quote"}
      </button>
      <button type="button" className="button--ghost" onClick={onLinkOrder} disabled={syncingCommerce}>
        {syncingCommerce ? "Syncing..." : "Link order"}
      </button>
    </div>
    <div className="kv-list">
      <div className="kv-item">
        <strong>Status</strong>
        <span className={commerceStatusClassName}>{commerceStatusLabel}</span>
      </div>
      <div className="kv-item">
        <strong>Quote ref</strong>
        <span>{quoteRef}</span>
      </div>
      <div className="kv-item">
        <strong>Order ref</strong>
        <span>{orderRef}</span>
      </div>
      <div className="kv-item">
        <strong>Session</strong>
        <span>{sessionLabel}</span>
      </div>
    </div>
  </>
);
