interface FinishArtifact {
  id: string;
  label: string;
  href: string;
}

interface DesignerFinishPanelProps {
  artifacts: FinishArtifact[];
  quoteRef: string;
  orderRef: string;
}

export const DesignerFinishPanel = ({
  artifacts,
  quoteRef,
  orderRef
}: DesignerFinishPanelProps) => (
  <>
    <div className="review-summary">
      <div>
        <strong>{artifacts.length > 0 ? "Latest files are ready." : "No files have been created yet."}</strong>
        <p>{artifacts.length > 0 ? "Open the latest generated files below." : "Create print files from Check to generate them."}</p>
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
    {quoteRef !== "n/a" || orderRef !== "n/a" ? (
      <>
        <div className="section-heading">
          <div>
            <h3>Linked records</h3>
            <p>References already attached to this project.</p>
          </div>
        </div>
        <div className="kv-list">
          <div className="kv-item">
            <strong>Quote ref</strong>
            <span>{quoteRef}</span>
          </div>
          <div className="kv-item">
            <strong>Order ref</strong>
            <span>{orderRef}</span>
          </div>
        </div>
      </>
    ) : null}
  </>
);
