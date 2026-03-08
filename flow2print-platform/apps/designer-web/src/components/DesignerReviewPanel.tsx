interface ReviewIssue {
  id?: string;
  severity: "info" | "warning" | "blocking";
  issueCode?: string;
  message: string;
}

interface DesignerReviewPanelProps {
  hasBlockingIssues: boolean;
  isEditableProject: boolean;
  canShowSelectedItem: boolean;
  liveChecks: ReviewIssue[];
  preflightStatusClassName: string;
  preflightStatusLabel: string;
  preflightIssues: ReviewIssue[];
  onShowSelectedItem: () => void;
  onBackToEditing: () => void;
}

export const DesignerReviewPanel = ({
  hasBlockingIssues,
  isEditableProject,
  canShowSelectedItem,
  liveChecks,
  preflightStatusClassName,
  preflightStatusLabel,
  preflightIssues,
  onShowSelectedItem,
  onBackToEditing
}: DesignerReviewPanelProps) => {
  const blockingIssues = liveChecks.filter((issue) => issue.severity === "blocking");
  const warningIssues = liveChecks.filter((issue) => issue.severity === "warning");
  const infoIssues = liveChecks.filter((issue) => issue.severity === "info");

  return (
    <>
      <div className={`review-summary ${hasBlockingIssues ? "review-summary--warning" : "review-summary--pass"}`}>
        <div>
          <strong>{hasBlockingIssues ? "Issues need attention before files can be created." : "Ready for file creation."}</strong>
          <p>
            {hasBlockingIssues
              ? `${blockingIssues.length} blocking issue${blockingIssues.length === 1 ? "" : "s"} and ${warningIssues.length} warning${warningIssues.length === 1 ? "" : "s"} on this side.`
              : "The current side passes the essential print checks."}
          </p>
        </div>
        {isEditableProject ? (
          <div className="stack-actions">
            {canShowSelectedItem ? (
              <button type="button" className="button--ghost" onClick={onShowSelectedItem}>
                Show hidden item
              </button>
            ) : null}
            <button type="button" className="button--ghost" onClick={onBackToEditing}>
              Back to design
            </button>
          </div>
        ) : null}
      </div>

      <div className="review-metrics">
        <div className="metric-card">
          <strong>Blocking issues</strong>
          <span className={blockingIssues.length > 0 ? "badge badge--danger" : "badge badge--success"}>
            {blockingIssues.length}
          </span>
        </div>
        <div className="metric-card">
          <strong>Warnings</strong>
          <span className={warningIssues.length > 0 ? "badge badge--warning" : "badge badge--success"}>
            {warningIssues.length}
          </span>
        </div>
        <div className="metric-card">
          <strong>Pre-flight</strong>
          <span className={preflightStatusClassName}>{preflightStatusLabel}</span>
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section__header">
          <h4>Current side</h4>
          <span className="badge badge--neutral">{liveChecks.length}</span>
        </div>
        <div className="issue-list">
          {liveChecks.length === 0 ? <div className="empty-state">No immediate layout issues on this side.</div> : null}
          {liveChecks.map((issue, index) => (
            <div className="issue-item" key={`${issue.severity}-${issue.id ?? index}`}>
              <strong className={`issue-severity issue-severity--${issue.severity}`}>{issue.severity}</strong>
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-section__header">
          <h4>Print file checks</h4>
          <span className={preflightStatusClassName}>{preflightStatusLabel}</span>
        </div>
        <div className="review-checklist">
          <div className="review-checklist__item">
            <strong>Image resolution</strong>
            <span>{blockingIssues.some((issue) => issue.message.toLowerCase().includes("image")) ? "Needs review" : "OK"}</span>
          </div>
          <div className="review-checklist__item">
            <strong>Safe area</strong>
            <span>{warningIssues.some((issue) => issue.message.toLowerCase().includes("safe area")) ? "Warning" : "OK"}</span>
          </div>
          <div className="review-checklist__item">
            <strong>Bleed</strong>
            <span>OK</span>
          </div>
          <div className="review-checklist__item">
            <strong>Fonts</strong>
            <span>Ready</span>
          </div>
        </div>
        <div className="issue-list">
          {preflightIssues.length === 0 ? <div className="empty-state">No file run yet. Create print files to generate pre-flight results.</div> : null}
          {preflightIssues.map((issue, index) => (
            <div className="issue-item" key={issue.id ?? `${issue.issueCode ?? "preflight"}-${index}`}>
              <strong>{issue.issueCode ?? issue.severity}</strong>
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      </div>

      {infoIssues.length > 0 ? (
        <div className="workspace-alert workspace-alert--subtle">
          <div>
            <strong>Helpful notes</strong>
            <p>{infoIssues[0]?.message}</p>
          </div>
        </div>
      ) : null}
    </>
  );
};
