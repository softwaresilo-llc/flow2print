interface DesignerNavigatorPanelProps {
  title: string;
  summary?: string;
  description?: string;
  content: React.ReactNode;
  footer?: React.ReactNode;
}

export const DesignerNavigatorPanel = ({
  title,
  summary,
  description,
  content,
  footer
}: DesignerNavigatorPanelProps) => (
  <article className="panel panel--tight panel--navigator panel--sidebar panel--utility">
    <div className="navigator-topbar">
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      {summary ? <span className="badge badge--neutral">{summary}</span> : null}
    </div>
    <div className="navigator-panel__body">{content}</div>
    {footer ? <div className="navigator-panel__footer">{footer}</div> : null}
  </article>
);
