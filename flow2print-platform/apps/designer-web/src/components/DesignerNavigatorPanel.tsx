interface DesignerNavigatorPanelProps {
  title: string;
  summary: string;
  description: string;
  content: React.ReactNode;
}

export const DesignerNavigatorPanel = ({
  title,
  summary,
  description,
  content
}: DesignerNavigatorPanelProps) => (
  <article className="panel panel--tight panel--navigator panel--sidebar panel--utility">
    <div className="navigator-topbar">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <span className="badge badge--neutral">{summary}</span>
    </div>
    {content}
  </article>
);
