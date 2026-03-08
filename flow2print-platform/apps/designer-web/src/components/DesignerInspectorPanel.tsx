import type { ReactNode } from "react";

interface DesignerInspectorPanelProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
}

export const DesignerInspectorPanel = ({
  title,
  description,
  badge,
  children
}: DesignerInspectorPanelProps) => (
  <article className="panel panel--tight">
    <div className="inspector-header">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {badge ? <div className="inspector-header__badge">{badge}</div> : null}
    </div>
    {children}
  </article>
);
