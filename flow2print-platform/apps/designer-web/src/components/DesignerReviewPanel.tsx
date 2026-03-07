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
}: DesignerReviewPanelProps) => (
  <>
    <div className={`review-summary ${hasBlockingIssues ? "review-summary--warning" : "review-summary--pass"}`}>
      <div>
        <strong>{hasBlockingIssues ? "This side still needs attention." : "This side is ready for print files."}</strong>
        <p>
          {hasBlockingIssues
            ? "Resolve the blocking items below. You can jump back to editing at any time."
            : "Only warnings or informational notes remain on this side."}
        </p>
      </div>
      {isEditableProject ? (
        <div className="stack-actions">
          {canShowSelectedItem ? (
            <button type="button" className="button--ghost" onClick={onShowSelectedItem}>
              Show selected item
            </button>
          ) : null}
          <button type="button" className="button--ghost" onClick={onBackToEditing}>
            Back to editing
          </button>
        </div>
      ) : null}
    </div>
    <div className="section-heading">
      <div>
        <h3>Live checks</h3>
        <p>Quick layout hints before you create print files.</p>
      </div>
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
    <div className="section-heading">
      <div>
        <h3>Preflight</h3>
        <p>Latest print-file validation.</p>
      </div>
      <span className={preflightStatusClassName}>{preflightStatusLabel}</span>
    </div>
    <div className="issue-list">
      {preflightIssues.length === 0 ? <div className="empty-state">No print-file validation has been generated yet.</div> : null}
      {preflightIssues.map((issue, index) => (
        <div className="issue-item" key={issue.id ?? `${issue.issueCode ?? "preflight"}-${index}`}>
          <strong>{issue.issueCode ?? issue.severity}</strong>
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  </>
);
